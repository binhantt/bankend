import { db } from '../config/database';
export interface User {
    id: number;
    name: string;
    email: string;
    password: string;
    phone: string;
    address: string;
    role: string;
    balance: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export const createUser = async (userData: Omit<User, 'id'>) => {
    const result = await db.insertInto('users')
        .values(userData)
        .execute();
    
    // Fetch the created user
    const newUser = await db.selectFrom('users')
        .selectAll()
        .where('email', '=', userData.email)
        .executeTakeFirst();
    
    return newUser;
}