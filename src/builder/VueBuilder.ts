import AbsBuilder from "./AbsBuilder";
import shelljs from 'shelljs'
import FELog from "../utls/FELog";
import path from 'path'
import OSSUtils from "../utls/OSSUtils";
import HttpClient from "../utls/HttpClient";

export default class VueBuilder extends AbsBuilder {
    outputPath: string | null = null;
    async build(): Promise<boolean> {
        //npx vue-cli-service build --mode uat 
        const { env, isPrdEnv } = this.config.build
        const modeStr = isPrdEnv ? '' : `--mode ${env}`
        if (shelljs.exec(`yarn build ${modeStr}`).code !== 0) {
            FELog.error('打包失败')
            return false;
        }

        const from = path.resolve(this.config.build.projectRootDir, './dist');
        const to = path.resolve(this.config.build.dist, this.outputFilePrefix())
        FELog.log(`将打包结果拷贝到目标位置： cp from ${from} to ${to}`)
        const rt = shelljs.cp("-r", from, to).code === 0;
        if (!rt) {
            FELog.error('将打包结果拷贝到目标目录失败')
            return false;
        }

        FELog.log('BUILD VUE SUCCEED  打包结束')
        this.outputPath = to;
        return true;
    }

    async upload() {
        const ossFileName = `${this.outputFilePrefix()}`;
        if (this.config.output?.oss && this.outputPath) {
            await OSSUtils.upload(`${this.config.output.oss.ossKeyPrefix}/${ossFileName}`, this.outputPath, this.config.output.oss);
            await HttpClient.submitAppRecord(this.config, this.outputPath, ossFileName);
        }
    }
}