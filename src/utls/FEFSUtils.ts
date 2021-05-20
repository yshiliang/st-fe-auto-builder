import fs from 'fs'
import path from 'path'
import shelljs from 'shelljs'
import FELog from './FELog';


const isString = (data: any) => {
    return data && Object.prototype.toString.call(data) === '[object String]';
}

export default class FEFSUtils {
    /**
     * 判断特定文件是否存在于指定目录下，若存在，则返回此全目录路径，仅检查两级目录
     * @param dir 
     * @param filename 
     * @returns 
     */
    static hasFile(dir: string, filename: string | RegExp) {
        if (!dir || !filename || !fs.statSync(dir).isDirectory()) {
            return null
        }

        console.log('in dir :', dir);
        if (isString(filename) && fs.existsSync(path.resolve(dir, filename as string))) return dir;

        let targetDir: string | null = null;
        fs.readdirSync(dir).forEach(name => {
            console.log('filename :', name);
            if (filename instanceof RegExp && filename.test(name)) {
                targetDir = dir;
            }



            const p = path.resolve(dir, name);


            if (!fs.statSync(p).isDirectory()) {
                return;
            }

            if ((isString(filename) && fs.existsSync(path.resolve(p, filename as string))) ||
                (filename instanceof RegExp && filename.test(name))) {
                targetDir = p;
            }
        })

        console.log('found target dir :', targetDir);
        return targetDir;
    }

    static exchangeRNEnvironmentConfig(projectRootDir: string, env: string, channel?: string): boolean {
        //配置打包环境，即根据【env】重写env.js的内容
        const envDir = path.resolve(projectRootDir, 'env');
        const evnJs = path.resolve(envDir, 'env.js');
        const envTargetJs = path.resolve(envDir, `env.${env}.js`)

        if (!fs.existsSync(envTargetJs)) {
            FELog.error(`打包环境【${env}】不存在，请先检查【[PRO_ROOT_DIR]/env】目录！`);
            return false;
        }

        //切换打包环境
        fs.copyFileSync(envTargetJs, evnJs);

        //配置打包渠道
        if (channel) {
            shelljs.sed('-i', /channel:.*,/, `channel: '${channel}',`, evnJs);
        }

        return true;
    }

    static findFilenameWithExtension(dir: string, ext: string) {
        if (!dir || !ext || !fs.statSync(dir).isDirectory()) {
            return null;
        }

        let name: string | null = null;
        console.log('dir :', dir);
        fs.readdirSync(dir).forEach(filename => {
            console.log('filename :', name);
            const arr = filename.split('.');
            if (arr.length > 1 && arr.pop() === ext) {
                name = arr.join('.');
            }
        })

        return name;
    }

    static sizeOfFile(filePath: string) {
        return fs.statSync(filePath).size;
    }

    static md5OfFile(filePath: string) {
        return shelljs.exec(`MD5 ${filePath} | awk '{print $4}'`).stdout.trim();
    }
}