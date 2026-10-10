import {callAI,AppError} from './providers.mjs';
import {prepareContext,rolePrompt,reviewPrompt,validateReply,validateReview} from './prompts.mjs';

export const securityHeaders={
 'X-Content-Type-Options':'nosniff',
 'Referrer-Policy':'no-referrer',
 'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
 'Permissions-Policy':'microphone=(self), camera=(), geolocation=()'
};
export function setSecurityHeaders(res){for(const [key,value] of Object.entries(securityHeaders))res.setHeader(key,value);}
export function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
export function sendError(res,error){send(res,error instanceof AppError?error.status:500,{error:error instanceof AppError?error.message:'처리 중 문제가 발생했습니다. 새로고침 후 다시 시도해 주세요.'});}
const tooLong=()=>new AppError(413,'대화가 너무 깁니다. 기록을 저장하고 새로 시작해 주세요.');
async function readJSON(req){
 if(Number(req.headers['content-length'])>250000)throw tooLong();
 // Vercel provides a parsed body getter; the local HTTP server provides a stream.
 if('body' in req){
  let data;try{data=req.body;}catch{throw new AppError(400,'요청 형식이 올바르지 않습니다.');}
  if(data!==undefined){if(Buffer.byteLength(JSON.stringify(data))>250000)throw tooLong();return data;}
 }
 const chunks=[];let bytes=0;
 for await(const chunk of req){bytes+=chunk.length;if(bytes>250000)throw tooLong();chunks.push(chunk);}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new AppError(400,'요청 형식이 올바르지 않습니다.');}
}

export function createAPIHandler(ai=callAI,{protocol='https'}={}){
 return async(req,res)=>{
  setSecurityHeaders(res);
  try{
   const host=req.headers.host||'';
   if(!/^[a-z0-9.-]+(?::\d+)?$/i.test(host))throw new AppError(400,'요청 주소가 올바르지 않습니다.');
   const url=new URL(req.url,`${protocol}://${host}`);
   if(req.method!=='POST')throw new AppError(405,'허용되지 않는 요청 방식입니다.');
   if(req.headers.origin&&req.headers.origin!==url.origin)throw new AppError(403,'이 앱의 화면에서 요청해 주세요.');
   if(!['/api/check','/api/reply','/api/review'].includes(url.pathname))throw new AppError(404,'요청한 기능이 없습니다.');
   if(!(req.headers['content-type']||'').startsWith('application/json'))throw new AppError(415,'JSON 요청만 지원합니다.');
   const data=await readJSON(req);
   if(!data||typeof data!=='object'||typeof data.apiKey!=='string')throw new AppError(400,'API 키를 입력해 주세요.');
   let result;
   if(url.pathname==='/api/check'){
    const d=await ai({provider:data.provider,apiKey:data.apiKey,model:data.model,system:'Return only the JSON object {"ok":true}.',input:'Connection test.'});
    if(d.ok!==true)throw new AppError(502,'연결은 되었지만 테스트 응답 형식이 맞지 않습니다.');result={ok:true};
   }else{
    const ctx=prepareContext(data.session),isReview=url.pathname==='/api/review';
    const prompt=isReview?reviewPrompt(ctx):rolePrompt(ctx);
    const d=await ai({provider:data.provider,apiKey:data.apiKey,model:data.model,...prompt});
    result=isReview?validateReview(d):validateReply(d,ctx);
   }
   send(res,200,result);
  }catch(error){sendError(res,error);}
 };
}
