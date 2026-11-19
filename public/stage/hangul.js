// 문장 → 입 모양 시간표. 한글 음절을 초성·중성·종성으로 나눠 중성으로 입 모양을 정합니다.
const BASE=0xAC00,LAST=0xD7A3;
const SYLLABLE=140,LETTER=110,SPACE=40,COMMA=220,STOP=380,ELLIPSIS=600,NEWLINE=220;
const OPEN={A:1,E:.7,O:.65,U:.4,EU:.3,I:.35,M:0,REST:0};
const MEDIAL=['A','A','A','A','E','E','E','E','O','A','A','O','O','U','E','E','U','U','EU','EU','I'];
const CLOSED_INITIAL=new Set([6,7,8,17]);       // ㅁ ㅂ ㅃ ㅍ
const CLOSED_FINAL=new Set([16,17,18,10,14]);   // ㅁ ㅂ ㅄ ㄻ ㄿ

export function decompose(ch) {
 const code=typeof ch==='string'?ch.codePointAt(0):NaN;
 if(!(code>=BASE&&code<=LAST))return null;
 const n=code-BASE;
 return {initial:Math.floor(n/588),medial:Math.floor(n%588/28),final:n%28};
}

export function speechTimeline(text,{rate=1}={}) {
 const k=rate>0&&Number.isFinite(rate)?rate:1,cues=[],chars=Array.from(String(text??''));
 let t=0,index=0;
 const cue=(duration,shape,charIndex)=>{if(duration>0){cues.push({start:t,duration,shape,open:OPEN[shape],charIndex});t+=duration;}};
 for(let i=0;i<chars.length;i++,index++){
  const ch=chars[i],parts=decompose(ch);
  if(parts){
   const d=SYLLABLE/k,shape=MEDIAL[parts.medial];
   const head=CLOSED_INITIAL.has(parts.initial)?d*.35:0,tail=CLOSED_FINAL.has(parts.final)?d*.25:0;
   cue(head,'M',index);cue(d-head-tail,shape,index);cue(tail,'M',index);
  }else if(ch==='…'){cue(ELLIPSIS,'REST',index);}
  else if(ch==='.'&&chars[i+1]==='.'&&chars[i+2]==='.'){cue(ELLIPSIS,'REST',index+2);i+=2;index+=2;}
  else if('.?!。'.includes(ch)){cue(STOP,'REST',index);}
  else if(',，、'.includes(ch)){cue(COMMA,'REST',index);}
  else if(ch==='\n'){cue(NEWLINE,'REST',index);}
  else if(/\s/.test(ch)){cue(SPACE,'REST',index);}
  else if(/[\p{L}\p{N}]/u.test(ch)){cue(LETTER/k,'E',index);cues.at(-1).open=.5;}
 }
 return {cues,duration:t};
}
