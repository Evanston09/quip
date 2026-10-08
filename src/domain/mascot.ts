import motions from "../../assets/mascot/motions.json";

export const MASCOT_MOTIONS = motions;
export type MascotMotion = keyof typeof motions;
export type MascotPose = (typeof motions.idle.frames)[number];
export const MASCOT_EASING = [0.45, 0, 0.55, 1] as const;
