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

            const productsWithImages = await Promise.all(products.map(async (product) => {
                const images = await db
                    .selectFrom('product_images')
                    .selectAll()
                    .where('product_id', '=', product.id)
                    .execute();
                return {
                    ...product,
                    images
                };
            }));

            res.status(200).json({
                success: true,
                data: productsWithImages
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
            const { images, ...updateData } = req.body;
            const updateProductData: UpdateProductDTO = updateData;

            if (!updateProductData.name) {
                res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập tên sản phẩm'
                });
                return;
            }

            await db.transaction().execute(async (trx) => {
                // Kiểm tra nếu sản phẩm tồn tại
                const product = await trx.selectFrom('products')
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

                // Kiểm tra nếu tên sản phẩm đã tồn tại cho các sản phẩm khác
                const existingProduct = await trx.selectFrom('products')
                    .select(['id'])
                    .where('name', '=', updateProductData.name)
                    .where('id', '!=', Number(id))
                    .executeTakeFirst();

                if (existingProduct) {
                    res.status(409).json({
                        success: false,
                        message: 'Tên sản phẩm đã tồn tại'
                    });
                    return;
                }

                // Cập nhật thời gian cập nhật
                const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
                const updatedData = {
                    ...updateProductData,
                    updated_at: timestamp
                };

                // Cập nhật sản phẩm
                await trx.updateTable('products')
                    .set(updatedData)
                    .where('id', '=', Number(id))
                    .execute();

                // Lấy lại sản phẩm sau khi cập nhật
                const updatedProduct = await trx.selectFrom('products')
                    .selectAll()
                    .where('id', '=', Number(id))
                    .executeTakeFirst();

                // Cập nhật hình ảnh nếu có
                if (images) {
                    // Xóa các hình ảnh cũ của sản phẩm
                    await trx.deleteFrom('product_images')
                        .where('product_id', '=', Number(id))
                        .execute();

                    // Thêm các hình ảnh mới
                    await trx.insertInto('product_images')
                        .values(images.map((img: {image_url: string, sort_order?: number}, index: number) => ({
                            product_id: Number(id),
                            image_url: img.image_url,
                            sort_order: img.sort_order ?? index,
                            created_at: timestamp
                        })))
                        .execute();

                    // Cập nhật main_image_url nếu cần
                    if (images.length > 0 && !updateProductData.main_image_url) {
                        await trx.updateTable('products')
                            .set({
                                main_image_url: images[0].image_url,
                                updated_at: timestamp
                            })
                            .where('id', '=', Number(id))
                            .execute();
                    }
                }

                // Lấy lại sản phẩm sau khi cập nhật cùng với hình ảnh
                const finalProduct = await trx.selectFrom('products')
                    .selectAll()
                    .where('id', '=', Number(id))
                    .executeTakeFirst();

                const finalImages = await trx.selectFrom('product_images')
                    .selectAll()
                    .where('product_id', '=', Number(id))
                    .execute();

                res.status(200).json({
                    success: true,
                    message: 'Cập nhật sản phẩm thành công',
                    data: {
                        ...updatedProduct,
                        images: finalImages
                    }
                });
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