(function(){
'use strict';
const origin='http://127.0.0.1:19426';
const KEY='mt_supertonic_preferences_v1';
const defaults={engine:'native',voice:'F1',language:'auto',speed:1,mp3Model:'supertonic3',mp3Voice:'F1',mp3Bitrate:'128',mp3Split:false};
let preferences={...defaults},dirty=new Set(),ready=false,frame,connection,seq=0,generation=0,run=null,audio,activeFetch,playbackURL,finishPlayback;
const pending=new Map();
const status=document.createElement('div');status.id='mtSpeechStatus';status.setAttribute('role','status');status.style.cssText='font-size:12px;color:#475569;padding:6px';
const say=message=>{status.textContent=message;document.querySelectorAll('.mt-speech-status').forEach(e=>e.textContent=message);};
try{Object.assign(preferences,JSON.parse(localStorage.getItem(KEY)||'{}'));}catch(_){say('브라우저 저장소 제한 · 로컬 도우미 저장을 사용합니다.');}
try{if(window.opener?.mtSpeechPreferences)Object.assign(preferences,window.opener.mtSpeechPreferences);}catch(_){}
window.mtSpeechPreferences=preferences;
const choices={engine:[['native','Supertonic 3 · 오프라인 고속'],['browser','Supertonic 3 · 오프라인 브라우저']],voice:[],language:[['auto','자동'],['ko','한국어'],['en','영어'],['ja','일본어']],mp3Model:[['supertonic3','Supertonic 3 오프라인 고속']],mp3Voice:[],mp3Bitrate:[['96','96 kbps'],['128','128 kbps']]};
for(const sex of ['F','M'])for(let i=1;i<=5;i++)choices.voice.push([sex+i,(sex==='F'?'여성':'남성')+' '+i]);choices.mp3Voice=choices.voice;
for(const [key,list] of Object.entries(choices))if(!list.some(([v])=>v===preferences[key]))preferences[key]=defaults[key];
function speedValue(value){return Number.isFinite(Number(value))?Math.round(Math.max(0.5,Math.min(2,Number(value)))*20)/20:1;}
function sync(){preferences.speed=speedValue(preferences.speed);document.querySelectorAll('[data-speech-key]').forEach(e=>{const k=e.dataset.speechKey;if(e.type==='checkbox')e.checked=preferences[k]===true;else e.value=preferences[k];});document.querySelectorAll('[data-speech-speed-value]').forEach(e=>e.textContent=preferences.speed.toFixed(2)+'×');if(audio){audio.preservesPitch=true;audio.defaultPlaybackRate=preferences.speed;audio.playbackRate=preferences.speed;}}
function save(key,value){
 dirty.add(key);preferences[key]=value;sync();let local=false,remote=false;
 try{localStorage.setItem(KEY,JSON.stringify(preferences));local=true;}catch(_){}
 // Synchronous small localhost write ensures a just-closed popup cannot lose its last choice.
 try{const request=new XMLHttpRequest();request.open('POST',origin+'/speech-preferences',false);request.setRequestHeader('Content-Type','application/json');request.send(JSON.stringify({patch:{[key]:value}}));if(request.status!==200)throw Error();remote=true;}catch(_){}
 try{if(window.opener){window.opener.mtSpeechPreferences={...preferences};window.opener.localStorage.setItem(KEY,JSON.stringify(preferences));}}catch(_){}
 say(remote?'듣기 옵션 저장됨':local?'PC 도우미에 저장하지 못했습니다. 실행 파일을 확인하세요. 브라우저에는 저장되었습니다.':'듣기 옵션 저장 실패 · 로컬 도우미를 실행한 뒤 다시 선택하세요.');
}
async function restore(){
 try{const response=await fetch(origin+'/speech-preferences');if(!response.ok)throw Error();const saved=await response.json();for(const k of Object.keys(defaults))if(k in saved&&!dirty.has(k))preferences[k]=saved[k];ready=true;sync();try{localStorage.setItem(KEY,JSON.stringify(preferences));}catch(_){}say('오프라인 낭독 준비');}
 catch(_){say('로컬 도우미 연결 실패 · 실행 파일을 켜고, 브라우저가 요청하면 로컬 네트워크 접근을 허용한 뒤 연결 확인을 누르세요.');}
}
function field(parent,key,label){const wrap=document.createElement('label');wrap.style.cssText='display:flex;gap:8px;align-items:center;margin:8px 0';wrap.append(label+' ');const control=document.createElement('select');control.dataset.speechKey=key;for(const [v,t] of choices[key])control.add(new Option(t,v));control.onchange=()=>save(key,control.value);wrap.append(control);parent.append(wrap);return control;}
function options(parent){const box=document.createElement('section');box.className='mt-speech-options';box.innerHTML='<h4>듣기 · AI TTS</h4><p style="font-size:12px">PC에서 오프라인_뷰어_실행.cmd를 최초 한 번 실행하면 이후 로그인 시 도우미가 자동으로 시작됩니다. 브라우저가 요청하면 로컬 네트워크 접근을 허용하세요. 음성은 PC 안에서 합성합니다.</p>';field(box,'engine','낭독 방식');field(box,'voice','낭독 목소리');field(box,'language','언어');const speedRow=document.createElement('label');speedRow.style.cssText='display:flex;align-items:center;gap:8px;margin:8px 0';speedRow.append('낭독 속도 ');const speedSlider=document.createElement('input');speedSlider.type='range';speedSlider.min='0.5';speedSlider.max='2';speedSlider.step='0.05';speedSlider.dataset.speechKey='speed';speedSlider.setAttribute('aria-label','낭독 속도');speedSlider.style.cssText='flex:1;min-width:80px';speedSlider.oninput=()=>save('speed',speedValue(speedSlider.value));const speedOutput=document.createElement('output');speedOutput.dataset.speechSpeedValue='1';speedRow.append(speedSlider,speedOutput);box.append(speedRow);const pitchNote=document.createElement('p');pitchNote.style.cssText='font-size:11px;color:#64748b';pitchNote.textContent='0.5~2배속 · 목소리 높이 유지 · MP3에도 적용';box.append(pitchNote);button('로컬 도우미 연결 확인',restore,box);const note=document.createElement('div');note.className='mt-speech-status';note.setAttribute('role','status');box.append(note);parent.append(box);}
options(document.getElementById('mtEbookPopupSettings'));
const exportDialog=document.createElement('dialog');exportDialog.id='mtSpeechExportDialog';exportDialog.innerHTML='<h3>팝업 문장 MP3 생성</h3><p>현재 팝업에서 읽는 도서·학습 세션의 문장들을 사용합니다.</p>';field(exportDialog,'mp3Model','모델');field(exportDialog,'mp3Voice','목소리');field(exportDialog,'mp3Bitrate','비트레이트');const splitLabel=document.createElement('label');splitLabel.innerHTML='<input type="checkbox" data-speech-key="mp3Split"> 구간별 MP3를 ZIP으로 받기 (해제: 하나의 MP3)';splitLabel.firstChild.onchange=e=>save('mp3Split',e.target.checked);exportDialog.append(splitLabel);
const exportStatus=document.createElement('p');exportDialog.append(exportStatus);let exportJob=null;
function button(label,fn,parent){const b=document.createElement('button');b.type='button';b.className='btn-excel';b.textContent=label;b.onclick=e=>{e.preventDefault();e.stopPropagation();Promise.resolve(fn()).catch(error=>say(error.message));};parent.append(b);return b;}
button('생성',async()=>{
 try{if(exportJob)throw Error('이미 생성 중입니다.');const words=getWords(mtActiveSlotIndex);const rows=words.map(w=>textFor(w));
 const response=await fetch(origin+'/speech-export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rows,settings:preferences})});const job=await response.json();if(!response.ok)throw Error(job.error);exportJob=job.id;
 while(exportJob){await new Promise(r=>setTimeout(r,700));const result=await (await fetch(origin+'/speech-job/'+job.id)).json();exportStatus.textContent=`생성 ${result.completed}/${result.total} 구간 · 음성 ${result.partsDone}개`;
 if(result.status==='error')throw Error(result.error);if(result.status==='done'){const downloadResponse=await fetch(origin+result.url);if(!downloadResponse.ok)throw Error('완성 파일을 읽지 못했습니다.');const downloadUrl=URL.createObjectURL(await downloadResponse.blob());const a=document.createElement('a');a.href=downloadUrl;a.download=result.url.endsWith('.zip')?'구간별_낭독.zip':'전체_낭독.mp3';a.textContent='완료 · 다운로드';exportStatus.replaceChildren(a);a.click();setTimeout(()=>URL.revokeObjectURL(downloadUrl),3600000);exportJob=null;}}
 }catch(error){exportJob=null;exportStatus.textContent='생성 실패 · '+error.message;}
},exportDialog);
button('생성 취소',async()=>{if(exportJob)await fetch(origin+'/speech-cancel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:exportJob})});},exportDialog);
button('닫기',()=>exportDialog.close(),exportDialog);document.body.append(exportDialog);
async function pauseSpeech(){if(!audio||!run)return;run.paused=!run.paused;if(run.paused)audio.pause();else if(playbackURL)await audio.play();say(run.paused?'일시정지':'낭독 중');}
const popupControls=document.createElement('div');popupControls.id='mtPopupSpeechControls';popupControls.style.cssText='display:flex;gap:5px;flex-wrap:wrap;margin:6px 0';button('중지',()=>stop(),popupControls);button('MP3',()=>{sync();exportDialog.showModal();},popupControls);document.getElementById('mtEbookPopupDragHandle').after(popupControls);
button('일시정지 / 계속',pauseSpeech,popupControls);popupControls.append(status);
function getWords(slot){return mtEbookTypingActive?mtGetEbookWords(slot):mtCurrentStudyWords.slice();}
let lastField='kor';
function textFor(word,field=lastField){return String(field==='eng'?word.eng:field==='subKor'?(word.subKor||word.literalKor):word.kor||'');}
function popupIndex(){return mtEbookTypingActive?(mtEbookCurrentListIndex??0):mtCurrentIndex;}
function lang(text){if(preferences.language!=='auto')return preferences.language;return /[가-힣ᄀ-ᇿ]/u.test(text)?'ko':/[ぁ-ヿ]/u.test(text)?'ja':/[\u3400-\u9fff]/u.test(text)?'ko':'en';}
function parts(text){const result=[];let chars=Array.from(text.trim());while(chars.length){let cut=Math.min(115,chars.length);if(chars.length>cut){const p=chars.slice(0,cut).join(''),i=Math.max(p.lastIndexOf(' '),p.lastIndexOf('。'),p.lastIndexOf('.'));if(i>55)cut=Array.from(p.slice(0,i+1)).length;}const part=chars.splice(0,cut).join('');if(/[\p{L}\p{N}]/u.test(part))result.push(part);}return result;}
async function connectionError(){
 let denied=false;try{denied=(await navigator.permissions.query({name:'local-network-access'})).state==='denied';}catch(_){}
 return Error(denied?'브라우저가 PC 연결을 차단했습니다. 주소창의 사이트 설정에서 로컬 네트워크 접근을 허용한 뒤 다시 눌러 주세요.':'PC 음성 도우미가 응답하지 않습니다. 자동 복구를 기다린 뒤 같은 듣기 버튼을 다시 눌러 주세요.');
}
function resetBridge(){frame?.remove();frame=null;connection=null;}
function connect(){if(connection)return connection;const currentFrame=document.createElement('iframe');frame=currentFrame;currentFrame.hidden=true;connection=new Promise((resolve,reject)=>{
 let settled=false;const finish=(error)=>{if(settled)return;settled=true;clearTimeout(timer);removeEventListener('message',onReady);currentFrame.onerror=null;if(error){resetBridge();reject(error);}else resolve();};
 const onReady=e=>{if(e.source===currentFrame.contentWindow&&e.origin===origin&&e.data?.type==='reader-tts'&&e.data.action==='ready')finish();};
 const timer=setTimeout(async()=>finish(await connectionError()),15000);addEventListener('message',onReady);
 currentFrame.onerror=async()=>finish(await connectionError());currentFrame.onload=()=>currentFrame.contentWindow.postMessage({type:'reader-tts',action:'connect'},origin);
 currentFrame.src=origin+'/supertonic3/bridge.html?viewer=129';document.body.append(currentFrame);
 });return connection;}
addEventListener('message',e=>{if(e.source!==frame?.contentWindow||e.origin!==origin||e.data?.type!=='reader-tts')return;const d=e.data;
 if(d.action==='unavailable'){for(const r of pending.values()){clearTimeout(r.timer);r.reject(Error(d.message||'브라우저 합성 엔진 연결 실패'));}pending.clear();resetBridge();return;}
 const request=pending.get(d.id);if(d.action==='progress'){say(`모델 여는 중 ${d.loaded}/${d.total}`);return;}if(!request)return;clearTimeout(request.timer);pending.delete(d.id);d.action==='audio'?request.resolve(d):request.reject(Error(d.message||'합성 실패'));});
async function synth(text,token){
 if(preferences.engine==='native'){
  const controller=new AbortController();activeFetch=controller;
  try{let response;try{response=await fetch(origin+'/supertonic3/synthesize',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.any([controller.signal,AbortSignal.timeout(180000)]),body:JSON.stringify({engine:'native',text,lang:lang(text),voice:preferences.voice})});}catch(error){if(controller.signal.aborted)throw error;throw await connectionError();}
   if(!response.ok){const error=await response.json().catch(()=>({}));throw Error(error.error||'로컬 음성 합성 실패');}
   const samples=await response.arrayBuffer(),sampleRate=Number(response.headers.get('X-Sample-Rate'));if(!samples.byteLength||samples.byteLength%4||!sampleRate)throw Error('로컬 음성 응답 형식 오류');return {samples,sampleRate};
  }finally{if(activeFetch===controller)activeFetch=null;}
 }
 await connect();if(token!==generation)throw new DOMException('중지','AbortError');return new Promise((resolve,reject)=>{const id=++seq,timer=setTimeout(()=>{pending.delete(id);resetBridge();reject(Error('음성 합성 시간 초과 · 다시 눌러 주세요.'));},180000);pending.set(id,{resolve,reject,timer});frame.contentWindow.postMessage({type:'reader-tts',action:'synthesize',id,generation:token,engine:preferences.engine,text,lang:lang(text),voice:preferences.voice},origin);});}
function ensureAudio(){if(!audio){audio=document.createElement('audio');audio.id='mtSpeechAudio';audio.hidden=true;audio.preload='auto';document.body.append(audio);}audio.preservesPitch=true;audio.defaultPlaybackRate=speedValue(preferences.speed);audio.playbackRate=speedValue(preferences.speed);return audio;}
function pcmWave(samples,rate){const pcm=new Float32Array(samples),bytes=new ArrayBuffer(44+pcm.length*2),v=new DataView(bytes);function str(at,text){for(let i=0;i<text.length;i++)v.setUint8(at+i,text.charCodeAt(i));}str(0,'RIFF');v.setUint32(4,36+pcm.length*2,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,pcm.length*2,true);for(let i=0;i<pcm.length;i++){const s=Math.max(-1,Math.min(1,pcm[i]));v.setInt16(44+i*2,Math.round(s*(s<0?32768:32767)),true);}return new Blob([bytes],{type:'audio/wav'});}
async function playSpeech(result,token){const player=ensureAudio(),url=URL.createObjectURL(pcmWave(result.samples,result.sampleRate));playbackURL=url;player.src=url;player.playbackRate=speedValue(preferences.speed);player.preservesPitch=true;
 try{await new Promise((resolve,reject)=>{let done=false;const finish=error=>{if(done)return;done=true;player.removeEventListener('ended',ended);player.removeEventListener('error',failed);if(finishPlayback===finish)finishPlayback=null;error?reject(error):resolve();};const ended=()=>finish(),failed=()=>finish(Error('낭독 음성을 재생하지 못했습니다.'));finishPlayback=finish;player.addEventListener('ended',ended);player.addEventListener('error',failed);if(token!==generation){finish();return;}if(!run?.paused)player.play().catch(finish);});}
 finally{if(playbackURL===url){player.pause();player.removeAttribute('src');player.load();playbackURL=null;}URL.revokeObjectURL(url);}}
function stop(){generation++;run=null;activeFetch?.abort();audio?.pause();finishPlayback?.();frame?.contentWindow?.postMessage({type:'reader-tts',action:'cancel',generation},origin);for(const r of pending.values()){clearTimeout(r.timer);r.reject(new DOMException('중지','AbortError'));}pending.clear();document.querySelectorAll('.mt-speech-reading').forEach(e=>e.classList.remove('mt-speech-reading'));say('낭독 중지');}
function englishSentences(text){return typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('en',{granularity:'sentence'}).segment(text)].map(s=>s.segment.trim()).filter(Boolean):(text.match(/[^.!?]+(?:[.!?]+|$)/g)||[text]).map(s=>s.trim()).filter(Boolean);}
async function start(slot,index,field='kor',firstText=null,allEnglish=false){window.mtStopEbookPageSpeech?.();stop();lastField=field;const token=generation;const word=getWords(slot)[index];if(!word)return;const text=firstText??textFor(word,field);const utterances=allEnglish?englishSentences(text).flatMap(parts):parts(text);ensureAudio();if(token!==generation)return;run={slot,paused:false,field,index};try{
 if(Number(mtActiveSlotIndex)!==Number(slot)&&mtActiveSlotIndex!==slot){stop();return;}
 mtSaveLastReadPosition(slot,Number.isInteger(word.originalIndex)?word.originalIndex:index);mtSaveSessionState();await mtPersistTypedSlotStates();if(token!==generation)return;
 document.querySelectorAll('.mt-speech-reading').forEach(e=>e.classList.remove('mt-speech-reading'));
 const highlight=document.getElementById(field==='eng'?'mtMaskContainer':'mtKorText');highlight.classList.add('mt-speech-reading');
 say(allEnglish?'현재 카드의 영어문장 전체 낭독 중':'선택한 문장 낭독 중');for(const part of utterances){if(token!==generation)return;const result=await synth(part,token);if(token!==generation)return;await playSpeech(result,token);}
 if(token===generation){run=null;say('낭독 완료');document.querySelectorAll('.mt-speech-reading').forEach(e=>e.classList.remove('mt-speech-reading'));}
 }catch(error){if(token===generation)say('낭독 실패 · '+error.message);}}
const style=document.createElement('style');style.textContent='.mt-speech-reading{background:#fef3c7!important;outline:2px solid #fbbf24}.mt-speech-listen{margin:0 7px;padding:3px 7px}#mtSpeechOptionsDialog,#mtSpeechExportDialog{max-width:90vw;border:1px solid #cbd5e1;border-radius:12px;padding:22px}.mt-speech-options select{max-width:65%;padding:5px}';document.head.append(style);
function listenButton(parent,field,text,label){const b=button('🔊',()=>start(mtActiveSlotIndex,popupIndex(),field,text),parent);b.title=label;b.setAttribute('aria-label',label);b.classList.add('mt-popup-sentence-listen');b.dataset.field=field;parent.prepend(b);return b;}
const iconStyle=document.createElement('style');iconStyle.textContent='#mt-flashcard button.mt-popup-sentence-listen{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;width:18px;min-width:18px;height:15px;min-height:15px;padding:0;margin:0 4px 0 0;font-size:6px;line-height:1;border-radius:3px;vertical-align:middle;flex:0 0 auto}';document.head.append(iconStyle);
function placeEnglishListeners(){
 const mask=document.getElementById('mtMaskContainer');mask.querySelectorAll('.mt-popup-sentence-listen[data-field="eng"]').forEach(b=>b.remove());
 const word=mtCurrentStudyWords[mtCurrentIndex];if(!word)return;const english=textFor(word,'eng');
 const segments=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('en',{granularity:'sentence'}).segment(english)]:[{segment:english,index:0}];
 const tokens=[...english.matchAll(mtMaskMode==='chunk'&&!word.exercise?/\S+/g:/[^ ]+/g)];const wrappers=[...mask.children].filter(e=>e.classList.contains('mt-word-wrapper'));
 // Insert into each sentence's first word so the icon stays with its masked text.
 const insertions=[];segments.forEach((s,index)=>{if(!s.segment.trim())return;const offset=s.index+s.segment.length-s.segment.trimStart().length;const tokenIndex=tokens.findIndex(t=>t.index+t[0].length>offset);const target=wrappers[tokenIndex];if(target)insertions.push({target,text:s.segment,index});});
 for(const item of insertions.reverse())listenButton(item.target,'eng',item.text,segments.length>1?`영어문장 ${item.index+1} 듣기`:'영어문장 듣기');
}
function decoratePopup(){
 const root=document.getElementById('mtKorText');if(!mtCurrentStudyWords[mtCurrentIndex])return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];let node;
 while(node=walker.nextNode())if(node.textContent.trim()&&!node.parentElement.closest('button,.mt-popup-speech-sentence'))nodes.push(node);
 const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter('ko',{granularity:'sentence'}):null;
 for(const node of nodes){const field=node.parentElement.closest('.mt-paren-text')?'subKor':'kor',fragment=document.createDocumentFragment();const segments=segmenter?[...segmenter.segment(node.textContent)].map(x=>x.segment):[node.textContent];
 for(const text of segments){const span=document.createElement('span');span.className='mt-popup-speech-sentence';span.append(text);if(/[\p{L}\p{N}]/u.test(text))listenButton(span,field,text,field==='subKor'?'보조문장 듣기':'문장 듣기');fragment.append(span);}node.replaceWith(fragment);}
 const settingsButton=document.getElementById('mtEbookPopupSettingsBtn');settingsButton.style.display='inline-flex';settingsButton.textContent='⚙ 팝업 설정';
 placeEnglishListeners();
}
const originalMaskRender=window.mtRenderMask;window.mtRenderMask=function(){const result=originalMaskRender.apply(this,arguments);placeEnglishListeners();return result;};
document.addEventListener('keydown',event=>{
 if(event.key!=='ArrowDown'||event.ctrlKey||event.altKey||event.metaKey||event.shiftKey||event.isComposing)return;
 if(event.target instanceof Element&&event.target.closest('#mtEbookPopupSettings'))return;
 const popup=document.getElementById('mt-flashcard');
 if(!popup.getClientRects().length||getComputedStyle(popup).visibility==='hidden'||document.querySelector('dialog[open]'))return;
 const listen=popup.querySelector('.mt-popup-sentence-listen[data-field="eng"]');if(!listen)return;
 event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)start(mtActiveSlotIndex,popupIndex(),'eng',null,true).catch(error=>say(error.message));
},true);
document.getElementById('mtMaskContainer').setAttribute('aria-keyshortcuts','ArrowDown');
const shortcutHelp=document.createElement('span');shortcutHelp.textContent='↓: 현재 영어문장 모두 순서대로 듣기';shortcutHelp.style.cssText='font-size:11px;color:#64748b;align-self:center';popupControls.append(shortcutHelp);
const originalLoad=window.mtLoadWord;window.mtLoadWord=function(){if(run)stop();const result=originalLoad.apply(this,arguments);decoratePopup();return result;};
const main=window.mtGoMainMenu;window.mtGoMainMenu=function(){stop();return main.apply(this,arguments);};
const close=window.mtCloseEbookTyping;window.mtCloseEbookTyping=function(){stop();return close.apply(this,arguments);};
const closeViewer=window.mtCloseEbookViewer;window.mtCloseEbookViewer=function(){stop();return closeViewer.apply(this,arguments);};
addEventListener('storage',e=>{if(e.key===KEY&&e.newValue){Object.assign(preferences,JSON.parse(e.newValue));sync();}});
document.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',stop));
window.mtStopPopupSpeech=stop;window.mtSpeechPCMToWave=pcmWave;sync();decoratePopup();restore();
})();
