import koaRouter = require('koa-router')
import * as mongoose from 'mongoose';
import { AppInfo, AppInfoSchema, IAppInfo, IAppInfoMongo } from '../../../../model/AppInfo';

export const router = new koaRouter();


router.get('/', async(ctx: koaRouter.IRouterContext) => {
  const { platform } = ctx.params;
  const normalizedPlatform = platform.toLocaleLowerCase();

  if(!['android', 'ios'].includes(normalizedPlatform)) {
    ctx.throw(500, new Error("Invalid platform"));
  }

  const AppInfoAndroidModel: mongoose.Model<IAppInfoMongo> = mongoose.model<IAppInfoMongo>(normalizedPlatform, AppInfoSchema);

  const queryResults: IAppInfo[] = await AppInfoAndroidModel.find().lean();
  const results: IAppInfo[] = queryResults.map((item: IAppInfoMongo) => {
    return new AppInfo({
      id: item.id,
      bundleId: item.bundleId,
      name: item.name,
      image: item.image,
      author: item.author,
      version: item.version,
      platform: item.platform,
      createDate: item.createDate,
      updateDate: item.updateDate,
    });
  });

  return {
    results: results,
    count: results.length
  };
});


router.get('/:appId', async(ctx: koaRouter.IRouterContext) => {
  const { platform, appId } = ctx.params;
  const normalizedPlatform = platform.toLocaleLowerCase();

  if(!['android', 'ios'].includes(normalizedPlatform)) {
    ctx.throw(500, new Error("Invalid platform"));
  }

  const AppInfoAndroidModel: mongoose.Model<IAppInfoMongo> = mongoose.model<IAppInfoMongo>(normalizedPlatform, AppInfoSchema);

  const queryResult: IAppInfo = await AppInfoAndroidModel.findOne({
    id: appId
  }).lean();

  if(!queryResult) {
    ctx.throw(404, new Error(`Not found`));
  }

  const result = new AppInfo({
      id: queryResult.id,
      bundleId: queryResult.bundleId,
      name: queryResult.name,
      image: queryResult.image,
      author: queryResult.author,
      version: queryResult.version,
      platform: queryResult.platform,
      createDate: queryResult.createDate,
      updateDate: queryResult.updateDate,
  });

  return {
    result: result,
  };
});