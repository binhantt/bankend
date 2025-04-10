import { Router } from 'express';
import AuthController from '../controllers/authController';
import CaptchaController from '../controllers/captchaController';

const router = Router();
router.get('/generate', CaptchaController.generate);
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

export default router;