#!/usr/bin/env ts-node

import yargs from "yargs";
import FEBuilder from "./FEBuilder";
import { BUILD_TYPE, PROJECT_TYPE } from "./FEBuilderConfig";

yargs(process.argv.slice(2)).version('0.0.1')
    .command('build', 'FE AUTO BUILDER', yargs => {
        return yargs
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
            .option('channel', {
                type: 'string',
                desc: '打包渠道',
            })
            .option('build-version', {
                type: 'string',
                desc: '指定打包版本号'
            })
            .option('branch', {
                type: 'string',
                desc: '打包分支',
                default: '未知'
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
            .help()
    }, argv => {
        FEBuilder.start({
            appId: argv.appid,
            projectType: argv["project-type"] as PROJECT_TYPE,
            buildType: argv["build-type"] as BUILD_TYPE,
            env: argv.env,
            channel: argv.channel,
            version: argv["build-version"],
            branch: 'dev.ysl',
            // url: 'http://git.keking.cn/logistics-front/banma-web-ctms-pc.git'
            url: 'http://git.keking.cn/app_ios/keking-app-ctms.git',

            ossKeyPrefix: "app/app_mgmt_uat/private_test",
            ossAK: "LTAI4FvqxFnWkU9KUogkCYZw",
            ossAS: 'nmygVsA2KtdPul4AV0C87CyEumIqCA',
            ossBucket: 'bm-file-uat',
            ossEndpoint: 'https://oss-cn-shanghai.aliyuncs.com',

            keystorePath: '/Users/y.liang/.ST_AUTO_BUILD_HOME/_keystore/release-key.keystore',
            keyAlias: 'release-alias.keystore',
            keystorePassword: 'CoM_mUstANg_aPp_oSe820t3Y21Z5',
            keyPassword: 'CoM_mUstANg_aPp_oSe820t3Y21Z5',
            jiagu: true,
        })
    })
    .locale('en')
    .help()
    .parse()