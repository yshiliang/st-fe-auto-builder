import AbsBuilder from "./AbsBuilder";
import shelljs from 'shelljs'
import fs from 'fs'
import path from 'path'
import FEShell from "../utls/FEShell";
import FELog from "../utls/FELog";
import FEFSUtils from "../utls/FEFSUtils";
import OSSUtils from "../utls/OSSUtils";
import HttpClient from "../utls/HttpClient";

export default class IPABuilder extends AbsBuilder {
    ipaPath: string | null = null;
    appName: string | null = null;
    async build(): Promise<boolean> {
        this.appName = FEFSUtils.findFilenameWithExtension(this.config.build.projectRootDir, 'xcodeproj');
        if (!this.appName) {
            FELog.error('找不到iOS项目的工程文件')
            return false;
        }
        const archiveDir = `${this.config.build.dist}/archive` // ios/archive目录
        if (!fs.existsSync(archiveDir)) {
            fs.mkdirSync(archiveDir, { recursive: true })
        }

        const exportOptionsForAppStroe = path.resolve(this.config.build.projectRootDir, 'ExportOptions_appstore.plist');
        const exportOptionsForADHOC = path.resolve(this.config.build.projectRootDir, 'ExportOptions.plist');
        if (!fs.existsSync(exportOptionsForADHOC)) {
            FELog.error('工程主目录下配置文件缺失：ExportOptions.plist');
            return false;
        }
        if (this.config.build.isPrdEnv && !fs.existsSync(exportOptionsForAppStroe)) {
            FELog.error('工程主目录下配置文件缺失：ExportOptions_appstore.plist');
            return false;
        }

        const ipaExportPathAdhoc = `${this.config.build.dist}/${this.outputFilePrefix()}/adhoc`;
        const ipaExportPathAppstore = `${this.config.build.dist}/${this.outputFilePrefix()}/appstore`;
        const archivePath = `${archiveDir}/${this.outputFilePrefix()}.xcarchive`;
        const xcworkspacePath = path.resolve(this.config.build.projectRootDir, `${this.appName}.xcworkspace`);

        //xcode 打包
        // const build_ipa_shell = `
        // xcodebuild clean archive -workspace ${xcworkspacePath} \
        // -scheme ${this.appName} \
        // -configuration Release \
        // -archivePath ${archivePath}`

        const signInfo = this.config.sign?.ios;
        const buildIpaShellArgs = ["clean", "archive", "-workspace", xcworkspacePath, "-scheme", this.appName, "-configuration", "Release", "-archivePath", archivePath]

        const exportIpaAdhocShell = `\
        xcodebuild -exportArchive -archivePath ${archivePath} \
        -exportPath ${ipaExportPathAdhoc} \
        -exportOptionsPlist ${exportOptionsForADHOC} \
        CODE_SIGN_IDENTITY='${signInfo?.signIdentity}' \
        PROVISIONING_PROFILE='${signInfo?.profileUUID}' `

        const export_ipa_appstore_shell = `
        xcodebuild -exportArchive -archivePath ${archivePath} \
        -exportPath ${ipaExportPathAppstore} \
        -exportOptionsPlist ${exportOptionsForAppStroe} \
        -allowProvisioningUpdates
        `

        let rtCode = await FEShell.asyncSpawn('xcodebuild', buildIpaShellArgs, { silent: true })
        if (rtCode === 0) {
            rtCode = shelljs.exec(exportIpaAdhocShell).code
        }

        if (rtCode === 0 && this.config.build.isPrdEnv) {
            rtCode = shelljs.exec(export_ipa_appstore_shell).code
        }

        if (rtCode !== 0) {
            FELog.error('打包失败')
            return false
        }

        FELog.log('BUILD IPA SUCCEED  打包结束');
        this.ipaPath = `${ipaExportPathAdhoc}/${this.appName}.ipa`;
        return true
    }

    async upload() {
        const ossFileName = `${this.outputFilePrefix()}.ipa`
        const ossInfo = this.config.output?.oss;
        if (ossInfo && this.appName && this.ipaPath) {
            await OSSUtils.upload(`${ossInfo.ossKeyPrefix}/${ossFileName}`, this.ipaPath, ossInfo);

            //itms.plist
            const infoPlistPath = `./${this.appName}/Info.plist`;
            const displayName = shelljs.exec(`/usr/libexec/PlistBuddy -c "Print :CFBundleDisplayName" ${infoPlistPath}`);
            const ipaDownloadUrl = `${ossInfo.endpoint.replace(/https:\/\//, 'https://' + ossInfo.bucket + '.')}/${ossInfo.ossKeyPrefix}/${ossFileName}`;

            const itmsPlist = path.resolve(this.ipaPath!, '../manifest.plist');
            const manifestPlist = path.resolve(this.config.build.projectRootDir, 'manifest.plist');
            if (!fs.existsSync(manifestPlist)) {
                FELog.log('工程主目录下配置文件缺失：manifest.plist');
                return;
            }
            fs.copyFileSync(manifestPlist, itmsPlist);
            shelljs.exec(`/usr/libexec/PlistBuddy -c "Set :items:0:assets:0:url ${ipaDownloadUrl}" ${itmsPlist}`);
            shelljs.exec(`/usr/libexec/PlistBuddy -c "Set :items:0:metadata:bundle-version ${this.config.build.version}" ${itmsPlist}`)
            shelljs.exec(`/usr/libexec/PlistBuddy -c "Set :items:0:metadata:title ${displayName}-${this.config.build.env.toUpperCase()}" ${itmsPlist}`);

            const ossITMSKey = `${ossInfo.ossKeyPrefix}/${this.outputFilePrefix()}_itms.plist`
            await OSSUtils.upload(ossITMSKey, itmsPlist, ossInfo);
            await HttpClient.submitAppRecord(this.config, this.ipaPath, ossFileName);
        }
    }
}