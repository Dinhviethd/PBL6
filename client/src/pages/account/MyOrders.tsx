import { useState } from "react";
import { Link } from "react-router-dom";
import { MyWaitQueue } from "@/components/ticketing/wait-queue";
import { Empty, Field, Loading, Notice, PageHead, Pager, Status } from "@/components/ticketing/shared";
import { useLoad, money, when, values } from "@/features/ticketing/data";
import type { Order } from "@/features/ticketing/types";

export function MyOrders() {
  const [page, setPage] = useState(0),
    [filter, setFilter] = useState(""),
    r = useLoad<Order[]>(`/me/orders?page=${page}&${filter}`);
  return (
    <>
      <PageHead eyebrow="TÀI KHOẢN" title="Lịch sử đặt vé" />
      <MyWaitQueue />
      <form
        className="filters"
        onSubmit={(e) => {
          e.preventDefault();
          const d = values(e),
            p = new URLSearchParams();
          for (const [k, v] of Object.entries(d))
            if (v)
              p.set(
                k,
                k === "from" || k === "to" ? new Date(v).toISOString() : v,
              );
          setFilter(p.toString());
          setPage(0);
        }}
      >
        <Field label="Mã đơn / tên" name="q" required={false} />
        <Field label="Từ ngày" name="from" type="date" required={false} />
        <Field label="Đến ngày" name="to" type="date" required={false} />
        <button className="btn primary">Lọc</button>
      </form>
      <Notice error={r.error} />
      {r.loading ? (
        <Loading />
      ) : r.data?.length ? (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Đơn hàng</th>
                <th>Sự kiện</th>
                <th>Ngày đặt</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {r.data.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link to={`/checkout/${o.id}`}>{o.order_code}</Link>
                  </td>
                  <td>{o.event_title_snapshot}</td>
                  <td>{when(o.created_at)}</td>
                  <td>{money(o.total_amount)}</td>
                  <td>
                    <Status value={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>Bạn chưa có đơn đặt vé nào.</Empty>
      )}
      <Pager page={page} setPage={setPage} hasNext={r.data?.length === 50} />
    </>
  );
}
