import { Router } from 'express'; 
import CategoryController from '../controllers/categoryController';
import Auth from '../controllers/authController'; // Assume this import
import  ProductController  from '../controllers/producController';
import { buildGroupedRoutes } from '../utils/routeBuilder';
import OrderController from '../controllers/orderController';
import UserController from '../controllers/UserController'; // Import the UserController module from the correct path
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
     {method : "post" , path: "/", handler: Auth.LoginAdmin}
    ]
  } ,
  {
    basePath: '/logout',
    routes: [
      {method : "post", path: "/", handler: Auth.Logout}
    ] ,
  },
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
  },
  {
    basePath: '/users',
    routes: [
      { method: 'get', path: '/', handler: UserController.getAll },
      { method: 'post', path: '/create', handler: UserController.create},
      { method: 'delete', path: 'delete/:id', handler: UserController.delete },
      { method: 'put', path: '/:id', handler: UserController.update  },
    ]
  }
]);

export default router;