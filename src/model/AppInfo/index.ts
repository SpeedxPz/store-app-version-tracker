
import { Document, Schema } from 'mongoose';

export const AppInfoSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true},
  bundleId: { type: String, required: true},
  name: { type: String, required: true},
  image: { type: String, required: false},
  author: { type: String, required: true},
  version: { type: String, required: true},
  createDate: { type: Number, required: true},
  updateDate: { type: Number, required: true},

});

export interface IAppInfoMongo extends Document {
  id: string;
  bundleId: string;
  name: string;
  image: string;
  author: string;
  version: string;
  platform: string;
  createDate: number;
  updateDate: number;

};

export interface IAppInfo {
  id: IAppInfoMongo['id'];
  bundleId: IAppInfoMongo['bundleId'];
  name: IAppInfoMongo['name'];
  image: IAppInfoMongo['image'];
  author: IAppInfoMongo['author'];
  version: IAppInfoMongo['version'];
  platform: IAppInfoMongo['platform'];
  createDate: IAppInfoMongo['createDate'];
  updateDate: IAppInfoMongo['updateDate'];
}

export class AppInfo implements IAppInfo  {
  id: IAppInfo['id'];
  bundleId: IAppInfo['bundleId'];
  name: IAppInfo['name'];
  image: IAppInfo['image'];
  author: IAppInfo['author'];
  version: IAppInfo['version'];
  platform: IAppInfo['platform'];
  createDate: IAppInfo['createDate'];
  updateDate: IAppInfo['updateDate'];

  constructor(appInfo: IAppInfo) {
    Object.assign(this, appInfo);
  }
}

