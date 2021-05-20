
export type PROJECT_TYPE = 'rn' | 'ios' | 'android' | 'web';
export type BUILD_TYPE = 'ipa' | 'apk' | 'rn' | 'vue'

const PROJECT_BUILD_TYPE_MAP = {
    'web': ['vue'],
    'ios': ['ipa'],
    'android': ['apk'],
    'rn': ['rn', 'ipa', 'apk']
}

/**
 * 判断项目类型与打包类型是否匹配
 * @param projectType 
 * @param buildType 
 * @returns boolean
 */
export function verifyBuildType(projectType: PROJECT_TYPE, buildType: BUILD_TYPE): boolean {
    return (PROJECT_BUILD_TYPE_MAP[projectType] as string[]).findIndex(item => item === buildType) >= 0;
}


export interface FEArgv {
    appId: string;//唯一标识每一个使用FEAutoBuilder进行自动打包的应用

    //build options
    projectType: PROJECT_TYPE;
    buildType: BUILD_TYPE;
    env: string;//打包环境
    channel?: string;//打包渠道
    version?: string;//自定义打包版本号

    //output
    ossKeyPrefix?: string;
    ossAS?: string;
    ossAK?: string;
    ossBucket?: string;
    ossEndpoint?: string;

    //repo
    url?: string;
    branch?: string;

    //android sign
    keystorePath?: string;
    keyAlias?: string;
    keystorePassword?: string;
    keyPassword?: string;
    jiagu?: boolean;

    //operate record
    operator?: string;
    from?: string;
}

export interface BuildOptions {
    projectRootDir: string;//项目根目录（绝对路径）
    dist: string;//打包结果输出本地指定目录
    projectType: PROJECT_TYPE;
    buildType: BUILD_TYPE;//根据PROJECT_TYPE来决定默认值
    env: string;//打包环境
    channel?: string;//打包渠道
    version?: string;//打包版本号
    buildCode: number;//编译流水号
    bundleBuildCode?: number;//附属资源包的编译号
    latestSubmitId?: string;//最近一条提交日志
}

export interface Sign {
    ios?: {
        signIdentity: string;
        profileUUID: string;
        //导出选项
        exportOptionsForADHOC: string;
        exportOptionsForAppStroe: string;
    },
    android?: {
        keystorePath: string;
        keyAlias: string;
        keystorePassword: string;
        keyPassword: string;
        jiagu: boolean;
    }
}

export interface Output {
    oss?: {
        ossKeyPrefix: string;
        accessKeyId: string;
        accessKeySecret: string;
        bucket: string;
        endpoint: string;
    };//打包结果上传到OSS
}

export interface Repository {
    url?: string;
    branch?: string;
}

//操作记录
export interface OperateRecord {
    operator?: string;
    from?: string;
}

export default interface FEBuilderConfig {
    appId: string;//唯一标识每一个使用FEAutoBuilder进行自动打包的应用
    build: BuildOptions;//打包参数配置
    output?: Output;//
    repo?: Repository;//代码仓库
    sign?: Sign;
    operateRecord?: OperateRecord;
}