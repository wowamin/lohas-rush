export type ExplorationCategory = 'daycare' | 'service';
export type ExplorationLocation = {
  id: string;
  name: string;
  category: ExplorationCategory;
  description: string;
  position: readonly [number, number];
  discoveryRadius: number;
  interactionRadius: number;
  journalTitle: string;
  journalContent: string;
};
export type ExplorationEntry = { discoveredAt: number; completedAt: number | null };
export type ExplorationEntries = Record<string, ExplorationEntry>;
export type ExplorerPresence = { x: number; z: number; speed: number; available: boolean };
export type ExplorationStatus = 'undiscovered' | 'discovered' | 'completed';
export function explorationStatus(entry: ExplorationEntry | undefined): ExplorationStatus {
  return !entry ? 'undiscovered' : entry.completedAt !== null ? 'completed' : 'discovered';
}
