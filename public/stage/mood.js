// 답변마다 붙는 감정. 서버(lib/prompts.mjs)와 브라우저가 같은 규칙을 씁니다.
// 화면에는 감정 이름을 보이지 않습니다. 교사는 캐릭터의 몸짓을 직접 읽습니다.
export const MOODS=['calm','open','hesitant','anxious','defensive','upset','withdrawn','relieved'];

const LABELS={calm:'차분함',open:'마음을 엶',hesitant:'망설임',anxious:'불안함',defensive:'방어함',upset:'속상함',withdrawn:'위축·거리 두기',relieved:'안도함'};
const MEANINGS={
 calm:'차분하게 이야기함',
 open:'마음을 열고 눈을 맞춤',
 hesitant:'말하기를 망설이고 머뭇거림',
 anxious:'불안해서 시선을 피하고 긴장함',
 defensive:'방어적으로 짧게 말하고 팔짱을 낌',
 upset:'속상해서 고개를 숙임',
 withdrawn:'위축되어 거리를 두고 거의 보지 않음',
 relieved:'안심해서 긴장이 풀림'
};
export const MOOD_GUIDE=MOODS.map(m=>`${m}(${LABELS[m]}: ${MEANINGS[m]})`).join(', ');

const ALIASES=Object.fromEntries([
 ...MOODS.map(m=>[m,m]),
 ...Object.entries(LABELS).flatMap(([m,label])=>label.split(/[·\s]+/).filter(Boolean).map(word=>[word,m])),
 ['방어','defensive'],['불안','anxious'],['망설','hesitant'],['속상','upset'],['위축','withdrawn'],['안도','relieved'],['차분','calm']
].map(([k,v])=>[k.trim(),v.trim()]));

export function moodIntensity(risk) {
 return {none:.55,tension:.8,stop:1}[risk]??.55;
}

export function inferMood({risk='none',speaker}={}) {
 if(risk==='stop')return speaker==='v'?'withdrawn':'anxious';
 if(risk==='tension')return speaker==='a'?'defensive':'hesitant';
 return 'calm';
}

export function normalizeMood(value,{risk,speaker}={}) {
 const key=typeof value==='string'?value.trim().toLowerCase():'';
 if(key){
  if(ALIASES[key])return ALIASES[key];
  const prefix=Object.keys(ALIASES).find(k=>k.length>1&&!/^[a-z]+$/.test(k)&&key.startsWith(k));
  if(prefix)return ALIASES[prefix];
 }
 return inferMood({risk,speaker});
}

// 체험(시나리오) 모드 전용 표. engine.js의 classify 의도와 연습 조건으로 고릅니다.
export function demoMood({intent='open',variant='cooperative',phase='pre',preStep,role='v',turn=0}={}) {
 if(intent==='pressure')return role==='v'?'upset':role==='a'?'defensive':'anxious';
 if(variant==='unsafe'){
  if(role==='v')return intent==='safety'?'anxious':'withdrawn';
  return role==='a'?'hesitant':'anxious';
 }
 if(phase==='pre'&&preStep==='intro')return variant==='resistant'?'hesitant':'calm';
 if(phase==='post'){
  if(variant==='relapse')return 'hesitant';
  return intent==='safety'||role!=='a'?'relieved':'open';
 }
 if(variant==='resistant'&&turn<4&&intent!=='safety'&&role!=='g')return role==='a'?'defensive':'hesitant';
 if(role==='g')return intent==='safety'?'relieved':intent==='plan'?'calm':'hesitant';
 if(['feeling','need','plan'].includes(intent))return 'open';
 if(intent==='safety')return 'relieved';
 if(intent==='story')return role==='v'?'hesitant':'calm';
 if(intent==='responsibility')return role==='v'?'calm':'hesitant';
 if(intent==='followup')return 'calm';
 return 'hesitant';
}
