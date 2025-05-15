import { Request, Response } from 'express';
import { db } from "../config/database";
import bcrypt from 'bcrypt';

interface User {
    id: number;
    email: string;
    name: string | null;
    phone: string | null;
    address: string | null;
    created_at: Date;
    updated_at: Date;
    is_active: boolean;
    role: string;
}

class UserController {
     public getAll = async (req: Request, res: Response): Promise<void> => {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const offset = (page - 1) * limit;

            const query = db
                .selectFrom('users')
                .select([
                    'id',
                    'email',
                    'name',
                    'phone',
                    'address',
                    'created_at',
                    'updated_at',
                    'is_active',
                    'role'
                ]);

            // Add filters if provided
            if (req.query.role) {
                query.where('role', '=', req.query.role as string);
            }

            const users = await query
                .offset(offset)
                .limit(limit)
                .execute();

            const totalCount = await db
                .selectFrom('users')
                .select(({ fn }) => [fn.count('id').as('total')])
                .executeTakeFirst();

            res.status(200).json({
                data: users,
                pagination: {
                    total: Number(totalCount?.total) || 0,
                    page,
                    limit,
                    totalPages: Math.ceil(Number(totalCount?.total) / limit)
                }
            });
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).json({ 
                success: false,
                message: 'Failed to fetch users',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    public getById = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const user = await db
                .selectFrom('users')
                .selectAll()
                .where('id', '=', Number(id))
                .executeTakeFirst();

            if (!user) {
                res.status(404).json({ success: false, message: 'User not found' });
                return;
            }

            res.status(200).json({ success: true, data: user });
        } catch (error) {
            console.error('Error fetching user:', error);
            res.status(500).json({ 
                success: false,
                message: 'Failed to fetch user',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    public create = async (req: Request, res: Response): Promise<void> => {
        try {
            const { email, name, phone, address, role } = req.body;
            const timestamp = new Date().toISOString();

            const result = await db
                .insertInto('users')
                .values({
                    email,
                    name,
                    phone,
                    address,
                    role: role || 'user',
                    is_active: true,
                    created_at: timestamp,
                    updated_at: timestamp
                })
                .executeTakeFirst();

            res.status(201).json({ 
                success: true,
                message: 'User created successfully',
                id: Number(result.insertId)
            });
        } catch (error) {
            console.error('Error creating user:', error);
            res.status(500).json({ 
                success: false,
                message: 'Failed to create user',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    public update = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const { name, phone, address, role, is_active } = req.body;

            await db
                .updateTable('users')
                .set({
                    name,
                    phone,
                    address,
                    role,
                    is_active,
                    updated_at: new Date().toISOString()
                })
                .where('id', '=', Number(id))
                .execute();

            res.status(200).json({ success: true, message: {
                name : name,
                phone : phone,
                address : address,
                role : role,
                is_active : is_active,
                updated_at : new Date().toISOString()
                
            } });
        } catch (error) {
            console.error('Error updating user:', error);
            res.status(500).json({ 
                success: false,
                message: 'Failed to update user',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    public delete = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            await db
                .deleteFrom('users')
                .where('id', '=', Number(id))
                .execute();

            res.status(200).json({ success: true, message: 'User deleted successfully' });
        } catch (error) {
            console.error('Error deleting user:', error);
            res.status(500).json({ 
                success: false,
                message: 'Failed to delete user',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    public changePassword = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const { currentPassword, newPassword } = req.body;

            // Get user with password (assuming password field exists in database)
            const user = await db
                .selectFrom('users')
                .select(['id', 'password'])
                .where('id', '=', Number(id))
                .executeTakeFirst();

            if (!user) {
                res.status(404).json({ success: false, message: 'User not found' });
                return;
            }

            // Verify current password (you'll need to implement password comparison logic)
            const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

            if (!isPasswordValid) {
                res.status(400).json({ 
                    success: false, 
                    message: 'Current password is incorrect' 
                });
                return;
            }

            // Hash new password before storing
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            await db
                .updateTable('users')
                .set({
                    password: hashedPassword,
                    updated_at: new Date().toISOString()
                })
                .where('id', '=', Number(id))
                .execute();

            res.status(200).json({ 
                success: true, 
                message: 'Password changed successfully' 
            });
        } catch (error) {
            console.error('Error changing password:', error);
            res.status(500).json({ 
                success: false,
                message: 'Failed to change password',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}
export default new UserController();