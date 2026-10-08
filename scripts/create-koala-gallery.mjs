import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const names = ['body', 'shadow', 'head', 'left-arm', 'arm', 'eye'];
const assets = Object.fromEntries(names.map(name => [name, `data:image/svg+xml;base64,${Buffer.from(read(`assets/mascot/koala-${name}.svg`)).toString('base64')}`]));
const motions = JSON.parse(read('assets/mascot/motions.json'));
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Speaking Coach · Koala animations</title>
<style>
@font-face{font-family:Nunito;src:url(data:font/ttf;base64,${Buffer.from(readFileSync(new URL('../node_modules/@expo-google-fonts/nunito/700Bold/Nunito_700Bold.ttf', import.meta.url))).toString('base64')}) format('truetype');font-weight:700;font-display:swap}
*{box-sizing:border-box}body{margin:0;background:#fafcfb;color:#263a32;font-family:Nunito,system-ui,sans-serif;line-height:1.55}::selection{background:#d3e8da}button{font:inherit;cursor:pointer;color:inherit}button:focus-visible,input:focus-visible{outline:3px solid #347553;outline-offset:4px}header,main,footer{max-width:1100px;margin:auto;padding:24px 32px}header{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #dce4df;gap:20px}.brand{font-size:20px;font-weight:700}header span{font-size:14px;color:#52655a}main{padding-top:48px}.intro{display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:48px}h1{font-size:clamp(32px,4.5vw,52px);line-height:1.14;letter-spacing:-.025em;margin:0 0 20px;max-width:12ch}p{font-family:system-ui,sans-serif;color:#52655a;font-size:16px;max-width:45ch}.stage{background:#eaf3ed;min-height:390px;border-radius:28px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px}.koala{position:relative;width:min(320px,100%);aspect-ratio:1;border:0;background:transparent;padding:0}.koala img{display:block;width:100%;height:100%;pointer-events:none}.body,.head,.arm,.eye{position:absolute}.body{inset:0}.arm{top:36.5234375%;width:39.0625%;height:39.0625%;transform-origin:50% 50%}.left{left:18.75%}.right{left:42.1875%}.head{left:10.9375%;top:12.5%;width:78.125%;height:78.125%;transform-origin:50% 50%}.eye{top:26%;width:8%;height:8%}.eye-left{left:34%}.eye-right{left:58%}.stage-label{font-size:20px;font-weight:700;margin-top:0}.stage-hint{margin:4px 0 0;font-size:13px}.controls{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin:28px 0 32px}.primary,.secondary{border-radius:12px;min-height:48px;padding:10px 20px;border:1px solid #347553;background:#347553;color:white}.secondary{background:transparent;color:#2e664b}.controls label{display:flex;align-items:center;gap:10px;margin-left:auto;min-height:44px;font-family:system-ui,sans-serif;font-size:14px}.controls input{accent-color:#347553;width:18px;height:18px}.options{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.option{background:#fff;border:1px solid #dce4df;border-radius:16px;display:flex;align-items:center;text-align:left;padding:16px;gap:12px;min-height:120px}.option[aria-pressed=true]{border:2px solid #347553;background:#edf6ef;padding:15px}.mini{width:84px;min-width:84px}.option strong{display:block;font-size:17px}.option span{display:block;font-family:system-ui,sans-serif;font-size:13px;color:#52655a;margin-top:4px;line-height:1.5}footer{font-family:system-ui,sans-serif;font-size:13px;color:#52655a;margin-top:16px;padding-bottom:36px}.status{min-height:24px;font-size:14px;color:#2e664b;font-family:system-ui,sans-serif}noscript{display:block;padding:20px}
@media(max-width:850px){.options{grid-template-columns:repeat(2,1fr)}.intro{gap:24px}.stage{min-height:330px}.mini{width:64px;min-width:64px}}
@media(max-width:600px){header,main,footer{padding-left:20px;padding-right:20px}main{padding-top:32px}.intro{grid-template-columns:1fr;gap:24px}h1{max-width:16ch;font-size:36px}.stage{min-height:310px}.koala{max-width:260px}.options{grid-template-columns:1fr}.mini{width:80px;min-width:80px}.controls label{margin-left:0}.option{min-height:110px}header span{display:none}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}
</style></head><body>
<header><div class="brand">Speaking Coach</div><span>Koala animation gallery</span></header>
<main><section class="intro"><div><h1>A little more life.</h1><p>A gentle companion for speaking practice. Familiar eyes, a quiet smile, and small gestures that give each moment a little warmth.</p><p>Choose an action below, or play the whole collection. Tap the big koala to replay its current action.</p><div class="status" id="status" role="status" aria-live="polite">Ready to say hello.</div></div><div class="stage"><button class="koala" id="hero" aria-label="Koala. Replay hello"></button><div class="stage-label" id="label">Hello</div><p class="stage-hint">Small movements. No sound. No endless loops.</p></div></section>
<div class="controls"><button class="primary" id="play-all">Play all six</button><button class="secondary" id="pause" aria-pressed="false">Pause</button><label><input id="reduce" type="checkbox">Reduce motion</label></div>
<section class="options" id="options" aria-label="Koala actions"></section>
</main><footer>The same artwork and motion keyframes used in the app. Every animation returns to rest; replaying cancels the previous action. Motion stops when this tab is hidden. This file works offline.</footer>
<noscript>This gallery needs JavaScript to animate the koala.</noscript>
<script>
const assets=${JSON.stringify(assets)};
const motions=${JSON.stringify(motions)};
const names=Object.keys(motions);
const hero=document.querySelector('#hero');
const status=document.querySelector('#status');
const reduce=document.querySelector('#reduce');
const pause=document.querySelector('#pause');
const systemMotion=matchMedia('(prefers-reduced-motion: reduce)');
reduce.checked=systemMotion.matches;
let selected='wave', running=[], tour=0, playback=0, paused=false;
const rigs=new Map();
function rig(element){
 element.innerHTML='<img src="'+assets.shadow+'" alt=""><div class="body"><img src="'+assets.body+'" alt=""><div class="arm left"><img src="'+assets['left-arm']+'" alt=""></div><div class="arm right"><img src="'+assets.arm+'" alt=""></div><div class="head"><img src="'+assets.head+'" alt=""><div class="eye eye-left"><img src="'+assets.eye+'" alt=""></div><div class="eye eye-right"><img src="'+assets.eye+'" alt=""></div></div></div>';
 return {body:element.querySelector('.body'),head:element.querySelector('.head'),left:element.querySelector('.left'),right:element.querySelector('.right'),eyes:[...element.querySelectorAll('.eye')]};
}
const mainRig=rig(hero);
for(const name of names){
 const button=document.createElement('button');button.className='option';button.dataset.motion=name;button.setAttribute('aria-pressed',String(name===selected));
 const mini=document.createElement('div');mini.className='koala mini';mini.setAttribute('aria-hidden','true');button.append(mini);
 const copy=document.createElement('div');const title=document.createElement('strong');title.textContent=motions[name].label;const detail=document.createElement('span');detail.textContent=motions[name].description;copy.append(title,detail);button.append(copy);
 rigs.set(name,rig(mini));button.addEventListener('click',()=>play(name));document.querySelector('#options').append(button);
}
function resetRig(r){for(const part of [r.body,r.head,r.left,r.right,...r.eyes])part.style.transform='none'}
function stop(){playback++;for(const animation of running)animation.cancel();running=[];paused=false;pause.textContent='Pause';pause.setAttribute('aria-pressed','false');resetRig(mainRig);for(const [name,r] of rigs)still(r,motions[name].frames[1])}
function still(r,frame){r.body.style.transform='translateY('+(frame.bodyY/512*100)+'%)';r.head.style.transform='translateY('+(frame.headY/400*100)+'%) rotate('+frame.head+'deg)';r.left.style.transform='rotate('+frame.left+'deg)';r.right.style.transform='rotate('+frame.right+'deg)';for(const eye of r.eyes)eye.style.transform='scaleY('+frame.eyes+')'}
function animate(r,motion){
 const m=motions[motion];
 if(reduce.checked){still(r,m.frames[1]);return []}
 const easing='cubic-bezier(.45,0,.55,1)';
 const keyframes=transform=>m.frames.map(f=>({offset:f.t,transform:transform(f),easing}));
 const options={duration:m.duration,fill:'forwards'};
 return [r.body.animate(keyframes(f=>'translateY('+(f.bodyY/512*100)+'%)'),options),r.head.animate(keyframes(f=>'translateY('+(f.headY/400*100)+'%) rotate('+f.head+'deg)'),options),r.left.animate(keyframes(f=>'rotate('+f.left+'deg)'),options),r.right.animate(keyframes(f=>'rotate('+f.right+'deg)'),options),...r.eyes.map(eye=>eye.animate(keyframes(f=>'scaleY('+f.eyes+')'),options))];
}
function select(name){selected=name;document.querySelector('#label').textContent=motions[name].label;hero.setAttribute('aria-label','Koala. Replay '+motions[name].label);document.querySelectorAll('.option').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.motion===name)))}
async function play(name,token){
 if(token===undefined)tour++;
 stop();const playbackId=playback;select(name);running=[...animate(mainRig,name),...animate(rigs.get(name),name)];
 status.textContent=reduce.checked?'Reduced motion: '+motions[name].label+' shown as a still pose.':motions[name].label+' · playing';
 await Promise.allSettled(running.map(a=>a.finished));
 if(playbackId===playback&&selected===name&&!paused)status.textContent=reduce.checked?'Reduced motion: '+motions[name].label+' shown as a still pose.':motions[name].label+' · complete. Tap to replay.';
}
hero.addEventListener('click',()=>play(selected));
document.querySelector('#play-all').addEventListener('click',async()=>{
 const token=++tour;
 for(const name of names){if(token!==tour||document.hidden)return;await play(name,token);if(reduce.checked)await new Promise(resolve=>setTimeout(resolve,900))}
 if(token===tour)status.textContent='All six actions complete. Choose a favorite to replay.';
});
pause.addEventListener('click',()=>{if(!running.length||running.every(a=>a.playState==='finished'))return;paused=!paused;running.forEach(a=>paused?a.pause():a.play());pause.textContent=paused?'Resume':'Pause';pause.setAttribute('aria-pressed',String(paused));status.textContent=paused?'Animation paused.':motions[selected].label+' · playing'});
reduce.addEventListener('change',()=>play(selected));
systemMotion.addEventListener('change',e=>{reduce.checked=e.matches;play(selected)});
document.addEventListener('visibilitychange',()=>{if(document.hidden){tour++;stop();status.textContent='Paused while this tab is hidden. Tap the koala to replay.'}});
play('wave');
</script></body></html>`;
const destination = new URL('docs/koala-animations.html', root);
writeFileSync(destination, html);
process.stdout.write(`Created ${fileURLToPath(destination)}\n`);
