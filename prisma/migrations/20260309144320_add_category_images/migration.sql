-- CreateTable
CREATE TABLE "CategoryImage" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "key" TEXT NOT NULL,

    CONSTRAINT "CategoryImage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CategoryImage" ADD CONSTRAINT "CategoryImage_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
