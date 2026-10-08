-- CreateEnum
CREATE TYPE "BankStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DEGRADED');

-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('WEB_SCRAPING', 'MOBILE_PROXY', 'FILE_EXPORT', 'HYBRID');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'REAUTH_REQUIRED', 'SUSPENDED', 'ERROR');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('DEPOSIT', 'TRANSFER', 'WITHDRAWAL', 'REVERSAL', 'PAYMENT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "MovementStatus" AS ENUM ('RECEIVED', 'VALID', 'INVALID', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "SubmissionChannel" AS ENUM ('TELEGRAM', 'API');

-- CreateEnum
CREATE TYPE "PaymentSubmissionStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PENDING_MOVEMENT', 'MATCHING', 'VERIFIED', 'AMBIGUOUS', 'REJECTED', 'ERROR', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "MatchResult" AS ENUM ('EXACT_MATCH', 'PROBABLE_MATCH', 'AMBIGUOUS_MATCH', 'NO_MATCH', 'PENDING');

-- CreateEnum
CREATE TYPE "OcrConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'LOGOUT', 'SYNC', 'CONFIG_CHANGE', 'ADMIN_OPERATION', 'ERROR');

-- CreateEnum
CREATE TYPE "AuditResult" AS ENUM ('SUCCESS', 'FAILURE');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('ACCOUNT_NOT_SYNCING', 'HIGH_ERROR_RATE', 'ACCOUNT_ESCALATED', 'SERVICE_DEGRADED');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('WARNING', 'CRITICAL');

-- CreateTable
CREATE TABLE "banks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "status" "BankStatus" NOT NULL DEFAULT 'ACTIVE',
    "integration_type" "IntegrationType" NOT NULL,
    "adapter_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "bank_id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "encrypted_credentials" TEXT NOT NULL,
    "credentials_read_only_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "status" "AccountStatus" NOT NULL DEFAULT 'PENDING',
    "sync_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sync_interval_seconds" INTEGER NOT NULL DEFAULT 60,
    "last_sync_at" TIMESTAMP(3),
    "last_movement_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_movements" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "sender" TEXT,
    "receiver" TEXT,
    "movement_type" "MovementType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "MovementStatus" NOT NULL DEFAULT 'RECEIVED',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "raw_data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_submissions" (
    "id" TEXT NOT NULL,
    "channel" "SubmissionChannel" NOT NULL,
    "external_message_id" TEXT,
    "sender_identifier" TEXT NOT NULL,
    "bank_account_id" TEXT,
    "file_hash" VARCHAR(64) NOT NULL,
    "file_storage_ref" TEXT NOT NULL,
    "file_mime_type" TEXT NOT NULL,
    "status" "PaymentSubmissionStatus" NOT NULL DEFAULT 'RECEIVED',
    "ocr_extracted_data" JSONB,
    "ocr_confidence" "OcrConfidence",
    "matched_movement_id" TEXT,
    "match_result" "MatchResult",
    "match_score" DOUBLE PRECISION,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_events" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "from_status" "PaymentSubmissionStatus",
    "to_status" "PaymentSubmissionStatus" NOT NULL,
    "reason" TEXT,
    "actor" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "actor" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "result" "AuditResult" NOT NULL,
    "metadata" JSONB,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_logs" (
    "id" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "status" "SyncStatus" NOT NULL DEFAULT 'RUNNING',
    "error" TEXT,
    "movements_found" INTEGER NOT NULL DEFAULT 0,
    "movements_new" INTEGER NOT NULL DEFAULT 0,
    "duration_ms" INTEGER,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "banks_adapter_key_key" ON "banks"("adapter_key");

-- CreateIndex
CREATE INDEX "bank_accounts_merchant_id_idx" ON "bank_accounts"("merchant_id");

-- CreateIndex
CREATE INDEX "bank_accounts_bank_id_idx" ON "bank_accounts"("bank_id");

-- CreateIndex
CREATE INDEX "bank_movements_account_id_date_idx" ON "bank_movements"("account_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "bank_movements_account_id_reference_amount_date_key" ON "bank_movements"("account_id", "reference", "amount", "date");

-- CreateIndex
CREATE UNIQUE INDEX "payment_submissions_matched_movement_id_key" ON "payment_submissions"("matched_movement_id");

-- CreateIndex
CREATE INDEX "payment_submissions_file_hash_idx" ON "payment_submissions"("file_hash");

-- CreateIndex
CREATE INDEX "payment_submissions_status_idx" ON "payment_submissions"("status");

-- CreateIndex
CREATE INDEX "payment_submissions_bank_account_id_idx" ON "payment_submissions"("bank_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_submissions_channel_external_message_id_key" ON "payment_submissions"("channel", "external_message_id");

-- CreateIndex
CREATE INDEX "verification_events_submission_id_idx" ON "verification_events"("submission_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- CreateIndex
CREATE INDEX "alert_logs_type_entity_type_entity_id_idx" ON "alert_logs"("type", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "alert_logs_created_at_idx" ON "alert_logs"("created_at");

-- CreateIndex
CREATE INDEX "sync_logs_account_id_started_at_idx" ON "sync_logs"("account_id", "started_at");

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "banks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_movements" ADD CONSTRAINT "bank_movements_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_submissions" ADD CONSTRAINT "payment_submissions_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_submissions" ADD CONSTRAINT "payment_submissions_matched_movement_id_fkey" FOREIGN KEY ("matched_movement_id") REFERENCES "bank_movements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_events" ADD CONSTRAINT "verification_events_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "payment_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
