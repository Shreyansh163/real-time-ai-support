/*
  Warnings:

  - You are about to drop the column `isActive` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `senderType` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `sentiment` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `assignedAgent` on the `Ticket` table. All the data in the column will be lost.
  - You are about to drop the column `closedAt` on the `Ticket` table. All the data in the column will be lost.
  - You are about to drop the column `priority` on the `Ticket` table. All the data in the column will be lost.
  - Made the column `senderId` on table `Message` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_senderId_fkey";

-- AlterTable
ALTER TABLE "Conversation" DROP COLUMN "isActive";

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "senderType",
DROP COLUMN "sentiment",
ALTER COLUMN "senderId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Ticket" DROP COLUMN "assignedAgent",
DROP COLUMN "closedAt",
DROP COLUMN "priority",
ADD COLUMN     "assignedAgentId" TEXT,
ADD COLUMN     "resolvedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
