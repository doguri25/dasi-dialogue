import {portraitFor} from '../artwork.js';

// 기존 학생 그림 6장(docs/image-assets.json)의 머리 모양·옷을 3D 캐릭터로 옮긴 생김새입니다.
// 어느 생김새도 특정 역할(피해 경험/행동한 학생)에 고정하지 않습니다. 대응은 portraitFor 규칙을 그대로 따릅니다.
export const LOOKS={
 'elementary-a':{age:'elementary',hair:'bob',hairColor:'#2a211d',skin:'#f3cfb1',top:'#9db697',topKind:'sweatshirt',under:null,cheek:'#f0a99a'},
 'elementary-b':{age:'elementary',hair:'tousled',hairColor:'#2b231f',skin:'#efc6a4',top:'#d6a14f',topKind:'sweatshirt',under:null,cheek:'#eea08f'},
 'middle-a':{age:'middle',hair:'halfup',hairColor:'#231c19',skin:'#f1cbad',top:'#93ab8e',topKind:'cardigan',under:'#f3ead8',cheek:'#eba596'},
 'middle-b':{age:'middle',hair:'cropped',hairColor:'#2a221e',skin:'#ecc3a2',top:'#b7a8d8',topKind:'hoodie',under:null,cheek:'#e99d8d'},
 'high-a':{age:'high',hair:'chinbob',hairColor:'#211a17',skin:'#f0caab',top:'#8fa78b',topKind:'cardigan',under:'#fbf8f1',cheek:'#e8a293'},
 'high-b':{age:'high',hair:'sidepart',hairColor:'#261f1b',skin:'#eac09f',top:'#34466b',topKind:'jacket',under:'#f2e9d6',cheek:'#e59a8a'},
 guardian:{age:'adult',hair:'short',hairColor:'#3a302a',skin:'#e9c09f',top:'#d8c4a3',topKind:'knit',under:null,cheek:'#e29d8e'}
};

export function lookFor(scenario,role) {
 if(role==='g')return 'guardian';
 const src=portraitFor(scenario,role)||'';
 const match=src.match(/student-([a-z]+-[ab])\.webp$/);
 return match&&LOOKS[match[1]]?match[1]:'elementary-a';
}
