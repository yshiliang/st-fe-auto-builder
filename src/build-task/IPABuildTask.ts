import FEFSUtils from "../utls/FEFSUtils";
import FELog from "../utls/FELog";
import AbsBuildTask from "./AbsBuildTask";
import path from 'path'
import shelljs from 'shelljs'
import FEBuilderConfig from "../FEBuilderConfig";
import IPABuilder from "../builder/IPABuilder";
import FEShell from "../utls/FEShell";
import fs from 'fs'

export default class IPABuildTask extends AbsBuildTask {
    private mainProjectRootDir: string | null = null;//宿主工程根目录

    //检查项目类型是否正确（有没有对应的配置文件）
    protected onCheckProjectRootDir(): string | null {
        FELog.log('工程根目录验证: 检查*.xcodeproj是否存在');
        let projectRootDir = this.workspace;
        if (this.argv.projectType === 'rn') {
            this.mainProjectRootDir = FEFSUtils.hasFile(this.workspace!, 'package.json');
            projectRootDir = this.mainProjectRootDir ? path.resolve(this.mainProjectRootDir, 'ios') : null;
        }

        return projectRootDir ? FEFSUtils.hasFile(projectRootDir, /.*.xcodeproj/) : null;
    }

    //安装项目依赖
    protected onInstallDependencies(projectRootDir: string): boolean {
        let rt = true;
        if (this.argv.projectType === 'rn') {
            rt = FEShell.yarn(this.mainProjectRootDir!);
        }

        if (rt) rt = FEShell.podInstall(projectRootDir);
        return rt;
    }

    //准备打包环境
    protected onPrepareBuildEnvironment(config: FEBuilderConfig): boolean {
        let appName = FEFSUtils.findFilenameWithExtension(config.build.projectRootDir, 'xcodeproj');
        console.log('app name is :', appName);
        let rt = !!appName && shelljs.cd(config.build.projectRootDir).code === 0;

        const signInfo = config.sign?.ios;
        if (!signInfo) {
            rt = false;
            FELog.error('ios 签名信息不存在，无法签名！')
        }

        if (rt && signInfo) {
            //处理export options
            FELog.log('自动配置ExportOptions信息');
            const exportPlist = path.resolve(config.build.projectRootDir, 'ExportOptions.plist');
            const rawExportPlist = path.resolve(__dirname, '../assets/ExportOptions.plist');
            fs.copyFileSync(rawExportPlist, exportPlist);
            shelljs.exec(`/usr/libexec/PlistBuddy -c "Set :teamID ${signInfo.teamId}" ${exportPlist}`);
            shelljs.exec(`/usr/libexec/PlistBuddy -c "Add :provisioningProfiles:${signInfo.bundleId} string ${signInfo.profileName}" ${exportPlist}`);
            if (config.build.isPrdEnv) {
                const exportPlist = path.resolve(config.build.projectRootDir, 'ExportOptions_appstore.plist');
                const rawExportPlist = path.resolve(__dirname, '../assets/ExportOptions_appstore.plist');
                fs.copyFileSync(rawExportPlist, exportPlist);
                shelljs.exec(`/usr/libexec/PlistBuddy -c "Set :teamID ${signInfo.teamId}" ${exportPlist}`);
            }

            const plistPath = `./${appName}/Info.plist`;
            const pbxprojPath = `./${appName}.xcodeproj/project.pbxproj`;
            if (config.build.version) {
                rt = shelljs.exec(`/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString ${config.build.version}" ${plistPath}`).code === 0;
            } else {
                const lineStr = shelljs.exec(`grep -r MARKETING_VERSION ${pbxprojPath} | sed -n 1p`);
                config.build.version = lineStr.replace(';', '').split('=')[1].trim();
            }
            if (rt) rt = shelljs.exec(`/usr/libexec/PlistBuddy -c "Set :CFBundleVersion ${config.build.buildCode}" ${plistPath}`).code === 0;

            if (rt && config.build.projectType === 'rn') {
                config.build.bundleVersion = require(path.resolve(this.mainProjectRootDir!, 'package.json')).version;
                rt = FEFSUtils.exchangeRNEnvironmentConfig(this.mainProjectRootDir!, config.build.env, config.build.channel);
                shelljs.sed('-i', /\"versionCode\":.*,/, `\"versionCode\": ${config.build.bundleBuildCode},`, '../package.json');//处理 rn build code
            }
        }
        return rt;
    }

    protected onCreateBuilder(config: FEBuilderConfig) {
        return new IPABuilder(config);
    }
}