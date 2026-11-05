-- Códigos de un solo uso para restablecer la contraseña del Portal.
-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "secret_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "password_reset_tokens_merchant_id_created_at_idx" ON "password_reset_tokens"("merchant_id", "created_at");

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Integridad multi-tenant: toda cuenta bancaria debe pertenecer a un
-- comercio existente. Si esta migración falla con una violación de FK,
-- hay `bank_accounts` con `merchant_id` huérfano (cuentas creadas por
-- el flujo admin antes de que existiera el Portal). Revisar con:
--   SELECT DISTINCT ba.merchant_id FROM bank_accounts ba
--     LEFT JOIN merchants m ON m.id = ba.merchant_id
--     WHERE m.id IS NULL;
-- y decidir cuenta por cuenta (asignar a un comercio real o eliminarla)
-- antes de volver a aplicar la migración.
-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
