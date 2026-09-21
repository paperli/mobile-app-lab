// A stable owner handle around Lightning's pooled animation controllers.
export function animateOwned(node,props,{duration=1100,delay=0,easing='cubic-bezier(.16,1,.3,1)',reduced=false}={}){
 if(node.destroyed)return null;
 const keys=Object.keys(props),motions=node.sceneMotions||(node.sceneMotions=new Set());
 Array.from(motions).forEach(m=>{if(m.keys.some(k=>keys.indexOf(k)>=0))m.stop();});
 if(reduced||duration===0){Object.assign(node,props);return {stop(){}};}
 const controller=node.animate(props,{duration,delay,easing});
 const handle={keys,active:true,stop(){if(handle.active)controller.stop(false);}};
 controller.on('stopped',()=>{handle.active=false;motions.delete(handle);});
 motions.add(handle);controller.start();return handle;
}
