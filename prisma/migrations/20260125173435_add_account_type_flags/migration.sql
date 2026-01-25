/*
  Warnings:

  - You are about to drop the column `accountType` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "accountType";

-- CreateIndex
CREATE INDEX "users_isDeveloper_idx" ON "users"("isDeveloper");

-- CreateIndex
CREATE INDEX "users_canUseExpenses_idx" ON "users"("canUseExpenses");
