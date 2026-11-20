import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const decoders = new Map<string, DRACOLoader>();
const disposeDecoders = () => { for (const decoder of decoders.values()) decoder.dispose(); decoders.clear(); };
// Dedicated decoder workers can remain controlled service-worker clients briefly
// after closing a game window. Release them before the next version activates.
const onPageHide = (event: PageTransitionEvent) => { if (!event.persisted) disposeDecoders(); };
if (typeof window !== 'undefined') window.addEventListener('pagehide', onPageHide);
export function createGltfLoader(base = './') {
  let decoder = decoders.get(base);
  if (!decoder) {
    decoder = new DRACOLoader().setDecoderPath(`${base}assets/draco/`);
    const memory = typeof navigator !== 'undefined' ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory : undefined;
    const constrained = typeof navigator !== 'undefined' && (navigator.hardwareConcurrency <= 4 || (typeof memory === 'number' && memory > 0 && memory <= 4));
    decoder.setWorkerLimit(constrained ? 1 : 2);
    decoders.set(base, decoder);
  }
  return new GLTFLoader().setDRACOLoader(decoder);
}
import.meta.hot?.dispose(() => {
  if (typeof window !== 'undefined') window.removeEventListener('pagehide', onPageHide);
  disposeDecoders();
});
