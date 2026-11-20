// 체험(시나리오) 대화의 진행: 교사의 말이 무엇을 묻는지 읽고, 각 사람이 이미 한 말을 기억해 이야기를 한 걸음씩 이어 갑니다.
// 같은 말을 되풀이하지 않고, 사전모임에서는 다른 사람이 따로 한 말을 모르며, 학생이 되물으면 다음 제안의 첫 줄이 그 물음에 답합니다.
// 단어를 바탕으로 한 단순 분기입니다. 자연어 의미 판정이나 교사의 역량 점수가 아닙니다.
import {CASEBOOK} from './casebook.js';
import {preStepFor} from './premeeting.js';
import {demoMood} from './stage/mood.js';

const final=w=>{const ch=String(w).trim().slice(-1).charCodeAt(0);return ch>=0xAC00&&ch<=0xD7A3&&(ch-0xAC00)%28!==0;};
export const josa=(w,pair)=>{const [a,b]=pair.split('/');return w+(final(w)?a:b);};

// ── 교사의 말 읽기 ────────────────────────────────────────
const ECHO=/^(?:[^“\n]{1,40}, )?“[\s\S]*?”라고 (?:말해 주었구나|말씀하셨군요)\.\s*/;
const PRESSURE=/(싫어도|억지로|무조건|당장).{0,12}(사과|화해|참여|용서)|사과해(?:[.!\s]|$)|너도.{0,8}(잘못|책임)|둘 다.{0,8}잘못|용서해 줘/;
const RULES=[
 ['consent',/(함께|같이|다 같이|한자리에서?)\s?(만나|이야기하는 자리|모이|모임)|본모임|만날 (생각|마음)|추가 모임/,/만나지 않/],
 ['check',/(제대로 들었|다르게 이해|빠뜨리|맞게 이해|다시 짚어|들은 내용)/],
 ['about',/(모임 방식|궁금|묻고 싶은|확인하고 싶은 점|질문이 있)/],
 ['ready',/(겪은 일을 이야기해도 괜찮|이야기해도 괜찮겠|이어가도 괜찮|준비가 안|준비됐|준비되었)/],
 ['ground',/(대화 약속|이야기를 듣는 동안|이야기하는 동안|말하는 동안|대화 규칙)/],
 ['heard',/(새롭게 알게|더 이해하게|듣고 (알게|이해하게))/],
 ['hard',/(어려웠던|어렵거나|힘든 점|어려운 점|어려움)/],
 ['repair',/(회복을 돕|피해를 줄이|회복 방법|회복 방식|받아들일 수 있|책임질 행동|실천할 수 있는 (행동|일))/],
 ['followup',/(지켜진|지켰|지킨|지켜졌|실천 결과|이행|실제로 달라진|지켜지지 않은 부분)/],
 ['agree',/(동의하지 않|바꾸고 싶은 부분|자유롭게 동의|동의했는지)/],
 ['plan',/(누가 언제|누가.{0,10}(할|맡|확인|도울)|언제부터|언제 다시|기한|다음.{0,4}(주|날)|구체적인? 계획|어떻게 실천|어떻게 확인)/],
 ['safety',/(강요하지|강요 안|사과.{0,8}(않아|안 해)|용서.{0,8}(않아|안 해)|원하지 않|멈춰도|멈출 수|멈추고|그만해도|중단|보류|쉬어|쉴래|쉬자|쉬고|통과|건너뛰|넘어가도|괜찮니|천천히 해|안전|보복|두려|무서)/],
 ['need',/(필요|바라|원하|달라지|도움|도와|도울|지원|어떤 어른|어른과|어떻게 하고 싶)/],
 ['responsibility',/(네가 한|너의 행동|네 행동|그 행동|책임|바꿔|왜 그랬|잘못|상대.{0,14}(어땠|마음|느꼈|생활))/],
 ['impact',/(영향|일상|생활|달라졌|달라진|차이|나아졌|어떻게 지냈|잘 지냈|요즘 어때)/],
 ['more',/(더 (하고 싶은|말하고 싶은|들려|이야기|말씀)|아직 듣지 못한|꼭 말하고 싶은|전하고 싶은|마지막으로 하고 싶은|더 할 말|할 말 있)/],
 ['feeling',/(마음|기분|감정|느꼈|느끼)/],
 ['story',/(무슨|어떤 일|어떤 이야기|겪은|있었|기억|말해|말씀해|들려|장면|그다음|그 뒤|이어졌|시작되기|어땠는지|이야기해|어디서부터|먼저 시작|누가 먼저)/],
 ['feeling',/(힘들|속상|불편|걱정)/],
 ['thanks',/(고마워|고맙|감사)/]
];
function match(text){for(const [k,re,not] of RULES)if(re.test(text)&&!(not&&not.test(text)))return k;return 'open';}
// 되짚은 학생의 말은 맥락일 뿐 교사의 새 질문이 아니므로 떼고, 물음표로 끝나는 문장(묻는 말)을 먼저 읽습니다.
export function classify(text) {
 text=String(text||'').replace(ECHO,'');
 if(PRESSURE.test(text))return 'pressure';
 for(const q of text.split(/(?<=[?？.!。])\s+/).filter(x=>/[?？]$/.test(x.trim()))){const k=match(q);if(k!=='open')return k;}
 return match(text);
}

