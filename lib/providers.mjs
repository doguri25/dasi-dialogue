export const defaults={openai:'gpt-5.4-mini',anthropic:'claude-sonnet-4-6',gemini:'gemini-3.8-flash'};
export class AppError extends Error {constructor(status,message){super(message);this.status=status;}}

export function requestFor(provider,key,model,system,input) {
 if(!Object.hasOwn(defaults,provider)) throw new AppError(400,'지원하지 않는 AI 서비스입니다.');
 if(typeof key!=='string'||key.trim().length<10||key.length>1024||/[\r\n]/.test(key)) throw new AppError(400,'API 키를 설정에서 입력해 주세요.');
 if(typeof model!=='string'||!/^[a-zA-Z0-9._:-]{1,100}$/.test(model)) throw new AppError(400,'모델 이름을 확인해 주세요.');
 const headers={'Content-Type':'application/json'};
 if(provider==='openai') return {url:'https://api.openai.com/v1/responses',headers:{...headers,Authorization:`Bearer ${key}`},body:{model,instructions:system,input,max_output_tokens:3200,store:false,...(/^gpt-5/.test(model)?{reasoning:{effort:'low'}}:{})}};
 if(provider==='anthropic') return {url:'https://api.anthropic.com/v1/messages',headers:{...headers,'x-api-key':key,'anthropic-version':'2023-06-01'},body:{model,system,messages:[{role:'user',content:input}],max_tokens:2400}};
 return {url:`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,headers:{...headers,'x-goog-api-key':key},body:{systemInstruction:{parts:[{text:system}]},contents:[{role:'user',parts:[{text:input}]}],generationConfig:{maxOutputTokens:3200,responseMimeType:'application/json'}}};
}
export function extractText(provider,data) {
 if(provider==='openai') return (data.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n');
 if(provider==='anthropic') return (data.content||[]).filter(x=>x.type==='text').map(x=>x.text).join('\n');
 return (data.candidates?.[0]?.content?.parts||[]).filter(x=>!x.thought).map(x=>x.text||'').join('\n');
}
export function parseJSON(text) {
 try {const clean=text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');const value=JSON.parse(clean);if(!value||typeof value!=='object'||Array.isArray(value)) throw new Error();return value;}
 catch {throw new AppError(502,'AI 응답 형식을 읽지 못했습니다. 입력 문장은 남아 있습니다. 다시 보내 주세요.');}
}
const providerNames={openai:'OpenAI',anthropic:'Claude',gemini:'Gemini'};
function serviceError(provider,response,data,retried) {
 const status=response.status,error=data?.error||{};
 // Classify known fields locally. Never expose or log the provider's raw message.
 const codes=[error.code,error.type,error.status];
 const quota=codes.some(x=>['insufficient_quota','billing_error','billing_hard_limit_reached'].includes(x))||status===402||
  /credit balance|spend(?:ing)? (?:limit|cap)|exceeded your current quota|billing hard limit/i.test(String(error.message||''));
 const messages={400:'모델명 또는 요청을 서비스가 받아들이지 못했습니다. 설정의 모델명과 서비스의 API 사용 설정을 확인해 주세요.',401:'API 키 인증에 실패했습니다. 선택한 서비스의 키인지 설정에서 확인해 주세요.',403:'이 키로 모델을 사용할 권한이 없습니다. 서비스의 모델 접근 권한을 확인해 주세요.',404:'모델을 찾을 수 없습니다. 설정에서 이 계정이 사용할 수 있는 모델명을 확인해 주세요.',408:'서비스에서 처리 시간이 초과되었습니다. 잠시 후 다시 보내 주세요.',413:'대화가 서비스의 요청 크기 한도를 넘었습니다. 기록을 저장하고 새 연습을 시작해 주세요.',429:'요청 제한 또는 사용량 한도에 도달했습니다. 서비스의 사용량·한도를 확인한 뒤 다시 보내 주세요.'};
 let message=quota?'API 잔액 또는 결제·사용 한도를 확인해 주세요. 서비스의 결제 설정을 확인한 뒤 다시 보내 주세요.':messages[status];
 if(!message&&status>=500)message=(status===529||status===503?'서비스가 일시적으로 혼잡하거나 이용 불가능합니다.':status===504?'서비스에서 응답 시간이 초과되었습니다.':'서비스 내부 오류로 응답하지 못했습니다.')+(retried?' 한 번 자동 재시도했지만 응답하지 못했습니다.':'')+' 잠시 후 다시 보내거나 설정에서 다른 AI 서비스를 선택해 주세요.';
 message||='서비스가 요청을 거절했습니다. 연결 설정과 해당 서비스의 상태를 확인해 주세요.';
 return new AppError(status>=500?502:status,`${providerNames[provider]} · HTTP ${status}: ${message} 입력한 문장은 유지됩니다.`);
}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function retryDelay(response,now) {
 const value=response.headers.get('retry-after');
 if(!value)return 1000;
 const ms=/^\d+(\.\d+)?$/.test(value)?Number(value)*1000:Date.parse(value)-now;
 return Number.isFinite(ms)?Math.max(0,ms):1000;
}
export async function callAI({provider,apiKey,model,system,input},fetcher=fetch,{wait=sleep,now=Date.now}={}) {
 const r=requestFor(provider,typeof apiKey==='string'?apiKey.trim():apiKey,typeof model==='string'?model.trim():model,system,input);
 // One deadline covers both attempts and reading their bodies (client allows 65s).
 const signal=AbortSignal.timeout(60000),started=now();
 let data;
 for(let attempt=0;attempt<2;attempt++) {
  try {
   const response=await fetcher(r.url,{method:'POST',headers:r.headers,body:JSON.stringify(r.body),signal,redirect:'error'});
   try{data=await response.json();}catch(e){if(signal.aborted)throw e;data=null;}
   if(response.ok)break;
   const delay=retryDelay(response,now());
   // Authentication, billing and quota errors are not resolved by repeated requests.
   if(attempt===0&&[500,502,503,504,529].includes(response.status)&&delay<=3000&&now()-started+delay<50000){await wait(delay);continue;}
   throw serviceError(provider,response,data,attempt>0);
  }catch(e){
   if(e instanceof AppError)throw e;
   throw new AppError(502,`${providerNames[provider]}: `+(signal.aborted||e.name==='TimeoutError'?'응답 시간이 길어졌습니다. 입력한 문장은 유지됩니다. 잠시 후 다시 보내 주세요.':'AI 서비스에 연결할 수 없습니다. 입력한 문장은 유지됩니다. 네트워크를 확인해 주세요.'));
  }
 }
 if(!data)throw new AppError(502,'AI 응답을 읽지 못했습니다. 입력한 문장은 유지됩니다. 다시 시도해 주세요.');
 if(data.stop_reason==='max_tokens'||data.incomplete_details?.reason==='max_output_tokens'||data.candidates?.[0]?.finishReason==='MAX_TOKENS')throw new AppError(502,`${providerNames[provider]}: 답변이 출력 길이 한도에서 중단되었습니다. 입력한 문장은 유지됩니다. 다른 모델로 다시 시도해 주세요.`);
 const result=extractText(provider,data);
 if(!result.trim()) throw new AppError(502,'텍스트 응답이 없거나 생성이 중단되었습니다. 다른 모델 또는 질문으로 다시 시도해 주세요.');
 return parseJSON(result);
}
