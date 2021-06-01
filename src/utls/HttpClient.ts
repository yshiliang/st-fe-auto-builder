import axios from 'axios'
import Crypto from 'crypto'
import Qs from 'qs'
import FEBuilderConfig from '../FEBuilderConfig';
import FEFSUtils from './FEFSUtils';
import Resource from './Resource';


const DEFAULT_SECURT = '1234567890!@#$%^&*()'
type PARAMS = { [k: string]: any }


export default class HttpClient {
    static async submitAppRecord(config: FEBuilderConfig, outputFile: string, resName: string) {
        const size = FEFSUtils.sizeOfFile(outputFile);
        const md5 = FEFSUtils.md5OfFile(outputFile);
        let os = '';
        if (config.build.buildType === 'apk') os = 'android';
        else if (config.build.buildType === 'ipa') os = 'ios';
        else if (config.build.buildType === 'vue') os = 'browse';
        else {
            if (new RegExp(/.*ios.*/).test(resName)) os = 'ios';
            else if (new RegExp(/.*android.*/).test(resName)) os = 'android';
        }
        return this.uploadAppResource({
            name: resName,
            appId: config.appId,
            os: os,
            type: config.build.buildType,
            env: config.build.env,
            channel: config.build.channel,
            buildBranch: config.repo?.branch,
            version: config.build.version,
            buildCode: config.build.buildCode,
            rnVersion: config.build.bundleVersion,
            rnBuildCode: config.build.bundleBuildCode,
            url: `${config.output?.oss?.ossKeyPrefix}/${resName}`,
            size,
            operator: config.operateRecord?.operator,
            from: config.operateRecord?.from,
            md5,
            latestSubmitLog: config.build.latestSubmitId
        })
    }

    private static async uploadAppResource(record: Resource) {
        const params: PARAMS = { record }
        params._mt = 'Resource.addRecord'
        return axios({
            method: 'post',
            url: '/m.api',
            data: this.processParams(params),
            proxy: {
                host: 'localhost',
                port: 3001
            }
        }).then(resp => {
            console.log('rsp', resp.data)
            Promise.resolve(resp)
        }).catch(e => {
            console.log('e', e.data)
            Promise.reject(e)
        })
    }

    private static md5(origin: string) {
        return Crypto.createHash('md5').update(origin).digest('hex').toString();
    }

    private static signParams(params: PARAMS) {
        const raw = `${Qs.stringify(params)}${DEFAULT_SECURT}`
        return this.md5(raw)
    }

    private static processParams(params: PARAMS) {
        const timestamp = new Date().getTime()

        const _params: PARAMS = {
            timestamp,
            _sm: 'md5',
            ...(params || {})
        }
        _params._sig = this.signParams(_params)
        return _params
    }
}