import AbsBuilder from "./AbsBuilder";
import shelljs from 'shelljs'
import fs from 'fs'
import path from 'path'
import FELog from "../utls/FELog";
import Constants from "../Constants";

export default class APKBuilder extends AbsBuilder {
    async build(): Promise<boolean> {
        //gradle打包
        const signInfo = this.config.sign?.android;
        const env = this.config.build.env!;
        const variantsName = env;
        const buildShell = `app:a${env[0].toUpperCase()}`;

        const buildAPKShell = `
            chmod +x gradlew \n
            ./gradlew app:clean  ${buildShell}
        `
        if (shelljs.exec(buildAPKShell).code !== 0) {
            FELog.error('打包失败')
            return false
        }

        const originAPKPath = path.resolve(this.config.build.projectRootDir, `app/build/outputs/apk/${variantsName}/app-${variantsName}.apk`)
        const jiaguOutputTmpDir = `${this.config.build.dist}/${this.outputFilePrefix()}_jiagu_tmp`
        const jiaguOutputApkPath = `${this.config.build.dist}/${this.outputFilePrefix()}_jiagu_resign.apk`
        const normalOutputApkPath = `${this.config.build.dist}/${this.outputFilePrefix()}.apk`

        if (signInfo?.jiagu && env === 'release') {
            if (!this.jiaguAndResign(originAPKPath, jiaguOutputTmpDir, jiaguOutputApkPath)) {
                FELog.error('加固重签失败')
                return false
            }
        } else {
            FELog.log(`将打包结果拷贝到目标位置： cp from ${originAPKPath} to ${normalOutputApkPath}`)
            fs.copyFileSync(originAPKPath, normalOutputApkPath)
        }

        FELog.log('BUILD APK SUCCEED')
        return true
    }

    jiaguAndResign(originAPKPath: string, jiaguOutputTmpDir: string, outputApkPath: string) {
        const jiaguToolPath = path.resolve(Constants.AUTO_BUILD_HOME_DIR, '360jiagubao_mac/jiagu')
        if (fs.existsSync(jiaguOutputTmpDir)) {
            fs.rmdirSync(jiaguOutputTmpDir, { recursive: true })
        }
        fs.mkdirSync(jiaguOutputTmpDir)

        let rt = shelljs.exec(`java -jar ${jiaguToolPath}/jiagu.jar -jiagu ${originAPKPath} ${jiaguOutputTmpDir}`).code === 0
        if (rt) {
            const apkPath = shelljs.ls('-L', jiaguOutputTmpDir)[0]
            rt = false
            if (apkPath) {
                const signInfo = this.config.sign?.android;
                const signShell = `jarsigner -verbose -keystore ${signInfo?.keystorePath} \
                                    -storepass ${signInfo?.keystorePassword} \
                                    -keypass ${signInfo?.keyPassword} \
                                    -signedjar ${outputApkPath} ${path.resolve(jiaguOutputTmpDir, apkPath)} ${signInfo?.keyAlias}`
                rt = shelljs.exec(signShell).code === 0
            }
        }

        fs.rmdirSync(jiaguOutputTmpDir, { recursive: true })
        return rt
    }
}