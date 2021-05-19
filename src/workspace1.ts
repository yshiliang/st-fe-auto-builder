/**
 * workspace为各个build task的工作区，其根目录为系统home目录下的.ST_AUTO_BUILD_HOME目录。
 * 脚本将根据appId创建同名目录，并将该app的打包结果放到output子目录下。
 * 打包过程中，会将项目代码拷贝到名为.workspace的子目录下，打包完成后进行对应的清理工作。
 * 
 * ~/.ST_AUTO_BUILD_HOME/[appId]
 *  - output/[buildType]/[env]
 *  - .workspace/[appId]-[buildType]
 */

import path from 'path'
import fs from 'fs'
import FELog from './utls/FELog';
import shelljs from 'shelljs'
import { BuildOptions, FEArgv } from './FEBuilderConfig';
import Constants from './Constants';
import BuildCode from './BuildCode';
import FEFSUtils from './utls/FEFSUtils';

/**
 * 创建工作区，并安装项目依赖，做好打包前的项目准备工作
 */
export default class Workspace {
    /**
     * 根据appId创建本地工作区
     * clone 代码到工作区下的特定临时子目录
     * checkout 到正确的分支
     * 检查项目类型是否正确（有没有对应的配置文件）, 根据项目类型安装项目依赖。 可抽象出Project类来处理相关逻辑
     * @returns BuildOptions
     */
    static init(argv: FEArgv) {
        const output = path.resolve(Constants.AUTO_BUILD_HOME_DIR, `${argv.appId}/output/${argv.buildType}/${argv.env}`);
        const workspace = path.resolve(Constants.AUTO_BUILD_HOME_DIR, `${argv.appId}/.workspace/${argv.appId}-${argv.buildType}`);

        //创建工作区
        if (!fs.existsSync(workspace)) {
            fs.mkdirSync(workspace, { recursive: true });
        } else {
            FELog.error(`工作目录${workspace}已经存在，请检查是否有正在进行中的打包任务`);
            return;
        }

        //clone代码，并切换到正确分支
        let latestSubmitId = '';
        let code = shelljs.cd(workspace).code;
        if (code === 0) {
            FELog.log(`git clone ${argv.url} and checkout to Branch origin/${argv.branch}`)
            code = shelljs.exec(`git clone ${argv.url} ./`).code
        }
        if (code === 0) code = shelljs.exec(`git checkout -b ${argv.branch} origin/${argv.branch}`).code
        if (code === 0) code = shelljs.exec('git log -5').code
        if (code === 0) {
            const rt = shelljs.exec('git log -1 --pretty=%H', { silent: true });
            latestSubmitId = rt.stdout?.trim();
            FELog.log('git end')
        } else {
            FELog.error('Git操作失败，请检查仓库地址、分支名字及网络情况')
            this._clean(workspace);
            return
        }

        //检查项目类型是否正确
        let rootDir: string | null = null;
        if (argv.projectType === 'rn' || argv.projectType === 'web') {
            rootDir = FEFSUtils.hasFile(workspace, 'package.json');
        } else if (argv.projectType === 'android') {
            rootDir = FEFSUtils.hasFile(workspace, 'build.gradle');
        } else if (argv.projectType === 'ios') {
            rootDir = FEFSUtils.hasFile(workspace, /.*.xcodeproj/)
        }
        if (!rootDir) {
            FELog.error(`工程根目录不正确：${workspace}`)
            return;
        }
        let projectRootDir = rootDir

        //安装项目依赖
        code = shelljs.cd(projectRootDir).code;
        if (argv.projectType === 'rn' || argv.projectType === 'web') {
            FELog.log('start yarn');
            code = shelljs.exec('yarn').code;
            FELog.log('end yarn')
            if (code !== 0) {
                FELog.error('yarn 失败');
                this._clean(workspace);
                return;
            }
        }

        if (argv.projectType === 'rn') {
            if (argv.buildType === 'ipa') {
                projectRootDir = path.resolve(projectRootDir, 'ios');
            } else if (argv.buildType === 'apk') {
                projectRootDir = path.resolve(projectRootDir, 'android')
            }
        }

        if (argv.buildType === 'ipa') {
            code = shelljs.cd(projectRootDir).code;
            if (code === 0) code = shelljs.exec('pod install').code;
            if (code !== 0) {
                FELog.error('pod install 失败');
                this._clean(workspace);
                return;
            }
        }

        const buildCodeInfo = new BuildCode(argv.appId);
        const buildOptions: BuildOptions = {
            projectRootDir,
            dist: output,
            projectType: argv.projectType,
            buildType: argv.buildType,
            env: argv.env,
            channel: argv.channel,
            buildCode: buildCodeInfo.nextBuildCode(argv.buildType),
            version: argv.version,
            latestSubmitId,
        }

        buildCodeInfo.save();
        fs.mkdirSync(output, { recursive: true });
        return buildOptions
    }

    static clean(argv: FEArgv) {
        const workspace = path.resolve(Constants.AUTO_BUILD_HOME_DIR, `${argv.appId}/.workspace/${argv.appId}-${argv.buildType}`);
        this._clean(workspace);
    }

    private static _clean(workspace: string) {
        shelljs.cd(Constants.AUTO_BUILD_HOME_DIR);
        FELog.log(`清理工作空间：rm -rf ${workspace}`)
        fs.rmSync(workspace, { recursive: true, force: true });
    }
}