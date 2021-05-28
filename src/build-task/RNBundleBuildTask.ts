import FEFSUtils from "../utls/FEFSUtils";
import FELog from "../utls/FELog";
import AbsBuildTask from "./AbsBuildTask";
import path from 'path'
import shelljs from 'shelljs'
import FEBuilderConfig from "../FEBuilderConfig";
import RNBuilder from "../builder/RNBuilder";
import FEShell from "../utls/FEShell";

export default class RNBundleBuildTask extends AbsBuildTask {
    //检查项目类型是否正确（有没有对应的配置文件）
    protected onCheckProjectRootDir(): string | null {
        FELog.log('工程根目录验证: 检查metro.config.js是否存在');
        let projectRootDir = this.workspace;
        return projectRootDir ? FEFSUtils.hasFile(projectRootDir, 'metro.config.js') : null;
    }

    //安装项目依赖
    protected onInstallDependencies(projectRootDir: string): boolean {
        return FEShell.yarn(projectRootDir);
    }

    //准备打包环境
    protected onPrepareBuildEnvironment(config: FEBuilderConfig): boolean {
        let rt = shelljs.cd(config.build.projectRootDir).code === 0;
        if (rt) {
            if (config.build.version) {
                shelljs.sed('-i', /\"version\":.*,/, `\"version\": \"${config.build.version}\",`, './package.json');
            } else {
                config.build.version = require(path.resolve(config.build.projectRootDir, 'package.json')).version;
            }
            shelljs.sed('-i', /\"versionCode\":.*,/, `\"versionCode\": ${config.build.buildCode},`, './package.json');

            rt = FEFSUtils.exchangeRNEnvironmentConfig(config.build.projectRootDir, config.build.env, config.build.channel);
        }
        return rt;
    }

    protected onCreateBuilder(config: FEBuilderConfig) {
        return new RNBuilder(config);
    }
}