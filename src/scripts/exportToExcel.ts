import * as XLSX from 'xlsx';
import { db } from '../config/database';
import fs from 'fs';
import path from 'path';

async function exportProductsToExcel() {
  try {
    // Get all products with their categories
    const products = await db.selectFrom('products')
      .leftJoin(
        'product_category_relations as pcr',
        'pcr.product_id',
        'products.id'
      )
      .leftJoin(
        'categories',
        'categories.id',
        'pcr.product_category_id'
      )
      .select([
        'products.id',
        'products.name',
        'products.price',
        'products.sku',
        'products.description',
        'products.stock',
        'products.quantity',
        'products.manufacturer_id',
        'products.created_at',
        'products.updated_at',
        'categories.id as category_id',
        'categories.name as category_name'
      ])
      .execute();

    // Group products with their categories
    const productMap = new Map<number, any>();
    
    products.forEach(product => {
      if (!productMap.has(product.id)) {
        productMap.set(product.id, {
          ...product,
          categories: [],
          product_category_ids: [],
          category_names: []
        });
      }
      
      const currentProduct = productMap.get(product.id);
      
      if (product.category_id) {
        currentProduct.categories.push({
          id: product.category_id,
          name: product.category_name
        });
        currentProduct.product_category_ids.push(product.category_id);
        currentProduct.category_names.push(product.category_name);
      }
    });

    const formattedProducts = Array.from(productMap.values());

    if (!formattedProducts.length) {
      console.log('Không có sản phẩm nào để xuất.');
      return;
    }

    // Use formattedProducts for the Excel export
    const worksheet = XLSX.utils.json_to_sheet(formattedProducts);

    // Tạo workbook và thêm worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

    // Tạo đường dẫn lưu file
    const exportPath = path.resolve(__dirname, 'D:\\duan\\products.xlsx');
    fs.mkdirSync(path.dirname(exportPath), { recursive: true });

    // Ghi file Excel
    XLSX.writeFile(workbook, exportPath);
    console.log(`Đã xuất Excel thành công tại: ${exportPath}`);
  } catch (error) {
    console.error('Lỗi khi xuất Excel:', error);
  } finally {
    await db.destroy();
  }
}

exportProductsToExcel();