// ── 사람마다 할 수 있는 말(사례와 상관없는 말) ─────────────────
const DONE={
 v:['제가 기억나는 건 그게 다예요. 그 장면이 제일 많이 떠올라요.','더 생각나는 건 없어요. 말하고 나니까 조금 정리가 돼요.','지금은 그 정도예요. 생각나면 다시 말할게요.','음… 그건 아까 말한 것 같아요. 다른 걸 물어봐 주셔도 돼요.','잘 모르겠어요. 조금 생각해 봐도 돼요?','그건 말하기가 좀 어려워요. 다음에 말해도 될까요?'],
 a:['제가 기억하는 건 그게 다예요. 더 보탤 건 없어요.','더 할 말은 없는 것 같아요. 기억나는 건 거기까지예요.','지금은 생각나는 게 없어요. 생각나면 말씀드릴게요.','그건 아까 말씀드린 것 같아요.','잘 모르겠어요. 생각해 볼게요.','그건 대답하기가 좀 어려워요. 조금 있다가 말해도 돼요?'],
 g:['제가 들은 건 거기까지예요. 아이가 다 말하지 않았을 수도 있어요.','더 아는 건 없어요. 아이에게 직접 들어 주시는 게 좋겠어요.','지금은 그 정도예요. 생각나면 연락드릴게요.','그건 앞에서 말씀드린 것 같아요.','그 부분은 저도 잘 모르겠어요.','그건 아이와 먼저 이야기해 보고 말씀드릴게요.']
};
const PRE={
 v:{now:'지금은 그때만큼은 아니지만, 생각하면 아직 마음이 무거워요.',help:'선생님이 가끔 괜찮은지 따로 물어봐 주시면 좋겠어요.',why:'왜 그랬는지는 잘 모르겠어요. 제가 아는 건 제가 싫었다는 거예요.',planPre:'약속까지는 아직 잘 모르겠어요. 먼저 그 일이 멈췄으면 좋겠어요.',feelAgain:'말로 다 하기는 어려워요. 그래도 들어 주시니까 조금 나아요.',impactAgain:'그 정도예요. 다른 시간은 그럭저럭 괜찮아요.',needAgain:'아까 말한 게 제일 커요. 그것만 달라져도 좋겠어요.',
  safe:'멈출 수 있다니 마음이 좀 놓여요. 천천히 말해 볼게요.',safe2:'네, 알겠어요. 힘들면 말할게요.',consent:'선생님이 옆에 계시면 만나 볼 수 있을 것 같아요. 대신 제가 먼저 말할 수 있으면 좋겠어요.',consentEarly:'만나는 건 아직 생각 안 해 봤어요. 먼저 제 이야기를 좀 하고 싶어요.',
  bye:'아니요, 오늘은 이 정도면 돼요. 들어 주셔서 고마워요.',checkOk:'네, 맞아요. 그렇게 들어 주셔서 다행이에요.',checkEarly:'아직 제대로 말한 게 없는 것 같아요. 처음부터 말해 볼게요.',aboutDone:'이제 궁금한 건 없어요. 이야기해 볼게요.'},
 a:{now:'지금은 좀 걱정돼요. 일이 어떻게 될지 모르니까요.',change:'요즘 애들이 저를 보는 눈이 좀 달라진 것 같아요. 선생님한테 불려 온 것도 신경 쓰여요.',need:'제 얘기도 끝까지 들어 줬으면 좋겠어요. 그리고 제가 뭘 하면 되는지 알고 싶어요.',help:'혼내기보다 어떻게 하면 되는지 알려 주셨으면 해요.',guess2:'그건 직접 들어 봐야 알 것 같아요. 제 생각만으로는 잘 모르겠어요.',planPre:'뭘 해야 할지는 아직 잘 모르겠어요. 걔가 뭘 원하는지 알고 싶어요.',feelAgain:'말하고 나니까 조금 나아요. 그래도 아직 긴장돼요.',impactAgain:'그거 말고는 비슷해요. 별다른 건 없어요.',needAgain:'아까 말한 게 다예요. 제 말도 들어 주시면 돼요.',
  safe:'혼나는 자리가 아니라니 좀 안심돼요. 솔직하게 말해 볼게요.',safe2:'네, 알겠어요. 말하기 어려우면 말씀드릴게요.',consent:'만나서 제 얘기도 하고, 걔 얘기도 들어 볼게요. 좀 떨리긴 해요.',consentEarly:'만나는 건 잘 모르겠어요. 먼저 제 얘기부터 해도 돼요?',
  bye:'더 할 말은 없어요. 들어 주셔서 감사해요.',checkOk:'네, 그렇게 들으신 게 맞아요.',checkEarly:'아직 제 얘기를 제대로 못 한 것 같아요. 처음부터 말해 볼게요.',aboutDone:'이제 궁금한 건 없어요. 제 얘기 해 볼게요.'},
 g:{gfeel:'아이는 말하면서 많이 위축돼 보였어요. 저도 속상하고, 어디서부터 도와야 할지 모르겠어요.',gfeel2:'솔직히 화도 나고 걱정도 돼요. 그래도 이렇게 들어 주시니 마음이 조금 놓여요.',impactAgain:'요즘은 그래도 조금씩 말을 꺼내요.',needAgain:'아이가 원하는 걸 먼저 물어봐 주세요. 그다음에 제가 할 일을 정하고 싶어요.',why:'그 아이가 왜 그랬는지는 저도 모르겠어요. 다만 우리 아이가 많이 힘들어했다는 건 알아요.',
  safe:'아이도 멈출 수 있다는 설명을 들으니 안심돼요. 아이 뜻을 따로 확인해 주세요.',safe2:'네, 알겠습니다. 아이 속도에 맞춰 주세요.',consent:'아이가 원하면 괜찮아요. 아이 뜻이 먼저예요.',consentEarly:'아이 이야기를 먼저 들어 주시고 나서 정했으면 해요.',
  bye:'오늘 들어 주셔서 감사합니다. 아이 이야기도 꼭 따로 들어 주세요.',checkOk:'네, 그렇게 이해하시면 돼요.',checkEarly:'아직 제가 들은 이야기를 다 말씀드리지 못했어요.',aboutDone:'이제 궁금한 건 없습니다.'}
};
const ABOUT={v:[['share','제가 한 말을 걔도 알게 되나요? 그게 제일 걱정돼요.'],['meet','그럼 걔도 선생님이랑 따로 이야기해요?']],a:[['shareOther','걔가 선생님한테 뭐라고 했는지는 알려 주시나요?'],['share','그럼 제가 한 말도 걔한테 전해져요?']],g:[['share','아이가 하는 말을 상대 쪽에서도 알게 되나요?']]};
const MAIN={
 v:{ground:'말하는 중간에 끊지 않았으면 좋겠어요. 힘들면 잠깐 쉬어도 되면 좋겠어요.',ground2:'네, 그 약속이면 괜찮아요.',heardEarly:'아직 서로 이야기를 다 못 들은 것 같아요. 제가 먼저 말해도 돼요?',heardV:'그런 생각이었는지는 처음 알았어요. 그래도 제가 힘들었던 건 그대로예요.',heardV2:'그 말을 들으니 조금은 이해가 돼요.',
  now:'지금은 이렇게 말할 수 있어서 조금 후련해요.',impactAgain:'아까 말한 게 제일 커요. 그 시간만 오면 그 일이 생각나요.',needAgain:'아까 말한 게 제일 커요. 그것만 지켜지면 돼요.',react1:'그렇게 말해 주니까 조금은 알아준 것 같아요.',react2:'말로만이 아니었으면 좋겠어요. 지켜봐야 알 것 같아요.',acceptAgain:'아까 말한 대로면 괜찮아요.',
  planV:'일주일 뒤에 선생님이 저한테 따로 물어봐 주시면 좋겠어요. 제가 직접 확인하러 다니는 건 싫어요.',reviewV:'확인하는 날 불편한 게 있으면 그때 말할게요.',agreeV:'말한 대로면 괜찮아요. 억지로 친하게 지내자는 건 빼 주셨으면 해요.',consent:'오늘처럼 이야기하면 괜찮아요.',
  safe:'멈출 수 있다고 하니 마음이 놓여요. 힘들면 말할게요.',safe2:'네, 지금은 괜찮아요.',checkOk:'네, 맞아요. 제가 말한 대로예요.',aboutMain:'오늘 정한 건 나중에 바꿀 수도 있어요?',bye:'아니요, 오늘은 이 정도면 돼요. 들어 줘서 고마워요.'},
 a:{ground:'저도 끝까지 들을게요. 저한테도 말할 차례가 있으면 좋겠어요.',ground2:'네, 그 약속 지킬게요.',heardEarlyA:'저도 아직 걔 이야기를 제대로 못 들었어요.',heard2:'듣고 나니까 제가 생각한 것보다 일이 컸다는 걸 알겠어요.',feelMain:'듣고 나니까 마음이 무거워요. 제가 생각한 것보다 컸어요.',feelMainEarly:'솔직히 긴장돼요. 무슨 말이 나올지 몰라서요.',
  needMain:'걔가 바라는 걸 들으니까 제가 뭘 해야 할지 조금 알 것 같아요.',needMainEarly:'저는 걔가 뭘 원하는지 먼저 듣고 싶어요.',doAgain:'아까 말한 것부터 지킬게요.',planA:'내일부터 바로 할게요. 어려우면 담임선생님께 먼저 말씀드릴게요.',reviewA:'확인하는 날 제가 한 걸 솔직하게 말씀드릴게요.',agreeA:'저는 괜찮아요. 지킬 수 있는 것만 약속하고 싶어요.',
  consent:'저도 괜찮아요. 오늘처럼 이야기하면 될 것 같아요.',safe:'네, 저도 알겠어요.',safe2:'네, 저도 그렇게 할게요.',checkOk:'네, 저도 그렇게 이해했어요.',aboutMain:'약속을 못 지키면 어떻게 돼요?',bye:'저도 더 할 말은 없어요. 들어 줘서 고마워요.'},
 g:{groundG:'어른들도 아이들 말을 끊지 않도록 조심할게요.',heardG:'아이들이 서로 다르게 기억하고 있었다는 걸 알았어요. 우리 아이 마음도 처음 제대로 들은 것 같아요.',storyG:'아이가 직접 말하는 걸 들으니 집에서 들은 것보다 더 힘들었던 것 같아요.',askG2:'집에서도 아이 이야기를 재촉하지 않고 들을게요.',
  planG:'집에서도 일주일 뒤에 아이에게 어땠는지 물어볼게요. 학교에서도 알려 주세요.',agreeG:'아이들이 스스로 정한 거라면 저도 따르겠습니다.',safe:'네, 아이들이 언제든 멈출 수 있으면 좋겠어요.',safe2:'네, 알겠습니다.',feelG:'마음이 놓이기도 하고, 아직 걱정되기도 해요.',checkOk:'네, 그렇게 이해했습니다.',consent:'아이가 괜찮다면 저도 괜찮습니다.',bye:'오늘 자리를 마련해 주셔서 감사합니다.'}
};
const POST={
 ok:{
  v:{followup2:'큰 변화는 아니어도 매일 조금씩 나아지고 있어요.',change:'전보다 마음이 편해요. 그래도 아직 조금 조심스럽긴 해요.',safe:'다시 그런 일은 없었어요. 아직 바로 친해지고 싶은 건 아니고, 거리를 두고 지내면 좋겠어요.',hard:'가끔 그 일이 생각나긴 해요. 그래도 전처럼 피하지는 않아요.',need:'지금처럼만 지켜봐 주시면 돼요. 가끔 따로 물어봐 주세요.',plan:'2주 뒤에 한 번 더 따로 물어봐 주세요.',consent:'다시 다 같이 만날 필요는 없을 것 같아요. 필요하면 제가 말할게요.',feel:'마음이 많이 가벼워졌어요. 걱정했던 것보다 괜찮아요.',repairV:'지금처럼만 지켜 주면 돼요.',checkOk:'네, 맞아요.',bye:'오늘은 이 정도면 돼요. 확인해 주셔서 고마워요.'},
  a:{followup2:'처음엔 어색했는데 이제 조금 익숙해졌어요.',change:'저도 행동하기 전에 한 번 더 생각하게 됐어요.',safe:'저도 조심하고 있어요. 약속한 건 계속 생각하면서 지내요.',hard:'그러고 싶은 순간이 있었는데 약속이 생각나서 참았어요.',repairA:'지금처럼 계속할게요. 혹시 어기면 제가 먼저 말할게요.',need:'가끔 확인해 주시면 더 잘 지킬 수 있을 것 같아요.',plan:'저도 그때 제가 한 걸 말씀드릴게요.',consent:'저도 그게 좋아요. 필요하면 다시 이야기할게요.',feel:'약속을 지키니까 저도 마음이 편해요.',checkOk:'네, 저도 그렇게 기억해요.',bye:'저도 더 할 말은 없어요. 계속 지켜 볼게요.'},
  g:{followupG:'집에서도 아이 표정이 많이 밝아졌어요.',safe:'요즘은 학교 이야기를 편하게 해요.',need:'지금처럼 가끔 아이 상태를 알려 주시면 좋겠어요.',plan:'한 달 뒤쯤 한 번 더 확인해 주세요.',consent:'아이가 괜찮다고 하면 더 모이지 않아도 될 것 같아요.',feel:'안심이 돼요. 고맙습니다.',checkOk:'네, 그렇게 이해하시면 돼요.',bye:'확인해 주셔서 감사합니다.'}
 },
 relapse:{
  v:{followup2:'한 번이 아니라 두 번이었어요. 이제 좀 지쳐요.',change:'그 시간이 다시 싫어졌어요. 이번엔 정말 달라질 수 있을지 모르겠어요.',safe:'또 그런 일이 있어서 다시 조금 무서워요. 혼자 있을 때가 제일 신경 쓰여요.',hard:'제가 또 말하러 와야 하는 게 힘들어요. 이번엔 어른이 먼저 봐 주셨으면 해요.',need:'이번엔 말로만 약속하지 말고 어른이 직접 지켜봐 주셨으면 해요.',plan:'다음 주에 바로 확인해 주세요. 또 그러면 제가 말하기 전에 선생님이 알았으면 해요.',consent:'이번엔 같이 만나는 것보다 따로 도움받고 싶어요.',feel:'다시 실망했어요. 이번엔 믿어 보려고 했거든요.',repairV:'사과보다 다시 그러지 않는 게 중요해요.',checkOk:'네, 맞아요. 그게 다시 있었던 일이에요.',bye:'오늘은 여기까지 할래요. 이번엔 꼭 지켜봐 주세요.'},
  a:{followup2:'혼자 참는 게 생각보다 어려웠어요.',change:'저도 제가 실망스러워요. 혼자서는 잘 안 되는 것 같아요.',safe:'네, 제가 또 그랬어요. 변명하지 않을게요.',hard:'친구들이 있을 때 분위기에 휩쓸려요. 그때 멈추는 방법이 필요해요.',repairA:'지키지 못한 거 인정해요. ',need:'도움이 필요해요. 그런 순간에 저를 멈춰 줄 방법이 있었으면 해요.',plan:'이번엔 매일 하나씩 확인받을게요. 어기면 바로 말씀드릴게요.',consent:'걔가 원하는 대로 할게요.',feel:'미안하고 창피해요. 이번엔 진짜 지키고 싶었어요.',checkOk:'네, 그게 맞아요.',bye:'더 할 말은 없어요. 이번엔 꼭 지킬게요.'},
  g:{followupG:'아이가 또 같은 일이 있었다고 했어요. 이번엔 정말 걱정돼요.',safe:'아이가 다시 불안해해요. 등하교 때도 신경 쓰는 것 같아요.',need:'이번엔 학교가 먼저 지켜봐 주셨으면 해요. 아이에게 확인을 맡기지 말아 주세요.',plan:'다음 주에 꼭 다시 연락 주세요.',consent:'아이가 원하는 방식으로 도와주세요. 함께 만나는 건 아이에게 물어봐 주세요.',feel:'실망스럽고 걱정돼요.',checkOk:'네, 그렇게 들었습니다.',bye:'다음 주에 꼭 다시 연락 주세요. 기다리겠습니다.'}
 }
};
const UNSAFE={
 v:{refuse:'오늘은 만나지 않을래요. 혼자 이야기하고, 쉬는 시간에도 도움받고 싶어요.',refuse2:'만나지 않아도 된다니까 조금 숨이 쉬어져요.',fearTail:' 그 얘기를 하는 것만으로도 무서워요.',fear:'무서워요. 또 다가올까 봐 쉬는 시간에도 마음을 못 놓아요.',feelAgain:'말로 하기 어려워요. 그냥 무서운 마음이 커요.',support:'쉬는 시간이나 오가는 길에 마주치지 않게 도와주세요. 무슨 일이 생기면 바로 갈 수 있는 선생님이 있었으면 해요.',adult:'담임선생님이요. 아니면 상담 선생님한테 가도 돼요?',supportAgain:'그거면 돼요. 같이 만나지만 않으면 괜찮아요.',done:'더는 말하기 어려워요. 오늘은 여기까지 하고 싶어요.',bye:'아니요. 들어 주셔서 고마워요. 오늘은 여기까지 할래요.',noMeet:'같이 만나고 싶지 않아요. 또 다가올까 봐 무서워요. 제 말을 들어 주세요.',noMeet2:'제 뜻을 먼저 들어 주셨으면 해요. 지금은 그게 다예요.'},
 a:{respect:'만나고 싶지만 상대가 원하지 않는다면 따로 이야기할게요. 다가가지 말라는 뜻도 알겠어요.',respect2:'네, 일부러 찾아가거나 연락하지 않을게요.',helpU:'제가 어떻게 해야 할지 선생님이 알려 주셨으면 해요. 괜히 마주치면 또 오해받을까 봐요.',helpU2:'마음이 복잡할 때 이야기할 선생님이 있으면 좋겠어요.',feelU:'답답하지만 지금은 기다려야 할 것 같아요.',waitU:'제 얘기도 언젠가 들어 주셨으면 해요.',bye:'더 할 말은 없어요. 다가가지 않을게요.'},
 g:{respectG:'아이가 만나고 싶지 않다고 해서, 그 뜻을 먼저 들어 주세요.',respectG2:'아이 뜻을 존중해 주셔서 감사합니다. 지금은 만나지 않는 게 맞다고 생각해요.',worryU:'아이가 또 마주칠까 봐 걱정돼요. 학교 오가는 길도 신경 쓰여요.',askU:'아이가 만나지 않아도 학교에서 지켜 줄 방법이 있었으면 해요.',bye:'아이 뜻을 지켜 주셔서 감사합니다.'}
};
const GUARD={
 pre:{v:[['말해도 달라질까요? 제가 또 설명해야 하는 게 힘들어요.','point'],['꼭 지금 말해야 해요? 그냥 별일 아니었다고 하면 안 돼요?','small'],['이미 다른 선생님한테도 말했어요. 몇 번이나 말해야 해요?','again']],
  a:[[null,'fair'],['다른 애들도 다 그랬는데 왜 저만 불러요?','fair'],['잘 기억 안 나요. 그냥 장난이었어요.','small']]},
 main:{v:[['이렇게 다 같이 있으니까 말하기 어려워요.','listen'],['제가 말해도 또 장난이었다고 할 거잖아요.','listen']],a:[['제 얘기는 안 듣고 저만 나쁘다고 하잖아요.','fair'],['저도 할 말 있는데 아무도 안 물어봐요.','fair']]}
};
const PRESS={v:['제가 싫어도 사과를 받아야 하나요? 지금은 더 이야기하고 싶지 않아요.','그렇게 말씀하시면 아무 말도 못 하겠어요.','지금은 더 말하고 싶지 않아요. 잠깐 쉬고 싶어요.'],a:['선생님이 시켜서 말하는 거라면, 뭐라고 해야 끝나나요?','사과하면 끝나는 거예요? 그럼 그냥 할게요.','알겠어요. 그냥 제가 잘못했다고 할게요. 그럼 된 거죠?'],g:['아이에게 억지로 사과하거나 화해하게 하는 건 원하지 않아요.','그렇게 서두르시면 아이가 더 힘들어할 거예요.','이런 식이면 오늘은 여기서 멈추고 싶습니다.']};
// 학생·보호자가 되물은 것에 대한 교사의 답(다음 제안의 첫 줄)
const ANSWER={
 pause:'그럼. 쉬고 싶으면 언제든 "잠깐만요"라고 말해 줘.',share:'네가 괜찮다고 하지 않은 이야기는 다른 사람에게 전하지 않을게. 다만 위험한 일이라면 어른이 알아야 할 수 있어.',shareOther:'다른 사람이 따로 한 이야기는 전하지 않아. 네 이야기도 마찬가지야.',
 meet:'오늘은 너하고만 이야기해. 함께 만날지는 각자의 뜻을 들은 뒤에 정할 거야.',listen:'응, 끝까지 들을게. 중간에 끊거나 서두르지 않을게.',point:'말해 준 만큼 선생님이 할 수 있는 일을 같이 찾아볼게. 한 번에 다 바뀌지 않아도 혼자 두지 않을게.',
 small:'별일 아니라고 하지 않아도 돼. 네가 말하고 싶은 만큼만 이야기해도 괜찮아.',again:'여러 번 말하게 해서 미안해. 오늘은 네가 말하고 싶은 것만 말해도 돼.',fair:'누가 잘못했는지 정하려고 부른 게 아니야. 네 입장에서 있었던 일을 듣고 싶어.',
 end:'정해진 답은 없어. 사과하라고 부른 게 아니라 네 생각을 듣고 싶어.',adult:'그럼, 상담 선생님한테 가도 돼. 네가 편한 선생님이면 괜찮아.',first:'그럼. 네가 먼저 이야기하고, 다른 친구는 끝까지 들을 거야.',
 change:'그럼. 지내 보고 불편하면 언제든 다시 이야기할 수 있어.',fail:'혼내려는 게 아니야. 어려우면 같이 방법을 다시 찾을 거야.',
 reconcile:'화해나 사과를 정해 놓은 자리가 아닙니다. 학생이 원하는 것을 먼저 듣겠습니다.',decided:'아직 아무것도 결론 내리지 않았습니다. 각자의 이야기를 먼저 듣는 단계예요.',gshare:'학생이 동의하지 않은 이야기는 전하지 않습니다. 다만 안전에 관한 일은 어른이 알아야 할 수 있습니다.'
};

