import { Router } from 'express';
import AuthController from '../controllers/auth.Controller';
import CaptchaController from '../controllers/captcha.Controller';
import ParentCategoriesController from '../controllers/parent_categories.Controller';
import categoryController from '../controllers/category.Controller';
import productController from '../controllers/produc.Controller';
import orderController from '../controllers/order.Controller';
import productIntro from '../controllers/productIntro.Controller';

const router = Router();
router.get('/generate', CaptchaController.generate);
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.get('/verify-token', AuthController.verifyToken);
router.get('/profile', AuthController.getProfile);

router.put('/:userId/password', AuthController.changePassword);
router.put('/:userId/profile', AuthController.updateProfile);
router.get('/categroy', ParentCategoriesController.Getcategroy); 
router.get('/products', productController.getAll);
router.get('/categroy/:name', ParentCategoriesController.GetProduct) ; 
router.get('/products/:name', ParentCategoriesController.GetProductById);
// router.get('/products/:name/:id', productController.getProduct);
router.post('/order/creact', orderController.createOrder);
router.get('/:userId/orders', orderController.getOrdersByUserId);
router.delete('/orders/:id', orderController.deleteOrder);
router.get('/productIntro', productIntro.getAll);
router.get('/products/category/1', ParentCategoriesController.seackNameProduct);
export default router;