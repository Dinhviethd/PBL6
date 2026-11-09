// Built frontend + real Express headers, deliberately never connects to a database.
const {createApplication}=require('../../../server/dist/app');
const app=createApplication({databaseUrl:'postgres://unused:unused@127.0.0.1/security_test',secret:'s'.repeat(32),qrSecret:'q'.repeat(32),hstsMaxAgeSeconds:86400,clientUrl:'http://127.0.0.1:5188'});
const server=app.app.listen(5188,'127.0.0.1');
const parent=require('node:http').createServer((_req,res)=>{
  res.setHeader('Content-Type','text/html');
  res.end('<iframe src="http://127.0.0.1:5188/auth/login"></iframe>');
}).listen(5199,'127.0.0.1');
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{
  parent.close();server.close(()=>process.exit(0));
});
