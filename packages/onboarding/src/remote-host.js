import { io } from 'socket.io-client';
import QRCode from 'qrcode';
import { phoneState,applyPhoneCommand } from './remote-contract.js';

export async function setupRemoteHost(scene) {
  try {
    const health=await fetch('/api/onboarding/health',{signal:AbortSignal.timeout(3000)});
    if(!health.ok||!(await health.json()).onboarding)return;
  } catch { return; }
  let token=sessionStorage.getItem('onboarding-host');
  if(!token){token=crypto.randomUUID();sessionStorage.setItem('onboarding-host',token);}
  const socket=io({transports:['websocket','polling']});
  const render=scene.onchange;
  scene.onchange=()=>{render();if(socket.connected)socket.emit('state',phoneState(scene));};
  scene.syncPhone=()=>scene.onchange();
  scene.disconnectPhone=()=>{scene.connected=false;scene.permission=false;scene.phoneStep='pair';scene.go(4);};
  socket.on('connect',()=>socket.emit('host',token,async result=>{
    if(result.error)return;
    scene.roomCode=result.code;
    const url=new URL(location.href);url.search='';url.searchParams.set('phone',result.code);
    scene.phoneUrl=url.href;
    scene.qrSource=await QRCode.toDataURL(url.href,{width:600,margin:3,errorCorrectionLevel:'M'});
    if(scene.phase===4&&scene.puzzleReady)scene.pairStatus();
    if(scene.phase===8)scene.plan();
    scene.onchange();
  }));
  socket.on('command',command=>applyPhoneCommand(scene,command));
  socket.on('phone-joined',()=>{
    scene.connected=true;scene.remotePhone=true;document.getElementById('phone').hidden=true;
    if(scene.phase>=8&&!scene.member&&!['signup','email','offer','pay'].includes(scene.phoneStep))scene.phoneStep='signup';
    else if(scene.phase===4)scene.openApp();
    if(scene.phase===8)scene.plan();
    scene.onchange();
  });
  socket.on('phone-left',()=>{scene.cancelHold();scene.remotePhone=false;scene.connected=false;if(scene.phase===8)scene.plan();scene.onchange();});
}
