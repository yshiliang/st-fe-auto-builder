import AbsBuilder from "./AbsBuilder";
import shelljs from 'shelljs'
import fs from 'fs'
import path from 'path'
import FELog from "../utls/FELog";
import Constants from "../Constants";
import OSSUtils from "../utls/OSSUtils";
import HttpClient from "../utls/HttpClient";

export default class APKBuilder extends AbsBuilder {
    apkPath: string | null = null;
    async build(): Promise<boolean> {
        //gradle打包
        const signInfo = this.config.sign?.android;
        const env = this.config.build.env!;
        const variantsName = env;
        const buildShell = `app:assemble${env[0].toUpperCase()}${env.substr(1)}`;

        const buildAPKShell = `
            chmod +x gradlew \n
            ./gradlew app:clean  ${buildShell}
        `

        FELog.log(`start building: ${buildShell}`);
        if (shelljs.exec(buildAPKShell).code !== 0) {
            FELog.error('打包失败');
            return false
        }

        const originAPKPath = path.resolve(this.config.build.projectRootDir, `app/build/outputs/apk/${variantsName}/app-${variantsName}.apk`);
        const originUnsignedAPKPath = path.resolve(this.config.build.projectRootDir, `app/build/outputs/apk/${variantsName}/app-${variantsName}-unsigned.apk`);
        if (fs.existsSync(originUnsignedAPKPath)) {
            if (!this.resign(originUnsignedAPKPath, originAPKPath)) {
                FELog.error(`签名失败: ${originUnsignedAPKPath}`);
                return false;
            }
        }

        if (!fs.existsSync(originAPKPath)) {
            FELog.error(`打包结果不存在: ${originAPKPath}`);
            return false;
        }

        const jiaguOutputTmpDir = `${this.config.build.dist}/${this.outputFilePrefix()}_jiagu_tmp`
        const jiaguOutputApkPath = `${this.config.build.dist}/${this.outputFilePrefix()}_jiagu_resign.apk`
        const normalOutputApkPath = `${this.config.build.dist}/${this.outputFilePrefix()}.apk`

        if (signInfo?.jiagu) {
            if (!this.jiaguAndResign(originAPKPath, jiaguOutputTmpDir, jiaguOutputApkPath)) {
                FELog.error('加固重签失败')
                return false
            }
            this.apkPath = jiaguOutputApkPath;
        } else {
            FELog.log(`将打包结果拷贝到目标位置： cp from ${originAPKPath} to ${normalOutputApkPath}`)
            fs.copyFileSync(originAPKPath, normalOutputApkPath);
            this.apkPath = normalOutputApkPath;
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
                rt = this.resign(path.resolve(jiaguOutputTmpDir, apkPath), outputApkPath);
            }
        }

        fs.rmdirSync(jiaguOutputTmpDir, { recursive: true })
        return rt
    }

    resign(unsignedApkPath: string, outputApkPath: string) {
        const signInfo = this.config.sign?.android;
        if (!signInfo) {
            FELog.error('签名信息不存在，无法签名！');
            return false;
        }
        const signShell = `jarsigner -verbose -keystore ${signInfo?.keystorePath} \
                            -storepass ${signInfo?.keystorePassword} \
                            -keypass ${signInfo?.keyPassword} \
                            -signedjar ${outputApkPath} ${unsignedApkPath} ${signInfo?.keyAlias}`
        return shelljs.exec(signShell).code === 0
    }

    async upload() {
        const ossFileName = `${this.outputFilePrefix()}${(this.config.sign?.android?.jiagu) ? '_jiagu_resign' : ''}.apk`;
        if (this.config.output?.oss && this.apkPath) {
            await OSSUtils.upload(`${this.config.output.oss.ossKeyPrefix}/${ossFileName}`, this.apkPath, this.config.output.oss);
            await HttpClient.submitAppRecord(this.config, this.apkPath, ossFileName);
        }
    }
}