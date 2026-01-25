-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('USER', 'DEVELOPER', 'HYBRID');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "accountType" "AccountType" NOT NULL DEFAULT 'USER',
ADD COLUMN     "canUseExpenses" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "developerEnabledAt" TIMESTAMP(3),
ADD COLUMN     "expensesEnabledAt" TIMESTAMP(3),
ADD COLUMN     "isDeveloper" BOOLEAN NOT NULL DEFAULT false;
