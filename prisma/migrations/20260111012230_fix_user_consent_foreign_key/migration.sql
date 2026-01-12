-- DropForeignKey
ALTER TABLE "user_consents" DROP CONSTRAINT "user_consents_client_id_fkey";

-- AddForeignKey
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "oauth_clients"("clientId") ON DELETE RESTRICT ON UPDATE CASCADE;
