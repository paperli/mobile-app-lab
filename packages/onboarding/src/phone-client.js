import 'core-js/stable';
import { io } from 'socket.io-client';
import { setupPhone } from './phone.js';
import { remoteMethods } from './remote-contract.js';
import './fonts.css';
import './style.css';
import './journey.css';
import './ios-checkout.css';
import './phone-client.css';

document.body.classList.add('phone-only');
document.getElementById('tvStage').remove();
document.getElementById('boot').hidden=true;
const el=document.createElement('main');el.id='phone';el.className='standalone-phone';
el.innerHTML='<div class="remote-status" role="status">Connecting to your TV…</div><div class="phone-screen wk-phone__screen journey-phone"></div>';
document.body.appendChild(el);
const screen=el.querySelector('.phone-screen'),status=el.querySelector('.remote-status');
const socket=io({transports:['websocket','polling']});
const state={phase:4,phoneStep:'connecting',connected:false,voice:'ready',accountMode:'signup',host:{unlock(){}},hideHub(){}};
let holdAt=0;
const send=(method,value)=>{if(socket.connected)socket.emit('command',{method,value});};
for(const method of remoteMethods)state[method]=value=>{
  if(method==='startHold'){holdAt=performance.now();state.voice='listening';}
  if(method==='cancelHold'){holdAt=0;state.voice='ready';}
  if(method==='endHold'){value=holdAt?performance.now()-holdAt:0;holdAt=0;state.voice='processing';}
  send(method,value);
};
state.syncPhone=()=>send('syncPhone',{phoneStep:state.phoneStep,accountMode:state.accountMode});
state.go=()=>send('disconnectPhone');
const render=setupPhone(state,{el,screen});state.onchange=render;
const room=new URLSearchParams(location.search).get('phone');
const showStatus=message=>{status.textContent=message;status.hidden=!message;el.classList.toggle('remote-offline',!!message);};
socket.on('connect',()=>socket.emit('join',room,result=>{
  if(result.error){showStatus(result.error);return;}
  if(result.state)Object.assign(state,result.state);showStatus('');render();
}));
socket.on('state',snapshot=>{Object.assign(state,snapshot);if(holdAt&&state.phase===6)state.voice='listening';else if(state.phase!==6)holdAt=0;showStatus('');render();});
socket.on('disconnect',()=>{state.cancelHold();showStatus('Reconnecting to your TV…');});
socket.on('connect_error',()=>showStatus('Reconnecting to your TV…'));
socket.on('host-offline',()=>showStatus('Waiting for your TV to reconnect…'));
socket.on('host-online',()=>socket.emit('join',room,result=>{if(result.state){Object.assign(state,result.state);showStatus('');render();}}));
document.addEventListener('visibilitychange',()=>{if(document.hidden)state.cancelHold();});
window.addEventListener('blur',()=>state.cancelHold());
