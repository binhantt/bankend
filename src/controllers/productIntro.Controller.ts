import { Request, Response } from 'express';
import { db } from '../config/database';

class ProductIntroController {
    public getAll = async (req: Request, res: Response): Promise<void> => {
        try {
            const page = Math.max(1, Number(req.query.page) || 1);
            const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
            const offset = (page - 1) * limit;

            // Get total count
            const { count } = await db.selectFrom('product_intros')
                .select(eb => eb.fn.countAll().as('count'))
                .executeTakeFirstOrThrow();

            // Get paginated data
            const data = await db.selectFrom('product_intros')
                .selectAll()
                .orderBy('id')
                .offset(offset)
                .limit(limit)
                .execute();

            res.status(200).json({
                success: true,
                data: {
                    items: data,
                    pagination: {
                        total: Number(count),
                        page,
                        limit,
                        totalPages: Math.ceil(Number(count) / limit)
                    }
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Lỗi khi lấy danh sách giới thiệu sản phẩm'
            });
        }
    }

    public create = async (req: Request, res: Response): Promise<void> => {
        try {
            const { image_url, title, subtitle, button1_text, button1_link, button2_text, button2_link } = req.body;

            if (!image_url || !title) {
                res.status(400).json({
                    success: false,
                    message: 'Thiếu thông tin bắt buộc (image_url và title)'
                });
                return;
            }

            const result = await db.insertInto('product_intros')
                .values({
                    image_url,
                    title,
                    subtitle,
                    button1_text,
                    button1_link,
                    button2_text,
                    button2_link
                })
                .executeTakeFirst();

            res.status(201).json({
                success: true,
                message: 'Tạo mới thành công',
                data: {
                    id: Number(result.insertId), 
                    image_url,
                    title,
                    subtitle,
                    button1_text,
                    button1_link,
                    button2_text,
                    button2_link
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Lỗi khi tạo mới giới thiệu sản phẩm'
            });
        }
    }

    public update = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const { image_url, title, subtitle, button1_text, button1_link, button2_text, button2_link } = req.body;

            await db.updateTable('product_intros')
                .set({
                    image_url :image_url,
                    title,
                    subtitle,
                    button1_text,
                    button1_link,
                    button2_text,
                    button2_link
                })
                .where('id', '=', Number(id))
                .execute();

            res.status(200).json({
                success: true,
                message: 'Cập nhật thành công'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Lỗi khi cập nhật giới thiệu sản phẩm'
            });
        }
    }

    public delete = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;

            await db.deleteFrom('product_intros')
                .where('id', '=', Number(id))
                .execute();

            res.status(200).json({
                success: true,
                message: 'Xóa thành công'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Lỗi khi xóa giới thiệu sản phẩm'
            });
        }
    }
}

export default new ProductIntroController();