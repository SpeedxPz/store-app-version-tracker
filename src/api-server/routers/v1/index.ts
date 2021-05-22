import koaRouter = require('koa-router')
import * as versionRouter from './version';

export const router = new koaRouter();

router.use(
  '/version/:platform',
  versionRouter.router.routes(),
  versionRouter.router.allowedMethods()
);