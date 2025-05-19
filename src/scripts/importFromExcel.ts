import * as XLSX from 'xlsx';
import { db } from '../config/database';
import path from 'path';
import fs from 'fs';

interface ExcelCategoryRow {
  name: string;
  image?: string;
  id_categories?: number;
}

interface ExcelManufacturerRow {
  name: string;
  address?: string;
  phone?: string;
}

interface ExcelProductRow {
  name: string;
  description?: string;
  id_categories: number;
  price: number;
  is_active?: boolean;
  manufacturer_id?: number;
  main_image_url?: string;
  stock?: number;
  sku?: string;
  weight?: number;
  dimensions?: string;
  quantity?: number;
}

// Export function để có thể import từ file khác
export async function importDataFromExcel(filePath: string) {
  if (!filePath.endsWith('.xlsx') && !filePath.endsWith('.xls')) {
    throw new Error('Invalid file format. Please provide an .xlsx or .xls file');
  }

  try {
    const workbook = XLSX.readFile(filePath);
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Import Categories
    if (workbook.SheetNames.includes('Categories')) {
      const categoriesSheet = workbook.Sheets['Categories'];
      const categoriesData = XLSX.utils.sheet_to_json(categoriesSheet) as ExcelCategoryRow[];
      
      console.log(`Importing ${categoriesData.length} categories...`);
      for (const category of categoriesData) {
        try {
          await db.insertInto('categories')
            .values({
              name: category.name,
              image: category.image || null,
              id_categories: category.id_categories || null,
              created_at: timestamp,
              updated_at: timestamp
            })
            .execute();
        } catch (error) {
          console.log(`Category "${category.name}" đã tồn tại, bỏ qua...`);
        }
      }
      console.log('Categories import completed!');
    }

    // Import Manufacturers
    if (workbook.SheetNames.includes('Manufacturers')) {
      const manufacturersSheet = workbook.Sheets['Manufacturers'];
      const manufacturersData = XLSX.utils.sheet_to_json(manufacturersSheet) as ExcelManufacturerRow[];
      
      console.log(`Importing ${manufacturersData.length} manufacturers...`);
      for (const manufacturer of manufacturersData) {
        try {
          await db.insertInto('manufacturers')
            .values({
              name: manufacturer.name,
              address: manufacturer.address || null,
              phone: manufacturer.phone || null,
              created_at: timestamp,
              updated_at: timestamp
            })
            .execute();
        } catch (error) {
          console.log(`Manufacturer "${manufacturer.name}" đã tồn tại, bỏ qua...`);
        }
      }
      console.log('Manufacturers import completed!');
    }

    // Import Products
    if (workbook.SheetNames.includes('Products')) {
      const productsSheet = workbook.Sheets['Products'];
      const productsData = XLSX.utils.sheet_to_json(productsSheet) as ExcelProductRow[];
      
      console.log(`Importing ${productsData.length} products...`);
      for (const product of productsData) {
        try {
          await db.insertInto('products')
            .values({
              name: product.name,
              description: product.description || null,
              id_categories: product.id_categories,
              price: product.price,
              is_active: product.is_active !== undefined ? product.is_active : true,
              manufacturer_id: product.manufacturer_id || null,
              main_image_url: product.main_image_url || null,
              stock: product.stock || 0,
              sku: product.sku || null,
              weight: product.weight || null,
              dimensions: product.dimensions || null,
              quantity: product.quantity || 0,
              created_at: timestamp,
              updated_at: timestamp
            })
            .execute();
        } catch (error) {
          console.log(`Product "${product.name}" (SKU: ${product.sku}) đã tồn tại, bỏ qua...`);
        }
      }
      console.log('Products import completed!');
    }

    console.log('All data import completed successfully!');
  } catch (error) {
    console.error('Error during import:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

// Chỉ chạy trực tiếp khi file được gọi trực tiếp
if (require.main === module) {
  (async () => {
    const excelFilePath = process.argv[2];
    let finalPath = '';

    if (excelFilePath && fs.existsSync(excelFilePath)) {
      finalPath = path.resolve(excelFilePath);
    } else {
      const possiblePaths = [
        path.join(__dirname, 'data.xlsx'),
        path.join(process.cwd(), 'data.xlsx')
      ];

      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          finalPath = possiblePath;
          break;
        }
      }

      if (!finalPath) {
        console.error('Excel file not found. Please provide a valid path.');
        process.exit(1);
      }
    }

    console.log(`Found Excel file at: ${finalPath}`);
    await importDataFromExcel(finalPath);
  })().catch(err => {
    console.error('Error in import script:', err);
    process.exit(1);
  });
}
