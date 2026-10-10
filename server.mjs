import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {callAI,AppError} from './lib/providers.mjs';
import {prepareContext,rolePrompt,reviewPrompt,validateReply,validateReview} from './lib/prompts.mjs';
const root=path.resolve(fileURLToPath(new URL('./public/',import.meta.url)));
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
async function body(req) {
 const chunks=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>250000) throw new AppError(413,'대화가 너무 깁니다. 기록을 저장하고 새로 시작해 주세요.');chunks.push(chunk);}
 try {return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch {throw new AppError(400,'요청 형식이 올바르지 않습니다.');}
}
export function createApp(ai=callAI) {
 return http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  res.setHeader('Permissions-Policy','microphone=(self), camera=(), geolocation=()');
  try {
   if(!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host||'')) throw new AppError(403,'로컬 주소로 접속해 주세요.');
   const url=new URL(req.url,`http://${req.headers.host}`);
   if(url.pathname.startsWith('/api/')) {
    if(req.method!=='POST') throw new AppError(405,'허용되지 않는 요청 방식입니다.');
    if(req.headers.origin&&req.headers.origin!==url.origin) throw new AppError(403,'이 앱의 화면에서 요청해 주세요.');
    if(!(req.headers['content-type']||'').startsWith('application/json')) throw new AppError(415,'JSON 요청만 지원합니다.');
    const data=await body(req);
    if(!data||typeof data!=='object'||typeof data.apiKey!=='string') throw new AppError(400,'API 키를 입력해 주세요.');
    let result;
    if(url.pathname==='/api/check') {
     const d=await ai({provider:data.provider,apiKey:data.apiKey,model:data.model,system:'Return only the JSON object {"ok":true}.',input:'Connection test.'});
     if(d.ok!==true) throw new AppError(502,'연결은 되었지만 테스트 응답 형식이 맞지 않습니다.');result={ok:true};
    } else if(url.pathname==='/api/reply'||url.pathname==='/api/review') {
     const ctx=prepareContext(data.session),isReview=url.pathname.endsWith('review');
     const prompt=isReview?reviewPrompt(ctx):rolePrompt(ctx);
     const d=await ai({provider:data.provider,apiKey:data.apiKey,model:data.model,...prompt});
     result=isReview?validateReview(d):validateReply(d,ctx);
    } else throw new AppError(404,'요청한 기능이 없습니다.');
    send(res,200,result);return;
   }
   if(req.method!=='GET'&&req.method!=='HEAD') throw new AppError(405,'허용되지 않는 요청 방식입니다.');
   const target=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
   if(!target.startsWith(root+path.sep)||!Object.hasOwn(mime,path.extname(target))) throw new AppError(404,'파일을 찾지 못했습니다.');
   let file;try{file=await readFile(target);}catch{throw new AppError(404,'파일을 찾지 못했습니다.');}
   res.writeHead(200,{'Content-Type':mime[path.extname(target)],'Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:file);
  } catch(e){send(res,e instanceof AppError?e.status:500,{error:e instanceof AppError?e.message:'처리 중 문제가 발생했습니다. 새로고침 후 다시 시도해 주세요.'});}
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const port=Number(process.env.PORT||3210);const app=createApp();
 app.listen(port,'127.0.0.1',()=>console.log(`다시, 대화: http://localhost:${port}`));
 app.on('error',e=>{console.error(e.code==='EADDRINUSE'?`${port} 포트를 사용 중입니다. PORT=3211 npm start로 실행할 수 있습니다.`:'서버를 시작할 수 없습니다.');process.exitCode=1;});
}
