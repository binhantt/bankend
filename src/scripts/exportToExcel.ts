import * as XLSX from 'xlsx';
import { db } from '../config/database';
import fs from 'fs';
import path from 'path';

async function exportDataToExcel() {
  try {
    // Export Categories
    const categories = await db.selectFrom('categories')
      .select([
        'id',
        'name',
        'image',
        'id_categories',
        'created_at',
        'updated_at'
      ])
      .execute();

    // Export Manufacturers
    const manufacturers = await db.selectFrom('manufacturers')
      .select([
        'id',
        'name',
        'address',
        'phone',
        'created_at',
        'updated_at'
      ])
      .execute();

    // Export Products
    const products = await db.selectFrom('products')
      .select([
        'id',
        'name',
        'description',
        'id_categories',
        'price',
        'is_active',
        'manufacturer_id',
        'main_image_url',
        'stock',
        'sku',
        'weight',
        'dimensions',
        'quantity',
        'created_at',
        'updated_at'
      ])
      .execute();

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Add Categories sheet
    if (categories.length > 0) {
      const categoriesSheet = XLSX.utils.json_to_sheet(categories);
      XLSX.utils.book_append_sheet(workbook, categoriesSheet, 'Categories');
    }

    // Add Manufacturers sheet
    if (manufacturers.length > 0) {
      const manufacturersSheet = XLSX.utils.json_to_sheet(manufacturers);
      XLSX.utils.book_append_sheet(workbook, manufacturersSheet, 'Manufacturers');
    }

    // Add Products sheet
    if (products.length > 0) {
      const productsSheet = XLSX.utils.json_to_sheet(products);
      XLSX.utils.book_append_sheet(workbook, productsSheet, 'Products');
    }

    // Create export path
    const exportPath = path.resolve('D:\\duan\\data.xlsx');
    fs.mkdirSync(path.dirname(exportPath), { recursive: true });

    // Write Excel file
    XLSX.writeFile(workbook, exportPath);
    console.log(`Data exported successfully to: ${exportPath}`);
    console.log(`Categories exported: ${categories.length}`);
    console.log(`Manufacturers exported: ${manufacturers.length}`);
    console.log(`Products exported: ${products.length}`);
  } catch (error) {
    console.error('Error during export:', error);
  } finally {
    await db.destroy();
  }
}

exportDataToExcel();
