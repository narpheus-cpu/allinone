(function(){
'use strict';
const origin='http://127.0.0.1:19426';
const KEY='mt_supertonic_preferences_v1';
const defaults={engine:'native',voice:'F1',language:'auto',mp3Model:'supertonic3',mp3Voice:'F1',mp3Bitrate:'128',mp3Split:false};
let preferences={...defaults},dirty=new Set(),ready=false,frame,connection,seq=0,generation=0,run=null,audio,source;
const pending=new Map();
const status=document.createElement('div');status.id='mtSpeechStatus';status.setAttribute('role','status');status.style.cssText='font-size:12px;color:#475569;padding:6px';
const say=message=>{status.textContent=message;document.querySelectorAll('.mt-speech-status').forEach(e=>e.textContent=message);};
try{Object.assign(preferences,JSON.parse(localStorage.getItem(KEY)||'{}'));}catch(_){say('브라우저 저장소 제한 · 로컬 도우미 저장을 사용합니다.');}
try{if(window.opener?.mtSpeechPreferences)Object.assign(preferences,window.opener.mtSpeechPreferences);}catch(_){}
window.mtSpeechPreferences=preferences;
const choices={engine:[['native','Supertonic 3 · 오프라인 고속'],['browser','Supertonic 3 · 오프라인 브라우저']],voice:[],language:[['auto','자동'],['ko','한국어'],['en','영어'],['ja','일본어']],mp3Model:[['supertonic3','Supertonic 3 오프라인 고속']],mp3Voice:[],mp3Bitrate:[['96','96 kbps'],['128','128 kbps']]};
for(const sex of ['F','M'])for(let i=1;i<=5;i++)choices.voice.push([sex+i,(sex==='F'?'여성':'남성')+' '+i]);choices.mp3Voice=choices.voice;
for(const [key,list] of Object.entries(choices))if(!list.some(([v])=>v===preferences[key]))preferences[key]=defaults[key];
function sync(){document.querySelectorAll('[data-speech-key]').forEach(e=>{const k=e.dataset.speechKey;if(e.type==='checkbox')e.checked=preferences[k]===true;else e.value=preferences[k];});}
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
function options(parent){const box=document.createElement('section');box.className='mt-speech-options';box.innerHTML='<h4>듣기 · AI TTS</h4><p style="font-size:12px">PC의 오프라인_뷰어_실행.cmd를 실행하세요. 브라우저가 요청하면 이 사이트의 로컬 네트워크 접근을 허용하세요. 음성 합성은 PC 안에서 처리됩니다.</p>';field(box,'engine','낭독 방식');field(box,'voice','낭독 목소리');field(box,'language','언어');button('로컬 도우미 연결 확인',restore,box);const note=document.createElement('div');note.className='mt-speech-status';note.setAttribute('role','status');box.append(note);parent.append(box);}
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
async function pauseSpeech(){if(!audio||!run)return;run.paused=!run.paused;await (run.paused?audio.suspend():audio.resume());say(run.paused?'일시정지':'낭독 중');}
function moveSpeech(delta){if(run)start(run.slot,Math.max(0,Math.min(run.words.length-1,run.index+delta)),run.field);}
const popupControls=document.createElement('div');popupControls.id='mtPopupSpeechControls';popupControls.style.cssText='display:flex;gap:5px;flex-wrap:wrap;margin:6px 0';button('중지',()=>stop(),popupControls);button('MP3',()=>{sync();exportDialog.showModal();},popupControls);document.getElementById('mtEbookPopupDragHandle').after(popupControls);
button('일시정지 / 계속',pauseSpeech,popupControls);button('이전 문장',()=>moveSpeech(-1),popupControls);button('다음 문장',()=>moveSpeech(1),popupControls);popupControls.append(status);
function getWords(slot){return mtEbookTypingActive?mtGetEbookWords(slot):mtCurrentStudyWords.slice();}
let lastField='kor';
function textFor(word,field=lastField){return String(field==='eng'?word.eng:field==='subKor'?(word.subKor||word.literalKor):word.kor||'');}
function popupIndex(){return mtEbookTypingActive?(mtEbookCurrentListIndex??0):mtCurrentIndex;}
function lang(text){if(preferences.language!=='auto')return preferences.language;return /[가-힣ᄀ-ᇿ]/u.test(text)?'ko':/[ぁ-ヿ]/u.test(text)?'ja':/[\u3400-\u9fff]/u.test(text)?'ko':'en';}
function parts(text){const result=[];let chars=Array.from(text.trim());while(chars.length){let cut=Math.min(115,chars.length);if(chars.length>cut){const p=chars.slice(0,cut).join(''),i=Math.max(p.lastIndexOf(' '),p.lastIndexOf('。'),p.lastIndexOf('.'));if(i>55)cut=Array.from(p.slice(0,i+1)).length;}const part=chars.splice(0,cut).join('');if(/[\p{L}\p{N}]/u.test(part))result.push(part);}return result;}
function connect(){if(connection)return connection;connection=new Promise((resolve,reject)=>{frame=document.createElement('iframe');frame.hidden=true;frame.src=origin+'/supertonic3/bridge.html';const timer=setTimeout(()=>{frame.remove();connection=null;reject(Error('로컬 음성 도우미 연결 실패'));},15000);const onReady=e=>{if(e.source===frame.contentWindow&&e.data?.action==='ready'){clearTimeout(timer);removeEventListener('message',onReady);resolve();}};addEventListener('message',onReady);frame.onload=()=>frame.contentWindow.postMessage({type:'reader-tts',action:'connect'},origin);document.body.append(frame);});return connection;}
addEventListener('message',e=>{if(e.source!==frame?.contentWindow||e.origin!==origin||e.data?.type!=='reader-tts')return;const d=e.data,request=pending.get(d.id);if(d.action==='progress'){say(`모델 여는 중 ${d.loaded}/${d.total}`);return;}if(!request)return;clearTimeout(request.timer);pending.delete(d.id);d.action==='audio'?request.resolve(d):request.reject(Error(d.message||'합성 실패'));});
async function synth(text,token){await connect();return new Promise((resolve,reject)=>{const id=++seq,timer=setTimeout(()=>{pending.delete(id);reject(Error('음성 합성 시간 초과'));},180000);pending.set(id,{resolve,reject,timer});frame.contentWindow.postMessage({type:'reader-tts',action:'synthesize',id,generation:token,engine:preferences.engine,text,lang:lang(text),voice:preferences.voice},origin);});}
function stop(){generation++;run=null;try{source?.stop();audio?.resume();}catch(_){}frame?.contentWindow?.postMessage({type:'reader-tts',action:'cancel',generation},origin);for(const r of pending.values()){clearTimeout(r.timer);r.reject(new DOMException('중지','AbortError'));}pending.clear();document.querySelectorAll('.mt-speech-reading').forEach(e=>e.classList.remove('mt-speech-reading'));say('낭독 중지');}
let following=false;
async function start(slot,index,field='kor',firstText=null){stop();lastField=field;const token=generation;const words=getWords(slot),ebook=mtEbookTypingActive;audio ||= new AudioContext();await audio.resume();if(token!==generation)return;run={slot,paused:false,words,field,index};try{for(let i=index;i<words.length&&token===generation;i++){
 run.index=i;
 if(Number(mtActiveSlotIndex)!==Number(slot)&&mtActiveSlotIndex!==slot){stop();return;}
 following=true;
 try{if(ebook){if(mtEbookCurrentListIndex!==i)mtOpenEbookTyping(slot,i);}else if(mtCurrentIndex!==i){mtCurrentIndex=i;mtLoadWord(i);} }finally{following=false;}
 mtSaveLastReadPosition(slot,Number.isInteger(words[i].originalIndex)?words[i].originalIndex:i);mtSaveSessionState();await mtPersistTypedSlotStates();if(token!==generation)return;
 document.querySelectorAll('.mt-speech-reading').forEach(e=>e.classList.remove('mt-speech-reading'));
 const highlight=document.getElementById(field==='eng'?'mtMaskContainer':'mtKorText');highlight.classList.add('mt-speech-reading');
 let text=textFor(words[i],field);if(i===index&&firstText){const offset=text.indexOf(firstText);if(offset>=0)text=text.slice(offset);}
 say(`낭독 ${i+1}/${words.length}`);for(const part of parts(text)){if(token!==generation)return;const result=await synth(part,token);if(token!==generation)return;const samples=new Float32Array(result.samples),buffer=audio.createBuffer(1,samples.length,result.sampleRate);buffer.copyToChannel(samples,0);await new Promise(resolve=>{source=audio.createBufferSource();source.buffer=buffer;source.connect(audio.destination);source.onended=resolve;source.start();});}}
 if(token===generation){run=null;say('낭독 완료');document.querySelectorAll('.mt-speech-reading').forEach(e=>e.classList.remove('mt-speech-reading'));}
 }catch(error){if(token===generation)say('낭독 실패 · '+error.message);}}
const style=document.createElement('style');style.textContent='.mt-speech-reading{background:#fef3c7!important;outline:2px solid #fbbf24}.mt-speech-listen{margin:0 7px;padding:3px 7px}#mtSpeechOptionsDialog,#mtSpeechExportDialog{max-width:90vw;border:1px solid #cbd5e1;border-radius:12px;padding:22px}.mt-speech-options select{max-width:65%;padding:5px}';document.head.append(style);
function listenButton(parent,field,text,label){const b=button('🔊',()=>start(mtActiveSlotIndex,popupIndex(),field,text),parent);b.title=label;b.setAttribute('aria-label',label);b.classList.add('mt-popup-sentence-listen');b.dataset.field=field;return b;}
function decoratePopup(){
 const root=document.getElementById('mtKorText');if(!mtCurrentStudyWords[mtCurrentIndex])return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];let node;
 while(node=walker.nextNode())if(node.textContent.trim()&&!node.parentElement.closest('button,.mt-popup-speech-sentence'))nodes.push(node);
 const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter('ko',{granularity:'sentence'}):null;
 for(const node of nodes){const field=node.parentElement.closest('.mt-paren-text')?'subKor':'kor',fragment=document.createDocumentFragment();const segments=segmenter?[...segmenter.segment(node.textContent)].map(x=>x.segment):[node.textContent];
 for(const text of segments){const span=document.createElement('span');span.className='mt-popup-speech-sentence';span.append(text);if(/[\p{L}\p{N}]/u.test(text))listenButton(span,field,text,field==='subKor'?'보조문장 듣기':'문장 듣기');fragment.append(span);}node.replaceWith(fragment);}
 const settingsButton=document.getElementById('mtEbookPopupSettingsBtn');settingsButton.style.display='inline-flex';settingsButton.textContent='⚙ 팝업 설정';
}
const englishControls=document.createElement('div');englishControls.id='mtPopupEnglishListen';englishControls.style.cssText='width:fit-content;text-align:center;margin:4px auto 0;position:relative;z-index:2';listenButton(englishControls,'eng',null,'영어문장 듣기');document.getElementById('mtMaskContainer').after(englishControls);
const originalLoad=window.mtLoadWord;window.mtLoadWord=function(){if(run&&!following)stop();const result=originalLoad.apply(this,arguments);decoratePopup();return result;};
const main=window.mtGoMainMenu;window.mtGoMainMenu=function(){stop();return main.apply(this,arguments);};
const close=window.mtCloseEbookTyping;window.mtCloseEbookTyping=function(){stop();return close.apply(this,arguments);};
const closeViewer=window.mtCloseEbookViewer;window.mtCloseEbookViewer=function(){stop();return closeViewer.apply(this,arguments);};
addEventListener('storage',e=>{if(e.key===KEY&&e.newValue){Object.assign(preferences,JSON.parse(e.newValue));sync();}});
document.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',stop));
sync();decoratePopup();restore();
})();
