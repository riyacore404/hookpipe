-- CreateTable
CREATE TABLE "alert_rules" (
    "id" TEXT NOT NULL,
    "destination_id" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "window_minutes" INTEGER NOT NULL DEFAULT 5,
    "channel" TEXT NOT NULL,
    "channel_target" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_fired_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alert_rules_destination_id_idx" ON "alert_rules"("destination_id");

-- CreateIndex
CREATE INDEX "alert_rules_is_active_idx" ON "alert_rules"("is_active");

-- AddForeignKey
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
