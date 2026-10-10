import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {callAI,AppError} from './lib/providers.mjs';
import {createAPIHandler,setSecurityHeaders,sendError} from './lib/http-api.mjs';
const root=path.resolve(fileURLToPath(new URL('./public/',import.meta.url)));
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
export function createApp(ai=callAI) {
 const api=createAPIHandler(ai,{protocol:'http'});
 return http.createServer(async(req,res)=>{
  setSecurityHeaders(res);
  try {
   if(!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host||'')) throw new AppError(403,'로컬 주소로 접속해 주세요.');
   const url=new URL(req.url,`http://${req.headers.host}`);
   if(url.pathname.startsWith('/api/'))return api(req,res);
   if(req.method!=='GET'&&req.method!=='HEAD') throw new AppError(405,'허용되지 않는 요청 방식입니다.');
   const target=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
   if(!target.startsWith(root+path.sep)||!Object.hasOwn(mime,path.extname(target))) throw new AppError(404,'파일을 찾지 못했습니다.');
   let file;try{file=await readFile(target);}catch{throw new AppError(404,'파일을 찾지 못했습니다.');}
   res.writeHead(200,{'Content-Type':mime[path.extname(target)],'Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:file);
  } catch(e){sendError(res,e);}
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const port=Number(process.env.PORT||3210);const app=createApp();
 app.listen(port,'127.0.0.1',()=>console.log(`다시, 대화: http://localhost:${port}`));
 app.on('error',e=>{console.error(e.code==='EADDRINUSE'?`${port} 포트를 사용 중입니다. PORT=3211 npm start로 실행할 수 있습니다.`:'서버를 시작할 수 없습니다.');process.exitCode=1;});
}
