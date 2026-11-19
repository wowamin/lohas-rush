export const STATIC_CELL_SIZE=128;
/** Keep all instances resident, but give each region a separate frustum bound. */
export function spatialBatches<T extends {position:readonly[number,number,number]}>(items:readonly T[],cellSize=STATIC_CELL_SIZE){
  if(!Number.isFinite(cellSize)||cellSize<=0)throw new RangeError('Cell size must be positive.');
  const cells=new Map<string,T[]>();
  for(const item of items){
    const key=`${Math.floor(item.position[0]/cellSize)},${Math.floor(item.position[2]/cellSize)}`;
    const batch=cells.get(key)??[];batch.push(item);cells.set(key,batch);
  }
  return cells;
}
