import { Request, Response } from 'express';
import { db } from '../config/database';


class ProductController {
    public getAll = async (req: Request, res: Response): Promise<void> => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            let limit = parseInt(req.query.limit as string) || 10;
            const offset = (page - 1) * limit;

            // Nếu limit = 0 hoặc lớn hơn 1000 thì lấy tất cả
            if (limit === 0 || limit > 1000) {
                limit = 100000; // Số đủ lớn để lấy tất cả
            }
            // Thêm filter theo category và status nếu có
            const categoryId = req.query.category_id;
            const isActive = req.query.is_active;
            
            // Get base products first
            let query = db.selectFrom('products')
                .select([
                    'products.id',
                    'products.name',
                    'products.description',
                    'products.price',
                    'products.is_active',
                    'products.main_image_url',
                    'products.stock',
                    'products.sku',
                    'products.manufacturer_id',
                    'products.weight',
                    'products.dimensions',
                    'products.created_at',
                    'products.updated_at',
                ]);

            if (categoryId) {
                query = query.where('products.category_id', '=', Number(categoryId));
            }

            if (isActive !== undefined) {
                query = query.where('products.is_active', '=', isActive === 'true');
            }

            const products = await query
                .limit(limit)
                .offset(offset)
                .execute();

            // Get related data including both category types
            const productsWithDetails = await Promise.all(products.map(async (product) => {
                // Get product-category relations
                const relations = await db.selectFrom('product_category_relations')
                    .select(['product_category_id'])
                    .where('product_id', '=', product.id)
                    .execute();

                // Get all categories (both types)
                const [images, categories, details, warranties, manufacturer] = await Promise.all([
                    db.selectFrom('product_images')
                        .selectAll()
                        .where('product_id', '=', product.id)
                        .execute(),
                    db.selectFrom('product_category_relations')
                        .innerJoin('categories', 'categories.id', 'product_category_relations.product_category_id')
                        .selectAll('categories')
                        .where('product_category_relations.product_id', '=', product.id)
                        .execute(),
                    db.selectFrom('product_details')
                        .selectAll()
                        .where('product_id', '=', product.id)
                        .execute(),
                    db.selectFrom('warranties')
                        .selectAll()
                        .where('product_id', '=', product.id)
                        .execute(),
                    db.selectFrom('manufacturers')
                        .selectAll()
                        .where('id', '=', product.manufacturer_id)
                        .executeTakeFirst() // Reverted to original to handle missing manufacturers
                ]);

                return {
                    ...product,
                    images: images || [],
                    categories: [...categories],
                    details: details || [],
                    warranties: warranties || [],
                    manufacturer: manufacturer || null
                };
            }));

            // Get total count for pagination
            const totalCountResult = await db
                .selectFrom('products')
                .select(({ fn }) => [fn.count('id').as('total')])
                .executeTakeFirst();

            const total = totalCountResult ? Number(totalCountResult.total) : 0;
            const totalPages = Math.ceil(total / limit);

