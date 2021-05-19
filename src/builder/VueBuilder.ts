import AbsBuilder from "./AbsBuilder";
import shelljs from 'shelljs'
import FELog from "../utls/FELog";
import path from 'path'

export default class VueBuilder extends AbsBuilder {
    async build(): Promise<boolean> {
        //vue-cli-service build --mode uat 
        if (shelljs.exec(`npx vue-cli-service build --mode ${this.config.build.env}`).code !== 0) {
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
        return true;
    }
}