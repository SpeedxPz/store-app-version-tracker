import * as dotenv from 'dotenv';
import * as mongoose from 'mongoose';
import { Message } from 'node-rdkafka';
import { ApiServer } from './api-server';
import * as config from './config';
import { scheduleConsumer, schedulePollMessage, versionEventProducer, versionEventSendMessage } from './lib/kafka';
import { GetAppStoreInfo, GetPlayStoreInfo } from './lib/scraper';
import { AppInfoSchema, IAppInfo, IAppInfoMongo } from './model/AppInfo';
import { sleep } from './utils/common';
import { LogLevel, writeLog } from './utils/logger';


dotenv.config();


const start = async () => {
  writeLog(LogLevel.INFO, 'startup', `${config.app.namespace}`);
  config.checkRequiredConfig();
  try {
    await scheduleConsumer.connect();
    await versionEventProducer.connect();
    await mongoose.connect(config.app.mongo.uri);
  } catch(error) {
    writeLog(LogLevel.ERROR, 'startup_error', `${error}`);
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
      writeLog(LogLevel.ERROR, 'consume_error', `${error}`);
      process.exit(1);
    }
  }
};

const checkForUpdate = async () : Promise<any> => {
  return new Promise(async (resolve: Function , _1: Function) => {
    writeLog(LogLevel.INFO, 'update_call', `Start checking app version...`);
    const androidApps: string[] = config.app.apps.playstore.split(",");
    const iosApps: string[] = config.app.apps.appstore.split(",");

    writeLog(LogLevel.INFO, 'update_app_total', {
      apps: {
        android: androidApps.length,
        ios: iosApps.length,
      }
    });


    const androidAppInfos: IAppInfo[] = [];
    const iosAppInfos: IAppInfo[] = [];

    for(const item of androidApps) {
      try {
        const appInfo: IAppInfo = await GetPlayStoreInfo(item);
        androidAppInfos.push(appInfo);
        await sleep(1000);
      } catch (error) {
        writeLog(LogLevel.ERROR, 'update_playstore_error',  `${error}`);
      }
    }

    for(const item of iosApps) {
      try {
        const appInfo: IAppInfo = await GetAppStoreInfo(item);
        iosAppInfos.push(appInfo);
        await sleep(1000);
      } catch (error) {
        writeLog(LogLevel.ERROR, 'update_appstore_error',  `${error}`);
      }
    }

    writeLog(LogLevel.INFO, 'update_call', `Check update success`);


    const AppInfoAndroidModel: mongoose.Model<IAppInfoMongo> = mongoose.model<IAppInfoMongo>('android', AppInfoSchema);
    const AppInfoiOSModel: mongoose.Model<IAppInfoMongo> = mongoose.model('ios', AppInfoSchema);


    const notifyApp: IAppInfo[] = [];
    for(const appInfo of androidAppInfos) {
      try {
        const dbAppInfos: IAppInfoMongo[] = await AppInfoAndroidModel.find({id: appInfo.id});
        if(dbAppInfos.length) {
          const dbAppInfo: IAppInfoMongo = dbAppInfos[0];
          if(dbAppInfo.version != appInfo.version) {
            writeLog(LogLevel.INFO, 'update_new_version', {
              app_info: {
                platform: 'android',
                id: appInfo.id,
                name: appInfo.name,
                version_from: dbAppInfo.version,
                version_to: appInfo.version,
              }
            });
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
        writeLog(LogLevel.ERROR, 'update_error',  {
          platform: 'android',
          app_info: {
            id: appInfo.id,
            name: appInfo.name,
          },
          error: error
        });
      }
    }

    for(const appInfo of iosAppInfos) {
      try {
        const dbAppInfos: IAppInfoMongo[] = await AppInfoiOSModel.find({id: appInfo.id});
        if(dbAppInfos.length) {
          const dbAppInfo: IAppInfoMongo = dbAppInfos[0];
          if(dbAppInfo.version != appInfo.version) {
            writeLog(LogLevel.INFO, 'update_new_version', {
              platform: 'ios',
              app_info: {
                id: appInfo.id,
                name: appInfo.name,
                version_from: dbAppInfo.version,
                version_to: appInfo.version,
              }
            });
            notifyApp.push(appInfo);
            dbAppInfo.version = appInfo.version;
            dbAppInfo.image = appInfo.image;
            dbAppInfo.save();
          }
        } else {
          AppInfoiOSModel.create(appInfo);
          notifyApp.push(appInfo);
        }
      } catch (error) {
        writeLog(LogLevel.ERROR, 'update_error',  {
          platform: 'ios',
          app_info: {
            id: appInfo.id,
            name: appInfo.name,
          },
          error: error
        });
      }
    }
    writeLog(LogLevel.INFO, 'update_call', `${notifyApp.length} apps to notify`);
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
