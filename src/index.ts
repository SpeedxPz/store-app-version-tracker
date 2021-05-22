import * as dotenv from 'dotenv';
import * as mongoose from 'mongoose';
import { Message } from 'node-rdkafka';
import { ApiServer } from './api-server';
import * as config from './config';
import { scheduleConsumer, schedulePollMessage, versionEventProducer, versionEventSendMessage } from './lib/kafka';
import { GetAppStoreInfo, GetPlayStoreInfo } from './lib/scraper';
import { AppInfoSchema, IAppInfo, IAppInfoMongo } from './model/AppInfo';
import { sleep } from './utils/common';
import { writeLog } from './utils/logger';


dotenv.config();


const start = async () => {
  writeLog(`Starting up as namespace: ${config.app.namespace}`);
  config.checkRequiredConfig();
  try {
    await scheduleConsumer.connect();
    await versionEventProducer.connect();
    await mongoose.connect(config.app.mongo.uri, {
      useNewUrlParser: true,
      useUnifiedTopology:true,
      useCreateIndex: true,
    });
  } catch(error) {
    writeLog(`[ERROR] Error occured while connect to store | Reason: ${error}`);
    await scheduleConsumer.disconnect();
    process.exit(1);
  }
  new ApiServer(parseInt(config.app.apis.port));
  messageExecutor();
};


const messageExecutor = async () => {
  while(true) {
    try {
      const kafkaMessage: Message[] = await schedulePollMessage();
      if(kafkaMessage.length) {
        for (const item of kafkaMessage) {
          if(item.key && item.key == config.app.namespace){
            //Parse the value as config if required
            await checkForUpdate();
          }
        }
        scheduleConsumer.commit();
      }
    } catch (error) {
      writeLog(`[WARN] Message executor error occured | reason: ${error}`);
      await sleep(1000);
    }
  }
};

const checkForUpdate = async () : Promise<any> => {
  return new Promise(async (resolve: Function , _1: Function) => {
    writeLog(`Start checking app update...`);
    const androidApps: string[] = config.app.apps.playstore.split(",");
    const iosApps: string[] = config.app.apps.appstore.split(",");

    writeLog(`Android apps: ${androidApps.length} | iOS apps: ${iosApps.length}`);
    writeLog(`Retriving information from store...`);


    const androidAppInfos: IAppInfo[] = [];
    const iosAppInfos: IAppInfo[] = [];

    for(const item of androidApps) {
      try {
        const appInfo: IAppInfo = await GetPlayStoreInfo(item);
        androidAppInfos.push(appInfo);
        await sleep(1000);
      } catch (error) {
        writeLog(`[ERROR] Error occured while get info from PlayStore | Reason: ${error}`);
      }
    }

    for(const item of iosApps) {
      try {
        const appInfo: IAppInfo = await GetAppStoreInfo(item);
        iosAppInfos.push(appInfo);
        await sleep(1000);
      } catch (error) {
        writeLog(`[ERROR] Error occured while get info from AppStore | Reason: ${error}`);
      }
    }

    writeLog(`Store retrival complated`);


    const AppInfoAndroidModel: mongoose.Model<IAppInfoMongo> = mongoose.model<IAppInfoMongo>('android', AppInfoSchema);
    const AppInfoiOSModel: mongoose.Model<IAppInfoMongo> = mongoose.model('ios', AppInfoSchema);


    const notifyApp: IAppInfo[] = [];
    for(const appInfo of androidAppInfos) {
      try {
        const dbAppInfos: IAppInfoMongo[] = await AppInfoAndroidModel.find({id: appInfo.id});
        if(dbAppInfos.length) {
          const dbAppInfo: IAppInfoMongo = dbAppInfos[0];
          if(dbAppInfo.version != appInfo.version) {
            writeLog(`Found new version of ${appInfo.id} | ${appInfo.name} | version: ${appInfo.version}`);
            notifyApp.push(appInfo);
            dbAppInfo.version = appInfo.version;
            dbAppInfo.image = appInfo.image;
            dbAppInfo.save();
          }
        } else {
          AppInfoAndroidModel.create(appInfo);
          notifyApp.push(appInfo);
        }
      } catch (error) {
        writeLog(`[ERROR] Error while updating ${appInfo.id} | Reason: ${error}`);
      }
    }

    for(const appInfo of iosAppInfos) {
      try {
        const dbAppInfos: IAppInfoMongo[] = await AppInfoiOSModel.find({id: appInfo.id});
        if(dbAppInfos.length) {
          const dbAppInfo: IAppInfoMongo = dbAppInfos[0];
          if(dbAppInfo.version != appInfo.version) {
            writeLog(`Found new version of ${appInfo.id} | ${appInfo.name} | version: ${appInfo.version}`);
            notifyApp.push(appInfo);
            dbAppInfo.version = appInfo.version;
            dbAppInfo.image = appInfo.image;
            dbAppInfo.save();
          }
        } else {
          writeLog(`Found new version of ${appInfo.id} | ${appInfo.name} | version: ${appInfo.version}`);
          AppInfoiOSModel.create(appInfo);
          notifyApp.push(appInfo);
        }
      } catch (error) {
        writeLog(`[ERROR] Error while updating ${appInfo.id} | Reason: ${error}`);
      }
    }
    writeLog(`${notifyApp.length} apps to notify`);
    for(const app of notifyApp) {
      versionEventSendMessage(
        `version-notify-${app.id}`,
        JSON.stringify(app),
      );
    }
    return resolve();
  });
}

start();
