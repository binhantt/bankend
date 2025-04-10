import { Request, Response } from 'express';
import { db } from '../config/database';

class CategoryController {
    public getAll = async (req: Request, res: Response): Promise<void> => {
        try {
            const categories = await db.selectFrom('categories')
                .select(['id', 'name', 'created_at', 'updated_at'])
                .execute();

            res.status(200).json({
                success: true,
                data: categories
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
            const { name } = req.body;
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
            
            // Insert the new category
            const result = await db.insertInto('categories')
                .values({
                    name,
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
            const { name } = req.body;

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
            
            // Update the category
            await db.updateTable('categories')
                .set({
                    name,
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
}

export default new CategoryController();