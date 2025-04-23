import { Router } from 'express'; 
import CategoryController from '../controllers/categoryController';
import UserController from '../controllers/authController'; // Assume this import
import  ProductController  from '../controllers/producController';
import { buildGroupedRoutes } from '../utils/routeBuilder';
import OrderController from '../controllers/orderController';
const router = Router();
buildGroupedRoutes(router, [
  {
    basePath: '/categories',
    routes: [
      { method: 'get', path: '/', handler: CategoryController.getAll },  
      { method: 'post', path: '/create', handler: CategoryController.create },
      { method: 'put', path: '/update/:id', handler: CategoryController.update },
      { method: 'delete', path: '/delete/:id', handler: CategoryController.delete },
      { method: 'get', path: '/:', handler: CategoryController.getById }
    ]
  },
  {
    basePath: '/login',
    routes: [
     {method : "post" , path: "/", handler: UserController.LoginAdmin}
    ]
  } ,
  {
    basePath : '/products', 
    routes : [
      {method : "get", path: "/", handler: ProductController.getAll},
      {method : "post" , path: "/create", handler: ProductController.create} , 
      {method : "put", path: "/update/:id", handler: ProductController.update},
      {method : "delete", path: "/delete/:id", handler: ProductController.delete}
    ]
  },
  {
    basePath: '/orders',
    routes: [
      { method: 'post', path: '/create', handler: OrderController.createOrder },
      { method: 'get', path: '/', handler: OrderController.getOrders },
      // { method: 'get', path: '/:id', handler: OrderController.getOrderById },
      // { method: 'put', path: '/:id/status', handler: OrderController.updateOrderStatus }
    ]
  }
]);

export default router;