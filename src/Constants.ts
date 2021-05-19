import path from 'path'
import os from 'os'


const Constants = {
    AUTO_BUILD_HOME_DIR: path.resolve(os.homedir(), '.ST_AUTO_BUILD_HOME'),
}


export default Constants;