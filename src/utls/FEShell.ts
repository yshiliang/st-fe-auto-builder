import shelljs from 'shelljs'
import FELog from './FELog';
import { spawn } from 'child_process'
import moment from 'moment';

export default class FEShell {
    static stashPwd(task: Function, owner?: any) {
        const pwd = shelljs.pwd();
        FELog.log(`pwd is ${pwd}`)
        task && owner ? task.call(owner) : task();
        shelljs.cd(pwd);
    }

    static asyncSpawn(command: string, args: string[], options = { silent: false }): Promise<number> {
        return new Promise((resolve) => {
            const c = spawn(command, args)
            if (!options.silent) {
                c.stdout.on('data', data => {
                    console.log('building', moment().format('YYYY-MM-DD HH:mm:ss'))
                    console.log(`${data}`)
                })
                c.stderr.on('data', data => {
                    console.log('building with err', moment().format('YYYY-MM-DD HH:mm:ss'))
                    console.error(`${data}`)
                })
            } else {
                c.stdout.pipe(process.stdout)
                c.stderr.pipe(process.stdin)
            }

            c.on('close', code => {
                resolve(code || 0)
            })
        })
    }

    static yarn(dir: string) {
        let code = shelljs.cd(dir).code;
        FELog.log('start yarn');
        if (code === 0) code = shelljs.exec('yarn').code;

        if (code === 0) FELog.log('end yarn');
        else {
            FELog.error('yarn 失败');
            return false;
        }

        return true;
    }

    static podInstall(dir: string) {
        let code = shelljs.cd(dir).code;
        FELog.log('start pod install');
        if (code === 0) code = shelljs.exec('pod install').code;
        if (code !== 0) FELog.log('end pod install');
        else {
            FELog.error('pod install 失败');
            return false;
        }
        return true;
    }
}