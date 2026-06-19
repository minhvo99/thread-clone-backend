-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'BLOCKED');

-- CreateTable
CREATE TABLE "connections" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "addresseeId" TEXT NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "connections_addresseeId_status_createdAt_idx" ON "connections"("addresseeId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "connections_requesterId_status_createdAt_idx" ON "connections"("requesterId", "status", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "connections_requesterId_addresseeId_key" ON "connections"("requesterId", "addresseeId");

-- AddForeignKey
ALTER TABLE "connections" ADD CONSTRAINT "connections_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connections" ADD CONSTRAINT "connections_addresseeId_fkey" FOREIGN KEY ("addresseeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
