import { Request, Response } from 'express';
import { db } from '../config/database';

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
            const { name } = req.query;
            if (!name) {
                res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập tên danh mục để tìm kiếm'
                });
                return;
            }

            // First find matching categories
            const categories = await db.selectFrom('categories')
                .select(['id', 'name'])
                .where('name', 'like', `%${name}%`)
                .execute();

            if (categories.length === 0) {
                res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy danh mục với tên đã cho'
                });
                return;
            }

            // Then get products for each category
            const productsByCategory = await Promise.all(
                categories.map(async (category) => {
                    const products = await db.selectFrom('products')
                        .select(['id', 'name', 'price', 'main_image_url'])
                        .where('category_id', '=', category.id)
                        .execute();
                    return {
                        category,
                        products
                    };
                })
            );

            res.status(200).json({
                success: true,
                data: productsByCategory
            });
        } catch (error) {
            console.error('Search categories by name error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể tìm kiếm danh mục theo tên'
            });
        }
    }
    
}

export default new CategoryController();