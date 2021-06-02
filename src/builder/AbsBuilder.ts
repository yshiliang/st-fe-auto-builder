import FEBuilderConfig from '../FEBuilderConfig';


export default abstract class AbsBuilder {
    config: FEBuilderConfig;
    constructor(config: FEBuilderConfig) {
        if (new.target === AbsBuilder) {
            throw new Error('AbsBuilder cannot be directly instantiated')
        }
        this.config = config;
    }

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

    /**
     * 各自子类实现对应打包逻辑，即调用各自的打包命令
     * @returns boolean
     */
    abstract build(): Promise<boolean>;

    /**
     * 子类实现上传逻辑
     */
    abstract upload(): Promise<void>;
}