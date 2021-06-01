import AbsBuilder from "../builder/AbsBuilder";
import FEBuilderConfig, { BuildOptions, FEArgv, OperateRecord, Output, Repository, Sign, verifyBuildType } from "../FEBuilderConfig";
import path from 'path'
import fs from 'fs'
import shelljs from 'shelljs'
import Constants from "../Constants";
import FELog from "../utls/FELog";
import BuildCode from "../BuildCode";


/**
 * workspace为各个build task的工作区，其根目录为系统home目录下的.ST_AUTO_BUILD_HOME目录。
 * 脚本将根据appId创建同名目录，并将该app的打包结果放到output子目录下。
 * 打包过程中，会将项目代码拷贝到名为.workspace的子目录下，打包完成后进行对应的清理工作。
 * 
 * ~/.ST_AUTO_BUILD_HOME/[appId]
 *  - output/[buildType]/[env]
 *  - .workspace/[appId]-[buildType]
 */

/**
 * BuildTask
 * 根据projectType和buildType，及其它参数，校验打包环境，并创建打包所需要环境
 * 与builder一一对应
 */
export default class AbsBuildTask {
    argv: FEArgv;
    workspace: string | null = null;
    builder: AbsBuilder | null = null;
    constructor(argv: FEArgv) {
        if (new.target === AbsBuildTask) {
            throw new Error('AbsProject cannot be directly instantiated')
        }
        this.argv = argv;
    }

    /**
     * 1、根据appId创建本地工作区;
     * 2、clone 代码到工作区下的特定临时子目录，并checkout 到正确的分支；
     * 3、检查项目类型是否正确（有没有对应的配置文件）由子类实现；
     * 4、根据项目类型安装项目依赖。  由子类实现；
     * 5、生成特定的打包上下文环境参数,如[版本号信息:version、buildCode] [环境变量信息:env] [渠道信息:channel]等。  由子类实现；
     */

    init() {
        if (!verifyBuildType(this.argv.projectType, this.argv.buildType!)) {
            FELog.error(`ProjectType is ${this.argv.projectType}, BuildType is ${this.argv.buildType}，不匹配。`);
            return;
        }

        const dist = path.resolve(Constants.AUTO_BUILD_HOME_DIR, `${this.argv.appId}/output/${this.argv.buildType}/${this.argv.env}`);
        this.workspace = path.resolve(Constants.AUTO_BUILD_HOME_DIR, `${this.argv.appId}/.workspace/${this.argv.appId}-${this.argv.buildType}`);

        //创建工作区
        if (!fs.existsSync(this.workspace)) {
            fs.mkdirSync(this.workspace, { recursive: true });
        } else {
            FELog.error(`工作目录${this.workspace}已经存在，请检查是否有正在进行中的打包任务`);
            throw new Error(`工作目录${this.workspace}已经存在，请检查是否有正在进行中的打包任务`);
        }

        //clone代码，并切换到正确分支
        let latestSubmitId = '';
        FELog.log(`workspace is ${this.workspace}`);
        let code = shelljs.cd(this.workspace).code;
        if (code === 0) {
            FELog.log(`git clone ${this.argv.url} and checkout to Branch origin/${this.argv.branch}`);
            code = shelljs.exec(`git clone ${this.argv.url} ./`).code;
        }
        if (code === 0) code = shelljs.exec(`git checkout -b ${this.argv.branch} origin/${this.argv.branch}`).code;
        if (code === 0) code = shelljs.exec('git log -5').code;
        if (code === 0) {
            const rt = shelljs.exec('git log -1 --pretty=%H', { silent: true });
            latestSubmitId = rt.stdout?.trim();
            FELog.log('git end');
        } else {
            FELog.error('Git操作失败，请检查仓库地址、分支名字及网络情况');
            return;
        }

        const projectRootDir = this.onCheckProjectRootDir();
        if (!projectRootDir) {
            FELog.error(`工程根目录不正确，没有找到工程特定的标志文件`);
            return;
        }

        if (!this.onInstallDependencies(projectRootDir)) {
            FELog.error('项目依赖安装失败');
            return;
        }

        FELog.log(`projectRootDir is ${projectRootDir}`);
        const feconfig = this.createFEBuildConfig(this.argv, projectRootDir, dist, latestSubmitId);
        if (!this.onPrepareBuildEnvironment(feconfig)) {
            FELog.error('打包环境准备失败');
            return;
        }

        fs.mkdirSync(dist, { recursive: true });
        this.builder = this.onCreateBuilder(feconfig);
    }

    clean() {
        if (this.workspace) {
            shelljs.cd(Constants.AUTO_BUILD_HOME_DIR);
            FELog.log(`清理工作空间：rm -rf ${this.workspace}`);
            fs.rmSync(this.workspace, { recursive: true, force: true });
        }
    }

    private createFEBuildConfig(argv: FEArgv, projectRootDir: string, dist: string, latestSubmitId: string): FEBuilderConfig {
        const repo: Repository = {
            url: argv.url,
            branch: argv.branch,
        }

        const output: Output = {}
        if (argv.ossKeyPrefix && argv.ossAK && argv.ossAS && argv.ossBucket && argv.ossEndpoint) {
            output.oss = {
                ossKeyPrefix: `${argv.ossKeyPrefix || 'FE_AUTO_BUILD_OUTPUT'}/${argv.appId}/${argv.buildType}/${argv.env}`,
                accessKeyId: argv.ossAK,
                accessKeySecret: argv.ossAS,
                bucket: argv.ossBucket,
                endpoint: argv.ossEndpoint,
            }
        }

        const sign: Sign = {}
        if (argv.keystorePath && argv.keyAlias && argv.keyPassword && argv.keystorePassword) {
            sign.android = {
                keystorePath: argv.keystorePath,
                keyAlias: argv.keyAlias,
                keystorePassword: argv.keystorePassword,
                keyPassword: argv.keyPassword,
                jiagu: !!argv.jiagu,
            }
        }

        if (argv.signIdentify && argv.profileUUID) {
            sign.ios = {
                signIdentity: argv.signIdentify,
                profileUUID: argv.profileUUID,
            }
        }

        const operateRecord: OperateRecord = {
            operator: argv.operator,
            from: argv.from
        }

        const buildCodeInfo = new BuildCode(argv.appId);
        const buildOptions: BuildOptions = {
            projectRootDir,
            dist,
            projectType: argv.projectType,
            buildType: argv.buildType,
            env: argv.env,
            isPrdEnv: argv.isPrdEnv,
            channel: argv.channel,
            version: argv.version,
            buildCode: buildCodeInfo.nextBuildCode(argv.buildType),
            bundleBuildCode: (argv.projectType === 'rn' && argv.buildType !== 'rn') ? buildCodeInfo.nextBuildCode('rn') : undefined,
            latestSubmitId,
        }

        buildCodeInfo.save();
        return {
            appId: argv.appId,
            build: buildOptions,
            repo,
            output,
            sign,
            operateRecord
        } as FEBuilderConfig
    }

    //子类实现
    protected onCheckProjectRootDir(): string | null { return null }
    protected onInstallDependencies(projectRootDir: string): boolean { return false }
    protected onPrepareBuildEnvironment(config: FEBuilderConfig): boolean { return false }
    protected onCreateBuilder(config: FEBuilderConfig): AbsBuilder | null { return null }
}