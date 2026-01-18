/*
  Warnings:

  - You are about to drop the column `clientId` on the `authorization_codes` table. All the data in the column will be lost.
  - You are about to drop the column `codeChallenge` on the `authorization_codes` table. All the data in the column will be lost.
  - You are about to drop the column `codeChallengeMethod` on the `authorization_codes` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `authorization_codes` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `authorization_codes` table. All the data in the column will be lost.
  - You are about to drop the column `redirectUri` on the `authorization_codes` table. All the data in the column will be lost.
  - You are about to drop the column `scope` on the `authorization_codes` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `authorization_codes` table. All the data in the column will be lost.
  - You are about to drop the column `used` on the `authorization_codes` table. All the data in the column will be lost.
  - You are about to drop the column `usedAt` on the `authorization_codes` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `authorization_codes` table. All the data in the column will be lost.
  - You are about to drop the column `clientId` on the `oauth_clients` table. All the data in the column will be lost.
  - You are about to drop the column `clientName` on the `oauth_clients` table. All the data in the column will be lost.
  - You are about to drop the column `clientSecret` on the `oauth_clients` table. All the data in the column will be lost.
  - You are about to drop the column `client_secret_old` on the `oauth_clients` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `oauth_clients` table. All the data in the column will be lost.
  - You are about to drop the column `grantTypes` on the `oauth_clients` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `oauth_clients` table. All the data in the column will be lost.
  - You are about to drop the column `isPublic` on the `oauth_clients` table. All the data in the column will be lost.
  - You are about to drop the column `redirectUris` on the `oauth_clients` table. All the data in the column will be lost.
  - You are about to drop the column `secret_expires_at` on the `oauth_clients` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `oauth_clients` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `oauth_clients` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `scope_definitions` table. All the data in the column will be lost.
  - You are about to drop the column `isDefault` on the `scope_definitions` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `scope_definitions` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `ipAddress` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `expires_at` on the `user_consents` table. All the data in the column will be lost.
  - You are about to drop the column `granted_at` on the `user_consents` table. All the data in the column will be lost.
  - You are about to drop the column `revoked_at` on the `user_consents` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `emailVerified` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `fullName` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `passwordHash` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `roles` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[client_id]` on the table `oauth_clients` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[scope]` on the table `scope_definitions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,client_id]` on the table `user_consents` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `client_id` to the `authorization_codes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expires_at` to the `authorization_codes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `redirect_uri` to the `authorization_codes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `authorization_codes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `client_id` to the `oauth_clients` table without a default value. This is not possible if the table is not empty.
  - Added the required column `client_secret_hash` to the `oauth_clients` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `oauth_clients` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `oauth_clients` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scope` to the `scope_definitions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expires_at` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `user_consents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password_hash` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `users` table without a default value. This is not possible if the table is not empty.
  - Made the column `username` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('SYSTEM', 'THIRD_PARTY');

-- DropForeignKey
ALTER TABLE "authorization_codes" DROP CONSTRAINT "authorization_codes_clientId_fkey";

-- DropForeignKey
ALTER TABLE "authorization_codes" DROP CONSTRAINT "authorization_codes_userId_fkey";

-- DropForeignKey
ALTER TABLE "oauth_clients" DROP CONSTRAINT "oauth_clients_userId_fkey";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_userId_fkey";

-- DropForeignKey
ALTER TABLE "user_consents" DROP CONSTRAINT "user_consents_client_id_fkey";

-- DropForeignKey
ALTER TABLE "user_consents" DROP CONSTRAINT "user_consents_user_id_fkey";

-- DropIndex
DROP INDEX "authorization_codes_clientId_idx";

-- DropIndex
DROP INDEX "authorization_codes_expiresAt_idx";

-- DropIndex
DROP INDEX "authorization_codes_userId_idx";

-- DropIndex
DROP INDEX "oauth_clients_clientId_idx";

-- DropIndex
DROP INDEX "oauth_clients_clientId_key";

-- DropIndex
DROP INDEX "oauth_clients_userId_idx";

-- DropIndex
DROP INDEX "scope_definitions_name_idx";

-- DropIndex
DROP INDEX "scope_definitions_name_key";

-- DropIndex
DROP INDEX "sessions_expiresAt_idx";

-- DropIndex
DROP INDEX "sessions_userId_idx";

-- DropIndex
DROP INDEX "user_consents_revoked_at_idx";

-- DropIndex
DROP INDEX "users_email_idx";

-- DropIndex
DROP INDEX "users_username_idx";

-- AlterTable
ALTER TABLE "authorization_codes" DROP COLUMN "clientId",
DROP COLUMN "codeChallenge",
DROP COLUMN "codeChallengeMethod",
DROP COLUMN "createdAt",
DROP COLUMN "expiresAt",
DROP COLUMN "redirectUri",
DROP COLUMN "scope",
DROP COLUMN "state",
DROP COLUMN "used",
DROP COLUMN "usedAt",
DROP COLUMN "userId",
ADD COLUMN     "client_id" TEXT NOT NULL,
ADD COLUMN     "code_challenge" TEXT,
ADD COLUMN     "code_challenge_method" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expires_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "redirect_uri" TEXT NOT NULL,
ADD COLUMN     "scopes" TEXT[],
ADD COLUMN     "used_at" TIMESTAMP(3),
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "oauth_clients" DROP COLUMN "clientId",
DROP COLUMN "clientName",
DROP COLUMN "clientSecret",
DROP COLUMN "client_secret_old",
DROP COLUMN "createdAt",
DROP COLUMN "grantTypes",
DROP COLUMN "isActive",
DROP COLUMN "isPublic",
DROP COLUMN "redirectUris",
DROP COLUMN "secret_expires_at",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "client_id" TEXT NOT NULL,
ADD COLUMN     "client_secret_hash" TEXT NOT NULL,
ADD COLUMN     "client_type" "ClientType" NOT NULL DEFAULT 'THIRD_PARTY',
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "grant_types" TEXT[],
ADD COLUMN     "is_deletable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "owner_user_id" TEXT,
ADD COLUMN     "redirect_uris" TEXT[],
ADD COLUMN     "scopes" TEXT[],
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "scope_definitions" DROP COLUMN "createdAt",
DROP COLUMN "isDefault",
DROP COLUMN "name",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "scope" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "sessions" DROP COLUMN "createdAt",
DROP COLUMN "expiresAt",
DROP COLUMN "ipAddress",
DROP COLUMN "metadata",
DROP COLUMN "updatedAt",
DROP COLUMN "userAgent",
DROP COLUMN "userId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expires_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "user_consents" DROP COLUMN "expires_at",
DROP COLUMN "granted_at",
DROP COLUMN "revoked_at",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "scopes" SET DATA TYPE TEXT[];

-- AlterTable
ALTER TABLE "users" DROP COLUMN "createdAt",
DROP COLUMN "emailVerified",
DROP COLUMN "fullName",
DROP COLUMN "isActive",
DROP COLUMN "passwordHash",
DROP COLUMN "roles",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "password_hash" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "username" SET NOT NULL;

-- CreateIndex
CREATE INDEX "authorization_codes_client_id_idx" ON "authorization_codes"("client_id");

-- CreateIndex
CREATE INDEX "authorization_codes_user_id_idx" ON "authorization_codes"("user_id");

-- CreateIndex
CREATE INDEX "authorization_codes_expires_at_idx" ON "authorization_codes"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_clients_client_id_key" ON "oauth_clients"("client_id");

-- CreateIndex
CREATE INDEX "oauth_clients_owner_user_id_idx" ON "oauth_clients"("owner_user_id");

-- CreateIndex
CREATE INDEX "oauth_clients_client_type_idx" ON "oauth_clients"("client_type");

-- CreateIndex
CREATE INDEX "oauth_clients_deleted_at_idx" ON "oauth_clients"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "scope_definitions_scope_key" ON "scope_definitions"("scope");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_consents_user_id_client_id_key" ON "user_consents"("user_id", "client_id");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_clients" ADD CONSTRAINT "oauth_clients_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorization_codes" ADD CONSTRAINT "authorization_codes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "oauth_clients"("client_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "oauth_clients"("client_id") ON DELETE CASCADE ON UPDATE CASCADE;
