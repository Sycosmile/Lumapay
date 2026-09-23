ALTER TABLE "Subscription"
  ALTER COLUMN "amount" TYPE DECIMAL(30, 6)
  USING "amount"::numeric;
