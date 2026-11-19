import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { CenterCampus } from '../../data/centerCampuses.ts';
import { createSurface } from '../rendering/materials.ts';

type Surface = 'tile' | 'asphalt' | 'marking' | 'fixture' | 'green';
type Point = [number,number,number];
export function createCampusModel(site:CenterCampus){
  const root=new THREE.Group(),batches=new Map<Surface,THREE.BufferGeometry[]>();
  root.name=`campus-${site.id}-grounds`;
  root.userData.parkingSpaces=site.parkingXs.length;
  root.userData.pickup={x:0,z:40};
  const add=(source:THREE.BufferGeometry,surface:Surface,position:Point,color='#ffffff',rotation=0)=>{
    source.rotateY(rotation);source.translate(...position);
    const geometry=source.index?source.toNonIndexed():source;if(geometry!==source)source.dispose();
    const tint=new THREE.Color(color),colors=new Float32Array(geometry.getAttribute('position').count*3);
    for(let i=0;i<colors.length;i+=3)tint.toArray(colors,i);
    geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
    const batch=batches.get(surface)??[];batch.push(geometry);batches.set(surface,batch);
  };
  const box=(position:Point,size:Point,surface:Surface,color?:string)=>add(new THREE.BoxGeometry(...size),surface,position,color);
  const line=(x:number,z:number,width:number,depth:number,color='#f8f4de')=>box([x,.127,z],[width,.014,depth],'marking',color);
  box([0,.025,27],[site.courtHalfWidth*2,.05,86],'tile');
  box([0,.07,49],[site.courtHalfWidth*2,.05,46],'asphalt');
  box([0,.09,18],[16,.03,24],'tile');
  // A flat, obstacle-free approach from the building forecourt to the pickup lane.
  for(const z of [27,29,31])line(0,z,6,1);
  for(const x of [-7,7])line(x,40,.14,6.6,'#e8c570');
  for(const z of [36.7,43.3])line(0,z,14,.14,'#e8c570');
  for(const x of site.parkingXs){
    for(const side of [-1,1])line(x+side*2.5,58,.12,10);
    line(x,63,5,.12);
    // Geometric P, batched with the bay markings rather than one texture per space.
    line(x-.5,58,.14,2);line(x,58.9,1,.14);line(x,58,1,.14);line(x+.5,58.45,.14,.9);
  }
  const arrow=(x:number,z:number,rotation:number)=>{
    const head=new THREE.BufferGeometry();
    head.setAttribute('position',new THREE.Float32BufferAttribute([-.8,0,0,0,0,1.5,.8,0,0],3));
    head.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,.5,1,1,0],2));head.computeVertexNormals();
    add(head,'marking',[x,.14,z],'#f8f4de',rotation);
    const c=Math.cos(rotation),s=Math.sin(rotation);
    add(new THREE.BoxGeometry(.18,.014,2),'marking',[x-s,.14,z-c],'#f8f4de',rotation);
  };
  arrow(-32,64,Math.PI);arrow(-14,40,Math.PI/2);arrow(32,64,0);
  for(const side of [-1,1]){
    const x=side*(site.courtHalfWidth-3);
    box([x,.4,14],[2.8,.8,4],'fixture','#c3b8a7');
    for(const z of [13,15])add(new THREE.IcosahedronGeometry(.85,0),'green',[x,1.15,z],'#7b9c63');
    box([side*20,.52,18],[2.8,.16,1],'fixture','#997b58');
    box([side*20,.78,17.58],[2.8,.32,.14],'fixture','#997b58');
    for(const dx of [-1,1])box([side*20+dx,.25,18],[.12,.5,.65],'fixture','#586c64');
  }
  box([-site.courtHalfWidth+1,1.55,54],[.16,3.1,.16],'fixture','#486c5e');
  for(const [surface,geometries]of batches){
    const geometry=mergeGeometries(geometries);geometries.forEach(item=>item.dispose());
    const material=surface==='tile'?createSurface('tile',{color:'#e3ddcb'}):surface==='asphalt'?createSurface('asphalt'):
      new THREE.MeshStandardMaterial({vertexColors:true,roughness:.92});
    const mesh=new THREE.Mesh(geometry,material);mesh.name=`campus-${site.id}-${surface}`;
    mesh.receiveShadow=true;mesh.castShadow=surface==='fixture'||surface==='green';root.add(mesh);
  }
  return root;
}
