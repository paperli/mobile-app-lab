import express from 'express';
import { createServer, request } from 'node:http';
import { randomInt } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';

export function createPreviewServer({ directory=fileURLToPath(new URL('../../tv/dist-demo/',import.meta.url)) }={}) {
  const app=express(), server=createServer(app), io=new Server(server,{maxHttpBufferSize:16384});
  const rooms=new Map();
  // Share an existing ngrok URL with the separate landing-page preview.
  if(process.env.LANDING_PREVIEW_URL){
    const upstream=new URL(process.env.LANDING_PREVIEW_URL);
    app.use('/web-checkout',(req,res)=>{
      const proxy=request({hostname:upstream.hostname,port:upstream.port||80,path:req.originalUrl,method:req.method,headers:{...req.headers,host:upstream.host}},response=>{
        res.writeHead(response.statusCode||502,response.headers);response.pipe(res);
      });
      proxy.on('error',()=>{if(!res.headersSent)res.status(502).send('Landing preview is unavailable.');else res.destroy();});
      req.pipe(proxy);
    });
  }
  app.get('/api/onboarding/health',(_req,res)=>res.json({onboarding:true}));
  app.use(express.static(directory,{index:'index.html',dotfiles:'deny'}));
  io.on('connection',socket=>{
    socket.on('host',(token,ack)=>{
      if(typeof token!=='string'||!/^[a-f0-9-]{36}$/.test(token)||typeof ack!=='function')return;
      let room=[...rooms.values()].find(r=>r.token===token);
      if(!room){
        if(rooms.size>=100){ack({error:'Preview is full. Try again later.'});return;}
        let code;do{code=String(randomInt(100000,1000000));}while(rooms.has(code));
        room={code,token,host:null,state:null,updated:Date.now()};rooms.set(code,room);
      }
      if(room.host&&room.host!==socket.id&&io.sockets.sockets.has(room.host)){ack({error:'This TV is already open.'});return;}
      room.host=socket.id;room.updated=Date.now();socket.data={role:'host',code:room.code};socket.join(room.code);ack({code:room.code});
      socket.to(room.code).emit('host-online');
    });
    socket.on('join',(code,ack)=>{
      if(typeof ack!=='function')return;
      const room=typeof code==='string'&&rooms.get(code);
      if(!room||!room.host){ack({error:'This TV session has ended. Scan its new QR code.'});return;}
      socket.data={role:'phone',code};socket.join(code);ack({state:room.state});
      io.to(room.host).emit('phone-joined');
    });
    socket.on('state',state=>{
      const room=rooms.get(socket.data.code);
      if(!room||room.host!==socket.id||!state||typeof state!=='object')return;
      room.state=state;room.updated=Date.now();socket.to(room.code).emit('state',state);
    });
    let lastWindow=Date.now(),count=0;
    socket.on('command',command=>{
      if(Date.now()-lastWindow>1000){count=0;lastWindow=Date.now();}
      if(++count>40||socket.data.role!=='phone')return;
      const room=rooms.get(socket.data.code);
      if(room?.host)io.to(room.host).emit('command',command);
    });
    socket.on('disconnect',()=>{
      const room=rooms.get(socket.data.code);if(!room)return;
      room.updated=Date.now();
      if(room.host===socket.id){room.host=null;io.to(room.code).emit('host-offline');}
      else if(socket.data.role==='phone'){
        const remaining=[...(io.sockets.adapter.rooms.get(room.code)||[])].some(id=>io.sockets.sockets.get(id)?.data.role==='phone');
        if(!remaining&&room.host)io.to(room.host).emit('phone-left');
      }
    });
  });
  const cleanup=setInterval(()=>{for(const [code,room] of rooms)if(!room.host&&Date.now()-room.updated>300000)rooms.delete(code);},60000);
  cleanup.unref();server.on('close',()=>clearInterval(cleanup));
  return {server,io};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const {server}=createPreviewServer();
  server.listen(Number(process.env.PORT)||4180,'127.0.0.1',()=>console.log(`Onboarding preview: http://127.0.0.1:${server.address().port}/onboarding/`));
}
