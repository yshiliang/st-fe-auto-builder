import FEFSUtils from "../utls/FEFSUtils";
import FELog from "../utls/FELog";
import AbsBuildTask from "./AbsBuildTask";
import path from 'path'
import fs from 'fs'
import shelljs from 'shelljs'
import FEBuilderConfig from "../FEBuilderConfig";
import APKBuilder from "../builder/APKBuilder";
import FEShell from "../utls/FEShell";

export default class APKBuildTask extends AbsBuildTask {
    private mainProjectRootDir: string | null = null;//宿主工程根目录

    //检查项目类型是否正确（有没有对应的配置文件）
    protected onCheckProjectRootDir(): string | null {
        FELog.log('工程根目录验证: 检查build.gradle是否存在');
        let projectRootDir = this.workspace;
        if (this.argv.projectType === 'rn') {
            this.mainProjectRootDir = FEFSUtils.hasFile(this.workspace!, 'package.json');
            projectRootDir = this.mainProjectRootDir ? path.resolve(this.mainProjectRootDir, 'android') : null;
        }

        return projectRootDir ? FEFSUtils.hasFile(projectRootDir, 'build.gradle') : null;
    }

    //安装项目依赖
    protected onInstallDependencies(projectRootDir: string): boolean {
        let rt = true;
        if (this.argv.projectType === 'rn') {
            rt = FEShell.yarn(this.mainProjectRootDir!)
        }

        return rt;
    }

    //准备打包环境
    protected onPrepareBuildEnvironment(config: FEBuilderConfig): boolean {
        let rt = shelljs.cd(config.build.projectRootDir).code === 0;
        if (rt) {
            if (config.build.version) {
                shelljs.sed('-i', /APP_VERSION.*=.*/, `APP_VERSION=${config.build.version}`, './gradle.properties');
            } else {
                const matchArray = fs.readFileSync(path.resolve(config.build.projectRootDir, 'gradle.properties')).toString().match(/APP_VERSION.*=.*/);
                if (matchArray) {
                    config.build.version = matchArray[0].replace(/APP_VERSION.*=/, '').trim();
                }
            }
            shelljs.sed('-i', /BUILD_CODE.*=.*/, `BUILD_CODE=${config.build.buildCode}`, './gradle.properties');

            if (config.build.projectType === 'rn') {
                rt = FEFSUtils.exchangeRNEnvironmentConfig(this.mainProjectRootDir!, config.build.env, config.build.channel);
                shelljs.sed('-i', /\"versionCode.*\":.*,/, `\"versionCode\": ${config.build.bundleBuildCode},`, '../package.json');//处理 rn build code
            }
        }

        return rt;
    }

    protected onCreateBuilder(config: FEBuilderConfig) {
        return new APKBuilder(config);
    }
}