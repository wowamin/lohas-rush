export type Obstacle = { x: number; z: number; halfX: number; halfZ: number };
export type Location = {
  id: string; name: string; description: string;
  position: [number, number, number]; arrival: [number, number]; radius: number; color: string;
};
export const CITY_LIMIT = 52;
export const roadCoordinates = [-48, -24, 0, 24, 48];
export const locations: Location[] = [
  { id: 'daycare', name: '樂活日照中心', description: '前往日照中心，熟悉今日的服務路線。', position: [-12, 0, -36], arrival: [-12, -24], radius: 4, color: '#efad91' },
  { id: 'clinic', name: '樂活全齡診所', description: '下一站，全齡診所。沿街道向東行駛。', position: [12, 0, -36], arrival: [12, -24], radius: 4, color: '#9fcbd7' },
  { id: 'kitchen', name: '樂活團膳工廠', description: '最後一站，抵達南側的團膳工廠。', position: [36, 0, 12], arrival: [24, 12], radius: 4, color: '#c6b2dd' },
];
export const buildings = [-36, -12, 12, 36].flatMap(x =>
  [-36, -12, 12, 36].map((z, index) => ({
    x, z, halfX: 6, halfZ: 6, height: 5 + ((x + 36) / 24 + index) % 3 * 2,
    color: ['#f2e6ca', '#cddcce', '#d8d4e6', '#edd4bf'][index],
    location: locations.find(l => l.position[0] === x && l.position[2] === z),
  })),
);
// Every rendered building, including destinations, shares this collision source.
export const obstacles: Obstacle[] = buildings.map(({ x, z, halfX, halfZ }) => ({ x, z, halfX, halfZ }));
