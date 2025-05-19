import { Request, Response } from 'express';
import { db } from '../config/database';
import { spec } from 'node:test/reporters';


class ProductController {
    public getAll = async (req: Request, res: Response): Promise<void> => {
        try {
            const products = await db
            .selectFrom('products')
            .leftJoin('categories', 'products.id_categories', 'categories.id')
            .leftJoin('manufacturers', 'products.manufacturer_id', 'manufacturers.id')
            .leftJoin('product_details', 'products.id', 'product_details.product_id')
            .leftJoin('warranties', 'products.id', 'warranties.product_id')
            .leftJoin('product_images', 'products.id', 'product_images.product_id')
            .select([
                // Product basic info
                'products.id',
                'products.name',
                'products.description',
                'products.price',
                'products.id_categories',
                'products.is_active',
                'products.main_image_url',
                'products.stock',
                'products.sku',
                'products.weight',
                'products.dimensions',
                'products.quantity',
                'products.created_at',
                'categories.name as category_name',
                'categories.id as category_id',
                'manufacturers.name as manufacturer_name',
                'manufacturers.phone as manufacturer_phone',
                'manufacturers.address as manufacturer_address',
                'product_details.spec_name as detail_title',
                'product_details.spec_name as spec_name',
                'warranties.warranty_period as warranty_period',
                'warranties.warranty_provider as warranty_provider',

                'warranties.warranty_conditions as warranty_conditions',
                'product_images.id as image_id',
                'product_images.image_url as image_url'
            ])
            .execute();
        
            // Group products with their images
            const groupedProducts = products.reduce<Record<string, any>>((acc, product) => {
                if (!acc[product.id]) {
                    acc[product.id] = {
                        id: product.id,
                        name: product.name,
                        description: product.description,
                        price: product.price,
                        id_categories: product.id_categories,
                        is_active: product.is_active,
                        main_image_url: product.main_image_url,
                        stock: product.stock,
                        sku: product.sku,
                        weight: product.weight,
                        dimensions: product.dimensions,
                        quantity: product.quantity,
                        created_at: product.created_at,
                        images: [],
                        categories: {
                            id : product.category_id,
                            name: product.category_name,
                        },
                        manufacturers: {
                            name: product.manufacturer_name,
                            phone: product.manufacturer_phone, 
                            address: product.manufacturer_address,

                        }, 
                        details: [], // Changed from object to array
                        warranty: {
                            warranty_period: product.warranty_period,
                            warranty_provider: product.warranty_provider,
                            warranty_conditions: product.warranty_conditions
                        }
                    };
                }
                
                if (product.image_id) {
                    acc[product.id].images.push({
                        url: product.image_url,
                        sort_order: acc[product.id].images.length + 1
                    });
                }
                
                if (product.spec_name) {
                    acc[product.id].details.push({
                        spec_name: product.spec_name,
                        spec_value: product.detail_title,
                        sort_order: acc[product.id].details.length + 1
                    });
                }
                
                return acc;
            }, {});

            res.status(200).json({
                success: true,
                data: Object.values(groupedProducts)
            });
        } catch (error) {
            console.error('Get all products error:', error);
            res.status(500).json({
                success: false,
                message: 'Không thể lấy danh sách sản phẩm'
            });
        }
    }

