import { useEffect, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { createServiceVanFallback, loadServiceVan, serviceVanFile } from './serviceVan';
import { disposeModels } from '../assets/GameAssets';
import type { PassengerTransfer } from './passengerTransfer';
import { driverPose } from './driverAssistance';

export function ServiceVanModel({ transfer }: { transfer: MutableRefObject<PassengerTransfer> }) {
  const container = useRef<Group>(null);
  useEffect(() => {
    const group = container.current; if (!group) return;
    const fallback = createServiceVanFallback(); group.add(fallback);
    group.userData.modelState = 'fallback';
    const controller = new AbortController();
    let loaded: Group | import('three').Object3D | undefined;
    void loadServiceVan(`${import.meta.env.BASE_URL}${serviceVanFile}`, { signal: controller.signal }).then(model => {
      if (controller.signal.aborted) { disposeModels([model]); return; }
      loaded = model; group.remove(fallback); group.add(model); group.userData.modelState = 'ready';
    }).catch(() => { /* The network-independent van stays playable on failure. */ });
    return () => {
      controller.abort(); group.remove(fallback); if (loaded) group.remove(loaded);
      disposeModels(loaded ? [fallback, loaded] : [fallback]);
    };
  }, []);
  useFrame(() => {
    const hatch = container.current?.getObjectByName('rearHatch');
    if (hatch) hatch.rotation.x = -transfer.current.pose.hatch*Math.PI*2/3;
    const door=container.current?.getObjectByName('driverDoor');
    if(door)door.rotation.y=-driverPose(transfer.current.phase,transfer.current.progress).door*Math.PI*.38;
    const passengerDoor=container.current?.getObjectByName('passengerDoor');
    if(passengerDoor)passengerDoor.rotation.y=driverPose(transfer.current.phase,transfer.current.progress).door*Math.PI*.38;
  }, -1.5);
  return <group ref={container} name="service-van-model" dispose={null} />;
}
