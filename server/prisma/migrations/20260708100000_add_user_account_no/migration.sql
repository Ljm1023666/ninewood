-- AlterTable
ALTER TABLE "User" ADD COLUMN "accountNo" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "User_accountNo_key" ON "User"("accountNo");
