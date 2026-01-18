-- AlterTable
ALTER TABLE "oauth_clients" ADD COLUMN     "client_secret_old" TEXT,
ADD COLUMN     "secret_expires_at" TIMESTAMP(3);
