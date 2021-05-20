import OSS from 'ali-oss'
import FELog from './FELog';
import fs from 'fs'
export interface OSSConfig {
    accessKeyId: string;
    accessKeySecret: string;
    bucket: string;
    endpoint: string;
}
export default class OSSUtils {
    static async upload(name: string, localfile: string, config: OSSConfig) {
        const client = new OSS(config);
        try {
            FELog.log(`开始上传${localfile} 到OSS: ${name} ---> BUCKET is ${config.bucket}`);
            await this._upload(name, localfile, client);
            FELog.log('上传成功！！！');
        } catch (e) {
            FELog.error(`上传失败！！！ Error is ${e}`);
        }
    }

    private static async _upload(name: string, localfile: string, client: OSS) {
        if (fs.statSync(localfile).isDirectory()) {
            const list = fs.readdirSync(localfile);
            while (list.length) {
                const filename = list.shift();
                await this._upload(`${name}/${filename}`, `${localfile}/${filename}`, client);
            }
        } else {
            await client.put(name, localfile, { timeout: 0 });
        }
    }
}