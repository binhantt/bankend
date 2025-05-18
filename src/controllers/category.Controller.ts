import { Request, Response } from 'express';
import { db } from '../config/database';
import { Kysely, sql } from 'kysely';
class CategoryController {
    public getAll = async (req: Request, res: Response): Promise<void> => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 5;
            const offset = (page - 1) * limit;

            // Get categories with their parent category data
            const categories = await db.selectFrom('categories')
                .leftJoin('parent_categories', 'categories.parent_id', 'parent_categories.id')
                .select([
                    'categories.id', 
                    'categories.name',
                    'categories.image', 
                    'categories.created_at', 
                    'categories.updated_at',
                    'parent_categories.id as parent_id',
                    'parent_categories.name as parent_name'
                ])
                .limit(limit)
                .offset(offset)
                .execute();

            // Get total count
            const totalCountResult = await db
                .selectFrom('categories')
                .select(({ fn }) => [fn.count('id').as('total')])
                .executeTakeFirst();

            const total = totalCountResult ? Number(totalCountResult.total) : 0;
            const totalPages = Math.ceil(total / limit);

            res.status(200).json({
                success: true,
                data: categories,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems: total,
                    itemsPerPage: limit
                }
            });
        } catch (error) {
            console.error('Get categories error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể lấy danh sách danh mục'
            });
        }
    }

    public create = async (req: Request, res: Response): Promise<void> => {
        try {
            const { name, image, parent_id } = req.body;
            console.log(name);
            if (!name) {
                res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập tên danh mục'
                });
                return;
            }

            // Check if category already exists
            const existingCategory = await db.selectFrom('categories')
                .select('id')
                .where('name', '=', name)
                .executeTakeFirst();
            if (existingCategory) {
                res.status(409).json({
                    success: false,
                    message: 'Danh mục này đã tồn tại'
                });
                return;
            }

            const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
            
            const result = await db.insertInto('categories')
                .values({
                    name,
                    image,
                    parent_id: parent_id || null, // Add parent_id
                    created_at: timestamp,
                    updated_at: timestamp
                })
                .executeTakeFirst();

            // Fetch the newly created category
            const newCategory = await db.selectFrom('categories')
                .select(['id', 'name', 'created_at', 'updated_at'])
                .where('id', '=', result.insertId)
                .executeTakeFirst();

            res.status(201).json({
                success: true,
                message: 'Tạo danh mục thành công',
                data: newCategory
            });
        } catch (error) {
            console.error('Create category error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể tạo danh mục'
            });
        }
    }

    public delete = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;

            // Check if category exists
            const category = await db.selectFrom('categories')
                .select(['id'])
                .where('id', '=', Number(id))
                .executeTakeFirst();

            if (!category) {
                res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy danh mục'
                });
                return;
            }

            // Delete the category
            await db.deleteFrom('categories')
                .where('id', '=', Number(id))
                .execute();

            res.status(200).json({
                success: true,
                message: 'Xóa danh mục thành công'
            });
        } catch (error) {
            console.error('Delete category error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể xóa danh mục'
            });
        }
    }

    public update = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const { name, image, parent_id } = req.body;

            if (!name) {
                res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập tên danh mục'
                });
                return;
            }

            // Check if category exists
            const category = await db.selectFrom('categories')
                .select(['id'])
                .where('id', '=', Number(id))
                .executeTakeFirst();

            if (!category) {
                res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy danh mục'
                });
                return;
            }

            // Check if new name already exists for other categories
            const existingCategory = await db.selectFrom('categories')
                .select(['id'])
                .where('name', '=', name)
                .where('id', '!=', Number(id))
                .executeTakeFirst();

            if (existingCategory) {
                res.status(409).json({
                    success: false,
                    message: 'Tên danh mục đã tồn tại'
                });
                return;
            }

            const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
            
            await db.updateTable('categories')
                .set({
                    name,
                    image,
                    parent_id: parent_id || null, // Add parent_id
                    updated_at: timestamp
                })
                .where('id', '=', Number(id))
                .execute();

            // Fetch the updated category
            const updatedCategory = await db.selectFrom('categories')
                .select(['id', 'name', 'created_at', 'updated_at'])
                .where('id', '=', Number(id))
                .executeTakeFirst();

            res.status(200).json({
                success: true,
                message: 'Cập nhật danh mục thành công',
                data: updatedCategory
            });
        } catch (error) {
            console.error('Update category error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể cập nhật danh mục'
            });
        }
    }
    public getById = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const category = await db.selectFrom('categories')
               .select(['id', 'name', 'created_at', 'updated_at'])
               .where('id', '=', Number(id))
               .executeTakeFirst(); 
            if (!category) {
                res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy danh mục'
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: category
            });
        }catch (error) {
            console.error('Get category by id error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể lấy danh mục'
            });
        }
    }

    // Thêm phương thức tìm kiếm theo tên
    public searchByName = async (req: Request, res: Response): Promise<void> => {
        try {
            const { name } = req.params;
            console.log(name);
            if (!name) {
              res.status(400).json({
                success: false,
                error: 'Product name is required'
              });
              return;
            }
        
            const products = await db
              .selectFrom('products as p')
              .leftJoin('categories as c', 'c.id', 'p.id_categories')
              .leftJoin('parent_categories as pc', 'pc.id', 'c.parent_id')
              .leftJoin('manufacturers as m', 'm.id', 'p.manufacturer_id')
              .leftJoin('product_details as pd', 'pd.product_id', 'p.id')
              .leftJoin('warranties as w', 'w.product_id', 'p.id')
              .leftJoin('product_images as pi', 'pi.product_id', 'p.id') // Thêm join với bảng product_images
              .select([
                'p.id as product_id',
                'p.name as product_name',
                'p.price',
                'p.main_image_url',
                'p.stock',
                'p.sku',
                'c.id as category_id',
                'c.name as category_name',
                'pc.id as parent_category_id',
                'pc.name as parent_category_name',
                'm.id as manufacturer_id',
                'm.name as manufacturer_name',
                'm.address as manufacturer_address',
                'm.phone as manufacturer_phone',
                sql`COALESCE(
                    JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'spec_name', pd.spec_name,
                            'spec_value', pd.spec_value
                        )
                    ),
                    JSON_ARRAY()
                )`.as('product_details'),
                sql`COALESCE(
                    JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'warranty_period', w.warranty_period,
                            'warranty_provider', w.warranty_provider,
                            'warranty_conditions', w.warranty_conditions
                        )
                    ),
                    JSON_ARRAY()
                )`.as('warranties'),
                sql`COALESCE(
                    JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'image_url', pi.image_url,
                            'sort_order', pi.sort_order
                        )
                    ),
                    JSON_ARRAY()
                )`.as('product_images') // Thêm thông tin hình ảnh
              ])
              .where('p.name', 'like', `%${name}%`)
              .groupBy([
                'p.id', 'p.name', 'p.price', 'p.main_image_url', 'p.stock', 'p.sku',
                'c.id', 'c.name', 'pc.id', 'pc.name',
                'm.id', 'm.name', 'm.address', 'm.phone'
              ])
              .execute();
      
            res.status(200).json({
              success: true,
              data: products
            });
          } catch (error) {
            console.error(error);
            res.status(500).json({
              success: false,
              error: 'Failed to search products'
            });
          }
    }
    
}

export default new CategoryController();