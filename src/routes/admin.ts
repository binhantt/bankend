import { Router } from 'express';
import CategoryController from '../controllers/category.Controller';
import Auth from '../controllers/auth.Controller';
import ProductController from '../controllers/produc.Controller';
import { buildGroupedRoutes } from '../utils/routeBuilder';
import OrderController from '../controllers/order.Controller';
import UserController from '../controllers/User.Controller';
import ProductIntroController from '../controllers/productIntro.Controller';
import ParentCategoriesController from '../controllers/parent_categories.Controller';
import ManufacturersController from '../controllers/manufacturers.Controllers';

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
      { method: 'put', path: '/update/:id', handler: OrderController.updateOrder }
    ]
  },
  {
    basePath: '/users',
    routes: [
      { method: 'get', path: '/', handler: UserController.getAll },
      { method: 'post', path: '/create', handler: UserController.create},
      { method: 'delete', path: '/delete/:id', handler: UserController.delete },
      { method: 'put', path: '/update/:id', handler: UserController.update  },
    ]
  },
  {
    basePath: '/product-intros',
    routes: [
      { method: 'get', path: '/', handler: ProductIntroController.getAll },
      { method: 'post', path: '/create', handler: ProductIntroController.create },
      { method: 'put', path: '/update/:id', handler: ProductIntroController.update },
      { method: 'delete', path: '/delete/:id', handler: ProductIntroController.delete }
    ]
  },
  {
    basePath: '/parent-categories',
    routes: [
      { method: 'get', path: '/', handler: ParentCategoriesController.getAll },
      { method: 'post', path: '/create', handler: ParentCategoriesController.create },
      { method: 'put', path: '/update/:id', handler: ParentCategoriesController.update },
      { method: 'delete', path: '/delete/:id', handler: ParentCategoriesController.delete },
      { method: 'get', path: '/:id', handler: ParentCategoriesController.getById }
    ]
  },
  {
    basePath: '/manufacturers',
    routes: [
      { method: 'get', path: '/', handler: ManufacturersController.getAll },
      { method: 'post', path: '/create', handler: ManufacturersController.create },
      { method: 'put', path: '/update/:id', handler: ManufacturersController.update },
      { method: 'delete', path: '/delete/:id', handler: ManufacturersController.delete },
      { method: 'get', path: '/:id', handler: ManufacturersController.getById }
    ]
  }
]);

export default router;