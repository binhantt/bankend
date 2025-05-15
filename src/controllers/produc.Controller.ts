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
                    'products.category_id',
                    'products.main_image_url',
                    'products.stock',
                    'products.sku',
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

            // Get related data for each product
            const productsWithDetails = await Promise.all(products.map(async (product) => {
                const [images, category, details, warranties] = await Promise.all([
                    db.selectFrom('product_images')
                        .selectAll()
                        .where('product_id', '=', product.id)
                        .execute(),
                    db.selectFrom('categories')
                        .selectAll()
                        .where('id', '=', product.category_id)
                        .executeTakeFirst(),
                    db.selectFrom('product_details')
                        .selectAll()
                        .where('product_id', '=', product.id)
                        .execute(),
                    db.selectFrom('warranties')
                        .selectAll()
                        .where('product_id', '=', product.id)
                        .execute()
                ]);

                return {
                    ...product,
                    images: images || [],
                    category: category || null,
                    details: details || [],
                    warranties: warranties || []
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
            if (!productData.name || !productData.price) {
                res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập đầy đủ thông tin sản phẩm (tên và giá)'
                });
                return;
            }

            // Validate and format SKU
            if (productData.sku) {
                // Check if SKU is just numbers
                if (/^\d+$/.test(productData.sku)) {
                    res.status(400).json({
                        success: false,
                        message: 'Mã SKU không thể chỉ chứa số, vui lòng thêm chữ cái'
                    });
                    return;
                }

                // Ensure SKU is in uppercase and remove spaces
                productData.sku = productData.sku.toUpperCase().replace(/\s+/g, '');
            } else {
                // Generate SKU based on product name and timestamp
                const cleanName = productData.name
                    .replace(/[^a-zA-Z0-9]/g, '') // Remove special characters
                    .substring(0, 3) // Take first 3 characters
                    .toUpperCase();
                const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
                const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
                productData.sku = `${cleanName}${timestamp}${random}`;
            }

            // Check duplicate product name and SKU
            const [existingProduct, existingSku] = await Promise.all([
                db.selectFrom('products')
                    .select('id')
                    .where('name', '=', productData.name)
                    .executeTakeFirst(),
                db.selectFrom('products')
                    .select('id')
                    .where('sku', '=', productData.sku)
                    .executeTakeFirst()
            ]);

            if (existingProduct) {
                res.status(409).json({
                    success: false,
                    message: 'Sản phẩm này đã tồn tại'
                });
                return;
            }

            if (existingSku) {
                res.status(409).json({
                    success: false,
                    message: 'Mã SKU này đã tồn tại, vui lòng sử dụng mã khác'
                });
                return;
            }

            const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
            
            await db.transaction().execute(async (trx) => {
                // Create main product
                const productResult = await trx.insertInto('products')
                    .values({
                        ...productData,
                        created_at: timestamp,
                        updated_at: timestamp
                    })
                    .executeTakeFirst();

                const productId = productResult.insertId;

                if (Array.isArray(images) && images.length > 0 && images.every(img => img.image_url)) {
                    await trx.insertInto('product_images')
                    .values(images.map((img: { image_url: string; sort_order?: number }) => ({
                        product_id: productId,
                        image_url: img.image_url,
                        sort_order: img.sort_order || 0,
                        created_at: timestamp
                    })))
                    .execute();
                }

                // Process product details if exists
                if (details?.length > 0) {
                    await trx.insertInto('product_details')
                        .values(details.map((detail: {spec_name: string, spec_value: string, sort_order?: number}) => ({
                            product_id: productId,
                            spec_name: detail.spec_name,
                            spec_value: detail.spec_value,
                            sort_order: detail.sort_order || 0,
                            created_at: timestamp,
                            updated_at: timestamp
                        })))
                        .execute();
                }

                // Process warranties if exists
                if (warranties?.length > 0) {
                    await trx.insertInto('warranties')
                        .values(warranties.map((warranty: {
                            warranty_period: string;
                            warranty_provider: string;
                            warranty_conditions: string;
                        }) => ({
                            product_id: productId,
                            warranty_period: warranty.warranty_period,
                            warranty_provider: warranty.warranty_provider,
                            warranty_conditions: warranty.warranty_conditions,
                            created_at: timestamp,
                            updated_at: timestamp
                        })))
                        .execute();
                }

                // Fetch complete product data
                const newProduct = await trx.selectFrom('products')
                    .selectAll()
                    .where('id', '=', productId)
                    .executeTakeFirst();

                const [productImages, productDetails, productWarranties] = await Promise.all([
                    trx.selectFrom('product_images')
                        .selectAll()
                        .where('product_id', '=', productId)
                        .execute(),
                    trx.selectFrom('product_details')
                        .selectAll()
                        .where('product_id', '=', productId)
                        .execute(),
                    trx.selectFrom('warranties')
                        .selectAll()
                        .where('product_id', '=', productId)
                        .execute()
                ]);

                res.status(201).json({
                    success: true,
                    message: 'Tạo sản phẩm thành công',
                    data: {
                        ...newProduct,
                        images: productImages,
                        details: productDetails,
                        warranties: productWarranties
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