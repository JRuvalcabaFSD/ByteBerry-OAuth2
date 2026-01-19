-- AlterTable
ALTER TABLE "oauth_clients" ADD COLUMN     "is_system_client" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "system_role" TEXT;

-- CreateIndex
CREATE INDEX "oauth_clients_system_role_idx" ON "oauth_clients"("system_role");
