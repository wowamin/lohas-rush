export type LabelPoint = { id:string; position:readonly [number,number,number]; radius?:number };

export function nearestLabels<T extends LabelPoint>(points:readonly T[],x:number,z:number,limit=2,radius=140):T[] {
  if(!Number.isFinite(x)||!Number.isFinite(z))return [];
  return points.map(point=>({point,distance:Math.hypot(point.position[0]-x,point.position[2]-z)}))
    .filter(({point,distance})=>Number.isFinite(distance)&&distance<=Math.min(radius,point.radius??radius))
    .sort((a,b)=>a.distance-b.distance||a.point.id.localeCompare(b.point.id))
    .slice(0,Math.max(0,Math.min(2,Math.floor(limit)))).map(({point})=>point);
}
