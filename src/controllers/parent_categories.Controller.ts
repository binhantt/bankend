import { Request, Response } from 'express';
import { db } from '../config/database';
import { Kysely, sql } from 'kysely';
import { start } from 'repl';

export default class ParentCategoriesController {
  static async getAll(req: Request, res: Response) {
    try {
      const categories = await db.selectFrom('parent_categories').selectAll().execute();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch parent categories' });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const { name, isTestData } = req.body;

      if (isTestData) {
        console.log('Processing test data for parent category:', name);
      }

      const result = await db
        .insertInto('parent_categories')
        .values({ name })
        .executeTakeFirst();

      // Get the inserted ID using lastInsertId
      const insertId = result.insertId || null;

      res.status(201).json({
        success: true,
        id: insertId?.toString()
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to create parent category',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name } = req.body;

      console.log('Received update request for parent category:', { id, name });

      // Validate inputs
      if (!id || typeof name === 'undefined') {
        res.status(400).json({
          error: 'Invalid parameters',
          details: 'Both id and name are required'
        });
        return;
      }

      // Handle special characters and empty strings
      const trimmedName = name?.trim();
      if (!trimmedName) {
        res.status(400).json({
          error: 'Invalid name',
          details: 'Name cannot be empty'
        });
        return;
      }

      // Execute update query
      const result = await db
        .updateTable('parent_categories')
        .set({ name: trimmedName })
        .where('id', '=', Number(id))
        .executeTakeFirst();

      // Check if update was successful
      if (result.numUpdatedRows === null) {
        res.status(404).json({
          error: 'Not found',
          details: `No parent category found with id ${id}`
        });
        return;
      }

      // Successful response
      res.json({
        success: true,
        message: 'Parent category updated successfully',
        data: {
          id: Number(id),
          name: trimmedName
        }
      });
    } catch (error) {
      console.error('Update error:', error);
      res.status(500).json({
        error: 'Failed to update parent category',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }


  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          error: 'Invalid parameters',
          details: 'ID is required'
        });
        return;
      }

      console.log('Received delete request for parent category:', id);

      const result = await db
        .deleteFrom('parent_categories')
        .where('id', '=', Number(id))
        .executeTakeFirst();

      if (result.numDeletedRows === BigInt(0)) {
        res.status(404).json({
          error: 'Not found',
          details: `No parent category found with id ${id}`
        });
        return;
      }

      res.json({
        success: true,
        message: 'Parent category deleted successfully',
        deletedId: Number(id)
      });
    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({
        error: 'Failed to delete parent category',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const category = await db
        .selectFrom('parent_categories')
        .selectAll()
        .where('id', '=', Number(id))
        .executeTakeFirst();
      res.json(category);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch parent category' });
    }
  }
  static async Getcategroy(req: Request, res: Response): Promise<void> {
    try {
      const parentCategories = await db
        .selectFrom('parent_categories as pc')
        .leftJoin('categories as c', 'c.parent_id', 'pc.id')
        .select([
          'pc.id',
          'pc.name',
          'pc.created_at',
          'pc.updated_at',
          sql<Array<{id: string, name: string, image: string}>>`(
            SELECT JSON_ARRAYAGG(
              JSON_OBJECT(
                'id', sc.id,
                'name', sc.name,
                'image', sc.image
              )
            )
            FROM categories sc
            WHERE sc.parent_id = pc.id AND sc.id IS NOT NULL
          )`.as('categories')
        ])
        .groupBy(['pc.id', 'pc.name', 'pc.created_at', 'pc.updated_at'])
        .execute();
  
      // Process results with proper typing
      const result = parentCategories.map(pc => {
        const data: any = {
          id: pc.id,
          name: pc.name,
          created_at: pc.created_at,
          updated_at: pc.updated_at
        };
        if (pc.categories && Array.isArray(pc.categories) && pc.categories.length > 0) {
          data.categories = pc.categories;
        }
        return data;
      });
  
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch parent categories'
      });
    }
  }
  static async GetProduct(req: Request, res: Response): Promise<void> {
    try {
        const { name } = req.params;
        
        const parentCategories = await db
            .selectFrom('parent_categories as pc')
            .leftJoin('categories as c', 'c.parent_id', 'pc.id')
            .leftJoin('products as p', 'p.id_categories', 'c.id')
            .leftJoin('manufacturers as m', 'm.id', 'p.manufacturer_id') // Added manufacturer join
            .where('c.name', 'like', `%${name}%`)
            .select([
                'pc.id as parent_category_id',
                'pc.name as parent_category_name',
                'c.id as category_id',
                'c.name as category_name',
                'p.id as product_id',
                'p.name as product_name',
                'p.price',
                'p.is_active',
                'p.main_image_url',
                'p.stock',
                'p.sku',
                'p.quantity as product_quantity',
                'm.id as manufacturer_id', // Added manufacturer fields
                'm.name as manufacturer_name'
            ])
            .execute();

        // Grouping logic remains similar but can be optimized further
        const result = parentCategories.reduce((acc, row) => {
            let parentCat = acc.find(pc => pc.id === row.parent_category_id);
            
            if (!parentCat) {
                parentCat = {
                    id: row.parent_category_id,
                    name: row.parent_category_name,
                    categories: []
                };
                acc.push(parentCat);
            }
            
            if (row.category_id) {
                let category = parentCat.categories.find(c => c.id === row.category_id);
                
                if (!category) {
                    category = {
                        id: row.category_id,
                        name: row.category_name,
                        products: []
                    };
                    parentCat.categories.push(category);
                }
                
                if (row.product_id) {
                    category.products.push({
                        id: row.product_id,
                        name: row.product_name,
                        price: row.price,
                        main_image_url: row.main_image_url,
                        stock: row.stock,
                        sku: row.sku, 
                        quantity: row.product_quantity,
                        is_active: row.is_active, // This line is present but check if it's being overwritten
                        manufacturer_id: row.manufacturer_id,
                        manufacturer_name: row.manufacturer_name
                    });
                }
            }
            
            return acc;
        }, [] as Array<{
            id: number;
            name: string;
            categories: Array<{
                id: number;
                name: string;
                products: Array<{
                    id: number;
                    name: string;
                    price: number;
                    is_active: boolean;
                    main_image_url: string;
                    stock: number;
                    sku: string,
                    quantity: number;
                    manufacturer_id?: number; // Added manufacturer info
                    manufacturer_name?: string;
                }>;
            }>;
        }>);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch products by category name'
        });
    }
  }
  static async GetProductById(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;
      if (!name) {
        res.status(400).json({
          success: false,
          error: 'Product name is required'
        });
        return;
      }
  
      // First get the base product data
      const products = await db
        .selectFrom('products as p')
        .leftJoin('manufacturers as m', 'm.id', 'p.manufacturer_id')
        .leftJoin("categories as c " , 'c.id' ,'p.id_categories' )
        .select([
          'p.id as product_id',
          'p.name as product_name',
          'p.price',
          'p.main_image_url',
          'p.stock',
          'p.sku',
          // 'c.name as category_name',
          'p.description',
          'p.is_active',
          'p.quantity',
        
          'm.id as manufacturer_id',
          'm.name as manufacturer_name',
          'm.address as manufacturer_address',
          'm.phone as manufacturer_phone'
        ])
        .where('p.name', 'like', `%${name}%`)
        .execute() as ProductWithRelations[];
  
      // Then get related data separately and combine
      for (const product of products) {
        // Get product images
        const images = await db
          .selectFrom('product_images as pi')
          .select(['pi.image_url', 'pi.sort_order'])
          .where('pi.product_id', '=', product.product_id)
          .execute();
        
        // Get product details
        const details = await db
          .selectFrom('product_details as pd')
          .select(['pd.spec_name', 'pd.spec_value'])
          .where('pd.product_id', '=', product.product_id)
          .execute();
        
        // Get warranties
        const warranties = await db
          .selectFrom('warranties as w')
          .select(['w.warranty_period', 'w.warranty_provider', 'w.warranty_conditions'])
          .where('w.product_id', '=', product.product_id)
          .execute();
        
        // Add to product object
        product.product_images = images;
        product.product_details = details;
        product.warranties = warranties;
      }
  
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
  static async seackNameProduct(req: Request, res: Response): Promise<void> {
    try {
        const product = await db.selectFrom('products').selectAll().execute();
        res.status(200).json({
          success: true,
          data: product
        });
    }catch (error) {
        res.status(500).json({ error: 'Failed to fetch products' });
    }
  }
}

interface ProductWithRelations {
  product_id: any;
  product_name: any;
  price: any;
  is_active: any;
  main_image_url: any;
  stock: any;
  sku: any;
  manufacturer_id: any;
  manufacturer_name: any;
  description: any;
  quantity: any;
  manufacturer_address: any;
  manufacturer_phone: any;
  product_images: any[];
  product_details: any[];
  warranties: any[];
}
