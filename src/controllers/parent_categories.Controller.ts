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
        const { name } = req.params; // Get category name from URL params
        
        const parentCategories = await db
            .selectFrom('parent_categories as pc')
            .leftJoin('categories as c', 'c.parent_id', 'pc.id')
            .leftJoin('products as p', 'p.id_categories', 'c.id')
            .where('c.name', 'like', `%${name}%`) // Filter by category name
            .select([
                'pc.id as parent_category_id',
                'pc.name as parent_category_name',
                'c.id as category_id',
                'c.name as category_name',
                'p.id as product_id',
                'p.name as product_name',
                'p.price',
                'p.main_image_url',
                'p.stock',
                'p.sku'
            ])
            .execute();

        // Group the results hierarchically
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
                        sku: row.sku
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
                    main_image_url: string;
                    stock: number;
                    sku: string;
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
  
      const products = await db
        .selectFrom('products as p')
        .leftJoin('categories as c', 'c.id', 'p.id_categories')
        .leftJoin('parent_categories as pc', 'pc.id', 'c.parent_id')
        .leftJoin('manufacturers as m', 'm.id', 'p.manufacturer_id')
        .leftJoin('product_details as pd', 'pd.product_id', 'p.id')
        .leftJoin('warranties as w', 'w.product_id', 'p.id')
        .leftJoin('product_images as pi', 'pi.product_id', 'p.id') // Thêm join với bảng product_images
        .select([
          'p.id as product_id',
          'p.name as product_name',
          'p.price',
          'p.main_image_url',
          'p.stock',
          'p.sku',
          'c.id as category_id',
          'c.name as category_name',
          'pc.id as parent_category_id',
          'pc.name as parent_category_name',
          'm.id as manufacturer_id',
          'm.name as manufacturer_name',
          'm.address as manufacturer_address',
          'm.phone as manufacturer_phone',
          sql`COALESCE(
              JSON_ARRAYAGG(
                  JSON_OBJECT(
                      'spec_name', pd.spec_name,
                      'spec_value', pd.spec_value
                  )
              ),
              JSON_ARRAY()
          )`.as('product_details'),
          sql`COALESCE(
              JSON_ARRAYAGG(
                  JSON_OBJECT(
                      'warranty_period', w.warranty_period,
                      'warranty_provider', w.warranty_provider,
                      'warranty_conditions', w.warranty_conditions
                  )
              ),
              JSON_ARRAY()
          )`.as('warranties'),
          sql`COALESCE(
              JSON_ARRAYAGG(
                  JSON_OBJECT(
                      'image_url', pi.image_url,
                      'sort_order', pi.sort_order
                  )
              ),
              JSON_ARRAY()
          )`.as('product_images') // Thêm thông tin hình ảnh
        ])
        .where('p.name', 'like', `%${name}%`)
        .groupBy([
          'p.id', 'p.name', 'p.price', 'p.main_image_url', 'p.stock', 'p.sku',
          'c.id', 'c.name', 'pc.id', 'pc.name',
          'm.id', 'm.name', 'm.address', 'm.phone'
        ])
        .execute();

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
}