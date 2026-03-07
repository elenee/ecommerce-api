/*
  Warnings:

  - Added the required column `updatedAt` to the `Coupon` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();
-- AlterTable

ALTER TABLE "Product" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();
-- AlterTable

ALTER TABLE "Order" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();
-- AlterTable

ALTER TABLE "Coupon" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();
