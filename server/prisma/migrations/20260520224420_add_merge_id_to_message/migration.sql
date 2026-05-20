-- Add mergeId column to Message table
ALTER TABLE "Message" ADD COLUMN "mergeId" TEXT;

-- Create index for faster merge message queries
CREATE INDEX "Message_mergeId_idx" ON "Message"("mergeId");
