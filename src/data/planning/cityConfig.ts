export const cityConfig = {
  id: 'lohas-ecosystem-city-c', name: '樂活長照生態城',
  status: 'data-only', enabled: false, requiresApproval: 'V0.2',
  activationBlockedBy: ['unrouted-branch-roads', 'yihe-middle-ring-conflict', 'missing-models'],
  world: { width: 2400, depth: 2400, minX: -1200, maxX: 1200, minZ: -1200, maxZ: 1200 },
  roads: {
    rings: [
      { id: 'central-ring', name: '中央環道', radius: 110, width: 24 },
      { id: 'inner-ring', name: '內環道路', radius: 350, width: 24 },
      { id: 'middle-ring', name: '中環道路', radius: 650, width: 28 },
      { id: 'outer-ring', name: '外環道路', radius: 980, width: 28 },
    ],
    // Offset from the axes keeps the requested (730, 0) center off a trunk road.
    radial: { count: 8, angleOffset: Math.PI / 8, innerRadius: 110, outerRadius: 1150, width: 28 },
    branches: [
      { id: 'housing-streets', name: '住宅支路', width: 12, status: 'unrouted' },
      { id: 'medical-streets', name: '醫療服務道路', width: 16, status: 'unrouted' },
      { id: 'logistics-streets', name: '物流道路', width: 20, status: 'unrouted' },
    ],
    buildingSetback: 8, junctionReserveRadius: 24,
    unresolvedReservations: [{
      landmarkId: 'c-yihe',
      roadId: 'middle-ring',
      resolution: 'local-detour-required',
      proposal: '保留義合座標，局部將 R650 中環中心線外繞至至少 R675，再以平順曲線接回；完成全建築 AABB、道路淨空及路網連通驗證前不得啟用。',
      status: 'unresolved',
    }],
  },
  streaming: { chunkSize: 128, loadRadius: 2, unloadRadius: 3, implementation: 'reserved' },
  lod: { modelDistance: 180, proxyDistance: 500, cullDistance: 900 },
  source: { serviceOverview: 'not-attached', namesSource: 'user-text', namesPending: 0 },
} as const;

export const plannedMissionOrder = ['c-daihe', 'c-annan', 'c-longshan', 'c-yihe', 'c-xinying'] as const;
