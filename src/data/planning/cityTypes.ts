// Scheme C is a dormant data plan. These types do not depend on the active city.
export type WorldPosition = readonly [x: number, y: number, z: number];
export type DistrictId = 'central' | 'north' | 'northeast' | 'east' | 'southeast' | 'south' | 'southwest' | 'west' | 'northwest';
export type FacilityType = 'headquarters' | 'fountain' | 'plaza' | 'residential-care'
  | 'nursing-home' | 'day-center' | 'clinic' | 'home-nursing' | 'care-management' | 'home-care' | 'foundation'
  | 'day-work' | 'disability-service' | 'accessible-transport' | 'transport-base' | 'meal-factory' | 'training'
  | 'partner-hospital' | 'logistics-warehouse' | 'other-service'
  | 'housing' | 'commerce' | 'park' | 'parking' | 'school' | 'public-utility';

export type PlannedFloor = {
  readonly id: string;
  readonly name: string;
  readonly height: number;
  readonly serviceDescription: string;
};

export type PlannedBuilding = {
  readonly id: string;
  readonly name: string;
  readonly nameStatus: 'provided' | 'pending' | 'planning-label';
  readonly type: FacilityType;
  readonly district: DistrictId;
  readonly position: WorldPosition;
  readonly dimensions: { readonly width: number; readonly height: number; readonly depth: number };
  readonly serviceDescription: string;
  readonly floors?: readonly PlannedFloor[];
  readonly serviceRelation: 'unverified' | 'partner-service' | 'planning';
  readonly hasMission: boolean;
  readonly missionOrder: number | null;
  readonly missionId: string | null;
  readonly modelPath: string | null;
  readonly collision: { readonly enabled: boolean; readonly shape: 'aabb'; readonly halfSize: readonly [x: number, z: number] };
  readonly rendering: {
    readonly instanceKey: string | null;
    readonly lod: readonly { readonly minDistance: number; readonly representation: 'model' | 'proxy' | 'hidden' }[];
    readonly chunkId: string;
  };
  readonly evidence: 'user-request' | 'existing-project' | 'awaiting-service-overview' | 'planning';
  readonly notes: string;
};

export type PlannedDistrict = {
  readonly id: DistrictId;
  readonly name: string;
  readonly anchor: WorldPosition;
  readonly purpose: string;
  readonly uses: readonly FacilityType[];
};
