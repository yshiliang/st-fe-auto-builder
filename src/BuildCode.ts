import path from 'path'
import fs from 'fs'
import Constants from './Constants'
import { BUILD_TYPE } from './FEBuilderConfig'

type BUILD_CODE = { [k in BUILD_TYPE]?: number }

export default class BuildCode {
    buildCode: BUILD_CODE = {};
    appId: string;
    constructor(appId: string) {
        this.appId = appId;
        const buildCodeFile = path.resolve(Constants.AUTO_BUILD_HOME_DIR, `${this.appId}/build_code.json`);
        if (fs.existsSync(buildCodeFile)) {
            try {
                this.buildCode = JSON.parse(fs.readFileSync(buildCodeFile, { encoding: 'utf-8' })) as BUILD_CODE;
            } catch (e) { }
        }
    }

    nextBuildCode(buildType: BUILD_TYPE) {
        let number = this.buildCode[buildType] || 0;
        let nextNumber = number + 1;
        this.buildCode[buildType] = nextNumber;

        return nextNumber;
    }

    save() {
        const buildCodeFile = path.resolve(Constants.AUTO_BUILD_HOME_DIR, `${this.appId}/build_code.json`);
        fs.writeFileSync(buildCodeFile, JSON.stringify(this.buildCode, null, '\t'), { encoding: 'utf-8' });
    }
}