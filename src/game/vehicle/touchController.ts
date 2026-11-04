export type TouchAction = 'left' | 'right' | 'gas' | 'reverse' | 'brake';

// Keep frame-rate input outside React state. Pointer IDs allow simultaneous fingers.
export class TouchController {
  private pointers = new Map<number, TouchAction>();
  private steeringPointers = new Map<number, number>();
  InputSteer = 0; // -1 left, +1 right (opposite to the vehicle's angle convention)
  InputThrottle = 0;
  InputReverse = 0;
  InputBrake = 0;

  press(pointerId: number, action: TouchAction) { this.pointers.set(pointerId, action); }
  setSteering(pointerId: number, value: number) {
    this.steeringPointers.set(pointerId, Math.max(-1, Math.min(1, Number.isFinite(value) ? value : 0)));
  }
  release(pointerId: number) { this.pointers.delete(pointerId); this.steeringPointers.delete(pointerId); }
  clear() {
    this.pointers.clear();
    this.steeringPointers.clear();
    this.InputSteer = this.InputThrottle = this.InputReverse = this.InputBrake = 0;
  }
  update(dt: number) {
    let left = false, right = false, gas = false, reverse = false, brake = false;
    for (const action of this.pointers.values()) {
      if (action === 'left') left = true;
      else if (action === 'right') right = true;
      else if (action === 'gas') gas = true;
      else if (action === 'reverse') reverse = true;
      else brake = true;
    }
    const steering = [...this.steeringPointers.values()];
    const target = steering.length ? steering[steering.length - 1] : left ? -1 : right ? 1 : 0;
    const difference = target - this.InputSteer;
    this.InputSteer += Math.sign(difference) * Math.min(Math.abs(difference), Math.max(0, dt) * 5);
    this.InputThrottle = gas ? 1 : 0;
    this.InputReverse = reverse ? 1 : 0;
    this.InputBrake = brake ? 1 : 0;
  }
}

export const touchController = new TouchController();
