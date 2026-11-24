(function(){
'use strict';
const button=document.createElement('button');button.id='mtAppInstallBtn';button.type='button';button.className='btn-excel';button.textContent='앱 설치';button.title='Edge 앱으로 설치해 별도 창에서 실행';
const header=document.querySelector('.header-buttons');if(!header)return;header.append(button);
const standalone=matchMedia('(display-mode: standalone)');let offer=null;
function sync(){button.hidden=standalone.matches||navigator.standalone===true;}
sync();standalone.addEventListener('change',sync);
addEventListener('beforeinstallprompt',event=>{event.preventDefault();offer=event;sync();});
addEventListener('appinstalled',()=>{offer=null;button.hidden=true;if(dialog.open)dialog.close();});
const style=document.createElement('style');style.textContent='#mtAppInstallDialog{box-sizing:border-box;width:min(480px,94vw);max-height:88vh;overflow:auto;border:1px solid #cbd5e1;border-radius:12px;padding:22px;color:#111827;background:#fff}#mtAppInstallDialog::backdrop{background:#0006}#mtAppInstallDialog p{line-height:1.65}#mtAppInstallDialog a{color:#1d4ed8}#mtAppInstallBtn[hidden]{display:none}';document.head.append(style);
const dialog=document.createElement('dialog');dialog.id='mtAppInstallDialog';dialog.setAttribute('aria-labelledby','mtAppInstallTitle');dialog.innerHTML='<h3 id="mtAppInstallTitle">올인원 영작 앱 설치</h3><p>Edge에서 주소창 오른쪽의 <b>앱 설치 아이콘</b>을 누른 뒤 <b>설치</b>를 선택하세요. 아이콘이 없으면 Edge의 <b>⋯ → 기타 도구 → 앱</b>에서 이 사이트를 앱으로 설치할 수 있습니다.</p><p>설치 후 시작 메뉴나 작업표시줄에서 별도 창으로 실행할 수 있습니다. 같은 Edge 프로필로 설치하면 현재 도서·학습 기록·설정을 그대로 사용합니다.</p><p id="mtAppInstallStatus" role="status"></p>';
const close=document.createElement('button');close.className='btn-excel';close.type='button';close.textContent='닫기';close.onclick=()=>dialog.close();dialog.append(close);document.body.append(dialog);
button.onclick=async()=>{if(offer){const current=offer;offer=null;button.disabled=true;try{await current.prompt();await current.userChoice;}catch(_){showGuide('Edge의 주소창 설치 아이콘으로 설치해 주세요.');}finally{button.disabled=false;}return;}showGuide(location.protocol==='file:'?'앱 설치는 공개 사이트에서 가능합니다. 아래 링크를 Edge에서 열어 주세요.':'설치 아이콘이 아직 없으면 잠시 후 다시 누르거나 Edge 메뉴에서 설치해 주세요.');};
function showGuide(message){document.getElementById('mtAppInstallStatus').textContent=message;if(location.protocol==='file:'&&!dialog.querySelector('a')){const link=document.createElement('a');link.href='https://narpheus-cpu.github.io/allinone/';link.textContent='올인원 사이트 열기';dialog.insertBefore(link,close);}if(!dialog.open)dialog.showModal();}
})();
