import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useVisual } from '../../stores/visual';
import { useGame } from '../../stores/game';
import { QualitySampler } from './quality';

export function AdaptiveQuality() {
  const sampler = useRef(new QualitySampler());
  const mode = useRef('');
  useEffect(() => {
    // requestAnimationFrame may stop entirely in a hidden tab, so the frame
    // callback alone cannot discard a long background interval on resume.
    const reset = () => sampler.current.reset();
    document.addEventListener('visibilitychange', reset);
    return () => document.removeEventListener('visibilitychange', reset);
  }, []);
  useFrame((_, delta) => {
    const visual = useVisual.getState();
    const currentMode = `${visual.qualityMode}:${visual.autoCeiling}:${visual.viewMode}`;
    if (mode.current !== currentMode) { mode.current = currentMode; sampler.current.reset(); }
    if (document.hidden || useGame.getState().controlsPaused || visual.qualityMode !== 'auto' || visual.viewMode !== 'game') {
      sampler.current.reset(); return;
    }
    const change = sampler.current.sample(delta, visual.quality, visual.autoCeiling);
    if (change) visual.adaptQuality(change.quality, change.fps);
  });
  return null;
}
