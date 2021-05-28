import fs from 'fs'
import path from 'path'
import shelljs from 'shelljs'
import FELog from './FELog';


const isString = (data: any) => {
    return data && Object.prototype.toString.call(data) === '[object String]';
}

export default class FEFSUtils {
    /**
     * 判断特定文件是否存在于指定目录/二级子目录下，若存在，则返回目录路径，仅检查两级目录
     * 默认忽略隐藏目录
     * @param dir 
     * @param filename 
     * @returns 
     */
    static hasFile(dir: string, filename: string | RegExp, deep: number = 2): string | null {
        if (deep < 1 || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
            return null
        }

        console.log(`SEARCH ${filename} in dir :`, dir);
        if (isString(filename) && fs.existsSync(path.resolve(dir, filename as string))) return dir;

        let targetDir: string | null = null;
        const fileList = fs.readdirSync(dir);
        const subDirList: string[] = [];
        while (!targetDir && fileList.length > 0) {
            const name = fileList.shift();
            if (name && !name.startsWith('.')) {
                console.log('filename :', name);
                if (filename instanceof RegExp && filename.test(name)) {
                    targetDir = dir;
                    break;
                }

                //下一级目录
                const subDir = path.resolve(dir, name);
                if (fs.statSync(subDir).isDirectory()) {
                    subDirList.push(subDir);
                }
            }
        }

        while (!targetDir && subDirList.length > 0) {
            const subDir = subDirList.shift();
            if (subDir) {
                targetDir = this.hasFile(subDir, filename, deep - 1);
            }
        }

        FELog.log(`Found target dir :${targetDir}`);
        return targetDir;
    }

    static exchangeRNEnvironmentConfig(projectRootDir: string, env: string, channel?: string): boolean {
        //配置打包环境，即根据【env】重写env.js的内容
        const envDir = path.resolve(projectRootDir, 'env');
        const evnJs = path.resolve(envDir, 'env.js');
        const envTargetJs = path.resolve(envDir, `env.${env}.js`);

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
        if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
            return null;
        }

        let name: string | null = null;
        console.log(`SEARCH [${ext}] in dir :`, dir);
        const fileList = fs.readdirSync(dir);
        while (!name && fileList.length > 0) {
            const filename = fileList.shift();
            console.log('filename :', filename);
            if (filename) {
                const arr = filename.split('.');
                if (arr.length > 1 && arr.pop() === ext) {
                    name = arr.join('.');
                    name && FELog.log(`Found target file :${filename}`);
                }
            }
        }

        return name;
    }

    static sizeOfFile(filePath: string) {
        return fs.statSync(filePath).size;
    }

    static md5OfFile(filePath: string) {
        return shelljs.exec(`MD5 ${filePath} | awk '{print $4}'`).stdout.trim();
    }
}