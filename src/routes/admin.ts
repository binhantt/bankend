import { Router } from 'express'; 
import CategroyController from '../controllers/categoryController';
import { buildGroupedRoutes } from '../utils/routeBuilder';

const router = Router();
 buildGroupedRoutes(router, [
 {
  basePath: '/categories',
  routes: [
   { method: 'get',path: '/',handler: CategroyController.getAll},  
   { method: 'post',path: '/create',handler: CategroyController.create },
   { method: 'put',path: '/update/:id',handler: CategroyController.update },
   { method: 'delete',path: 'delete/:id',handler: CategroyController.delete },
  ]
 } 
 ])

export default router;