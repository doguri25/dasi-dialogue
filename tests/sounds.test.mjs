import test from 'node:test';
import assert from 'node:assert/strict';
import {createSounds} from '../public/sounds.js';

function fixture(initial=null){
 const values=new Map(initial===null?[]:[['dasi.sounds',initial]]),tones=[];let contexts=0;
 class AudioContext{
  constructor(){contexts++;this.state='running';this.currentTime=1;this.destination={};}
  createOscillator(){const tone={frequency:{setValueAtTime(value){tone.frequencyValue=value;}},connect(){},disconnect(){},start(at){tone.at=at;tones.push(tone);},stop(at){if(at===undefined)tone.cancelled=true;else tone.endsAt=at;}};return tone;}
  createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(value){assert.ok(value<=.04);},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
 }
 const host={AudioContext,localStorage:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}};
 return {host,tones,values,contexts:()=>contexts};
}
test('sounds start only on demand, use distinct quiet cues and queue immediate replies',async()=>{
 const f=fixture(),sounds=createSounds(f.host);assert.equal(f.contexts(),0);
 await sounds.play('select');await sounds.play('send');await sounds.play('reply');
 assert.equal(f.contexts(),1);assert.deepEqual(f.tones.map(t=>t.frequencyValue),[660,440,660,660,880]);
 assert.ok(f.tones.every((t,i)=>!i||t.at>f.tones[i-1].at));
});
test('muting stops pending tones, persists and stays silent after reloading',async()=>{
 const f=fixture(),sounds=createSounds(f.host);await sounds.play('reply');sounds.setEnabled(false);
 assert.ok(f.tones.every(t=>t.cancelled));assert.equal(f.values.get('dasi.sounds'),'false');
 const count=f.tones.length;await sounds.play('select');await createSounds(f.host).play('send');assert.equal(f.tones.length,count);
 sounds.setEnabled(true);await sounds.play('select');assert.equal(f.tones.length,count+1);
});
test('unsupported or blocked audio and unavailable storage never interrupt practice',async()=>{
 const sounds=createSounds({localStorage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}},AudioContext:class{constructor(){throw Error('unsupported');}}});
 await assert.doesNotReject(sounds.play('reply'));sounds.setEnabled(false);sounds.setEnabled(true);await sounds.play('unknown');
 await assert.doesNotReject(createSounds({}).play('select'));
});
