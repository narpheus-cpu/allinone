(function(){
'use strict';
let offer=null,button=null,dialog=null,workerState='pending';
// Capture the offer before the large viewer and its other modules finish loading.
addEventListener('beforeinstallprompt',event=>{event.preventDefault();offer=event;if(button)button.dataset.installState='ready';});
addEventListener('appinstalled',()=>{offer=null;if(button)button.hidden=true;if(dialog?.open)dialog.close();});
function init(){
 const header=document.querySelector('.header-buttons');if(!header)return;
 button=document.createElement('button');button.id='mtAppInstallBtn';button.type='button';button.className='btn-excel';button.textContent='앱 설치';button.title='Edge 앱으로 설치해 별도 창에서 실행';button.dataset.installState=offer?'ready':'preparing';header.append(button);
 const standalone=matchMedia('(display-mode: standalone)');const sync=()=>{button.hidden=standalone.matches||navigator.standalone===true;};sync();standalone.addEventListener('change',sync);
 const style=document.createElement('style');style.textContent='#mtAppInstallDialog{box-sizing:border-box;width:min(480px,94vw);max-height:88vh;overflow:auto;border:1px solid #cbd5e1;border-radius:12px;padding:22px;color:#111827;background:#fff}#mtAppInstallDialog::backdrop{background:#0006}#mtAppInstallDialog p{line-height:1.65}#mtAppInstallDialog a{color:#1d4ed8}#mtAppInstallBtn[hidden]{display:none}';document.head.append(style);
 dialog=document.createElement('dialog');dialog.id='mtAppInstallDialog';dialog.setAttribute('aria-labelledby','mtAppInstallTitle');dialog.innerHTML='<h3 id="mtAppInstallTitle">올인원 영작 앱 설치</h3><p>Edge 주소창 오른쪽의 <b>앱 설치 아이콘</b>에서도 설치할 수 있습니다.</p><p>설치 후 시작 메뉴나 작업표시줄에서 별도 창으로 실행할 수 있습니다. 같은 Edge 프로필로 설치하면 현재 도서·학습 기록·설정을 그대로 사용합니다.</p><p id="mtAppInstallStatus" role="status"></p>';
 const close=document.createElement('button');close.className='btn-excel';close.type='button';close.textContent='닫기';close.onclick=()=>dialog.close();dialog.append(close);document.body.append(dialog);
 function showGuide(message){document.getElementById('mtAppInstallStatus').textContent=message;if(location.protocol==='file:'&&!dialog.querySelector('a')){const link=document.createElement('a');link.href='https://narpheus-cpu.github.io/allinone/';link.textContent='올인원 사이트 열기';dialog.insertBefore(link,close);}if(!dialog.open)dialog.showModal();}
 button.onclick=async()=>{
  if(offer){const current=offer;offer=null;button.disabled=true;try{await current.prompt();const choice=await current.userChoice;if(choice.outcome==='accepted'){button.dataset.installState='accepted';}else{button.dataset.installState='dismissed';showGuide('설치를 취소했습니다. 다시 설치하려면 주소창의 앱 설치 아이콘을 눌러 주세요.');}}catch(_){button.dataset.installState='error';showGuide('설치 창을 열지 못했습니다. 주소창의 앱 설치 아이콘을 확인해 주세요.');}finally{button.disabled=false;}return;}
  showGuide(location.protocol==='file:'?'앱 설치는 공개 사이트에서 가능합니다. 아래 링크를 Edge에서 열어 주세요.':workerState==='pending'?'앱 설치를 준비하고 있습니다. 잠시 후 이 창을 닫고 앱 설치를 다시 눌러 주세요.':workerState==='failed'?'앱 설치 준비를 완료하지 못했습니다. 인터넷 연결을 확인한 뒤 새로고침해 주세요.':'Edge가 아직 설치 요청을 제공하지 않았습니다. 주소창의 앱 설치 아이콘을 확인해 주세요. 다른 사이트에서도 앱 메뉴가 비활성화되어 있다면 Edge를 완전히 종료한 뒤 다시 실행해 주세요.');
 };
 if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)){
  navigator.serviceWorker.register('./app-sw.js',{scope:'./',updateViaCache:'none'}).then(()=>navigator.serviceWorker.ready).then(()=>{workerState='ready';if(!offer)button.dataset.installState='waiting';}).catch(()=>{workerState='failed';if(!offer)button.dataset.installState='error';});
 }else{workerState='failed';}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
