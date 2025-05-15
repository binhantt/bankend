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
      const { name } = req.body;
      const result = await db
        .insertInto('parent_categories')
        .values({ name })
        .executeTakeFirst();
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create parent category' });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name } = req.body;
      const result = await db
        .updateTable('parent_categories')
        .set({ name })
        .where('id', '=', Number(id))
        .executeTakeFirst();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update parent category' });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await db
        .deleteFrom('parent_categories')
        .where('id', '=', Number(id))
        .executeTakeFirst();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete parent category' });
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