export type Location={id:string;name:string;position:[number,number,number];color:string};
export const locations:Location[]=[{id:'daycare',name:'樂活日照中心',position:[-24,0,-24],color:'#f6b6a8'},{id:'clinic',name:'樂活全齡診所',position:[24,0,-24],color:'#a4cfe2'},{id:'kitchen',name:'樂活團膳工廠',position:[24,0,24],color:'#d3b8e8'}];
export type Obstacle={x:number;z:number;halfX:number;halfZ:number};
export const obstacles:Obstacle[]=[];
for(let x=-36;x<=36;x+=12)for(let z=-36;z<=36;z+=12){if(Math.abs(x)%24===0||Math.abs(z)%24===0)continue;obstacles.push({x,z,halfX:3.5,halfZ:3.5});}