            res.status(200).json({
                success: true,
                data: productsWithDetails,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems: total,
                    itemsPerPage: limit
                }
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
            const { images, details, warranties, ...productData } = req.body;

            // Validate required fields
            if (!productData.name || !productData.price || !productData.product_category_ids || productData.product_category_ids.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập đầy đủ thông tin sản phẩm (tên, giá và ít nhất một danh mục sản phẩm)'
                });
                return;
            }

            const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
            
            await db.transaction().execute(async (trx) => {
                // Create main product with all required fields
                const productResult = await trx.insertInto('products')
                    .values({
                        name: productData.name,
                        price: productData.price,
                        sku: productData.sku || null,
                        description: productData.description || null,
                        is_active: productData.is_active !== undefined ? productData.is_active : true,
                        manufacturer_id: productData.manufacturer_id || null,
                        main_image_url: productData.main_image_url || null,
                        stock: productData.stock || 0,
                        weight: productData.weight || null,
                        dimensions: productData.dimensions || null,
                        quantity: productData.quantity || 0,
                        created_at: timestamp,
                        updated_at: timestamp
                    })
                    .executeTakeFirst();

                const productId = Number(productResult.insertId);
                
                // Insert product categories and fetch their names
                const productCategories = await Promise.all(
                    productData.product_category_ids.map(async (categoryId: number) => {
                        // Check if category exists in either table
                        const category = await trx.selectFrom('categories')
                            .select(['name'])
                            .where('id', '=', categoryId)
                            .unionAll(
                                trx.selectFrom('categories')
                                    .select(['name'])
                                    .where('id', '=', categoryId)
                            )
                            .executeTakeFirst();
                        
                        if (!category) {
                            throw new Error(`Danh mục với ID ${categoryId} không tồn tại`);
                        }
                        
                        await trx.insertInto('product_category_relations')
                            .values({
                                product_id: productId,
                                product_category_id: categoryId,
                                created_at: timestamp
                            })
                            .execute();
                        
                        return {
                            id: categoryId,
                            name: category.name
                        };
                    })
                );

                res.status(201).json({
                    success: true,
                    message: 'Tạo sản phẩm thành công',
                    data: {
                        id: productId,
                        ...productData,
                        categories: productCategories,
                        images: images || [],
                        details: details || null,
                        warranties: warranties || null
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

    public getById = async (req: Request, res: Response): Promise<void> => {
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
            const { images, details, warranties, ...updateData } = req.body;

            if (!updateData.name) {
                res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập tên sản phẩm'
                });
                return;
            }

            // Check if product exists and name is unique
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

            // Update product without returning clause
            await db.updateTable('products')
                .set({
                    ...updateData,
                    weight: updateData.weight ? Number(updateData.weight) : 0, // Convert empty string to 0
                    updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
                })
                .where('id', '=', Number(id))
                .execute();

            // Handle related data updates in transaction
            await db.transaction().execute(async (trx) => {
                // Handle images update
                if (images) {
                    await trx.deleteFrom('product_images')
                        .where('product_id', '=', Number(id))
                        .execute();

                    if (Array.isArray(images) && images.length > 0 && images.every(img => img.image_url)) {
                        const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
                        await trx.insertInto('product_images')
                            .values(images.map((img: {image_url: string, sort_order?: number}, index: number) => ({
                                product_id: Number(id),
                                image_url: img.image_url,
                                sort_order: img.sort_order ?? index,
                                created_at: timestamp
                            })))
                            .execute();
                    }
                }

                // Handle details update
                if (details) {
                    await trx.deleteFrom('product_details')
                        .where('product_id', '=', Number(id))
                        .execute();

                    if (details.length > 0) {
                        const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
                        await trx.insertInto('product_details')
                            .values(details.map((detail: {spec_name: string, spec_value: string, sort_order?: number}) => ({
                                product_id: Number(id),
                                spec_name: detail.spec_name,
                                spec_value: detail.spec_value,
                                sort_order: detail.sort_order || 0,
                                created_at: timestamp,
                                updated_at: timestamp
                            })))
                            .execute();
                    }
                }

                // Handle warranties update
                if (warranties) {
                    await trx.deleteFrom('warranties')
                        .where('product_id', '=', Number(id))
                        .execute();

                    if (warranties.length > 0) {
                        const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
                        await trx.insertInto('warranties')
                            .values(warranties.map((warranty: {
                                warranty_period: string;
                                warranty_provider: string;
                                warranty_conditions: string;
                            }) => ({
                                product_id: Number(id),
                                warranty_period: warranty.warranty_period,
                                warranty_provider: warranty.warranty_provider,
                                warranty_conditions: warranty.warranty_conditions,
                                created_at: timestamp,
                                updated_at: timestamp
                            })))
                            .execute();
                    }
                }
            });

            // Fetch complete updated product data
            const [finalProduct, productImages, productDetails, productWarranties] = await Promise.all([
                db.selectFrom('products')
                    .selectAll()
                    .where('id', '=', Number(id))
                    .executeTakeFirst(),
                db.selectFrom('product_images')
                    .selectAll()
                    .where('product_id', '=', Number(id))
                    .execute(),
                db.selectFrom('product_details')
                    .selectAll()
                    .where('product_id', '=', Number(id))
                    .execute(),
                db.selectFrom('warranties')
                    .selectAll()
                    .where('product_id', '=', Number(id))
                    .execute()
            ]);

            res.status(200).json({
                success: true,
                message: 'Cập nhật sản phẩm thành công',
                data: {
                    ...finalProduct,
                    images: productImages,
                    details: productDetails,
                    warranties: productWarranties
                }
            });
        } catch (error) {
            console.error('Update product error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể cập nhật sản phẩm'
            });
        }
    }

    public searchByName = async (req: Request, res: Response): Promise<void> => {
        try {
            const { q: name, page = 1, limit = 10 } = req.query;
            const pageNum = parseInt(page as string) || 1;
            const limitNum = parseInt(limit as string) || 10;
            const offset = (pageNum - 1) * limitNum;
            
            if (!name) {
                res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập tên sản phẩm để tìm kiếm'
                });
                return;
            }

            let query = db.selectFrom('products')
                .leftJoin('categories', 'categories.id', 'products.category_id')
                .select([
                    'products.id',
                    'products.name',
                    'products.description',
                    'products.price',
                    'products.is_active',
                    'products.category_id',
                    'products.main_image_url',
                    'products.dimensions',
                    'products.created_at',
                    'products.updated_at',
                    'categories.name as category_name'
                ])
                .where('products.name', 'like', `%${name}%`)
                .limit(limitNum)
                .offset(offset);

            const products = await query.execute();

            // Get total count for pagination
            const totalCount = await db
                .selectFrom('products')
                .select(({ fn }) => [fn.count('id').as('total')])
                .where('products.name', 'like', `%${name}%`)
                .executeTakeFirst();

            const productsWithImages = await Promise.all(products.map(async (product) => {
                const images = await db
                    .selectFrom('product_images')
                    .selectAll()
                    .where('product_id', '=', product.id)
                    .execute();
                const categories = await db
                   .selectFrom('categories')
                   .selectAll()
                   .where('id', '=', product.category_id)
                   .executeTakeFirst();
                return {
                    ...product,
                    images,
                    categories,
                };
            }));

            res.status(200).json({
                success: true,
                data: productsWithImages,
                pagination: {
                    currentPage: pageNum,
                    totalPages: Math.ceil(Number(totalCount?.total || 0) / limitNum),
                    totalItems: Number(totalCount?.total || 0),
                    itemsPerPage: limitNum
                }
            });
        } catch (error) {
            console.error('Search products by name error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể tìm kiếm sản phẩm'
            });
        }
    }

    public addProductImages = async (req: Request, res: Response): Promise<void> => {
        try {
            const { product_id } = req.params;
            const { images } = req.body;

            if (!product_id || !images || !Array.isArray(images)) {
                res.status(400).json({
                    success: false,
                    message: 'Vui lòng cung cấp ID sản phẩm và danh sách hình ảnh'
                });
                return;
            }

            // Check if product exists
            const product = await db.selectFrom('products')
                .select(['id'])
                .where('id', '=', Number(product_id))
                .executeTakeFirst();

            if (!product) {
                res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy sản phẩm'
                });
                return;
            }

            // Validate image URLs
            for (const img of images) {
                if (!img.image_url || typeof img.image_url !== 'string') {
                    res.status(400).json({
                        success: false,
                        message: 'Định dạng hình ảnh không hợp lệ. Mỗi hình ảnh phải có URL'
                    });
                    return;
                }

                try {
                    const url = new URL(img.image_url);
                    // Check if URL is too long (optional since we're using TEXT)
                    if (img.image_url.length > 2083) { // 2083 is max URL length supported by IE
                        res.status(400).json({
                            success: false,
                            message: 'URL hình ảnh quá dài. Vui lòng sử dụng URL ngắn hơn'
                        });
                        return;
                    }
                } catch (e) {
                    res.status(400).json({
                        success: false,
                        message: 'URL hình ảnh không hợp lệ'
                    });
                    return;
                }
            }

            const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');

            await db.transaction().execute(async (trx) => {
                // Add new images
                await trx.insertInto('product_images')
                    .values(images.map((img: { image_url: string; sort_order?: number }, index: number) => ({
                        product_id: Number(product_id),
                        image_url: img.image_url,
                        sort_order: img.sort_order ?? index,
                        created_at: timestamp
                    })))
                    .execute();

                // Fetch updated images
                const updatedImages = await trx.selectFrom('product_images')
                    .selectAll()
                    .where('product_id', '=', Number(product_id))
                    .execute();

                res.status(200).json({
                    success: true,
                    message: 'Thêm hình ảnh thành công',
                    data: updatedImages
                });
            });
        } catch (error) {
            console.error('Add product images error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể thêm hình ảnh cho sản phẩm'
            });
        }
    }
}

export default new ProductController();