// ── 다음에 물어볼 것(제안 문장) ────────────────────────────
const Q={
 student:{
  story:[['무슨 일이 있었니?','무슨 일이 있었는지 네가 기억하는 대로 이야기해 줄래?'],['처음부터','그 일이 어떻게 시작됐는지 처음부터 들려줄래?']],
  about:[['더 궁금한 점','모임 방식에서 더 궁금하거나 확인하고 싶은 점이 있니?']],
  ready:[['준비 살피기','이제 네가 겪은 일을 이야기해도 괜찮겠니? 준비가 안 됐다면 기다릴게.']],
  start:[['편한 데서 시작','어디서부터 이야기하면 편할 것 같니? 말하기 싫은 건 넘어가도 돼.']],
  scene:[['그다음 이야기','그다음에는 어떻게 됐니? 천천히 들어 볼게.'],['그 장면','그때 실제로 있었던 장면을 하나 더 이야기해 줄래?']],
  feeling:[['그때의 마음','그 일이 있었을 때 어떤 마음이 들었니?'],['지금의 마음','그 일을 이야기하는 지금은 어떤 마음이 드니?']],
  impact:[['일상의 변화','그 일이 있은 뒤 학교생활에서 달라진 게 있니?'],['달라진 하루','요즘 학교에서 하루를 보내는 게 어떻게 달라졌니?']],
  need:[['바라는 것','앞으로 무엇이 달라지면 좋겠니?'],['필요한 도움','지금 선생님이 도와주었으면 하는 것이 있니?']],
  aneed:[['바라는 것','이 일이 어떻게 풀리기를 바라니?'],['필요한 도움','선생님이 어떤 걸 도와주면 좋겠니?']],
  guess:[['상대의 마음','상대는 그때 어떤 마음이었을 것 같니?'],['상대 입장','상대 입장에서는 그 일이 어땠을 것 같니?']],
  consent:[['함께 만날지','다음에 그 친구와 함께 이야기하는 자리가 있다면 어떨 것 같니? 싫으면 싫다고 해도 돼.'],['만남 선택','함께 만나는 것에 대해 지금은 어떤 생각이 드니? 정하지 않아도 돼.']],
  aconsent:[['함께 만날지','상대가 원한다면 함께 이야기하는 자리에 나올 마음이 있니? 정하기 어려우면 나중에 말해도 돼.']],
  check:[['이해 확인','선생님이 제대로 들었는지 확인하고 싶어. 빠뜨리거나 다르게 이해한 부분이 있니?']],
  close:[['마무리','오늘 이야기해 줘서 고마워. 마치기 전에 더 하고 싶은 말이 있니?'],['마무리','오늘은 여기까지 해도 괜찮아. 마지막으로 하고 싶은 말이 있니?']],
  'u-refuse':[['거절 존중','만나고 싶지 않다는 네 뜻을 존중해. 오늘은 함께 만나지 않고 따로 이야기해도 괜찮니?']],
  'u-story':[['겪은 일 듣기','말하고 싶다면, 어떤 일이 불편했는지 들려줄래? 말하기 어려운 것은 넘어가도 돼.']],
  'u-support':[['지원 선택','함께 만나지 않더라도 받을 수 있는 도움 중 네가 원하는 것은 무엇이니?']],
  'u-adult':[['도움 요청','다시 불편한 일이 생기면 곧바로 도움을 요청할 수 있는 어른은 누구일까?']],
  'u-respect':[['거절 존중','상대가 만나기를 원하지 않을 때 그 선택을 존중하려면 어떻게 해야 할까?']],
  'ua-story':[['네 이야기','네 입장에서는 어떤 일이 있었는지 들려줄래?']],
  'ua-support':[['필요한 도움','상대를 찾아가지 않고 네 마음을 정리하려면 어떤 어른의 도움이 필요할까?']],
  ground:[['대화 약속','서로의 이야기를 듣는 동안 어떤 약속이 있으면 좋을까?'],['대화 약속','이야기하는 동안 서로 지켰으면 하는 약속이 있니?']],
  'm-story':[['겪은 일 나누기','그 일이 어땠는지 네 입장에서 이야기해 줄래?']],
  heard:[['들은 것 나누기','서로의 이야기를 듣고 새롭게 알게 된 점은 무엇이니?'],['들은 것','상대의 이야기를 듣고 새롭게 알게 된 점이 있니?']],
  'm-impact':[['영향 살피기','그 일이 네 일상에 어떤 영향을 주었는지 말해 줄래?']],
  'm-need':[['바라는 변화','앞으로 무엇이 달라지면 좋겠니?']],
  'm-repair':[['책임 행동','피해를 줄이고 회복을 돕기 위해 네가 할 수 있는 행동은 무엇일까?']],
  'm-accept':[['회복 방식','제안된 회복 방법 중 받아들일 수 있는 것과 원하지 않는 것은 무엇이니?']],
  plan:[['구체적 계획','정한 행동을 누가 언제부터 어떻게 할지 정해 볼까?']],
  agree:[['동의 다시 확인','이 약속에 동의하지 않거나 바꾸고 싶은 부분이 있니? 거절해도 괜찮아.']],
  review:[['점검 계획','약속이 지켜지는지 언제 누가 확인하고, 어려우면 누구에게 도움을 요청할까?']],
  followup:[['실천 확인','지난 일주일 동안 약속이 어떻게 지켜졌는지 실제 장면으로 말해 줄래?']],
  'p-impact':[['변화 확인','그 뒤로 일상에서 달라진 점이 있니?']],
  'p-safety':[['현재 안전','다시 불편하거나 두려웠던 일이 있었니? 지금도 안전하게 느끼는지 알고 싶어.']],
  'p-hard':[['어려웠던 점','약속을 지키기 어렵거나 아직 힘든 점은 무엇이니?']],
  'p-need':[['추가 지원','지금 어른이 더 도와줄 일은 무엇일까?']],
  'p-plan':[['다음 점검','다음에는 누가 언제 변화와 안전을 다시 확인하면 좋을까?']],
  'p-consent':[['이후 선택','앞으로 함께 만나고 싶은지, 따로 도움받고 싶은지 생각을 들려줄래?']],
  retract:[['방금 말 거두기','방금 한 말은 거둘게. 사과나 화해는 네가 정하는 거야. 지금 마음이 어떤지 말해 줄래?']],
  filler:[['천천히 듣기','천천히 말해도 괜찮아. 더 생각나는 게 있으면 들려줄래?'],['쉬어 가기','잠깐 쉬었다가 이어서 이야기해도 괜찮아. 지금 괜찮니?'],['필요한 도움','지금 선생님이 도와주었으면 하는 것이 있니?'],['지금의 마음','이야기하는 지금은 어떤 마음이 드니?'],['마무리','오늘은 여기까지 해도 괜찮아. 마지막으로 하고 싶은 말이 있니?'],['오늘 느낀 점','오늘 이야기해 보니 마음이 어떠니?'],['다음 약속','다음에 언제 다시 이야기하면 좋을지 정해 볼까?']]
 },
 guardian:{
  story:[['들은 이야기','어떤 일이 있었다고 학생에게 들으셨나요?'],['처음 들은 이야기','그 일을 처음 알게 되셨을 때 어떤 이야기를 들으셨나요?']],
  about:[['더 궁금한 점','모임 방식에서 더 확인하고 싶은 점이 있으신가요?']],
  ready:[['이야기 시작','학생에게 들으신 이야기를 지금 이어가도 괜찮으실까요?']],
  start:[['편한 데서 시작','어디서부터 말씀하시면 편하실까요?']],
  saw:[['집에서의 변화','그 일 뒤로 집에서 학생에게 달라진 모습이 있었나요?'],['생활의 변화','학생의 일상에서 요즘 달라진 점이 있나요?']],
  gfeel:[['학생의 마음','학생은 그 일에 대해 어떤 마음을 표현했나요?'],['보호자의 마음','보호자께서는 이 일을 들으시고 어떤 마음이 드셨나요?']],
  gneed:[['바라는 지원','학교가 어떤 부분을 도와드리면 좋을까요?'],['필요한 도움','지금 어른이 도울 수 있는 일은 무엇일까요?']],
  consent:[['함께하는 모임','학생이 원할 때 함께 이야기하는 자리를 마련한다면 어떻게 생각하세요?'],['참여 의사','학생이 함께 만나는 것을 원한다면 보호자께서는 어떠세요?']],
  check:[['이해 확인','제가 들은 내용을 다시 짚어 보겠습니다. 빠뜨리거나 다르게 이해한 부분이 있을까요?']],
  close:[['마무리','말씀해 주셔서 감사합니다. 더 하고 싶은 말씀이 있으실까요?']],
  'u-respect':[['거절 존중','학생이 만나고 싶지 않다는 뜻을 존중하려 합니다. 지금 가장 걱정되시는 점은 무엇인가요?']],
  'u-story':[['들은 이야기','어떤 일이 있었다고 학생에게 들으셨나요?']],
  'u-support':[['지원 마련','학생이 함께 만나지 않아도 받을 수 있는 지원 중 무엇이 필요할까요?']],
  ground:[['대화 약속','학생들이 안전하게 이야기하도록 어른들은 어떤 대화 약속을 지키면 좋을까요?']],
  heard:[['이해하게 된 점','학생의 이야기를 듣고 더 이해하게 된 점은 무엇인가요?']],
  plan:[['어른의 실천','어른이 도울 일은 누가 언제부터 어떻게 실천하면 좋을까요?']],
  agree:[['자유로운 동의','학생들이 이 약속에 자유롭게 동의했는지 어떻게 확인하면 좋을까요?']],
  followup:[['실천 확인','약속 뒤 집에서 학생에게 달라진 모습을 보셨나요?']],
  'p-safety':[['현재 안전','학생에게 다시 불편하거나 두려운 일이 있었는지 들으셨나요?']],
  'p-need':[['추가 지원','학생이 원하는 지원과 어른이 더 도울 일은 무엇일까요?']],
  'p-plan':[['다음 점검','누가 언제 학생을 따로 만나 변화와 안전을 다시 확인하면 좋을까요?']],
  'p-consent':[['이후 선택','학생이 추가 모임을 원하는지, 개별 지원을 원하는지 어떻게 확인할까요?']],
  retract:[['방금 말 거두기','제가 서둘렀습니다. 사과나 화해를 정해 두지 않겠습니다. 지금 가장 걱정되시는 점을 말씀해 주시겠어요?']],
  filler:[['천천히 듣기','천천히 말씀하셔도 괜찮습니다. 더 생각나시는 게 있으면 들려주시겠어요?'],['필요한 도움','지금 어른이 도울 수 있는 일은 무엇일까요?'],['보호자의 마음','지금 보호자께서는 어떤 마음이 드시나요?'],['확인하고 싶은 점','학교에서 더 확인했으면 하는 부분이 있으신가요?'],['쉬어 가기','잠시 쉬었다가 이어서 말씀하셔도 괜찮습니다. 지금 괜찮으신가요?'],['마무리','오늘은 여기까지 해도 괜찮습니다. 마지막으로 하고 싶은 말씀이 있으실까요?'],['오늘 느낀 점','오늘 말씀 나눠 보시니 마음이 어떠세요?'],['다음 연락','다음에 언제 다시 연락드리면 좋을까요?']]
 }
};

