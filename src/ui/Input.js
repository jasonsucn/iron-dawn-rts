import * as T from 'three';

export class Input {
  constructor(canvas,camera,cb) {
    this.canvas=canvas;this.camera=camera;this.cb=cb;
    this.keys=new Map();this.groups={};this.mouse={x:-1,y:-1,world:false};
    this.ray=new T.Raycaster();this.plane=new T.Plane(new T.Vector3(0,1,0),0);this.point=new T.Vector3();
    this.drag=null;this.middle=null;this.lastClick={time:0,id:0};this.edge=true;
    this.edgeTop=false;this.edgeBottom=false;this.edgeLeft=false;this.edgeRight=false;
    this.overControl=false;this.rightDown=null;this.rightDragged=false;
    this.listeners=[];
    this.listen(canvas,'pointerdown',e=>this.down(e));
    this.listen(window,'pointermove',e=>this.move(e));
    this.listen(window,'pointerup',e=>this.up(e));
    this.listen(canvas,'contextmenu',e=>{e.preventDefault();if(this.cb.active())this.right(e);});
    this.listen(canvas,'wheel',e=>{e.preventDefault();if(this.cb.active())this.cb.zoom(e.deltaY>0?1.10:.91);},{passive:false});
    this.listen(window,'keydown',e=>this.key(e,true));
    this.listen(window,'keyup',e=>this.key(e,false));
    this.listen(window,'blur',()=>this.reset());
  }
  listen(target,type,fn,options){target.addEventListener(type,fn,options);this.listeners.push(()=>target.removeEventListener(type,fn,options));}
  cast(x,y){this.ray.setFromCamera(new T.Vector2(x/innerWidth*2-1,1-y/innerHeight*2),this.camera);return this.ray;}
  ground(x,y){return this.cast(x,y).ray.intersectPlane(this.plane,this.point)?{x:this.point.x,z:this.point.z}:null;}
  entity(x,y){const hits=this.cast(x,y).intersectObjects(this.cb.getObjects(),true);return hits.find(h=>Number.isInteger(h.object.userData.entityId))?.object.userData.entityId??null;}
  down(e){
    if(!this.cb.active())return;
    if(e.button===1){e.preventDefault();this.middle={x:e.clientX,y:e.clientY,rotate:e.altKey};return;}
    if(e.button===2){this.rightDown={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};return;}
    if(e.button!==0)return;
    this.drag={x:e.clientX,y:e.clientY,moved:false,shift:e.shiftKey};
    try { this.canvas.setPointerCapture?.(e.pointerId); } catch {}
  }
  move(e){
    const control = e.target?.closest?.('button, a, input, select, textarea, .blueprint, .build-tabs [data-tab]');
    this.mouse={x:e.clientX,y:e.clientY,world:e.target===this.canvas,overControl:!!control};
    if(!this.cb.active())return;
    if(this.rightDown){
      const dx=e.clientX-this.rightDown.x,dy=e.clientY-this.rightDown.y;
      if(!this.rightDown.moved&&Math.hypot(e.clientX-this.rightDown.startX,e.clientY-this.rightDown.startY)>10)this.rightDown.moved=true;
      if(this.rightDown.moved){this.cb.pan(-dx*.085,-dy*.085);this.rightDown.x=e.clientX;this.rightDown.y=e.clientY;return;}
    }
    if(this.middle){const dx=e.clientX-this.middle.x,dy=e.clientY-this.middle.y;
      if(this.middle.rotate)this.cb.rotate(dx*.006);else this.cb.pan(-dx*.11,-dy*.11);
      this.middle.x=e.clientX;this.middle.y=e.clientY;return;
    }
    if(this.drag){const d=this.drag,dx=e.clientX-d.x,dy=e.clientY-d.y;
      if(Math.hypot(dx,dy)>6){d.moved=true;const b=document.querySelector('#drag-box');b.hidden=false;
        Object.assign(b.style,{left:Math.min(d.x,e.clientX)+'px',top:Math.min(d.y,e.clientY)+'px',width:Math.abs(dx)+'px',height:Math.abs(dy)+'px'});
      }
    }
    if(e.target===this.canvas){const p=this.ground(e.clientX,e.clientY);if(p)this.cb.preview(p);}
  }
  up(e){
    if(e.button===1){this.middle=null;return;}
    if(e.button===2){this.rightDragged=!!this.rightDown?.moved;this.rightDown=null;return;}
    if(e.button!==0||!this.drag)return;
    const d=this.drag;this.drag=null;document.querySelector('#drag-box').hidden=true;
    if(!this.cb.active())return;
    if(d.moved&&!this.cb.targeting()){this.cb.box({x:d.x,y:d.y,x2:e.clientX,y2:e.clientY},e.shiftKey);return;}
    const p=this.ground(e.clientX,e.clientY);if(!p)return;
    if(this.cb.targeting()){this.cb.place(p,e.shiftKey);return;}
    const id=this.entity(e.clientX,e.clientY);
    if(id!==null){const now=performance.now(),double=this.lastClick.id===id&&now-this.lastClick.time<330;this.lastClick={id,time:now};this.cb.select(id,e.shiftKey,double);}
    else this.cb.clear(e.shiftKey);
  }
  right(e){
    if(this.rightDragged){this.rightDragged=false;return;}
    if(this.cb.targeting()){this.cb.cancelTarget();return;}
    const id=this.entity(e.clientX,e.clientY),p=this.ground(e.clientX,e.clientY);
    if(p)this.cb.order(id===null?p:{...p,entityId:id});
  }
  key(e,down){
    if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)||(e.ctrlKey&&/^Digit/.test(e.code)))e.preventDefault();
    if(!down){const start=this.keys.get(e.code);this.keys.delete(e.code);if(start===undefined||!this.cb.active())return;
      if(performance.now()-start<175&&!e.ctrlKey&&!e.altKey){
        if(e.code==='KeyA')this.cb.command('attackMove');
        if(e.code==='KeyS')this.cb.command('stop');
        const tabs={KeyQ:'structures',KeyW:'defenses',KeyE:'infantry',KeyR:'vehicles'};if(tabs[e.code])this.cb.tab(tabs[e.code]);
      }return;
    }
    if(e.repeat)return;this.keys.set(e.code,performance.now());
    if(e.code==='Escape'){this.cb.escape();this.reset();return;}
    if(!this.cb.active())return;
    if(e.code==='KeyH')this.cb.command('hold');
    if(e.code==='Delete')this.cb.command('sell');
    if(e.code==='KeyG')this.cb.command('rally');
    if(e.code==='KeyF')this.cb.command('focus');
    if(e.code==='Space'){e.preventDefault();this.cb.command('home');}
    if(/^Digit[1-9]$/.test(e.code)){
      const i=Number(e.code.slice(5));
      if(e.ctrlKey){this.groups[i]=this.cb.selection();this.cb.status(`CONTROL GROUP ${i} ASSIGNED`);}
      else if(e.altKey)this.cb.blueprint(i-1);
      else this.cb.group((this.groups[i]||[]).filter(id=>this.cb.alive(id)));
    }
  }
  update(dt){
    if(!this.cb.active())return;
    const now=performance.now(),held=c=>this.keys.has(c)&&now-this.keys.get(c)>160;
    let x=0,z=0;const fast=this.keys.has('ShiftLeft')?1.6:1,speed=dt*38*fast;
    if(held('KeyA')||this.keys.has('ArrowLeft'))x-=speed;
    if(held('KeyD')||this.keys.has('ArrowRight'))x+=speed;
    if(held('KeyW')||this.keys.has('ArrowUp'))z-=speed;
    if(held('KeyS')||this.keys.has('ArrowDown'))z+=speed;
    if(this.edge&&!this.drag&&!this.middle&&this.mouse.x>=0){
      const ENTER=14,EXIT=26, m=this.mouse;
      const topIn=m.y<(this.edgeTop?EXIT:ENTER)&&!m.overControl;
      const bottomIn=m.world&&m.y>innerHeight-(this.edgeBottom?EXIT:ENTER);
      const leftIn=m.world&&m.x<(this.edgeLeft?EXIT:ENTER);
      const rightIn=m.world&&m.x>innerWidth-(this.edgeRight?EXIT:ENTER);
      this.edgeTop=topIn;this.edgeBottom=bottomIn;this.edgeLeft=leftIn;this.edgeRight=rightIn;
      if(topIn)z-=speed;if(bottomIn)z+=speed;if(leftIn)x-=speed;if(rightIn)x+=speed;
    }
    if(x||z)this.cb.pan(x,z);
    if(held('KeyQ'))this.cb.rotate(-dt*.8);if(held('KeyE'))this.cb.rotate(dt*.8);
  }
  reset(){this.keys.clear();this.drag=null;this.middle=null;this.rightDown=null;this.edgeTop=this.edgeBottom=this.edgeLeft=this.edgeRight=false;const box=document.querySelector('#drag-box');if(box)box.hidden=true;}
  dispose(){this.reset();this.listeners.forEach(fn=>fn());this.listeners=[];}
}
