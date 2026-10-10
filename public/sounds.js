// Short, locally generated cues. No downloads or audio start on page load.
export function createSounds(host=globalThis){
 let enabled=true,context=null,nextAt=0;
 const voices=new Set(),key='dasi.sounds';
 try{enabled=host.localStorage.getItem(key)!=='false';}catch{}
 function stop(){for(const voice of voices){try{voice.stop();}catch{}}voices.clear();nextAt=0;}
 async function play(kind){
  if(!enabled)return;
  const notes={select:[[660,0,.07]],send:[[440,0,.08],[660,.08,.09]],reply:[[660,0,.12],[880,.14,.16]]}[kind];
  if(!notes)return;
  try{
   const Audio=host.AudioContext||host.webkitAudioContext;if(!Audio)return;
   context??=new Audio({latencyHint:'interactive'});
   if(context.state==='suspended')await context.resume();
   if(!enabled||context.state!=='running')return;
   const start=Math.max(context.currentTime+.015,nextAt);
   for(const [frequency,offset,duration] of notes){
    const tone=context.createOscillator(),gain=context.createGain(),at=start+offset;
    tone.type='sine';tone.frequency.setValueAtTime(frequency,at);
    gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.035,at+.012);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
    tone.connect(gain);gain.connect(context.destination);voices.add(tone);
    tone.onended=()=>{voices.delete(tone);tone.disconnect();gain.disconnect();};
    tone.start(at);tone.stop(at+duration+.015);
   }
   const last=notes.at(-1);nextAt=start+last[1]+last[2]+.045;
  }catch{/* Audio support or output must never block practice. */}
 }
 return {get enabled(){return enabled;},play,stop,setEnabled(value){enabled=Boolean(value);if(!enabled)stop();try{host.localStorage.setItem(key,String(enabled));}catch{}return enabled;}};
}
