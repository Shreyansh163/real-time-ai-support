/*
  Warnings:

  - The primary key for the `_UserConversations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[A,B]` on the table `_UserConversations` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "_UserConversations" DROP CONSTRAINT "_UserConversations_AB_pkey";

-- CreateIndex
CREATE UNIQUE INDEX "_UserConversations_AB_unique" ON "_UserConversations"("A", "B");
