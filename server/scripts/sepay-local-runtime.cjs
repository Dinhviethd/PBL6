const fs=require('node:fs'),path=require('node:path');
const {verifiedConfig,localDir}=require('./sepay-local-guard.cjs');
const target=path.join(__dirname,'../../.local/sepay/runtime.json');
function main(){
  verifiedConfig();
  if(process.env.NODE_ENV==='production') throw Error('Local runtime configuration disabled in production');
  if(process.argv.length>2) throw Error('This command takes no arguments; enter private values only in the ignored local config file.');
  fs.mkdirSync(localDir,{recursive:true});
  fs.writeFileSync(target,JSON.stringify({environment:'test',bankCode:'MBBank',accountNumber:'',accountName:'',webhookSecret:'',apiV2SandboxToken:''},null,2),{flag:'wx',mode:0o600});
  console.log('Protected local config template written. Fill MBBank Test-mode account number/name and HMAC secret only in the ignored local file; never pass them as command arguments or copy them to chat/repo.');
}
try{main()}catch{console.error('Local SePay runtime config failed; no credential printed.');process.exitCode=1;}