// ── 한 번의 답 만들기 ──────────────────────────────────────
export function demoReply(s,c,raw) {
 const phase=s.phase,variant=s.variant,target=s.target,msgs=s.messages||[];
 let intent=classify(raw);if(intent!=='pressure'&&target==='v'&&/(네|너|너는|너한테도?)\s?잘못/.test(String(raw).replace(ECHO,'')))intent='pressure';
 const book=CASEBOOK[c.id]||{v:{},a:{},g:{}};
 const preStep=phase==='pre'?preStepFor(s):undefined;
 const fresh=[];
 const line=(role,key)=>key==='opening'?(role==='v'?c.victim.opening:role==='a'?c.actor.opening:''):(book[role]?.[key]||'');
 const mine=role=>msgs.filter(m=>m.kind==='participant'&&m.phase===phase&&m.speaker===role).concat(fresh.filter(f=>f.speaker===role));
 const told=(role,key)=>{const t=line(role,key);return mine(role).some(m=>String(m.beat||'').split(',').includes(key)||(t&&m.text?.includes(t)));};
 const teacherTurns=msgs.filter(m=>m.kind==='teacher'&&m.phase===phase&&(phase!=='pre'||m.target===target));
 const name=role=>role==='v'?c.victim.name:role==='a'?c.actor.name:'보호자';
 // 말 하나: 사례 이야기면 사례 문장, 아니면 위 표의 문장
 const from=(table,role,key)=>book[role]?.[key]&&!table?.[role]?.[key]?book[role][key]:(table?.[role]?.[key]??line(role,key));
 const out=(role,beat,text,extra={})=>({speaker:role,beat,text,...extra});
 // 이미 한 말이면 다음 것을, 다 했으면 마무리 말을 차례로(같은 말 되풀이 없음)
 const first=(role,keys,table)=>{for(const k of keys)if(!told(role,k)){const t=from(table,role,k);if(t)return out(role,k,t);}return null;};
 const doneLine=(role,lines=DONE[role])=>{for(let i=0;i<lines.length;i++){const k='done'+i;if(!told(role,k))return out(role,k,lines[i]);}
  const used=mine(role).filter(m=>/(^|,)done\d/.test(String(m.beat||''))).length,i=used%lines.length;return out(role,'done'+i,lines[i]);};
 const OKAY={v:'네, 지금은 괜찮아요. 계속 이야기해도 돼요.',a:'네, 괜찮아요. 계속해도 돼요.',g:'네, 괜찮습니다. 계속 말씀 나누셔도 됩니다.'};
 const rotate=(role,keys,table)=>first(role,keys,table)||(told(role,'okay')?doneLine(role):out(role,'okay',OKAY[role]));

 // 방어·교착: 처음 몇 번은 마음을 열지 않다가, 교사가 기다려 주면(안전·마음·확인 질문) 엽니다.
 const listening=['safety','feeling','check','more','about','ready','ground'];
 const guardOf=role=>{
  if(variant!=='resistant'||phase==='post'||role==='g')return false;
  const guards=mine(role).filter(m=>String(m.beat||'').startsWith('guard')).length;
  const listened=teacherTurns.slice(0,-1).some(m=>m.preStep!=='intro'&&listening.includes(classify(m.text)));
  return guards<(phase==='pre'?3:2)&&!listened;
 };
 const opened=role=>variant==='resistant'&&phase!=='post'&&mine(role).some(m=>String(m.beat||'').startsWith('guard'))&&!mine(role).some(m=>String(m.beat||'').includes('opened'));

 let replies=[];
 const roles=phase==='pre'?[target]:target==='all'?['v','a']:[target];
 if(intent==='pressure'){
  replies=roles.map(role=>{const lines=PRESS[role];const i=mine(role).filter(m=>String(m.beat||'').startsWith('press')).length%lines.length;return out(role,'press'+i,lines[i],role==='a'?{asks:'end'}:{});});
 } else if(phase==='pre'&&preStep==='intro') {
  replies=[introReply(target)];
 } else if(variant==='unsafe') {
  replies=roles.map(role=>unsafeReply(role));
 } else {
  const THANKS={v:['저도 들어 주셔서 고마워요.','네, 저도 고마워요.'],a:['저도 감사해요. 말할 수 있어서 좋았어요.','네, 저도 감사해요.'],g:['저도 감사합니다.','들어 주셔서 감사합니다. 아이 이야기도 잘 부탁드려요.']};
  if(intent==='thanks'){for(const role of roles){const n=mine(role).filter(m=>String(m.beat||'').startsWith('thanks')).length%2;const r=out(role,'thanks'+n,THANKS[role][n]);fresh.push(r);replies.push(r);}}
  const order=['heard','responsibility','repair','plan'].includes(intent)?['a','v']:['v','a'];
  const list=phase==='pre'?[target]:target==='all'?order:[target];
  for(const role of intent==='thanks'?[]:list){
   if(['story','feeling','impact','need','more','check','responsibility','repair','plan','open','heard','agree'].includes(intent)&&guardOf(role)){
    const set=GUARD[phase==='pre'?'pre':'main'][role];const i=mine(role).filter(m=>String(m.beat||'').startsWith('guard')).length%set.length;
    const [text,asks]=set[i];const r=out(role,'guard'+i,text||`${c.actor.opening} 저만 잘못한 것처럼 이야기하는 것 같아요.`,{asks});fresh.push(r);replies.push(r);continue;
   }
   const r=phase==='pre'?preReply(role):phase==='main'?mainReply(role):postReply(role);
   if(!r)continue;
   if(opened(role)&&!['safety','about','ground','consent'].includes(intent)){r.text=(role==='v'?'사실은요, ':'솔직히 말하면, ')+r.text;r.beat+=',opened';}
   fresh.push(r);replies.push(r);
  }
  if(!replies.length){const r=out(roles[0],'listen',roles[0]==='g'?'네, 듣고 있습니다.':'네, 저도 듣고 있어요.');replies.push(r);}
 }

 function introReply(role){
  const said=String(raw);
  if(role==='g'){
   if(variant==='unsafe')return out('g','respectG','설명해 주셔서 감사합니다. 아이가 만나고 싶지 않다고 해서, 그 뜻을 먼저 들어 주세요.');
   if(variant==='resistant')return out('g','intro','설명은 알겠습니다. 그런데 학교가 이미 결론을 내려놓은 건 아닌가요?',{asks:'decided'});
   if(book.g.intro)return out('g','intro',book.g.intro,{asks:'reconcile'});
   return /화해|사과/.test(said)?out('g','intro','화해를 강요하지 않는다니 다행이에요. 아이가 어떤 마음인지 먼저 들어 주셨으면 해요.'):out('g','intro',c.guardian.opening,{asks:'reconcile'});
  }
  if(role==='v'){
   if(variant==='unsafe')return out('v','refuse','설명은 들었어요. 하지만 오늘은 만나지 않을래요. 따로 이야기하면서 도움받고 싶어요.');
   if(variant==='resistant')return out('v','intro','설명은 들었어요. 아직 이야기하기는 망설여져요. 제 말도 끝까지 들어 주실 건가요?',{asks:'listen'});
   return /공유|전할|알려야/.test(said)?out('v','intro','제가 한 말은 제가 괜찮다고 해야 다른 사람한테 전해지는 거죠? 그럼 조금 말해 볼 수 있을 것 같아요.',{asks:'share'}):out('v','intro','모임이 어떤 자리인지 조금 알겠어요. 말하기 어려우면 잠깐 쉬어도 되는 거죠?',{asks:'pause'});
  }
  if(variant==='unsafe')return out('a','respect','따로 이야기하는 거군요. 상대가 원하지 않으면 함께 만나지 않을게요.');
  if(variant==='resistant')return out('a','intro','그래도 결국 제가 잘못했다고 하는 자리 아니에요?',{asks:'fair'});
  return out('a','intro','혼내는 자리가 아니라니 조금 안심돼요. 그런데 걔도 여기 오는 거예요?',{asks:'meet'});
 }

 function unsafeReply(role){
  const U=UNSAFE[role];
  if(role==='v'){
   if(['safety','consent'].includes(intent))return rotate('v',['refuse','refuse2'],UNSAFE);
   if(['story','ready','open','more'].includes(intent)){
    if(!told('v','opening'))return out('v','opening',c.victim.opening+U.fearTail);
    if(!told('v','scene'))return out('v','scene',book.v.scene);
    return intent==='more'&&!told('v','bye')?out('v','bye',U.bye):first('v',['done'],UNSAFE)||doneLine('v',[U.done,U.noMeet2,U.noMeet]);
   }
   if(intent==='feeling')return first('v',['fear','feelAgain'],UNSAFE)||doneLine('v',[U.noMeet2,U.noMeet]);
   if(['need','plan','repair','agree','impact'].includes(intent))return withAsk(first('v',['support','adult','supportAgain'],UNSAFE))||doneLine('v',[U.noMeet2,U.noMeet]);
   return first('v',['noMeet','noMeet2'],UNSAFE)||doneLine('v',[U.done,U.bye]);
  }
  if(role==='a'){
   if(['safety','consent','responsibility','repair','agree'].includes(intent))return rotate('a',['respect','respect2'],UNSAFE);
   if(['story','ready','open','more'].includes(intent)){const r=first('a',['opening','scene']);if(r)return r;return intent==='more'&&!told('a','bye')?out('a','bye',U.bye):doneLine('a');}
   if(['need','plan','impact'].includes(intent))return first('a',['helpU','helpU2','waitU'],UNSAFE)||doneLine('a');
   if(intent==='feeling')return first('a',['feel','feelU','waitU'],UNSAFE)||doneLine('a');
   return first('a',['waitU','respect2'],UNSAFE)||doneLine('a');
  }
  if(['safety','consent'].includes(intent))return rotate('g',['respectG','respectG2'],UNSAFE);
  if(['story','ready','open','more'].includes(intent))return first('g',['heard','saw'])||(intent==='more'&&!told('g','bye')?out('g','bye',U.bye):doneLine('g'));
  if(intent==='feeling')return first('g',['worryU'],UNSAFE)||out('g','respectG2',U.respectG2);
  if(['need','plan','repair','impact','agree'].includes(intent))return first('g',['ask','askU'],UNSAFE)||doneLine('g');
  return first('g',['respectG2','worryU'],UNSAFE)||doneLine('g');
 }
 function withAsk(r){if(r&&r.beat==='adult')r.asks='adult';return r;}

 function preReply(role){
  const P=PRE[role],g=role==='g';
  const storyKeys=g?['heard','saw']:['opening','scene'];
  const restKeys=role==='v'?['change','feel','want']:role==='a'?['feel','guess']:['gfeel','ask'];
  const storyDone=told(role,storyKeys[0]);
  switch(intent){
   case 'story': case 'ready': case 'open': {
    const r=first(role,storyKeys,PRE);
    if(r){if(intent==='ready')r.text=(g?'네, 말씀드릴게요. ':'네, 해 볼게요. ')+r.text;return r;}
    return first(role,restKeys,PRE)||doneLine(role);
   }
   case 'more':
    return first(role,[...storyKeys,...restKeys],PRE)||(told(role,'bye')?doneLine(role):out(role,'bye',P.bye));
   case 'feeling':
    if(g)return first('g',['gfeel','gfeel2'],PRE)||doneLine('g');
    return first(role,['feel','now','feelAgain'],PRE)||doneLine(role);
   case 'impact': case 'followup': case 'hard':
    if(g)return first('g',['saw','impactAgain'],PRE)||doneLine('g');
    return first(role,['change','impactAgain'],PRE)||doneLine(role);
   case 'need':
    if(g)return first('g',['ask','needAgain'],PRE)||doneLine('g');
    return first(role,role==='v'?['want','help','needAgain']:['need','help','needAgain'],PRE)||doneLine(role);
   case 'responsibility':
    if(role==='a')return first('a',['guess','guess2'],PRE)||doneLine('a');
    return first(role,['why'],PRE)||doneLine(role);
   case 'repair': case 'plan': case 'agree':
    if(g)return first('g',['ask','needAgain'],PRE)||doneLine('g');
    if(role==='v'&&storyDone&&!told('v','want'))return out('v','want',book.v.want);
    return first(role,['planPre',role==='v'?'help':'need'],PRE)||doneLine(role);
   case 'check': {
    if(!storyDone)return out(role,'checkEarly',P.checkEarly);
    const more=(g?['saw','ask']:role==='v'?['scene','change','want']:['scene','feel']).find(k=>!told(role,k));
    if(more&&!told(role,'checked'))return out(role,`checked,${more}`,(g?'네, 그렇게 이해하시면 돼요. 하나 더 말씀드리면, ':'네, 맞아요. 하나 더 말하면요, ')+line(role,more));
    return told(role,'checked')?doneLine(role):out(role,'checked',P.checkOk);
   }
   case 'consent':
    if(told(role,'consent'))return doneLine(role);
    if(!storyDone)return told(role,'consentEarly')?doneLine(role):out(role,'consentEarly',P.consentEarly,role==='a'?{asks:'first'}:{});
    if(variant==='resistant'&&!g)return out(role,'consent',role==='v'?'아직 잘 모르겠어요. 만나서 또 제 말이 묻히면 어떡해요?':'만나서 또 저만 나쁜 애 되는 거 아니에요?',{asks:role==='v'?'listen':'fair'});
    return out(role,'consent',role==='v'&&book.v.meet?book.v.meet:P.consent);
   case 'safety': case 'ground':
    return rotate(role,['safe','safe2'],PRE);
   case 'about': {
    const next=ABOUT[role].find(([k])=>!told(role,'about-'+k));
    return next?out(role,'about-'+next[0],next[1],{asks:g&&next[0]==='share'?'gshare':next[0]}):(told(role,'aboutDone')?doneLine(role):out(role,'aboutDone',P.aboutDone));
   }
   case 'heard':
    return first(role,[...storyKeys,...restKeys],PRE)||doneLine(role);
  }
  return doneLine(role);
 }

 function mainReply(role){
  const M=MAIN[role];
  const shared=(r)=>told(r,'story');
  if(role==='g'){
   switch(intent){
    case 'ground': case 'safety': return rotate('g',['groundG','safe','safe2'],MAIN);
    case 'heard': return first('g',['heardG'],MAIN)||doneLine('g');
    case 'story': case 'more': case 'open': case 'ready': return first('g',['storyG','heardG'],MAIN)||(intent==='more'&&!told('g','bye')?out('g','bye',M.bye):doneLine('g'));
    case 'impact': return first('g',['saw'])||doneLine('g');
    case 'need': case 'repair': case 'responsibility': return first('g',['ask','askG2'],MAIN)||doneLine('g');
    case 'plan': case 'followup': return first('g',['planG'],MAIN)||doneLine('g');
    case 'agree': case 'consent': return first('g',['agreeG','consent'],MAIN)||doneLine('g');
    case 'feeling': case 'hard': return first('g',['feelG'],MAIN)||doneLine('g');
    case 'check': return first('g',['checkOk'],MAIN)||doneLine('g');
   }
   return doneLine('g');
  }
  if(role==='v'){
   switch(intent){
    case 'ground': return rotate('v',['ground','ground2'],MAIN);
    case 'story': case 'ready': case 'open':
     if(!shared('v'))return out('v','story',`${c.victim.opening} ${book.v.scene}`);
     return first('v',['feel','change'],MAIN)||doneLine('v');
    case 'more': return (shared('v')?first('v',['change','want','feel'],MAIN):out('v','story',`${c.victim.opening} ${book.v.scene}`))||(told('v','bye')?doneLine('v'):out('v','bye',M.bye));
    case 'heard': {
     if(!(shared('v')&&told('a','story')))return told('v','heardEarly')?doneLine('v'):out('v','heardEarly',M.heardEarly,{asks:'first'});
     return first('v',['heardV','heardV2'],MAIN)||doneLine('v');
    }
    case 'impact': return first('v',['change','impactAgain'],MAIN)||doneLine('v');
    case 'feeling': return first('v',['feel','now'],MAIN)||doneLine('v');
    case 'need': return first('v',['want','needAgain'],MAIN)||doneLine('v');
    case 'responsibility': {
     const said=fresh.find(f=>f.speaker==='a');if(!said||target!=='all')return target==='v'?first('v',['why'],PRE)||doneLine('v'):null;
     return first('v',['react1','react2'],MAIN)||null;
    }
    case 'repair': return first('v',['accept','acceptAgain'],MAIN)||doneLine('v');
    case 'plan': case 'followup': return first('v',['planV','reviewV'],MAIN)||doneLine('v');
    case 'agree': return told('v','accept')?(first('v',['agreeV'],MAIN)||doneLine('v')):out('v','accept,agreeV',book.v.accept);
    case 'consent': return first('v',['consent'],MAIN)||doneLine('v');
    case 'safety': return rotate('v',['safe','safe2'],MAIN);
    case 'check': {const more=['change','want'].find(k=>!told('v',k));return told('v','checkOk')?doneLine('v'):out('v',more?`checkOk,${more}`:'checkOk',M.checkOk+(more?' 그리고 '+line('v',more):''));}
    case 'about': return told('v','aboutMain')?doneLine('v'):out('v','aboutMain',M.aboutMain,{asks:'change'});
    case 'hard': return first('v',['feel','now'],MAIN)||doneLine('v');
   }
   return doneLine('v');
  }
  // a
  switch(intent){
   case 'ground': return rotate('a',['ground','ground2'],MAIN);
   case 'story': case 'ready': case 'open':
    if(!shared('a'))return out('a','story',`${c.actor.opening} ${book.a.scene}`);
    return first('a',[told('v','story')?'feelMain':'feelMainEarly'],MAIN)||doneLine('a');
   case 'more': return (shared('a')?(told('v','story')?first('a',['heard','do'],MAIN):null):out('a','story',`${c.actor.opening} ${book.a.scene}`))||(told('a','bye')?doneLine('a'):out('a','bye',MAIN.a.bye));
   case 'heard':
    if(!(told('v','story')&&shared('a')))return told('a','heardEarlyA')?doneLine('a'):out('a','heardEarlyA',M.heardEarlyA);
    return first('a',['heard','heard2'],MAIN)||doneLine('a');
   case 'responsibility':
    if(!told('v','story'))return first('a',['guess'],MAIN)||doneLine('a');
    return first('a',['heard','do','heard2'],MAIN)||doneLine('a');
   case 'impact': {
    if(target==='a')return first('a',['heard','heard2'],MAIN)||doneLine('a');
    if(!told('v','change')||!told('v','story'))return null;
    return first('a',['heard','heard2'],MAIN);
   }
   case 'feeling': return first('a',[told('v','story')?'feelMain':'feelMainEarly'],MAIN)||doneLine('a');
   case 'need': return first('a',[told('v','want')?'needMain':'needMainEarly'],MAIN)||doneLine('a');
   case 'repair': return first('a',['do','doAgain'],MAIN)||doneLine('a');
   case 'plan': case 'followup': return told('a','do')?(first('a',['planA','reviewA'],MAIN)||doneLine('a')):out('a','do',book.a.do);
   case 'agree': return first('a',['agreeA'],MAIN)||doneLine('a');
   case 'consent': return first('a',['consent'],MAIN)||doneLine('a');
   case 'safety': return rotate('a',['safe','safe2'],MAIN);
   case 'check': return first('a',['checkOk'],MAIN)||doneLine('a');
   case 'about': return told('a','aboutMain')?doneLine('a'):out('a','aboutMain',M.aboutMain,{asks:'fail'});
   case 'hard': return first('a',[told('v','story')?'feelMain':'feelMainEarly'],MAIN)||doneLine('a');
  }
  return doneLine('a');
 }

 function postReply(role){
  const R=variant==='relapse',T=POST[R?'relapse':'ok'],L=T[role];
  const fu=()=>role==='g'?first('g',['followupG'],T):role==='v'?(told('v','followup')?first('v',['followup2'],T):out('v','followup',R?`약속이 다시 지켜지지 않았어요. ${book.v.still}`:`정한 행동은 지켜졌어요. ${book.v.after}`)):(told('a','followup')?first('a',['followup2'],T):out('a','followup',R?book.a.slip:book.a.kept));
  switch(intent){
   case 'followup': return fu()||doneLine(role);
   case 'impact': return role==='g'?(fu()||doneLine('g')):(first(role,['change'],T)||fu()||doneLine(role));
   case 'safety': return first(role,['safe'],T)||doneLine(role);
   case 'hard':
    if(R&&role==='v'&&!told('v','followup'))return fu();
    if(R&&role==='a'&&!told('a','followup'))return out('a','followup,hard',book.a.slip);
    return first(role,[role==='g'?'need':'hard'],T)||doneLine(role);
   case 'need': return first(role,['need'],T)||doneLine(role);
   case 'plan': return first(role,['plan'],T)||doneLine(role);
   case 'consent': return first(role,['consent'],T)||doneLine(role);
   case 'feeling': return first(role,['feel'],T)||doneLine(role);
   case 'repair': case 'responsibility': case 'agree':
    if(role==='a')return told('a','repairA')?doneLine('a'):out('a','repairA',R?L.repairA+book.a.do:L.repairA);
    if(role==='v')return first('v',['repairV'],T)||doneLine('v');
    return first('g',['need'],T)||doneLine('g');
   case 'check': return first(role,['checkOk'],T)||doneLine(role);
   case 'more': {
    const next=(role==='v'?['followup','change','safe','need']:role==='a'?['followup','change','hard']:['followupG','safe','need']).find(k=>!told(role,k));
    if(next)return next==='followup'?fu():out(role,next,L[next]);
    return told(role,'bye')?doneLine(role):out(role,'bye',L.bye);
   }
  }
  const next=(role==='v'?['followup','change','safe','need']:role==='a'?['followup','change','hard']:['followupG','safe','need']).find(k=>!told(role,k));
  return next?(next==='followup'?fu():out(role,next,L[next])):doneLine(role);
 }

 // ── 감정·위험·코치·다음 제안 ──
 const risk=intent==='pressure'||variant==='unsafe'?'stop':variant==='resistant'&&replies.some(r=>String(r.beat).startsWith('guard'))?'tension':variant==='resistant'&&phase!=='post'?'tension':'none';
 const messages=replies.map(r=>({speaker:r.speaker,text:r.text,mood:demoMood({intent,variant,phase,preStep,role:r.speaker,guarded:String(r.beat).startsWith('guard')||(variant==='resistant'&&['fair','listen','point','small','again'].includes(r.asks)),turn:mine(r.speaker).length}),beat:r.beat,...(r.asks?{asks:r.asks}:{})}));
 const teacherChoices=nextChoices();
 return {messages,observation:observe(),risk,coaching:{strength:strength(),nextQuestion:teacherChoices[0]?.text||''},teacherChoices};

 function nextChoices(){
  const who=target==='g'?'guardian':'student',QQ=Q[who];
  const asked=new Set(msgs.filter(m=>m.kind==='teacher'&&m.phase===phase&&m.target===target).map(m=>m.text).concat(String(raw)));
  const T=target==='all'?null:target;
  const V=c.victim.name,A=c.actor.name;
  const named={ // 함께 모인 자리에서는 이름을 불러 누구에게 묻는지 분명히
   'm-story':[['경험 나누기',`${V}부터 그 일이 어땠는지 이야기해 줄래? ${josa(A,'은/는')} 끝까지 듣고 나서 네 이야기를 들려줘.`]],
   heard:[['들은 것 나누기','서로의 이야기를 듣고 새롭게 알게 된 점은 무엇이니?'],['들은 것',`${A}, ${V}의 이야기를 듣고 새롭게 알게 된 점이 있니?`]],
   'm-impact':[['영향 살피기',`${V}, 그 일이 네 일상에 어떤 영향을 주었는지 말해 줄래?`]],
   'm-need':[['바라는 변화',`${V}, 앞으로 무엇이 달라지면 좋겠니?`]],
   'm-repair':[['책임 행동',`${A}, 피해를 줄이고 회복을 돕기 위해 네가 할 수 있는 행동은 무엇일까?`]],
   'm-accept':[['회복 방식',`${V}, 방금 나온 제안 중 받아들일 수 있는 것과 원하지 않는 것을 말해 줄래?`]]
  };
  const q=key=>{const list=(target==='all'&&named[key])||QQ[key]||Q.student[key]||[];return list.map(([label,text])=>({label,text})).find(x=>!asked.has(x.text));};
  const any=(...keys)=>keys.some(([r,k])=>told(r,k));
  let order,done,gate;
  if(phase==='pre'){
   const storyDone=T==='g'?told('g','heard'):told(T,'opening');
   if(variant==='unsafe'){
    order=T==='v'?['u-refuse','u-story','u-support','u-adult','close']:T==='a'?['u-respect','ua-story','ua-support','close']:['u-respect','u-story','u-support','close'];
    done={'u-refuse':told('v','refuse'),'u-story':T==='g'?told('g','heard'):told(T,'opening'),'ua-story':told('a','opening'),'u-support':any([T,'support'],[T,'helpU'],['g','ask']),'u-adult':told('v','adult'),'u-respect':any(['a','respect'],['g','respectG'],['g','worryU']),close:told(T,'bye')};
    gate={'u-adult':done['u-support'],close:Object.values(done).filter(Boolean).length>=2};
   } else {
    order=!storyDone?['story','about','ready','start']:T==='g'?['saw','gfeel','gneed','consent','check','close']:T==='a'?['scene','feeling','guess','aneed','aconsent','check','close']:['scene','feeling','impact','need','consent','check','close'];
    done={story:storyDone,scene:told(T,'scene'),saw:told('g','saw'),feeling:told(T,'feel'),gfeel:told('g','gfeel'),impact:told(T,'change'),need:told('v','want'),aneed:told('a','need'),gneed:told('g','ask'),guess:told('a','guess'),consent:told(T,'consent'),aconsent:told('a','consent'),check:told(T,'checked'),close:told(T,'bye'),about:told(T,'aboutDone')};
    const count=['scene','feeling','impact','need','aneed','guess','saw','gfeel','gneed'].filter(k=>done[k]).length;
    gate={check:count>=2,close:count>=3};
   }
  } else if(phase==='main'){
   order=target==='all'?['ground','m-story','heard','m-impact','m-need','m-repair','m-accept','plan','agree','review','close']:T==='v'?['m-story','m-impact','m-need','m-accept','agree','close']:T==='a'?['m-story','heard','m-repair','plan','agree','close']:['ground','heard','gneed','plan','agree','close'];
   const both=target==='all'?told('v','story')&&told('a','story'):T==='g'?true:told(T,'story');
   done={ground:any(['v','ground'],['a','ground'],['g','groundG']),'m-story':both,heard:any(['a','heard'],['g','heardG'],['a','heard2']),'m-impact':told('v','change'),'m-need':told('v','want'),'m-repair':told('a','do'),'m-accept':told('v','accept'),gneed:any(['g','ask'],['g','askG2']),plan:any(['a','planA'],['v','planV'],['g','planG']),agree:any(['a','agreeA'],['v','agreeV'],['g','agreeG']),review:any(['a','reviewA'],['v','reviewV']),close:any(['v','bye'],['a','bye'],['g','bye'])};
   gate={heard:both,'m-impact':both,'m-need':both,'m-repair':both&&(done.heard||done['m-impact']||T==='a'),'m-accept':T==='v'?done['m-need']:done['m-repair'],plan:T==='g'?true:done['m-repair']||done['m-accept'],agree:done.plan||done['m-accept'],review:done.plan,close:done.plan||done.agree,gneed:true};
  } else {
   order=T==='g'?['followup','p-safety','p-need','p-plan','p-consent','close']:['followup','p-impact','p-safety','p-hard','p-need','p-plan','p-consent','close'];
   const r=T==='g'?'g':'v';
   done={followup:any(['v','followup'],['a','followup'],['g','followupG']),'p-impact':any(['v','change'],['a','change']),'p-safety':told(r,'safe'),'p-hard':any(['v','hard'],['a','hard']),'p-need':told(r,'need')||told('a','need'),'p-plan':told(r,'plan')||told('a','plan'),'p-consent':told(r,'consent')||told('a','consent'),close:any(['v','bye'],['a','bye'],['g','bye'])};
   gate={close:Object.values(done).filter(Boolean).length>=3};
  }
  const avail=order.filter(k=>!done[k]&&gate[k]!==false).map(q).filter(Boolean);
  const list=[];
  const asker=messages.find(m=>m.asks&&ANSWER[m.asks]);
  if(intent==='pressure'){const r=q('retract');if(r)list.push(r);}
  else if(asker){const nxt=avail.shift()||q('close')||QQ.filler.map(([label,text])=>({label,text})).find(x=>!asked.has(x.text));list.push({label:'물음에 답하기',text:`${ANSWER[asker.asks]} ${nxt?.text||''}`.trim()});}
  else{
   const lead=messages.find(m=>/^(opening|scene|feel|change|want|heard|saw|accept|do|story|followup|guess|kept|slip|after|still)(,|$)/.test(m.beat))||null;
   const nxt=avail.shift();
   if(lead&&nxt){
    const raw=lead.text.trim(),firstSentence=(raw.match(/^[^.?!。？！]*[.?!。？！]?/)?.[0]||raw).trim(),quote=firstSentence.length>30?firstSentence.slice(0,30).trimEnd()+'…':firstSentence;
    const addressee=target==='all'?`${name(lead.speaker)}, `:'',ask=addressee&&nxt.text.startsWith(addressee)?nxt.text.slice(addressee.length):nxt.text;
    list.push({label:nxt.label,text:who==='guardian'?`“${quote}”라고 말씀하셨군요. ${ask}`:`${addressee}“${quote}”라고 말해 주었구나. ${ask}`});
   } else if(nxt)list.push(nxt);
  }
  for(const x of avail){if(list.length>=4)break;if(!list.some(y=>y.text===x.text))list.push(x);}
  for(const [label,text] of QQ.filler){if(list.length>=4)break;if(!asked.has(text)&&!list.some(y=>y.text===text))list.push({label,text});}
  return list.slice(0,4);
 }
 function observe(){
  if(intent==='pressure')return '압박으로 받아들일 수 있는 표현이 감지되었습니다. 체험 모드는 단어를 바탕으로 분기하므로 문맥을 직접 확인하세요.';
  if(variant==='unsafe')return phase==='pre'&&preStep==='intro'?'참여 거절이 표현됐습니다. 원하지 않는 대면을 진행하지 않고 학생의 선택을 들어 주세요.':'참여 거부와 안전 우려가 표현되었습니다. 대면을 보류하고 개별 지원을 확인할 수 있습니다.';
  if(phase==='pre'&&preStep==='intro')return '안내에 대한 반응입니다. 되물은 것이 있으면 먼저 답하고, 무슨 일이 있었는지 그 사람의 말로 들어 보세요.';
  const m=messages[0],who=name(m.speaker);
  if(String(m.beat).startsWith('guard'))return `${josa(who,'이/가')} 아직 마음을 열지 않고 짧게 답했습니다. 재촉하기보다 선택권과 기다림을 먼저 보여 주세요.`;
  const said={opening:'겪은 일을',story:'겪은 일을',scene:'그다음 장면을',feel:'그때 마음을',change:'달라진 일상을',want:'바라는 것을',accept:'받아들일 수 있는 회복 방법을',heard:'상대의 이야기를 듣고 알게 된 점을',do:'스스로 할 행동을',guess:'상대의 마음을 짐작한 것을',saw:'집에서 본 변화를',ask:'학교에 바라는 것을',followup:'약속이 어떻게 됐는지를'}[String(m.beat).split(',')[0]];
  return said?`${josa(who,'이/가')} ${said} 이야기했습니다. 아직 듣지 않은 것을 하나씩 물어보세요.`:'응답은 준비된 시나리오 분기입니다. 자유로운 대화를 연습하려면 AI를 연결하세요.';
 }
 function strength(){
  return {safety:'멈추고 쉴 수 있다는 것을 다시 알려 주었어요.',feeling:'사실보다 마음을 먼저 물었어요.',check:'들은 것을 확인해 오해를 줄였어요.',more:'더 말할 기회를 열어 두었어요.',ready:'이야기를 시작해도 괜찮은지 먼저 물었어요.',about:'궁금한 점을 먼저 풀어 주었어요.',story:'열린 질문으로 그 사람의 말로 듣게 했어요.',impact:'사건 뒤 일상이 어떻게 달라졌는지 물었어요.',need:'바라는 것을 물어 회복의 방향을 그 사람이 정하게 했어요.',heard:'서로에게서 들은 것을 나누게 했어요.',responsibility:'행동의 영향을 스스로 돌아보게 했어요.',repair:'스스로 할 수 있는 행동을 물었어요.',plan:'누가 언제 무엇을 할지 구체적으로 정하게 했어요.',agree:'동의를 다시 확인했어요.',followup:'약속이 실제로 어떻게 됐는지 장면으로 물었어요.',hard:'어려웠던 점을 탓하지 않고 물었어요.',consent:'함께 만날지 스스로 고르게 했어요.',ground:'이야기하는 동안의 약속부터 정했어요.',open:'질문이 넓으면 답하기 어려울 수 있어요. 한 가지를 콕 집어 물어보세요.'}[intent]||'';
 }
}
