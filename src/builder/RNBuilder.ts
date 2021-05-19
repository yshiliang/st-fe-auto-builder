import AbsBuilder from "./AbsBuilder";
import shelljs from 'shelljs'
import fs from 'fs'
import FELog from "../utls/FELog";
import FEShell from "../utls/FEShell";

export default class RNBuilder extends AbsBuilder {
    async build(): Promise<boolean> {
        //创建bundle目录，统一管理打包文件
        const bundleDir = `${this.config.build.dist}/${this.outputFilePrefix()}`
        const iosDir = `${bundleDir}/ios`
        const androidDir = `${bundleDir}/android`

        fs.mkdirSync(androidDir, { recursive: true })
        const channel = this.config.build.channel;
        if (!channel) { //rn-ios 暂不打渠道包
            fs.mkdirSync(iosDir, { recursive: true })
        }

        const buildRNIosShell = `
        npx react-native bundle --entry-file "${this.config.build.projectRootDir}/index.js" \
        --dev false \
        --bundle-output "${iosDir}/index.ios.jsbundle" \
        --assets-dest "${iosDir}" \
        --platform "ios" 
        `
        const buildRNAndroidShell = `
        npx react-native bundle --entry-file "${this.config.build.projectRootDir}/index.js" \
        --dev false \
        --bundle-output "${androidDir}/index.android.jsbundle" \
        --assets-dest "${androidDir}" \
        --platform "android" 
        `

        if (channel) {
            FELog.warn('注意：iOS平台不打渠道包');
        }

        let rtCode = shelljs.exec(buildRNAndroidShell).code
        if (rtCode === 0 && !channel) { //rn-ios 暂不打渠道包
            rtCode = shelljs.exec(buildRNIosShell).code
        }

        if (rtCode !== 0) {
            FELog.error('打包失败')
            return false
        }


        const iosZipShell = `zip -q -r ${iosDir} ./ios`
        const androidZipShell = `zip -q -r ${androidDir} ./android`

        FEShell.stashPwd(() => {
            shelljs.cd(bundleDir)
            rtCode = shelljs.exec(androidZipShell).code
            if (rtCode === 0 && !channel) {
                rtCode = shelljs.exec(iosZipShell).code
            }
        })


        if (rtCode !== 0) {
            FELog.error('资源包压缩失败')
            return false
        }

        FELog.log('BUILD RN BUNDLE SUCCEED  打包结束!')
        return true
    }
}