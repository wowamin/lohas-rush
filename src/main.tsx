import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './style.css';

const PedestrianStreetPreview = lazy(() => import('./game/streets/PedestrianStreetPreview'));
const ChihkanTowerPreview = lazy(() => import('./components/ChihkanTowerEmbed'));
const scene = new URLSearchParams(window.location.search).get('scene');
createRoot(document.getElementById('root')!).render(<React.StrictMode>
  {scene === 'chihkan' ? <Suspense fallback={<p>正在載入赤崁樓模型頁…</p>}><ChihkanTowerPreview /></Suspense> : scene === 'pedestrian' ? <Suspense fallback={<p>Loading street study…</p>}><PedestrianStreetPreview /></Suspense> : <App />}
</React.StrictMode>);
