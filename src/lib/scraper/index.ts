import * as axios from 'axios';
import { AppInfo, IAppInfo } from '../../model/AppInfo';

export const GetAppStoreInfo = async (appId: string): Promise<IAppInfo> => {
  return new Promise(async (resolve: Function, reject: Function) => {
    try {
      const resultJP = await axios.default.get(`https://itunes.apple.com/jp/lookup?id=${appId}&t=${Date.now()}`);
      const resultTH = await axios.default.get(`https://itunes.apple.com/th/lookup?id=${appId}&t=${Date.now()}`);
      const resultUS = await axios.default.get(`https://itunes.apple.com/us/lookup?id=${appId}&t=${Date.now()}`);

      let firstResult: any;

      if(resultJP.data.results.length > 0){
        firstResult = resultJP.data.results[0];
      }

      if(resultTH.data.results.length > 0){
        firstResult = resultTH.data.results[0];
      }

      if(resultUS.data.results.length > 0){
        firstResult = resultUS.data.results[0];
      }

      if(!firstResult) reject("Not found!");

      const appInfo: IAppInfo = new AppInfo({
        id: appId,
        bundleId: firstResult.bundleId,
        name: firstResult.trackName,
        image: firstResult.artworkUrl512,
        author: firstResult.artistName,
        version: firstResult.version,
        platform: 'iOS',
        createDate: Date.now(),
        updateDate: Date.now(),
      });

      return resolve(appInfo);

    } catch (err: any){
      return reject(err);
    }
  });
};

const ExtractAppInfoFromHTML = (htmlData: string) : any => {
  const result = htmlData.match(/\{\"\@context\".*\]\}\<\/script\>/g);
  if(!result) return null;
  return JSON.parse(result[0].replace("</script>",""));
}

const ExtractAppVersionFromHTML = (htmlData: string) : any => {
  const result = htmlData.match("<div[^>]*?>Current Version<\/div><span[^>]*?><div[^>]*?><span[^>]*?>(.*?)<\/span><\/div>");
  if(!result) return null;
  return result[1];
}


export const GetPlayStoreInfo = async (appId: string): Promise<IAppInfo> => {
  return new Promise(async (resolve: Function, reject: Function) => {
    try {
      const result = await axios.default.get(
        `https://play.google.com/store/apps/details?id=${appId}`,
        {
          transformResponse: (data) => data
        }
      );

      const appDetail = ExtractAppInfoFromHTML(result.data);
      const appVersion = ExtractAppVersionFromHTML(result.data);

      const appInfo: IAppInfo = new AppInfo({
        id: appId,
        bundleId: appId,
        name: appDetail.name,
        image: appDetail.image,
        author: appDetail.author.name,
        version: appVersion,
        platform: 'Android',
        createDate: Date.now(),
        updateDate: Date.now(),
      });

      return resolve(appInfo);

    } catch (err: any){
      return reject(err);
    }
  });
};