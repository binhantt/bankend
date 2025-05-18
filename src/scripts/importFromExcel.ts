import * as XLSX from 'xlsx';
import { db } from '../config/database';
import path from 'path';
import fs from 'fs';

interface ExcelProductRow {
  name: string;
  price: number;
  product_category_ids: number | number[];
  sku?: string;
  description?: string;
  is_active?: boolean;
  manufacturer_id?: number | null;
  main_image_url?: string | null;
  stock?: number;
  weight?: number | null;
  dimensions?: string | null;
  quantity?: number;
}

async function importProductsFromExcel(filePath: string) {
  if (!filePath.endsWith('.xlsx') && !filePath.endsWith('.xls')) {
    throw new Error('Invalid file format. Please provide an .xlsx or .xls file');
  }
  try {
    // Đọc file Excel
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Chuyển đổi thành JSON
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    console.log(`Bắt đầu import ${data.length} sản phẩm`);
    let successCount = 0;
    let errorCount = 0;
        await db.transaction().execute(async (trx) => {
      // Fix 1: Type the data array explicitly
      const typedData = data as ExcelProductRow[];
      
      // Fix 2: Use Promise.all for parallel async operations
      await Promise.all(typedData.map(async (row, index) => {
        try {
          if (!row.name || !row.price || !row.product_category_ids) {
            throw new Error(`Missing required fields for product at row ${index + 1}. Required: name, price, product_category_ids`);
          }
          
          // Tạo sản phẩm
          const productResult = await trx.insertInto('products')
            .values({
              name: row.name,
              price: row.price,
              sku: row.sku || null,
              description: row.description || null,
              is_active: row.is_active !== undefined ? row.is_active : true,
              manufacturer_id: row.manufacturer_id || null,
              main_image_url: row.main_image_url || null,
              stock: row.stock || 0,
              weight: row.weight || null,
              dimensions: row.dimensions || null,
              quantity: row.quantity || 0,
              created_at: timestamp,
              updated_at: timestamp
            })
            .executeTakeFirst();
          
          const productId = Number(productResult.insertId);
          
          // Xử lý danh mục sản phẩm
          const categoryIds = Array.isArray(row.product_category_ids) 
            ? row.product_category_ids 
            : [row.product_category_ids];
          
          await Promise.all(categoryIds.map(categoryId => 
            trx.insertInto('product_category_relations')
              .values({
                product_id: productId,
                product_category_id: categoryId,
                created_at: timestamp
              })
              .execute()
          ));
          
          console.log(`Đã tạo sản phẩm ${row.name} thành công`);
          successCount++;
          console.log(`(${index+1}/${data.length}) Đã xử lý sản phẩm ${row.name}`);
        } catch (error) {
          errorCount++;
          console.error(`Lỗi khi xử lý sản phẩm ${row.name}:`, error);
        }
      }));
    });
    
    console.log(`Kết thúc import: ${successCount} thành công, ${errorCount} lỗi`);
    console.log('Import từ Excel thành công!');
  } catch (error) {
    console.error('Lỗi khi import từ Excel:', error);
  } finally {
    await db.destroy();
  }
}

// Sử dụng: node dist/scripts/importFromExcel.js path/to/excel/file.xlsx
// Wrap the execution in an async function
(async () => {
    const excelFilePath = process.argv[2];
    let finalPath = '';
  
    if (excelFilePath && fs.existsSync(excelFilePath)) {
      finalPath = path.resolve(excelFilePath);
    } else {
      const possiblePaths = [
        path.join(__dirname, 'products.xlsx'),
        path.join('D:\\duan\\products.xlsx'),
        path.join(process.cwd(), 'products.xlsx')
      ];
  
      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          finalPath = possiblePath;
          break;
        }
      }
  
      if (!finalPath) {
        console.error('Không tìm thấy file Excel. Vui lòng kiểm tra đường dẫn.');
        process.exit(1);
      }
    }
  
    console.log(`Found Excel file at: ${finalPath}`);
    await importProductsFromExcel(finalPath);
  })().catch(err => {
    console.error('Error in import script:', err);
    process.exit(1);
  });
