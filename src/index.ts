#!/usr/bin/env ts-node

import yargs from "yargs";
import FEBuilder from "./FEBuilder";
import { BUILD_TYPE, PROJECT_TYPE } from "./FEBuilderConfig";
import FELog from "./utls/FELog";

yargs(process.argv.slice(2)).version('0.0.2')
    .command('build', 'FE AUTO BUILDER', yargs => {
        return yargs
            //basic
            .option('appid', {
                type: 'string',
                demandOption: true,
                desc: '打包任务名称， 与app管理平台的AppID一致',
            })
            .option('project-type', {
                type: 'string',
                choices: ['rn', 'ios', 'android', 'web'],
                demandOption: true,
                desc: '项目类型'
            })
            .option('build-type', {
                type: 'string',
                choices: ['ipa', 'apk', 'rn', 'vue'],
                demandOption: true,
                desc: '打包类型'
            })
            .option('env', {
                type: 'string',
                demandOption: true,
                desc: '打包环境，由各个项目决定',
            })
            .option('prd', {
                boolean: true,
                desc: '是否是生产环境',
            })
            .option('branch', {
                type: 'string',
                demandOption: true,
                desc: '打包分支'
            })
            .option('repository', {
                type: 'string',
                demandOption: true,
                desc: '仓库地址'
            })
            //OSS
            .option('keyprefix', {
                type: 'string',
                desc: 'OSS 存储路径前缀',
            })
            .option('accesssecret', {
                type: 'string',
                desc: 'OSS Access Secret',
            })
            .option('accesskey', {
                type: 'string',
                desc: 'OSS Access Key',
            })
            .option('bucket', {
                type: 'string',
                desc: 'OSS Bucket Name',
            })
            .option('endpoint', {
                type: 'string',
                desc: 'OSS Endpoint',
            })
            //ios sign
            .option('bundleid', {
                type: 'string',
                desc: 'iOS Bundle ID',
            })
            .option('teamid', {
                type: 'string',
                desc: 'iOS Team ID',
            })
            .option('sign-identify', {
                type: 'string',
                desc: 'iOS证书名称',
            })
            .option('profile-name', {
                type: 'string',
                desc: 'iOS Profile Name',
            })
            .option('profile-uuid', {
                type: 'string',
                desc: 'iOS Profile UUID',
            })
            //android sign
            .option('keystore-path', {
                type: 'string',
                desc: 'Android Keystore Path',
            })
            .option('keyalias', {
                type: 'string',
                desc: 'Android Key Alias',
            })
            .option('keystore-password', {
                type: 'string',
                desc: 'Android Keystore Password',
            })
            .option('keypassword', {
                type: 'string',
                desc: 'Android Key Password',
            })
            .option('jiagu', {
                boolean: true,
                desc: '是否加固',
            })

            //other
            .option('icon', {
                type: 'string',
                desc: 'app icon',
            })
            .option('channel', {
                type: 'string',
                desc: '打包渠道',
            })
            .option('build-version', {
                type: 'string',
                desc: '指定打包版本号'
            })
            .option('operator', {
                type: 'string',
                desc: '操作人',
                default: '未知'
            })
            .option('from', {
                type: 'string',
                desc: '来源',
                choices: ['mgmt', 'localscript'],
                default: 'localscript'
            })
            .group(['appid', 'project-type', 'build-type', 'env', 'prd', 'branch', 'repository'], 'BASIC')
            .group(['keyprefix', 'accesssecret', 'accesskey', 'bucket', 'endpoint'], 'OSS Config')
            .group(['bundleid', 'teamId', 'sign-identify', 'profile-name', 'profile-uuid'], 'iOS Sign Config')
            .group(['keystore-path', 'keyalias', 'keystore-password', 'keypassword', 'jiagu'], 'Android Sign Config')
            .group(['icon', 'channel', 'build-version', 'operator', 'from'], 'Others')
            .help()
    }, argv => {
        FEBuilder.start({
            appId: argv.appid,
            appIcon: argv.icon,
            projectType: argv["project-type"] as PROJECT_TYPE,
            buildType: argv["build-type"] as BUILD_TYPE,
            env: argv.env,
            isPrdEnv: argv.prd,
            branch: argv.branch,
            url: argv.repository,

            ossKeyPrefix: argv.keyprefix,
            ossAK: argv.accesskey,
            ossAS: argv.accesssecret,
            ossBucket: argv.bucket,
            ossEndpoint: argv.endpoint,

            keystorePath: argv["keystore-path"],
            keyAlias: argv.keyalias,
            keystorePassword: argv["keystore-password"],
            keyPassword: argv.keypassword,
            jiagu: argv.jiagu,

            bundleId: argv.bundleid,
            teamId: argv.teamid,
            signIdentify: argv["sign-identify"],
            profileName: argv["profile-name"],
            profileUUID: argv["profile-uuid"],

            channel: argv.channel,
            version: argv["build-version"],
            operator: argv.operator,
            from: argv.from,
        }).then(rt => {
            if (rt) {
                FELog.log('build successful')
                process.exitCode = 0;
            } else {
                FELog.log('build failed')
                process.exitCode = 5;
            }

        }).catch(e => {
            FELog.log(`build with err ${e} `)
            process.exitCode = 15;
        })

    })
    .locale('en')
    .help()
    .parse()