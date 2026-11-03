import type { Vector3 } from 'three';
import type { VehicleState } from '../vehicle/drivingPhysics.ts';

const sensitivity=.005;
const minPitch=.12,maxPitch=1.35;
export const MIN_CAMERA_DISTANCE=4,MAX_CAMERA_DISTANCE=40;
export class MouseOrbit {
  active=false;
  dragging=false;
  yaw=0;
  pitch=.5;
  radius=6;
  private x=0;
  private y=0;
  begin(position:Vector3,target:VehicleState,aimHeight:number,x:number,y:number) {
    const dx=position.x-target.x,dz=position.z-target.z,dy=position.y-aimHeight;
    this.radius=Math.max(MIN_CAMERA_DISTANCE,Math.min(MAX_CAMERA_DISTANCE,Math.hypot(dx,dy,dz)));
    this.yaw=Math.atan2(dx,dz)-target.angle;
    this.pitch=Math.max(minPitch,Math.min(maxPitch,Math.atan2(dy,Math.hypot(dx,dz))));
    this.x=x;this.y=y;this.active=true;this.dragging=true;
  }
  move(x:number,y:number) {
    if(!this.dragging)return;
    this.yaw-=(x-this.x)*sensitivity;
    this.pitch=Math.max(minPitch,Math.min(maxPitch,this.pitch+(y-this.y)*sensitivity));
    this.x=x;this.y=y;
  }
  end() { this.dragging=false; }
  zoom(delta:number,position:Vector3,target:VehicleState,aimHeight:number) {
    if(!Number.isFinite(delta)||delta===0)return;
    if(!this.active){const dragging=this.dragging;this.begin(position,target,aimHeight,this.x,this.y);this.dragging=dragging;}
    this.radius=Math.max(MIN_CAMERA_DISTANCE,Math.min(MAX_CAMERA_DISTANCE,this.radius*Math.exp(Math.max(-600,Math.min(600,delta))*.0015)));
  }
  reset() { this.active=false;this.dragging=false; }
  apply(position:Vector3,target:VehicleState,aimHeight:number) {
    const angle=target.angle+this.yaw,horizontal=this.radius*Math.cos(this.pitch);
    position.set(target.x+Math.sin(angle)*horizontal,aimHeight+this.radius*Math.sin(this.pitch),target.z+Math.cos(angle)*horizontal);
  }
}

export function bindMouseOrbit(canvas:HTMLElement,orbit:MouseOrbit,view:()=>{position:Vector3;target:VehicleState;aimHeight:number}) {
  let pointer:number|undefined;
  const release=()=>{
    if(pointer!==undefined && canvas.hasPointerCapture(pointer))canvas.releasePointerCapture(pointer);
    pointer=undefined;orbit.end();canvas.classList.remove('is-orbiting');
  };
  const down=(event:PointerEvent)=>{
    if(event.pointerType!=='mouse'||event.button!==2)return;
    event.preventDefault();release();const current=view();
    orbit.begin(current.position,current.target,current.aimHeight,event.clientX,event.clientY);
    pointer=event.pointerId;canvas.setPointerCapture(pointer);canvas.classList.add('is-orbiting');
  };
  const move=(event:PointerEvent)=>{
    if(event.pointerId!==pointer)return;
    if(!(event.buttons&2)){release();return;}
    orbit.move(event.clientX,event.clientY);
  };
  const up=(event:PointerEvent)=>{if(event.pointerId===pointer && !(event.buttons&2))release();};
  const cancel=(event:PointerEvent)=>{if(event.pointerId===pointer)release();};
  const menu=(event:Event)=>event.preventDefault();
  const visibility=()=>{if(document.hidden)release();};
  const wheel=(event:WheelEvent)=>{
    if(event.ctrlKey||event.deltaY===0)return; // Preserve browser Ctrl+wheel/pinch zoom.
    event.preventDefault();const current=view();
    const unit=event.deltaMode===1?16:event.deltaMode===2?canvas.clientHeight:1;
    orbit.zoom(event.deltaY*unit,current.position,current.target,current.aimHeight);
  };
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);
  canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('lostpointercapture',cancel);
  canvas.addEventListener('contextmenu',menu);window.addEventListener('blur',release);document.addEventListener('visibilitychange',visibility);
  canvas.addEventListener('wheel',wheel,{passive:false});
  return ()=>{
    release();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);
    canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',cancel);canvas.removeEventListener('lostpointercapture',cancel);
    canvas.removeEventListener('contextmenu',menu);window.removeEventListener('blur',release);document.removeEventListener('visibilitychange',visibility);
    canvas.removeEventListener('wheel',wheel);
  };
}
