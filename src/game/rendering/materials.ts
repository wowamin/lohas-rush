import * as THREE from 'three';

export type Surface = 'plaster' | 'concrete' | 'asphalt' | 'tile' | 'grass' | 'metal' | 'glass' | 'water' | 'marking';
type Maps = { color: Uint8Array; normal: Uint8Array; roughness: Uint8Array };
const pixels = new Map<string, Maps>();
const textureSize = 256;
function grain(x:number,y:number,period:number){
  let value=(Math.imul((x%period+period)%period,374761393)+Math.imul((y%period+period)%period,668265263))|0;
  value=Math.imul(value^(value>>>13),1274126177);return ((value^(value>>>16))>>>0)/4294967295*2-1;
}
function smoothNoise(u:number,v:number,period:number){
  const x=u*period,y=v*period,ix=Math.floor(x),iy=Math.floor(y);
  const fx=x-ix,fy=y-iy,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
  const a=grain(ix,iy,period)*(1-sx)+grain(ix+1,iy,period)*sx;
  const b=grain(ix,iy+1,period)*(1-sx)+grain(ix+1,iy+1,period)*sx;
  return a*(1-sy)+b*sy;
}
function generatedPixels(surface: Surface): Maps {
  const previous = pixels.get(surface); if (previous) return previous;
  const n = textureSize, color = new Uint8Array(n*n*4), normal = new Uint8Array(n*n*4), roughness = new Uint8Array(n*n*4);
  const heights = new Float32Array(n*n);
  for (let y=0;y<n;y++) for(let x=0;x<n;x++) {
    const u=x/n,v=y/n, i=y*n+x;
    const noise=grain(x,y,n)*.55+smoothNoise(u,v,24)*.35+smoothNoise(u,v,5)*.1;
    const edge=Math.min((u*2)%1,1-(u*2)%1,(v*2)%1,1-(v*2)%1);
    const grout=surface==='tile'?Math.min(1,edge/.012):1;
    const value=surface==='asphalt' ? 220+noise*8 : surface==='grass' ? 220+noise*18 : 249+noise*3;
    const c=value*grout+(1-grout)*205;
    color.set([c, c, surface==='grass'?c*.94:c*.99, 255],i*4);
    const r=surface==='asphalt'?.94:surface==='grass'?.96:surface==='concrete'?.8:surface==='tile'?.76:.84;
    roughness.set([255*(r+noise*.025),255*(r+noise*.025),255*(r+noise*.025),255],i*4);
    heights[i]=noise*(surface==='plaster'?.018:surface==='asphalt'?.045:.025)+(surface==='tile'?grout*.12:0);
  }
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const dx=(heights[y*n+(x+1)%n]-heights[y*n+(x+n-1)%n])*1.2;
    const dy=(heights[((y+1)%n)*n+x]-heights[((y+n-1)%n)*n+x])*1.2;
    const length=Math.hypot(dx,dy,1);
    normal.set([(-dx/length*.5+.5)*255,(-dy/length*.5+.5)*255,(1/length*.5+.5)*255,255],(y*n+x)*4);
  }
  const result={color,normal,roughness};pixels.set(surface,result);return result;
}
function texture(data: Uint8Array, color=false) {
  const map=new THREE.DataTexture(data,textureSize,textureSize,THREE.RGBAFormat);
  map.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;
  map.wrapS=map.wrapT=THREE.RepeatWrapping;
  map.magFilter=THREE.LinearFilter;map.minFilter=THREE.LinearMipmapLinearFilter;
  map.generateMipmaps=true;map.anisotropy=4;map.needsUpdate=true;
  return map;
}

/** World-scale mapping also covers InstancedMesh and geometry without artist-authored UVs. */
export function worldScaleMaps(material: THREE.MeshStandardMaterial, surface: Surface, period: number) {
  const data=generatedPixels(surface);
  material.map=texture(data.color,true);material.normalMap=texture(data.normal);material.roughnessMap=texture(data.roughness);
  material.normalScale.setScalar(surface==='plaster'?.22:surface==='tile'?.45:.35);
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
      vec4 surfacePosition = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        surfacePosition = instanceMatrix * surfacePosition;
      #endif
      vec3 surfaceWorld = (modelMatrix * surfacePosition).xyz;
      vec3 surfaceNormal = abs(inverseTransformDirection(transformedNormal, viewMatrix));
      vec2 surfaceUV = surfaceNormal.y > 0.5 ? surfaceWorld.xz : (surfaceNormal.x > surfaceNormal.z ? surfaceWorld.zy : surfaceWorld.xy);
      surfaceUV /= ${period.toFixed(5)};
      #ifdef USE_MAP
        vMapUv = surfaceUV;
      #endif
      #ifdef USE_NORMALMAP
        vNormalMapUv = surfaceUV;
      #endif
      #ifdef USE_ROUGHNESSMAP
        vRoughnessMapUv = surfaceUV;
      #endif`);
  };
  material.customProgramCacheKey=()=>`lohas-world-surface-v1-${period}`;
  return material;
}

/** Each returned material owns its textures and is compatible with disposeModels(). */
export function createSurface(surface: Surface, options: { color?: THREE.ColorRepresentation; vertexColors?: boolean } = {}) {
  const base = { color: options.color ?? (surface==='asphalt'?'#50565c':surface==='grass'?'#819565':surface==='concrete'?'#74787b':'#ffffff'), vertexColors: options.vertexColors ?? false };
  if(surface==='glass') return new THREE.MeshPhysicalMaterial({...base,roughness:.2,metalness:0,ior:1.46,clearcoat:.65,clearcoatRoughness:.12,
    // Reflective opaque architectural glazing avoids sorting and transmission passes while driving.
    transmission:0,envMapIntensity:1.1});
  const material=new THREE.MeshStandardMaterial({...base,roughness:surface==='metal'?.4:surface==='water'?.2:.84,
    metalness:surface==='metal'?.65:0});
  if(['plaster','concrete','asphalt','tile','grass'].includes(surface))worldScaleMaps(material,surface,surface==='tile'?1.2:surface==='plaster'?.65:surface==='asphalt'?3.7:2.8);
  return material;
}

export function architecturalSurface(name: string): Surface {
  if(name==='glass')return 'glass';
  if(['frame','steel','louver','mesh','roof','canopy'].includes(name))return 'metal';
  if(name==='paving')return 'tile';
  if(name==='concrete')return 'concrete';
  if(name==='green')return 'grass';
  return 'plaster';
}
