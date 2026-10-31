import { createHash, randomUUID } from "node:crypto";
import {
  ensure,
  role,
  type Principal,
  type Row,
  type Store,
  type UnitOfWork,
} from "../../contracts/core";
import {
  organizerColumns,
  organizerIdentityStore,
} from "./infrastructure/organizer";

const legalKeys = ["businessName", "taxIdOrBusinessLicense"] as const;
const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const versionOf = (row: Row) =>
  digest([
    row.id,
    ...Object.values(organizerColumns).map((key) => row[key] ?? null),
    row.pending_legal_changes ?? null,
  ]);
const legalVersion = (row: Row) =>
  digest(legalKeys.map((key) => row[organizerColumns[key]] ?? null));
const requestDto = (row: Row) => ({
  applicationId: row.id,
  ...row.pending_legal_changes,
  owner_id: row.user_id,
  status: "PENDING",
  created_at: row.pending_legal_changes.requestedAt,
  requested_changes: row.pending_legal_changes.changes,
  reason: null,
});

export function createOrganizerIdentity(db: Store, uow: UnitOfWork) {
  const repo = organizerIdentityStore(db);
  async function source(owner: string) {
    const row = await repo.approvedApplication(owner);
    ensure(
      row,
      "PROFILE_REQUIRED",
      "Tài khoản chưa có hồ sơ tổ chức đã duyệt. Vui lòng liên hệ quản trị viên để kiểm tra hồ sơ.",
      409,
    );
    return row;
  }
  async function read(owner: string) {
    const row = await repo.approvedApplication(owner);
    const capabilities = {
      logo: !!row && Object.hasOwn(row, "logo_url"),
      legalReview: !!row && Object.hasOwn(row, "pending_legal_changes"),
    };
    return {
      ...Object.fromEntries(
        Object.entries(organizerColumns).map(([key, column]) => [
          key,
          row?.[column] ?? null,
        ]),
      ),
      ownerId: owner,
      sourceApplicationId: row?.id ?? null,
      version: row ? versionOf(row) : null,
      initialized: !!row,
      applicationStatus: row?.status ?? null,
      verification: "NOT_VERIFIED",
      updatedAt: null,
      capabilities,
    };
  }
  function available(row: Row, column: string) {
    ensure(
      Object.hasOwn(row, column),
      "FIELD_NOT_AVAILABLE",
      "Chức năng cần trường dữ liệu bổ sung chưa được áp dụng. Các thông tin hiện có vẫn sử dụng bình thường.",
      409,
    );
  }
  async function reviewAvailable() {
    const row = await repo.sampleApplication();
    ensure(
      row && Object.hasOwn(row, "pending_legal_changes"),
      "FIELD_NOT_AVAILABLE",
      "Trường tái duyệt chưa được áp dụng.",
      409,
    );
  }
  return {
    async organizerProfileOwner(p: Principal) {
      role(p, ["ORGANIZER", "ADMIN"]);
      const owner = await repo.user(p.userId);
      return {
        id: owner.idUser,
        name: owner.name,
        email: owner.email,
        avatarUrl: owner.avatarUrl,
      };
    },
    async organizerProfile(p: Principal) {
      role(p, ["ORGANIZER", "ADMIN"]);
      return read(p.userId);
    },
    updateOrganizerProfile: (p: Principal, d: Row) =>
      uow.run(async () => {
        role(p, ["ORGANIZER", "ADMIN"]);
        await repo.lockOwner(p.userId);
        const row = await source(p.userId);
        ensure(
          versionOf(row) === d.version,
          "VERSION_CONFLICT",
          "Dữ liệu đã thay đổi. Vui lòng tải lại trước khi lưu.",
          409,
        );
        const changes: Row = {};
        for (const [key, column] of Object.entries(organizerColumns)) {
          if (
            (legalKeys as readonly string[]).includes(key) ||
            !Object.hasOwn(d, key)
          )
            continue;
          available(row, column);
          changes[column] = d[key];
        }
        await repo.update(row.id, changes);
        return read(p.userId);
      }),
    async organizerLegalRequests(p: Principal) {
      role(p, ["ORGANIZER", "ADMIN"]);
      const row = await repo.approvedApplication(p.userId);
      return row?.pending_legal_changes ? [requestDto(row)] : [];
    },
    submitOrganizerLegalRequest: (p: Principal, d: Row) =>
      uow.run(async () => {
        role(p, ["ORGANIZER", "ADMIN"]);
        await repo.lockOwner(p.userId);
        const row = await source(p.userId);
        available(row, "pending_legal_changes");
        ensure(
          versionOf(row) === d.version,
          "VERSION_CONFLICT",
          "Dữ liệu đã thay đổi. Vui lòng tải lại trước khi gửi.",
          409,
        );
        ensure(
          !row.pending_legal_changes,
          "REQUEST_PENDING",
          "Đã có yêu cầu pháp nhân chờ duyệt.",
          409,
        );
        const changes = Object.fromEntries(
          legalKeys
            .filter((key) => Object.hasOwn(d.changes, key))
            .map((key) => [key, d.changes[key]]),
        );
        ensure(
          Object.keys(changes).length &&
            Object.entries(changes).some(
              ([key, value]) =>
                row[organizerColumns[key as (typeof legalKeys)[number]]] !==
                value,
            ),
          "NO_CHANGES",
          "Thông tin pháp nhân chưa thay đổi.",
          400,
        );
        const pending = {
          id: randomUUID(),
          requestedAt: new Date().toISOString(),
          baseLegalVersion: legalVersion(row),
          changes,
        };
        await repo.update(row.id, { pending_legal_changes: pending });
        return requestDto({ ...row, pending_legal_changes: pending });
      }),
    async adminOrganizerLegalRequests(p: Principal, page: number) {
      role(p, ["ADMIN"]);
      const sample = await repo.sampleApplication();
      if (!sample || !Object.hasOwn(sample, "pending_legal_changes")) return [];
      return (await repo.pending(page * 50)).map(requestDto);
    },
    reviewOrganizerLegalRequest: (
      p: Principal,
      id: string,
      approve: boolean,
      reason: string,
    ) =>
      uow.run(async () => {
        role(p, ["ADMIN"]);
        await reviewAvailable();
        const first = await repo.request(id);
        ensure(
          first,
          "NOT_FOUND",
          "Không tìm thấy yêu cầu pháp nhân đang chờ.",
          404,
        );
        await repo.lockOwner(first.user_id);
        const row = await source(first.user_id);
        ensure(
          row.pending_legal_changes?.id === id,
          "ALREADY_REVIEWED",
          "Yêu cầu đã được xử lý.",
          409,
        );
        ensure(
          approve || reason.trim(),
          "REASON_REQUIRED",
          "Cần nhập lý do từ chối.",
          400,
        );
        const pending = row.pending_legal_changes;
        const changes: Row = { pending_legal_changes: null };
        if (approve) {
          ensure(
            legalVersion(row) === pending.baseLegalVersion,
            "VERSION_CONFLICT",
            "Pháp nhân đã thay đổi; yêu cầu cần được gửi lại.",
            409,
          );
          for (const key of legalKeys)
            if (Object.hasOwn(pending.changes, key)) {
              available(row, organizerColumns[key]);
              changes[organizerColumns[key]] = pending.changes[key];
            }
        }
        await repo.update(row.id, changes);
        return {
          ...requestDto(row),
          status: approve ? "APPROVED" : "REJECTED",
          reason: approve ? null : reason.trim(),
          reviewed_at: new Date().toISOString(),
        };
      }),
  };
}
