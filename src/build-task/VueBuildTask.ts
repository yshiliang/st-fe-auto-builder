import VueBuilder from "../builder/VueBuilder";
import FEFSUtils from "../utls/FEFSUtils";
import FELog from "../utls/FELog";
import AbsBuildTask from "./AbsBuildTask";
import path from 'path'
import fs from 'fs'
import shelljs from 'shelljs'
import FEBuilderConfig from "../FEBuilderConfig";
import FEShell from "../utls/FEShell";

export default class VueBuildTask extends AbsBuildTask {
    //检查项目类型是否正确（有没有对应的配置文件）
    protected onVerifyProjectRootDir(): string | null {
        FELog.log('工程根目录验证: 检查vue.config.js是否存在');
        let projectRootDir = this.workspace;
        return projectRootDir ? FEFSUtils.hasFile(projectRootDir, 'vue.config.js') : null;
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
                shelljs.sed('-i', /version.*:.*,/, `version: \"${config.build.version}\",`, './src/manifest.js');
            } else {
                const matchArray = fs.readFileSync(path.resolve(config.build.projectRootDir, './src/manifest.js'), { encoding: 'utf-8' }).toString().match(/version.*:.*,/);
                if (matchArray) {
                    config.build.version = matchArray[0].replace(/version.*:/, '').replace(/[,\']/g, '').trim();
                }
            }
            shelljs.sed('-i', /buildCode.*:.*,/, `buildCode: ${config.build.buildCode},`, './src/manifest.js');
        }
        return true;
    }

    protected onCreateBuilder(config: FEBuilderConfig) {
        return new VueBuilder(config);
    }
}