import { Request, Response } from 'express';
import { db } from '../config/database';

class ManufacturersController {
    public getAll = async (req: Request, res: Response): Promise<void> => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 5;
            const offset = (page - 1) * limit;

            const manufacturers = await db.selectFrom('manufacturers')
                .select([
                    'id', 
                    'name',
                    'address', 
                    'phone',
                    'created_at', 
                    'updated_at'
                ])
                .limit(limit)
                .offset(offset)
                .execute();

            const totalCountResult = await db
                .selectFrom('manufacturers')
                .select(({ fn }) => [fn.count('id').as('total')])
                .executeTakeFirst();

            const total = totalCountResult ? Number(totalCountResult.total) : 0;
            const totalPages = Math.ceil(total / limit);

            res.status(200).json({
                success: true,
                data: manufacturers,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems: total,
                    itemsPerPage: limit
                }
            });
        } catch (error) {
            console.error('Get manufacturers error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể lấy danh sách nhà sản xuất'
            });
        }
    }

    public create = async (req: Request, res: Response): Promise<void> => {
        try {
            const { name, address, phone } = req.body;
            if (!name) {
                res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập tên nhà sản xuất'
                });
                return;
            }

            const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
            
            const result = await db.insertInto('manufacturers')
                .values({
                    name,
                    address,
                    phone,
                    created_at: timestamp,
                    updated_at: timestamp
                })
                .executeTakeFirst();

            const newManufacturer = await db.selectFrom('manufacturers')
                .select(['id', 'name', 'address', 'phone', 'created_at'])
                .where('id', '=', result.insertId)
                .executeTakeFirst();

            res.status(201).json({
                success: true,
                message: 'Tạo nhà sản xuất thành công',
                data: newManufacturer
            });
        } catch (error) {
            console.error('Create manufacturer error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể tạo nhà sản xuất'
            });
        }
    }

    public update = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const { name, address, phone } = req.body;

            if (!name) {
                res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập tên nhà sản xuất'
                });
                return;
            }

            const manufacturer = await db.selectFrom('manufacturers')
                .select(['id'])
                .where('id', '=', Number(id))
                .executeTakeFirst();

            if (!manufacturer) {
                res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy nhà sản xuất'
                });
                return;
            }

            const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
            
            await db.updateTable('manufacturers')
                .set({
                    name,
                    address,
                    phone,
                    updated_at: timestamp
                })
                .where('id', '=', Number(id))
                .execute();

            const updatedManufacturer = await db.selectFrom('manufacturers')
                .select(['id', 'name', 'address', 'phone', 'created_at', 'updated_at'])
                .where('id', '=', Number(id))
                .executeTakeFirst();

            res.status(200).json({
                success: true,
                message: 'Cập nhật nhà sản xuất thành công',
                data: updatedManufacturer
            });
        } catch (error) {
            console.error('Update manufacturer error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể cập nhật nhà sản xuất'
            });
        }
    }

    public delete = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;

            const manufacturer = await db.selectFrom('manufacturers')
                .select(['id'])
                .where('id', '=', Number(id))
                .executeTakeFirst();

            if (!manufacturer) {
                res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy nhà sản xuất'
                });
                return;
            }

            await db.deleteFrom('manufacturers')
                .where('id', '=', Number(id))
                .execute();

            res.status(200).json({
                success: true,
                message: 'Xóa nhà sản xuất thành công'
            });
        } catch (error) {
            console.error('Delete manufacturer error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể xóa nhà sản xuất'
            });
        }
    }

    public getById = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const manufacturer = await db.selectFrom('manufacturers')
               .select(['id', 'name', 'address', 'phone', 'created_at', 'updated_at'])
               .where('id', '=', Number(id))
               .executeTakeFirst(); 
            if (!manufacturer) {
                res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy nhà sản xuất'
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: manufacturer
            });
        }catch (error) {
            console.error('Get manufacturer by id error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể lấy thông tin nhà sản xuất'
            });
        }
    }
}

export default new ManufacturersController();