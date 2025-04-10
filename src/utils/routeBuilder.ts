import { Router, RequestHandler } from 'express';

type RouteMethod = 'get' | 'post' | 'put' | 'delete';

type RouteDefinition = {
  method: RouteMethod;
  path: string;
  handler: RequestHandler;
};

type RouteGroup = {
  basePath: string;
  routes: RouteDefinition[];
};

export function buildGroupedRoutes(router: Router, groups: RouteGroup[]) {
  groups.forEach(group => {
    const subRouter = Router();

    group.routes.forEach(route => {
      subRouter[route.method](route.path, route.handler);
    });

    router.use(group.basePath, subRouter);
  });

  return router;
}
