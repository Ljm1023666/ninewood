-- 兴趣圈子讨论帖（与 CircleAnnouncement 独立）

CREATE TABLE "CirclePost" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CirclePost_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CirclePostLike" (
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CirclePostLike_pkey" PRIMARY KEY ("postId","userId")
);

CREATE TABLE "CirclePostReply" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CirclePostReply_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CirclePost_circleId_createdAt_idx" ON "CirclePost"("circleId", "createdAt");
CREATE INDEX "CirclePost_userId_idx" ON "CirclePost"("userId");
CREATE INDEX "CirclePostLike_userId_idx" ON "CirclePostLike"("userId");
CREATE INDEX "CirclePostReply_postId_createdAt_idx" ON "CirclePostReply"("postId", "createdAt");
CREATE INDEX "CirclePostReply_userId_idx" ON "CirclePostReply"("userId");

ALTER TABLE "CirclePost" ADD CONSTRAINT "CirclePost_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CirclePost" ADD CONSTRAINT "CirclePost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CirclePostLike" ADD CONSTRAINT "CirclePostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CirclePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CirclePostLike" ADD CONSTRAINT "CirclePostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CirclePostReply" ADD CONSTRAINT "CirclePostReply_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CirclePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CirclePostReply" ADD CONSTRAINT "CirclePostReply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
