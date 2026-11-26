import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import { registerPwa } from './pwa/register';
import { resolveInterior } from './features/dahe/centers';

registerPwa();

// Preview pages must not initialize the city's store or its pagehide save hook.
const App = lazy(() => import('./App'));
const PedestrianStreetPreview = lazy(() => import('./game/streets/PedestrianStreetPreview'));
const ChihkanTowerPreview = lazy(() => import('./components/ChihkanTowerEmbed'));
const DaheInteriorPreview = lazy(() => import('./features/dahe/DaheInterior'));
const params = new URLSearchParams(window.location.search);
const scene = params.get('scene');
const interior = resolveInterior(params);
createRoot(document.getElementById('root')!).render(<React.StrictMode>
  {interior ? <Suspense fallback={<p>正在打開{interior.name}的門…</p>}><DaheInteriorPreview key={interior.id} center={interior} /></Suspense> : scene === 'chihkan' ? <Suspense fallback={<p>正在載入赤崁樓模型頁…</p>}><ChihkanTowerPreview /></Suspense> : scene === 'pedestrian' ? <Suspense fallback={<p>Loading street study…</p>}><PedestrianStreetPreview /></Suspense> : <Suspense fallback={<p>正在載入樂活城市…</p>}><App /></Suspense>}
</React.StrictMode>);
