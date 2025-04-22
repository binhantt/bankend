import { Request, Response } from 'express';
import { db } from '../config/database';
import { Product, CreateProductDTO, UpdateProductDTO } from '../interfaces/product.interface';

class ProductController {
    public getAll = async (req: Request, res: Response): Promise<void> => {
        try {
            const products = await db
                .selectFrom('products')
                .selectAll()
                .execute();

            res.status(200).json({
                success: true,
                data: products
            });
        } catch (error) {
            console.error('Get products error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể lấy danh sách sản phẩm'
            });
        }
    }

    public create = async (req: Request, res: Response): Promise<void> => {
        try {
            // Destructure to remove images from product data
            const { images, ...productData } = req.body;

            if (!productData.name) {
                res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập tên sản phẩm'
                });
                return;
            }

            // Check if product already exists
            const existingProduct = await db.selectFrom('products')
                .select('id')
                .where('name', '=', productData.name)
                .executeTakeFirst();

            if (existingProduct) {
                res.status(409).json({
                    success: false,
                    message: 'Sản phẩm này đã tồn tại'
                });
                return;
            }

            const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
            const productWithTimestamps = {
                ...productData,
                created_at: timestamp,
                updated_at: timestamp
            };
            await db.transaction().execute(async (trx) => {
                const result = await trx.insertInto('products')
                    .values({
                        ...productData,
                        created_at: timestamp,
                        updated_at: timestamp
                    })
                    .executeTakeFirst();

                // Insert product images if they exist
                if (images && images.length > 0) {
                    await trx.insertInto('product_images')
                        .values(images.map((img: {image_url: string, sort_order?: number}, index: number) => ({
                            product_id: result.insertId,
                            image_url: img.image_url,
                            sort_order: img.sort_order ?? index,
                            created_at: timestamp
                        })))
                        .execute();

                    // Set first image as main image if not specified
                    if (!productData.main_image_url) {
                        await trx.updateTable('products')
                            .set({
                                main_image_url: images[0].image_url,
                                updated_at: timestamp
                            })
                            .where('id', '=', result.insertId)
                            .execute();
                    }
                }

                // Fetch the newly created product with images
                const newProduct = await trx.selectFrom('products')
                    .selectAll()
                    .where('id', '=', result.insertId)
                    .executeTakeFirst();

                const productImages = await trx.selectFrom('product_images')
                    .selectAll()
                    .where('product_id', '=', result.insertId)
                    .execute();

                res.status(201).json({
                    success: true,
                    message: 'Tạo sản phẩm thành công',
                    data: {
                        ...newProduct,
                        images: productImages
                    }
                });
            });
        } catch (error) {
            console.error('Create product error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể tạo sản phẩm'
            });
        }
    }

    public delete = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;

            // Check if product exists
            const product = await db.selectFrom('products')
                .select(['id'])
                .where('id', '=', Number(id))
                .executeTakeFirst();

            if (!product) {
                res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy sản phẩm'
                });
                return;
            }

            // Delete the product
            await db.deleteFrom('products')
                .where('id', '=', Number(id))
                .execute();

            res.status(200).json({
                success: true,
                message: 'Xóa sản phẩm thành công'
            });
        } catch (error) {
            console.error('Delete product error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể xóa sản phẩm'
            });
        }
    }

    public update = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const updateData: UpdateProductDTO = req.body;

            if (!updateData.name) {
                res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập tên sản phẩm'
                });
                return;
            }

            // Check if product exists and name is unique in one query
            const [product, existingProduct] = await Promise.all([
                db.selectFrom('products')
                    .select(['id'])
                    .where('id', '=', Number(id))
                    .executeTakeFirst(),
                db.selectFrom('products')
                    .select(['id'])
                    .where('name', '=', updateData.name)
                    .where('id', '!=', Number(id))
                    .executeTakeFirst()
            ]);

            if (!product) {
                res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy sản phẩm'
                });
                return;
            }

            if (existingProduct) {
                res.status(409).json({
                    success: false,
                    message: 'Tên sản phẩm đã tồn tại'
                });
                return;
            }

            // Update with returning clause to get updated product in one query
            const updatedProduct = await db.updateTable('products')
                .set({
                    ...updateData,
                    updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
                })
                .where('id', '=', Number(id))
                .returningAll()
                .executeTakeFirst();

            res.status(200).json({
                success: true,
                message: 'Cập nhật sản phẩm thành công',
                data: updatedProduct
            });
        } catch (error) {
            console.error('Update product error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể cập nhật sản phẩm'
            });
        }
    }
}

export default new ProductController();