import { Html } from '@react-three/drei';
import { useEffect, useState } from 'react';
import { buildings } from '../data/city';
import { useGame } from '../stores/game';
import { useVisual } from '../stores/visual';
import { nearestLabels } from './rendering/nearbyLabels';

const places=buildings.filter(b=>!b.residential).map(b=>({id:b.id,name:b.name,position:[b.x,b.height+2,b.z] as [number,number,number],radius:b.shop?23:140,
  note:b.shop?'虛構店家・遊戲示意':b.id==='headquarters'?'1F 樂活現煮食（團膳工廠）・2F 集團總部辦公室':b.location?'依外觀參考製作・遊戲示意':'幾何佔位・遊戲示意'}));
places.push({id:'meal-van-label',name:'餐車配送・遊戲示意',position:[43,4,28],radius:45,note:'真實供應範圍及餐食未核實'});

export function NearbyWorldLabels() {
  const x=useGame(s=>s.x),z=useGame(s=>s.z);
  const view=useVisual(s=>s.viewMode),id=useVisual(s=>s.building);
  const [compact,setCompact]=useState(()=>matchMedia('(any-pointer: coarse), (max-width: 850px)').matches);
  useEffect(()=>{const media=matchMedia('(any-pointer: coarse), (max-width: 850px)');const update=()=>setCompact(media.matches);media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
  const showcase=view==='showcase'?buildings.find(b=>b.id===id):undefined;
  const visible=nearestLabels(places,showcase?.x??x,showcase?.z??z,compact?1:2);
  return <>{visible.map(point=><Html key={point.id} position={point.position} center distanceFactor={40} zIndexRange={[10,0]} style={{pointerEvents:'none'}}>
    <div className="world-label" data-world-label={point.id}>{point.name}<small>{point.note}</small></div>
  </Html>)}</>;
}
