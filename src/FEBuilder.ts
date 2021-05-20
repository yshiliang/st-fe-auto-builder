import AbsBuildTask from "./build-task/AbsBuildTask";
import APKBuildTask from "./build-task/APKBuildTask";
import IPABuildTask from "./build-task/IPABuildTask";
import RNBundleBuildTask from "./build-task/RNBundleBuildTask";
import VueBuildTask from "./build-task/VueBuildTask";
import { FEArgv } from "./FEBuilderConfig";
import FELog from "./utls/FELog";



export default class FEBuilder {
    static async start(argv: FEArgv) {
        const startTime = new Date().getTime();
        let task: AbsBuildTask | null = null
        switch (argv.buildType) {
            case 'vue':
                {
                    task = new VueBuildTask(argv);
                }
                break
            case 'apk':
                {
                    task = new APKBuildTask(argv);
                }
                break
            case 'ipa':
                {
                    task = new IPABuildTask(argv);
                }
                break
            case 'rn':
                {
                    task = new RNBundleBuildTask(argv);
                }
                break
            default:
                break
        }

        if (task) task.init();
        const builder = task?.builder;
        let success = !!builder;
        console.log('build options is ', builder?.config);
        if (success) {
            FELog.log(`start build [${builder?.config.build.buildType}] for [${builder?.config.appId}] with environment: ${builder?.config.build.env}
                        channel: ${builder?.config.build.channel || '默认'}   
                        version: ${builder?.config.build.version}   
                        build_code: ${builder?.config.build.buildCode}
                        git_branch: ${builder?.config.repo?.branch || '未知'} 
                        operator: ${builder?.config.operateRecord?.operator || '未知'}`)
            success = await builder!.build()
            if (success) {
                FELog.log(`end build [${builder?.config.build.buildType}] for [${builder?.config.appId}] with environment: ${builder?.config.build.env}
                        channel: ${builder?.config.build.channel || '默认'}   
                        version: ${builder?.config.build.version}   
                        build_code: ${builder?.config.build.buildCode}
                        git_branch: ${builder?.config.repo?.branch || '未知'}
                        operator: ${builder?.config.operateRecord?.operator || '未知'}`)
            }
        }

        const buildEndTime = new Date().getTime();
        FELog.log(`build cost time ${(buildEndTime - startTime) / 1000}s`);
        if (success) {
            await builder!.upload();
        }
        task?.clean();
        const endTime = new Date().getTime();
        FELog.log(`all cost time ${(endTime - startTime) / 1000}s`);
        return success;
    }
}

