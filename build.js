const { exec, sed } = require('shelljs')

let rt = exec("rm -rf ./dist & tsc").code === 0;
if (rt) rt = sed('-i', /#!\/usr\/bin\/env.*/, "#!/usr/bin/env node", './dist/index.js').code === 0;
if (rt) rt = exec("chmod 755 ./dist/index.js");

console.log(rt ? 'build successful' : 'build failed');