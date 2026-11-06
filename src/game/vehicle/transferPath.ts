export const DRIVER_CHAIR_OFFSET = .56;
export const smoothTransfer = (value:number) => {
  const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);
};
// Back clear of the neighboring passenger before aligning with the doorway.
// Driver and chair share this path so the assisting hands cannot drift away.
export function cabinWheelchairPosition(progress:number) {
  return {x:-.43+.43*smoothTransfer((progress-.35)/.3),z:.42+2.33*smoothTransfer(progress)};
}
export function groundWheelchairPosition(progress:number) {
  return {x:0,z:2.75+1.75*smoothTransfer(progress)};
}
