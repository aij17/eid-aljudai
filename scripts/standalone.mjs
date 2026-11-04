import {spawnSync} from 'node:child_process';
const [command='build',...args]=process.argv.slice(2);
if(!['build','dev'].includes(command))throw Error('Expected build or dev');
const result=spawnSync(process.execPath,['scripts/run-framework.mjs',command,...args],{env:{...process.env,EID_STANDALONE:'1'},stdio:'inherit'});if(result.error)throw result.error;process.exit(result.status??1);
