ALTER TABLE "Deposit"
  DROP CONSTRAINT "Deposit_signature_key";

ALTER TABLE "Deposit"
  ADD COLUMN "transferIndex" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "Deposit_signature_transferIndex_key"
  ON "Deposit"("signature", "transferIndex");