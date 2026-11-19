import { useEffect,useRef } from 'react';
import * as THREE from 'three';
import { centerCampuses } from '../data/centerCampuses';
import { createCampusModel } from './buildings/campusModel';
import { disposeModels } from './assets/GameAssets';

export function CenterCampuses(){
  const host=useRef<THREE.Group>(null);
  useEffect(()=>{
    const container=host.current!;
    const groups=centerCampuses.map(site=>{
      const model=createCampusModel(site);
      const canvas=document.createElement('canvas');canvas.width=768;canvas.height=384;
      const ctx=canvas.getContext('2d');
      if(ctx){
        ctx.fillStyle='#315f50';ctx.fillRect(0,0,768,384);ctx.fillStyle='#fff4d8';
        ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 72px "Microsoft JhengHei",sans-serif';
        ctx.fillText(`${site.name}日照`,384,88,710);ctx.font='700 84px "Microsoft JhengHei",sans-serif';ctx.fillText('P 停車・接送',384,207,710);
        ctx.font='40px "Microsoft JhengHei",sans-serif';ctx.fillText('遊戲示意園區',384,308);
      }
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
      const sign=new THREE.Mesh(new THREE.PlaneGeometry(3,1.5),new THREE.MeshStandardMaterial({map:texture,roughness:.9,side:THREE.DoubleSide}));
      sign.name=`campus-${site.id}-sign`;sign.position.set(-site.courtHalfWidth+1,2.5,54);model.add(sign);
      model.position.set(site.x,0,site.z);model.rotation.y=site.rotation;container.add(model);return model;
    });
    return()=>{for(const group of groups)container.remove(group);disposeModels(groups);};
  },[]);
  return <group name="center-campuses" ref={host}/>;
}
