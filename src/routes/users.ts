import { Router } from 'express';
import AuthController from '../controllers/authController';
import CaptchaController from '../controllers/captchaController';
import categoryController from '../controllers/categoryController';
import productController from '../controllers/producController';
const router = Router();
router.get('/generate', CaptchaController.generate);
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.get('/categroy', categoryController.getAll); 
router.get('/products', productController.getAll)
export default router;