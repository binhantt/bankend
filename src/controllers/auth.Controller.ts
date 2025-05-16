import { Request, Response } from 'express';
import { db } from '../config/database';
import { comparePasswords, encryptResponse, hashPassword } from '../utils/crypto';
import Token from '../services/token.Service';
import { createUser } from '../models/User';
import CaptchaService from '../services/captcha.Service';

class AuthController {
    public register = async (req: Request, res: Response): Promise<void> => {
        try {
            const { email, password, name, phone, address, captcha, captchaId } = req.body;
            console.log(req.body)
            if (!email || !password || !name || !captcha || !captchaId) {
                res.status(400).json({
                    success: false,
                    message: 'Vui lòng điền đầy đủ thông tin và mã xác thực'
                });
                return;
            }
            if (!CaptchaService.verify(captchaId, captcha)) {
                res.status(400).json({
                    success: false,
                    message: 'Mã xác thực không hợp lệ hoặc đã hết hạn'
                });
                return;
            }

            if (!email || !password || !name) {
                res.status(400).json({
                    success: false,
                    message:'Vui lòng điền đầy đủ thông tin: Email, mật khẩu và tên'
                });
                return;
            }

            const existingUser = await db.selectFrom('users')
                .select('id')
                .where('email', '=', email)
                .executeTakeFirst();

            if (existingUser) {
                res.status(409).json({
                    success: false,
                    message: 'Email này đã được đăng ký'
                });
                return;
            }

            const timestamp = new Date().toISOString();
            const hashedPassword = await hashPassword(password);
            
            const userData = {
                email,
                name,
                phone: phone || '',
                address: address || '',
                password: hashedPassword,
                role: 'user',
                balance: '0.00',
                is_active: true,
                created_at: timestamp,
                updated_at: timestamp
            }
            
            const newUser = await createUser(userData)
            
            if (!newUser) {
                throw new Error('Failed to create user')
            }

            // Generate access token
            const { token, expiresIn } = Token.create({
                userId: newUser.id,
                type: 'access'
            })

            // Generate and store refresh token
            const refreshToken = await Token.createRefreshToken({
                userId: newUser.id,
                type: 'refresh'
            })

            await db.updateTable('users')
                .set({ refresh_token: refreshToken })
                .where('id', '=', newUser.id)
                .execute()

            res.status(201).json({
                success: true,
                message: 'Registration successful',
                data: {
                    token,
                    refreshToken,
                    expiresIn: expiresIn,
                    id: newUser.id,
                    name: newUser.name,
                    email: newUser.email,
                    password : password,
                    phone: newUser.phone,
                    address: newUser.address,
                    role: newUser.role,
                    balance: newUser.balance,
                    is_active: newUser.is_active,
                    created_at: newUser.created_at,
                    updated_at: newUser.updated_at
                }
            })
        } catch (error) {
            console.error('Registration error:', error)
            res.status(500).json({
                success: false,
                message: 'Đăng ký thất bại, vui lòng thử lại sau'
            })
        }

    }
    
