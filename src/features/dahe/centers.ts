// Only presentation and preview routing live here; city coordinates and missions
// continue to use the existing location data. Entry anchors are building-local.
export const CENTER_INTERIORS = [
  { id: 'daihe', name: '大和日照', mark: '和', progressKey: 'lohas-rush:dahe-preview:v1', entrance: [.75, 2.4, 7.4] },
  { id: 'annan', name: '安南日照', mark: '安', progressKey: 'lohas-rush:annan-preview:v1', entrance: [0, 2.4, 8.4] },
  { id: 'longshan', name: '龍山日照', mark: '龍', progressKey: 'lohas-rush:longshan-preview:v1', entrance: [0, 2.4, 7.4] },
  { id: 'yihe', name: '義合日照', mark: '義', progressKey: 'lohas-rush:yihe-preview:v1', entrance: [0, 2.4, 7.4] },
  { id: 'xinying', name: '新營日照', mark: '新', progressKey: 'lohas-rush:xinying-preview:v1', entrance: [-1.45, 2.4, 8.4] },
] as const;
export type CenterInterior = typeof CENTER_INTERIORS[number];

export function resolveInterior(params: URLSearchParams): CenterInterior | undefined {
  if (params.get('scene') === 'dahe') return CENTER_INTERIORS[0];
  if (params.get('scene') !== 'interior') return undefined;
  return CENTER_INTERIORS.find(center => center.id === params.get('center'));
}

export function interiorHref(center: CenterInterior, base: string) {
  return center.id === 'daihe' ? `${base}?scene=dahe` : `${base}?scene=interior&center=${center.id}`;
}
