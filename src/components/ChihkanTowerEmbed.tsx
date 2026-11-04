import { useState } from 'react';
import './ChihkanTowerEmbed.css';

export function ChihkanTowerEmbed() {
  const [loaded, setLoaded] = useState(false);

  return <div className="chihkan-model">
    <div className="chihkan-model__viewport">
      {!loaded && <p className="chihkan-model__loading" role="status">正在載入 Sketchfab 檢視器…</p>}
      <iframe
        title="Taiwan Historic site Chihkan Tower — 赤崁樓 3D 模型"
        src="https://sketchfab.com/models/adf0926cb88545c1b9fec93f19b0e0ee/embed"
        width="960"
        height="540"
        loading="lazy"
        allow="autoplay; fullscreen; xr-spatial-tracking; web-share"
        allowFullScreen
        onLoad={() => setLoaded(true)}
      />
    </div>
    <p className="chihkan-model__help">
      可拖曳旋轉、縮放模型。若無法顯示，請
      <a href="https://sketchfab.com/3d-models/adf0926cb88545c1b9fec93f19b0e0ee" target="_blank" rel="noopener noreferrer">在 Sketchfab 開啟赤崁樓模型（新分頁）</a>。
    </p>
  </div>;
}

export default function ChihkanTowerPreview() {
  return <div className="chihkan-preview">
    <div className="chihkan-preview__content">
      <h1>赤崁樓 3D 模型</h1>
      <p className="chihkan-preview__intro">透過互動模型，從不同角度探索赤崁樓。</p>
      <ChihkanTowerEmbed />
      <a className="chihkan-preview__back" href="./">返回樂活遊戲</a>
    </div>
  </div>;
}
