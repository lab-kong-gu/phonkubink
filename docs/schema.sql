-- Ticketify / ผ่อนกับอิ้ง — schema DDL
-- Equivalent to `prisma db push` for prisma/schema.prisma.
-- Safe to run once on a fresh Supabase database.

-- Enums
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "ConcertStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SOLD_OUT', 'CANCELLED');
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');
CREATE TYPE "InstallmentStatus" AS ENUM ('PENDING', 'PAID', 'LATE');

-- User
CREATE TABLE "User" (
  "lineUserId"  text PRIMARY KEY,
  "displayName" text,
  "email"       text,
  "phone"       text,
  "pictureUrl"  text,
  "role"        "Role" NOT NULL DEFAULT 'USER',
  "createdAt"   timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Concert
CREATE TABLE "Concert" (
  "id"          text PRIMARY KEY,
  "name"        text NOT NULL,
  "artist"      text,
  "venue"       text,
  "eventDate"   timestamp(3),
  "ticketPrice" decimal(10,2) NOT NULL,
  "posterUrl"   text,
  "description" text,
  "status"      "ConcertStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt"   timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   timestamp(3) NOT NULL,
  "createdById" text,
  CONSTRAINT "Concert_createdById_fkey" FOREIGN KEY ("createdById")
    REFERENCES "User"("lineUserId") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "Concert_status_idx" ON "Concert"("status");
CREATE INDEX "Concert_createdById_idx" ON "Concert"("createdById");

-- InstallmentPlan
CREATE TABLE "InstallmentPlan" (
  "id"           text PRIMARY KEY,
  "concertId"    text NOT NULL,
  "label"        text,
  "weeks"        integer NOT NULL,
  "downAmount"   decimal(10,2) NOT NULL,
  "weeklyAmount" decimal(10,2) NOT NULL,
  "isActive"     boolean NOT NULL DEFAULT true,
  "createdAt"    timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    timestamp(3) NOT NULL,
  CONSTRAINT "InstallmentPlan_concertId_fkey" FOREIGN KEY ("concertId")
    REFERENCES "Concert"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "InstallmentPlan_concertId_idx" ON "InstallmentPlan"("concertId");

-- Order
CREATE TABLE "Order" (
  "id"           text PRIMARY KEY,
  "lineUserId"   text NOT NULL,
  "concertId"    text NOT NULL,
  "planId"       text,
  "weeks"        integer NOT NULL,
  "downAmount"   decimal(10,2) NOT NULL,
  "weeklyAmount" decimal(10,2) NOT NULL,
  "totalAmount"  decimal(10,2) NOT NULL,
  "status"       "OrderStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt"    timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Order_lineUserId_fkey" FOREIGN KEY ("lineUserId")
    REFERENCES "User"("lineUserId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Order_concertId_fkey" FOREIGN KEY ("concertId")
    REFERENCES "Concert"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Order_planId_fkey" FOREIGN KEY ("planId")
    REFERENCES "InstallmentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "Order_lineUserId_idx" ON "Order"("lineUserId");
CREATE INDEX "Order_concertId_idx" ON "Order"("concertId");
CREATE INDEX "Order_planId_idx" ON "Order"("planId");

-- Installment
CREATE TABLE "Installment" (
  "id"         text PRIMARY KEY,
  "orderId"    text NOT NULL,
  "weekNumber" integer NOT NULL,
  "dueDate"    timestamp(3) NOT NULL,
  "amount"     decimal(10,2) NOT NULL,
  "status"     "InstallmentStatus" NOT NULL DEFAULT 'PENDING',
  "paidAt"     timestamp(3),
  "createdAt"  timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Installment_orderId_fkey" FOREIGN KEY ("orderId")
    REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Installment_orderId_idx" ON "Installment"("orderId");
