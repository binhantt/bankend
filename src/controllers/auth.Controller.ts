import { Request, Response } from 'express';
import { db } from '../config/database';
import { encryptResponse, hashPassword } from '../utils/crypto';
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
                .where('role', '=', 'admin')
                .executeTakeFirst();

            if (!user) {
                res.status(401).json({
                    success: false,
                    message: 'Email không tồn tại hoặc không phải là tài khoản admin'
                });
                return;
            }

            // Direct password comparison
            if (user.password!== password) {
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
}


export default new AuthController();