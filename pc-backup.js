(function(){
'use strict';
const origin='http://127.0.0.1:19426',interval=5*60*1000;let busy=false,timer=null,nextAt=null,changeTimer=null;
const status=document.createElement('div');status.id='mtPcBackupStatus';status.setAttribute('role','status');status.style.cssText='font-size:12px;line-height:1.6;color:#475569;margin:-8px 0 12px;overflow-wrap:anywhere';document.querySelector('.header-container').after(status);
const button=document.querySelector('button[onclick="saveToLocalPC()"]');if(button)button.title='바탕화면의 올인원 자동저장 폴더에 즉시 저장하며, 창을 열어 두면 5분마다 v1·v2·v3 순환 저장';
function report(message,error=false){status.textContent=message;status.dataset.state=error?'error':'ready';status.style.color=error?'#b91c1c':'#475569';}
function schedule(delay=interval){clearTimeout(timer);nextAt=Date.now()+delay;timer=setTimeout(()=>run(),delay);}
async function run(){if(busy)return false;if(!mtAppReady||mtRestoreInProgress||typeof mtStartupFinished!=='undefined'&&!mtStartupFinished){report('자동저장 · 데이터 초기화를 기다리고 있습니다.');schedule(5000);return false;}busy=true;report('PC 자동저장 중…');status.dataset.state='saving';try{const snapshot=await mtBuildCompleteBackupData();const response=await fetch(origin+'/pc-backup/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(snapshot),signal:AbortSignal.timeout(120000)});const saved=await response.json();if(!response.ok||!saved.ok)throw Error(saved.error||'백업 파일 저장을 확인하지 못했습니다.');const at=new Date(saved.lastSavedAt).toLocaleTimeString('ko-KR');report('자동저장 켜짐 · 5분 주기 · 마지막 저장 '+at+' · '+saved.folder+' · '+saved.name);status.dataset.savedAt=String(saved.lastSavedAt);status.dataset.file=saved.name;try{mtStorageSucceeded('PC 백업');}catch(_){}schedule();return true;}catch(error){report('자동저장 실패 · '+(error.name==='TypeError'?'PC 도우미 연결을 확인해 주세요.':error.message)+' · 1분 뒤 다시 시도합니다.',true);schedule(60000);return false;}finally{busy=false;}}
// The helper owns the fixed desktop destination; disable the older permission-dependent timer.
try{if(mtAutoBackupTimerId)clearTimeout(mtAutoBackupTimerId);}catch(_){}
window.saveToLocalPC=()=>run();
document.addEventListener('mt-pc-backup-request',()=>{clearTimeout(changeTimer);changeTimer=setTimeout(()=>run(),1500);});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()>=(nextAt||0))run();});
report('자동저장 준비 중 · 바탕화면의 올인원 자동저장 폴더');status.dataset.state='pending';schedule(1500);
})();
