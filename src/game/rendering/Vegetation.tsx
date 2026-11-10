import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { streetFurniture } from '../../data/city';
import { useVisual } from '../../stores/visual';
import { QUALITY } from './quality';
import { disposeModels } from '../assets/GameAssets';

const trees=streetFurniture.filter(f=>f.kind==='tree');
function crown(detail: number) {
  const shapes=Array.from({length:5},(_,i)=>{
    const g=new THREE.IcosahedronGeometry(1,detail),angle=i*Math.PI*2/5;
    g.scale(.9,1.05,.85);g.translate(Math.cos(angle)*.65,i%2*.35,Math.sin(angle)*.6);return g;
  });
  const geometry=mergeGeometries(shapes);shapes.forEach(g=>g.dispose());return geometry;
}
function palm() {
  const positions:number[]=[],colors:number[]=[];
  for(let leaf=0;leaf<9;leaf++){
    const angle=leaf*Math.PI*2/9,length=1.7+(leaf%3)*.18;
    const point=(t:number,side:number)=>{
      const width=Math.sin(Math.PI*t)*.22*side,radial=length*t;
      return [Math.cos(angle)*radial-Math.sin(angle)*width,.28*Math.sin(t*Math.PI)-t*t*.7,Math.sin(angle)*radial+Math.cos(angle)*width];
    };
    for(let segment=0;segment<6;segment++){
      const a=point(segment/6,-1),b=point(segment/6,1),c=point((segment+1)/6,-1),d=point((segment+1)/6,1);
      for(const p of [a,c,b,b,c,d]){positions.push(...p);colors.push(.72+(leaf%3)*.08,.85,.67);}
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
}

export function Vegetation() {
  const host=useRef<THREE.Group>(null),batches=useRef<THREE.InstancedMesh[]>([]);
  const last=useRef(new THREE.Vector3(Infinity,0,Infinity));
  const quality=useVisual(s=>s.quality);
  useEffect(()=>{
    const root=host.current!;
    const foliage=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.88,side:THREE.DoubleSide});
    const palms=foliage.clone();palms.vertexColors=true;
    const configs:[string,THREE.BufferGeometry,THREE.Material,number][]=[
      ['vegetation-trunks',new THREE.CylinderGeometry(.13,.23,4.3,7),new THREE.MeshStandardMaterial({color:'#766247',roughness:.95}),trees.length],
      ['vegetation-crowns-near',crown(1),foliage,trees.length],
      ['vegetation-crowns-far',crown(0),foliage,trees.length],
      ['vegetation-palms',palm(),palms,trees.length],
      ['vegetation-shrubs',new THREE.IcosahedronGeometry(.26,1),foliage,trees.length*3],
    ];
    const meshes=configs.map(([name,geometry,material,count])=>{
      const mesh=new THREE.InstancedMesh(geometry,material,count);mesh.name=name;mesh.count=0;
      mesh.castShadow=true;mesh.receiveShadow=true;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);root.add(mesh);return mesh;
    });
    batches.current=meshes;last.current.set(Infinity,0,Infinity);
    root.userData.totalTrees=trees.length;
    return ()=>{batches.current=[];for(const mesh of meshes)mesh.dispose();disposeModels([root]);root.clear();};
  },[quality]);
  const dummy=useRef(new THREE.Object3D()),color=useRef(new THREE.Color());
  useFrame(({camera})=>{
    const meshes=batches.current;if(meshes.length!==5)return;
    if(Math.hypot(camera.position.x-last.current.x,camera.position.z-last.current.z)<8)return;
    last.current.copy(camera.position);
    const profile=QUALITY[quality],counts=[0,0,0,0,0],object=dummy.current;
    const add=(batch:number,x:number,y:number,z:number,sx:number,sy:number,sz:number,yaw:number,tint:string,index:number)=>{
      object.position.set(x,y,z);object.scale.set(sx,sy,sz);object.rotation.set(0,yaw,0);object.updateMatrix();
      meshes[batch].setMatrixAt(counts[batch],object.matrix);
      meshes[batch].setColorAt(counts[batch]++,color.current.set(tint).multiplyScalar(.88+(index%7)*.025));
    };
    trees.forEach((tree,i)=>{
      const distance=Math.hypot(tree.x-camera.position.x,tree.z-camera.position.z);
      if(distance>profile.vegetationRange)return;
      const isPalm=i%5===0,scale=.9+(i%5)*.04;
      add(0,tree.x,2.25,tree.z,1,1,1,i*.6,'#ffffff',i);
      if(isPalm)add(3,tree.x,4.75,tree.z,scale,scale,scale,i*.71,'#5b7950',i);
      else add(distance<profile.detailedTrees?1:2,tree.x,4.7,tree.z,scale,1.05,scale,i*.71,i%3?'#66845a':'#778a58',i);
      const amount=quality==='low'?1:3;
      if(distance<profile.detailedTrees*1.3)for(let j=0;j<amount;j++){
        const angle=j*Math.PI*2/3+i;
        add(4,tree.x+Math.cos(angle)*.32,.36,tree.z+Math.sin(angle)*.32,1,.9,1.15,angle,'#688347',i+j);
      }
    });
    meshes.forEach((mesh,i)=>{mesh.count=counts[i];mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();});
    host.current!.userData.visibleTrees=counts[0];
  },.5);
  return <group ref={host} name="street-vegetation" />;
}
