import { Vector3 } from 'three';
import type { VehicleState } from '../vehicle/drivingPhysics.ts';
import { constrainCamera, type CameraBlocker } from './cameraCollision.ts';

// Resolve the desired shot before damping. Retain a world-space shoulder while
// obstructed so turning the chair cannot flip the chosen side every frame.
export class WheelchairCameraAvoidance {
  private focus=new Vector3();
  private candidate=new Vector3();
  private best=new Vector3();
  private offset=new Vector3();
  private pathPoint=new Vector3();
  private active=false;
  private clearTime=0;
  reset() { this.active=false; this.clearTime=0; }
  apply(position:Vector3,target:VehicleState,blockers:readonly CameraBlocker[],delta=1/60,reference?:Vector3) {
    this.focus.set(target.x,1,target.z);
    const obstructed=constrainCamera(this.focus,position,blockers);
    const distance=position.distanceTo(this.focus);
    if(!this.active && !obstructed && distance>=3.3)return false;
    let returnPathClear=true;
    if(this.active && reference && !obstructed){
      // Clear endpoints do not guarantee a clear transition: a straight blend
      // between opposite shoulders can cross the parked bus.
      for(let i=1;i<10;i++){
        this.pathPoint.copy(reference).lerp(position,i/10);
        if(constrainCamera(this.focus,this.pathPoint,blockers)){returnPathClear=false;break;}
      }
    }
    if(this.active && !obstructed && distance>4.5 && returnPathClear)this.clearTime+=Math.max(0,Math.min(delta,.1));
    else this.clearTime=0;
    if(this.clearTime>.8){this.reset();return false;}
    if(this.active){
      this.candidate.copy(this.focus).add(this.offset);
      constrainCamera(this.focus,this.candidate,blockers);
      if(this.candidate.distanceTo(this.focus)>=3.3){position.copy(this.candidate);return true;}
    }
    const preferred=Math.atan2((reference??position).x-this.focus.x,(reference??position).z-this.focus.z);
    let bestScore=-Infinity;
    for(let i=0;i<9;i++){
      const angle=preferred+(i===0?0:Math.ceil(i/2)*(i%2?1:-1)*Math.PI/4);
      this.candidate.set(target.x+Math.sin(angle)*6,3.7,target.z+Math.cos(angle)*6);
      constrainCamera(this.focus,this.candidate,blockers);
      const score=Math.min(this.candidate.distanceTo(this.focus),5)-i*.04;
      if(score>bestScore){bestScore=score;this.best.copy(this.candidate);}
    }
    if(this.best.distanceTo(this.focus)<3.3){
      this.candidate.set(target.x,6,target.z);constrainCamera(this.focus,this.candidate,blockers);
      if(this.candidate.distanceTo(this.focus)>this.best.distanceTo(this.focus))this.best.copy(this.candidate);
    }
    this.offset.copy(this.best).sub(this.focus);this.active=true;this.clearTime=0;
    position.copy(this.best);return true;
  }
}