    public create = async (req: Request, res: Response): Promise<void> => {
        try {
            const { images, productDetails, warrantyData, ...productData } = req.body;
            
            // Add validation for required fields
            if (!productData.id_categories) {
                res.status(400).json({
                    success: false,
                    message: 'Category ID is required'
                });
                return;
            }
            
            const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
            
            await db.transaction().execute(async (trx) => {
                // Create main product
                const productResult = await trx.insertInto('products')
                    .values({
                        name: productData.name,
                        description: productData.description || null,
                        price: productData.price,
                    
                        id_categories: productData.id_categories,
                        is_active: productData.is_active !== undefined ? productData.is_active : 1,
                        manufacturer_id: productData.manufacturer_id || null,
                        main_image_url: productData.main_image_url || null,
                        stock: productData.stock !== undefined ? productData.stock : 0,
                        sku: productData.sku || null,
                        weight: productData.weight || null,
                        dimensions: productData.dimensions || null,
                        quantity: productData.quantity || 0,
                        created_at: timestamp,
                        updated_at: timestamp
                    })
                    .executeTakeFirst();
                
                const productId = Number(productResult.insertId);
                
                // Insert product images (using TEXT type for image_url)
                if (images && images.length > 0) {
                    // Validate each image has required url field
                    if (images.some((img: {url: string}) => !img.url)) {
                        res.status(400).json({
                            success: false,
                            message: 'Image URL is required for all product images'
                        });
                        return;
                    }
                    
                    await trx.insertInto('product_images')
                        .values(
                            images.map((image: {url: string, sort_order?: number}) => ({
                                product_id: productId,
                                image_url: image.url,
                                sort_order: image.sort_order || 0,
                                created_at: timestamp
                            }))
                        )
                        .execute();
                }
                
                // Insert product details
                if (productDetails && productDetails.length > 0) {
                    await trx.insertInto('product_details')
                        .values(
                            productDetails.map((detail: {spec_name: string, spec_value: string, sort_order?: number}) => ({
                                product_id: productId,
                                spec_name: detail.spec_name,
                                spec_value: detail.spec_value,
                                sort_order: detail.sort_order || 0,
                                created_at: timestamp,
                                updated_at: timestamp
                            }))
                        )
                        .execute();
                }
                
                // Insert warranty data if provided
                if (warrantyData) {
                    await trx.insertInto('warranties')
                        .values({
                            product_id: productId,
                            warranty_period: warrantyData.warranty_period,
                            warranty_provider: warrantyData.warranty_provider,
                            warranty_conditions: warrantyData.warranty_conditions,
                            created_at: timestamp,
                            updated_at: timestamp
                        })
                        .execute();
                }
                
                res.status(201).json({
                    success: true,
                    message: 'Tạo sản phẩm thành công',
                    data: {
                        id: productId,
                        productData :{
                            name: productData.name,
                            description: productData.description || null,
                            price: productData.price,
                            id_categories: productData.id_categories,
                            is_active: productData.is_active!== undefined? productData.is_active : 1,
                            manufacturer_id: productData.manufacturer_id || null,
                            main_image_url: productData.main_image_url || null,
                            stock: productData.stock!== undefined? productData.stock : 0,
                            sku: productData.sku || null,
                            weight: productData.weight || null,
                            dimensions: productData.dimensions || null,
                            quantity: productData.quantity || 0,    
                        },
                        images: images || [],
                        details: productDetails || [],
                        warranty: warrantyData || null
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
            const { 
                name, 
                description, 
                price, 
                is_active, 
                manufacturer_id = null, // Make manufacturer_id optional with default null
                main_image_url =null, 
                stock, 
                id_categories, 
                sku,
                weight, 
                dimensions, 
                quantity ,
                images = [],
                productDetails = [], // Changed from details
                warranties = {} // Changed from warranties
            } = req.body;

            console.log(req.body)
            await db.transaction().execute(async (trx) => {
                // Update main product info
                await trx
                    .updateTable('products')
                    .set({
                        name,
                        description,
                        manufacturer_id, // Now accepts null
                        price,
                        is_active,
                        main_image_url,
                        stock,
                        sku,
                        weight,
                        dimensions,
                        quantity,
                        id_categories,
                        updated_at: new Date()
                    })
                    .where('id', '=', id)
                    .execute();
                    
                // Update product images
                await trx.deleteFrom('product_images').where('product_id', '=', id).execute();
                if (images.length > 0) {
                    await trx
                        .insertInto('product_images')
                        .values(
                            images.map((img: { url: string; sort_order: number }) => ({
                                product_id: id,
                                image_url: img.url,
                                sort_order: img.sort_order
                            }))
                        )
                        .execute();
                }
    
                // Update product details
                await trx.deleteFrom('product_details').where('product_id', '=', id).execute();
                if (productDetails.length > 0) {
                    await trx
                        .insertInto('product_details')
                        .values(
                            productDetails.map((detail: { spec_name: string; spec_value: string; sort_order: number }) => ({
                                product_id: id,
                                spec_name: detail.spec_name,
                                spec_value: detail.spec_value,
                                sort_order: detail.sort_order
                            }))
                        )
                        .execute();
                }
    
                // Update warranties
                // await trx.deleteFrom('warranties').where('product_id', '=', id).execute();
                if (warranties && warranties.warranty_period && 
                    warranties.warranty_provider && warranties.warranty_conditions) {
                    await trx.insertInto('warranties')
                        .values({
                            product_id: id,
                            warranty_period: warranties.warranty_period,
                            warranty_provider: warranties.warranty_provider,
                            warranty_conditions: warranties.warranty_conditions,
                            created_at: new Date(),
                            updated_at: new Date()
                        })
                        .execute();
                }
            });
    
            res.status(200).json({ 
                success: true,
                data: {
                    id,
                    name,
                    description,
                    manufacturer_id,
                    price,
                    is_active,
                    main_image_url,
                    stock,
                    sku,
                    weight,
                    dimensions,
                    quantity,
                    id_categories,
                    images,
                    details: productDetails,
                    warranties: warranties ? [warranties] : []
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to update product',
                details: error instanceof Error ? error.message : String(error)
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
