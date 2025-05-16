import { Request, Response } from 'express';
import { db } from '../config/database';

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
}