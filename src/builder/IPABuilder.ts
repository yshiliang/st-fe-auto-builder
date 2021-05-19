import AbsBuilder from "./AbsBuilder";
import shelljs from 'shelljs'
import fs from 'fs'
import path from 'path'
import FEShell from "../utls/FEShell";
import FELog from "../utls/FELog";

export default class IPABuilder extends AbsBuilder {
    appName = '';
    async build(): Promise<boolean> {
        const archiveDir = `${this.config.build.dist}/archive` // ios/archive目录
        if (!fs.existsSync(archiveDir)) {
            fs.mkdirSync(archiveDir, { recursive: true })
        }

        const ipaExportPathAdhoc = `${this.config.build.dist}/${this.outputFilePrefix()}/adhoc`
        const ipaExportPathAppstore = `${this.config.build.dist}/${this.outputFilePrefix()}/appstore`
        const archivePath = `${archiveDir}/${this.outputFilePrefix()}.xcarchive`
        const xcworkspacePath = path.resolve(this.config.build.projectRootDir, `${this.appName}.xcworkspace`)

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
        -exportOptionsPlist ${signInfo?.exportOptionsForADHOC} \
        CODE_SIGN_IDENTITY='${signInfo?.signIdentity}' \
        PROVISIONING_PROFILE='${signInfo?.profileUUID}' `

        const export_ipa_appstore_shell = `
        xcodebuild -exportArchive -archivePath ${archivePath} \
        -exportPath ${ipaExportPathAppstore} \
        -exportOptionsPlist ${signInfo?.exportOptionsForAppStroe} \
        -allowProvisioningUpdates
        `

        let rtCode = await FEShell.asyncSpawn('xcodebuild', buildIpaShellArgs, { silent: true })
        if (rtCode === 0) {
            rtCode = shelljs.exec(exportIpaAdhocShell).code
        }

        if (rtCode === 0 && this.config.build.env === 'prd') {
            rtCode = shelljs.exec(export_ipa_appstore_shell).code
        }

        if (rtCode !== 0) {
            FELog.error('打包失败')
            return false
        }

        FELog.log('BUILD IPA SUCCEED  打包结束')
        return true
    }
}