    public login = async (req: Request, res: Response): Promise<void> => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập email và mật khẩu'
                });
                return;
            }

            // Encrypt email for database lookup
            const hashedPassword = await hashPassword(password);
            // First find user by email only
            const query = db.selectFrom('users')
                .select([
                    'id', 
                    'email',
                    'password',
                    "name",
                    "phone",
                    "address",
                    "role",
                    "balance",  
                    'is_active',
                    'created_at',
                    'updated_at'
                ])
                .where('email', '=', email)
                .where('password', '=', hashedPassword);
            // Log the SQL query and parameters
            console.log('Compiled SQL:', query.compile().sql);
            console.log('Query Parameters:', query.compile().parameters);

            const user = await query.executeTakeFirst();

            if (!user) {
                res.status(401).json({
                    success: false,
                    message: 'Email hoặc mật khẩu không chính xác'
                });
                return;
            }

           

            // Compare password with stored hash
            // Generate access token
            const { token, expiresIn } = Token.create({
                userId: user.id,
                type: 'access'
            });

            // Generate and store refresh token
            const refreshToken = await Token.createRefreshToken({
                userId: user.id,
                type: 'refresh'
            });

            await db.updateTable('users')
                .set({ refresh_token: refreshToken })
                .where('id', '=', user.id)
                .execute();

            res.status(200).json({
                success: true,
                message: 'Đăng nhập thành công',
                data: {
                    token,
                    refreshToken,
                    expiresIn,
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        phone: user.phone,
                        address: user.address,
                    
                        balance: user.balance,
                        
                        password : hashedPassword,
                        is_active: user.is_active,
                        created_at: user.created_at,
                        updated_at: user.updated_at
                    }
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Đăng nhập thất bại, vui lòng thử lại sau'
            });
        }
    };
    public LoginAdmin = async (req: Request, res: Response): Promise<void> => {
        try {
            const { email, password } = req.body;
            // Validate input
            if (!email || !password) {
                res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập email và mật khẩu'
                });
                return;
            }

            // Find admin user by email and role
            const user = await db.selectFrom('users')
                .select([
                    'id', 
                    'email',
                    'role',
                    'password',
                    'is_active',
                    'created_at',
                    'updated_at'
                ])
                .where('email', '=', email)
                .where('role', 'in', ['admin', 'part_time']) // Changed to check for either role
                .executeTakeFirst();

            if (!user) {
                res.status(401).json({
                    success: false,
                    message: 'Email không tồn tại hoặc không phải là tài khoản  admin / nhân viên'
                });
                return;
            }
            const isPasswordValid = hashPassword(password) === user.password;
            if (!isPasswordValid) {
                res.status(401).json({
                    success: false,
                    message: 'Mật khẩu không chính xác'
                });
                return;
            }

            // Generate access token
            const { token, expiresIn } = Token.create({
                userId: user.id,
                type: 'access'
            });

            // Generate and store refresh token
            const refreshToken = await Token.createRefreshToken({
                userId: user.id,
                type: 'refresh'
            });

            await db.updateTable('users')
                .set({ refresh_token: refreshToken })
                .where('id', '=', user.id)
                .execute();

            res.status(200).json({
                success: true,
                message: 'Đăng nhập admin thành công',
                data: {
                    token,
                    refreshToken,
                    expiresIn,
                    user: {
                        id: user.id,
                    
                        email: user.email,
                        is_active: user.is_active,
                        role: user.role,
                        created_at: user.created_at,
                        updated_at: user.updated_at
                    }
                }
            });
        } catch (error) {
            console.error('Admin login error:', error);
            res.status(500).json({
                success: false,
                message: 'Đăng nhập admin thất bại, vui lòng thử lại sau'
            });
        }

    };
    public Logout = async (req: Request, res: Response): Promise<void> => {
        try {
            const { userId } = req.body;
            if (!userId) {
                res.status(400).json({
                    success: false,
                    message: 'Vui lòng cung cấp userId'
                });
                return;
            }

            // Invalidate the refresh token in the database
            await db.updateTable('users')
                .set({ refresh_token: null })
                .where('id', '=', userId)
                .execute();

            res.status(200).json({
                success: true,
                message: 'Đăng xuất thành công'
            });
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                success: false,
                message: 'Đăng xuất thất bại, vui lòng thử lại sau'
            });
        }
    }
    
    public updateProfile = async (req: Request, res: Response): Promise<void> => {
        try {
            const { userId } = req.params;
            const updateData = req.body;
            console.log('1. Profile update request:', {
                userId,
                fieldsToUpdate: Object.keys(updateData)
            });

            // Validate if there's data to update
            if (!updateData || Object.keys(updateData).length === 0) {
                console.log('2. No update data provided');
                res.status(400).json({
                    success: false,
                    message: 'Không có dữ liệu cập nhật'
                });
                return;
            }

            // Remove sensitive fields from update
            const allowedFields = ['name', 'phone', 'address', 'email'];
            console.log('updateData', allowedFields);
            const sanitizedData = Object.keys(updateData)
                .filter(key => allowedFields.includes(key))
                .reduce((obj, key) => {
                    obj[key] = updateData[key];
                    return obj;
                }, {} as any);

            console.log('3. Sanitized update data:', sanitizedData);

            if (Object.keys(sanitizedData).length === 0) {
                console.log('4. No valid fields to update');
                res.status(400).json({
                    success: false,
                    message: 'Không có trường dữ liệu hợp lệ để cập nhật'
                });
                return;
            }

            // Check if user exists
            console.log('5. Checking if user exists:', userId);
            const existingUser = await db.selectFrom('users')
                .select(['id', 'email'])
                .where('id', '=', Number(userId))
                .executeTakeFirst();

            if (!existingUser) {
                console.log('6. User not found');
                res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy người dùng'
                });
                return;
            }

            // Check if email is being updated and if it's already in use
            if (sanitizedData.email && sanitizedData.email !== existingUser.email) {
                console.log('6. Checking email uniqueness:', sanitizedData.email);
                const emailExists = await db.selectFrom('users')
                    .select('id')
                    .where('email', '=', sanitizedData.email)
                    .where('id', '!=', Number(userId))
                    .executeTakeFirst();

                if (emailExists) {
                    console.log('7. Email already in use');
                    res.status(400).json({
                        success: false,
                        message: 'Email này đã được sử dụng bởi tài khoản khác'
                    });
                    return;
                }
            }

            // Add updated_at timestamp
            sanitizedData.updated_at = new Date().toISOString();
            
            console.log('8. Updating user profile in database');
            // Update user data
            await db.updateTable('users')
                .set(sanitizedData)
                .where('id', '=', Number(userId))
                .execute();

            console.log('9. Profile updated successfully');
            
            // Fetch updated user data
            const updatedUser = await db.selectFrom('users')
                .select([
                    'id',
                    'email',
                    'name',
                    'phone',
                    'address',
                    'updated_at'
                ])
                .where('id', '=', Number(userId))
                .executeTakeFirst();

            console.log('10. Fetched updated user data');
            
            res.status(200).json({
                success: true,
                message: 'Cập nhật thông tin thành công',
                data: updatedUser
            });
            
        } catch (error: any) {
            console.error('11. Profile update error:', error);
            // Handle specific database errors
            if (error?.code === 'ER_DUP_ENTRY' && error?.sqlMessage?.includes('email')) {
                res.status(400).json({
                    success: false,
                    message: 'Email này đã được sử dụng bởi tài khoản khác'
                });
                return;
            }
            res.status(500).json({
                success: false,
                message: 'Cập nhật thông tin thất bại, vui lòng thử lại sau'
            });
        }
    }
    public getProfile = async (req: Request, res: Response): Promise<void> => {
        try {
            const { token } = req.headers;
            console.log('Received token:', token); // Log the received token
            if (!token) {
                res.status(401).json({
                    success: false,
                    message: 'Authorization token required'
                });
                return;
            }
            
            const bearerToken = token.toString().replace('Bearer ', '');
            const { userId, valid } = Token.validateRefreshToken(bearerToken);
            
            if (!valid) {
                res.status(401).json({
                    success: false,
                    message: 'Invalid token'
                });
                return;
            }
            
            const user = await db.selectFrom('users')
                .selectAll()
                .where('id', '=', userId)
                .executeTakeFirst();
                
            if (!user) {
                res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
                return;
            }
            
            res.status(200).json({
                success: true,
                data: user
            });
        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get profile'
            });
        }
    }
    public changePassword = async (req: Request, res: Response): Promise<void> => {
        try {
            const { oldPassword, newPassword, confirmPassword } = req.body;
            const { userId } = req.params;
            console.log('1. Password change request:', { 
                userId,
                oldPasswordLength: oldPassword?.length,
                newPasswordLength: newPassword?.length,
                confirmPasswordLength: confirmPassword?.length
            });
    
            if (!oldPassword || !newPassword || !confirmPassword) {
                console.log('2. Missing required fields');
                res.status(400).json({
                    success: false,
                    message: 'Vui lòng điền đầy đủ thông tin mật khẩu'
                });
                return;
            }

            if (newPassword !== confirmPassword) {
                console.log('3. Password confirmation mismatch');
                res.status(400).json({
                    success: false,
                    message: 'Mật khẩu mới và xác nhận mật khẩu không khớp'
                });
                return;
            }
    
            // Get user with password
            console.log('4. Fetching user data for ID:', userId);
            const user = await db.selectFrom('users')
                .select(['id', 'password'])
                .where('id', '=', Number(userId))
                .executeTakeFirst();
    
            if (!user) {
                console.log('5. User not found');
                res.status(404).json({
                    success: false,
                    message: 'Người dùng không tồn tại'
                });
                return;
            }
    
            // Verify current password
            console.log('6. Verifying current password');
            const isPasswordValid = await comparePasswords(oldPassword, user.password);
            console.log('7. Password verification result:', { isPasswordValid });
            
            if (!isPasswordValid) {
                console.log('8. Current password is invalid');
                res.status(400).json({
                    success: false,
                    message: 'Mật khẩu hiện tại không chính xác'
                });
                return;
            }
    
            // Hash new password
            console.log('9. Hashing new password');
            const hashedPassword = hashPassword(newPassword);
    
            // Update password
            console.log('10. Updating password in database');
            await db.updateTable('users')
                .set({
                    password: hashedPassword,
                    updated_at: new Date().toISOString()
                })
                .where('id', '=', Number(userId))
                .execute();
    
            console.log('11. Password updated successfully');
            res.status(200).json({
                success: true,
                message: 'Đổi mật khẩu thành công'
            });
        } catch (error) {
            console.error('12. Error in password change:', error);
            res.status(500).json({
                success: false,
                message: 'Đổi mật khẩu thất bại, vui lòng thử lại sau'
            });
        }
    }
    public verifyToken = async (req: Request, res: Response): Promise<void> => {
        try {
            const authHeader = req.headers['authorization'];
            console.log('1. Received Authorization header:', authHeader);
    
            if (!authHeader) {
                console.log('2. No authorization header provided');
                res.status(401).json({
                    success: false,
                    message: 'Token không được cung cấp'
                });
                return;
            }
    
            // Handle both formats: with or without 'Bearer' prefix
            const token = authHeader.startsWith('Bearer') ? 
                authHeader.replace('Bearer', '').trim() : 
                authHeader.trim();
            
            console.log('3. Extracted token:', token);

            const { userId, valid, error } = Token.validateRefreshToken(token);
            console.log('4. Token validation result:', { userId, valid, error });
            
            if (!valid || !userId) {
                console.log('5. Token validation failed:', { error });
                res.status(401).json({
                    success: false,
                    message: 'Token không hợp lệ hoặc đã hết hạn'
                });
                return;
            }

            console.log('6. Token is valid, fetching user data for userId:', userId);
            // Get user data
            const user = await db.selectFrom('users')
                .select([
                    'id',
                    'email',
                    'name',
                    'phone',
                    'address',
                    'role',
                    'balance',
                    'is_active',
                    'created_at',
                    'updated_at'
                ])
                .where('id', '=', userId)
                .executeTakeFirst();
    
            if (!user) {
                console.log('7. User not found for userId:', userId);
                res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy thông tin người dùng'
                });
                return;
            }
    
            console.log('8. User found:', { userId: user.id, email: user.email });

            // Return user data without encryption since this is for verification
            res.status(200).json({
                success: true,
                message: 'Token hợp lệ',
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        phone: user.phone,
                        address: user.address,
                        role: user.role,
                        balance: user.balance,
                        is_active: user.is_active,
                        created_at: user.created_at,
                        updated_at: user.updated_at
                    }
                }
            });
            console.log('9. Response sent successfully');
    
        } catch (error: any) {
            console.error('10. Token verification error:', error);
            res.status(500).json({
                success: false,
                message: 'Xác thực token thất bại, vui lòng thử lại sau'
            });
        }
    }
    
}


export default new AuthController();