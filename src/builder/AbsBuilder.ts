import FEBuilderConfig from '../FEBuilderConfig';


export default class AbsBuilder {
    config: FEBuilderConfig;
    constructor(config: FEBuilderConfig) {
        if (new.target === AbsBuilder) {
            throw new Error('AbsBuilder cannot be directly instantiated')
        }
        this.config = config;
    }

    /**
     * 各自子类实现对应打包逻辑，即调用各自的打包命令
     * @returns boolean
     */
    async build(): Promise<boolean> { return false }

    async upload() { return }

    outputFilePrefix() {
        let buildCodeStr = `${this.config.build.buildCode}`;
        let remainCount = 5 - buildCodeStr.length;
        while (remainCount > 0) {
            buildCodeStr = `0${buildCodeStr}`;
            remainCount--;
        }

        const suffix = this.config.build.channel ? `_${this.config.build.channel}` : '';
        return `${this.config.appId}_${this.config.build.env}_${buildCodeStr}_v${this.config.build.version}${suffix}`;
    }
}