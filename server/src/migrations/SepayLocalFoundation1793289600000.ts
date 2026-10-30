import type { MigrationInterface, QueryRunner } from "typeorm";

// Additive migration. Registered only by the isolated local runner during P1.
export class SepayLocalFoundation1793289600000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`
      CREATE TABLE sepay_payment_details (
        payment_id uuid PRIMARY KEY REFERENCES payments(id) ON DELETE RESTRICT,
        environment varchar(8) NOT NULL CHECK (environment IN ('test','live')),
        bank_code varchar(32) NOT NULL,
        account_number varchar(100) NOT NULL,
        account_name varchar(150) NOT NULL,
        sub_account varchar(100),
        transfer_content varchar(13) NOT NULL CHECK (transfer_content ~ '^tkh[A-Za-z0-9]{3,10}$'),
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(environment, bank_code, account_number, transfer_content)
      );
      CREATE TABLE sepay_transactions (
        id uuid PRIMARY KEY,
        environment varchar(8) NOT NULL CHECK (environment IN ('test','live')),
        integration_account varchar(100) NOT NULL,
        webhook_transaction_id varchar(128),
        api_transaction_id uuid,
        reference_code varchar(256),
        bank_code varchar(32) NOT NULL,
        account_number varchar(100) NOT NULL,
        sub_account varchar(100),
        transfer_type varchar(3) NOT NULL CHECK (transfer_type IN ('in','out')),
        amount bigint NOT NULL CHECK (amount BETWEEN 1 AND 9007199254740991),
        currency varchar(3) NOT NULL DEFAULT 'VND' CHECK(currency='VND'),
        payment_code varchar(128),
        content text NOT NULL,
        transaction_at timestamptz NOT NULL,
        payload_hash varchar(64) NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
        payment_id uuid REFERENCES payments(id) ON DELETE RESTRICT,
        status varchar(16) NOT NULL DEFAULT 'RECEIVED'
          CHECK(status IN ('RECEIVED','PROCESSING','PROCESSED','REVIEW','ERROR')),
        reason text,
        attempt_count integer NOT NULL DEFAULT 0 CHECK(attempt_count >= 0),
        next_retry_at timestamptz,
        lease_until timestamptz,
        lease_token uuid,
        received_at timestamptz NOT NULL DEFAULT now(),
        processed_at timestamptz,
        CHECK(webhook_transaction_id IS NOT NULL OR api_transaction_id IS NOT NULL),
        CHECK(webhook_transaction_id IS NULL OR webhook_transaction_id ~ '^[0-9]+$'),
        CHECK(status <> 'REVIEW' OR (reason IS NOT NULL AND length(trim(reason)) > 0)),
        UNIQUE(environment, integration_account, webhook_transaction_id),
        UNIQUE(environment, integration_account, api_transaction_id)
      );
      CREATE INDEX sepay_transactions_work_idx ON sepay_transactions(status,next_retry_at,lease_until,id);
      CREATE INDEX sepay_transactions_payment_idx ON sepay_transactions(payment_id,received_at,id);
      CREATE INDEX sepay_transactions_code_idx ON sepay_transactions(payment_code);
      CREATE INDEX sepay_transactions_received_idx ON sepay_transactions(received_at,id);
      CREATE TABLE sepay_transaction_reviews (
        id uuid PRIMARY KEY,
        transaction_id uuid NOT NULL REFERENCES sepay_transactions(id) ON DELETE RESTRICT,
        actor_id uuid REFERENCES users("idUser") ON DELETE RESTRICT,
        action varchar(64) NOT NULL,
        reason text NOT NULL CHECK(length(trim(reason)) > 0),
        evidence_reference text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX sepay_reviews_transaction_idx ON sepay_transaction_reviews(transaction_id,created_at,id);
    `);
  }
  async down() {
    throw new Error("SePay data rollback requires reviewed backup recovery; automatic deletion is disabled.");
  }
}
