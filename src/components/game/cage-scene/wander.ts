import { CAGE_BOUNDS } from "@/game";
import { MathUtils } from "three";

const WANDER_MARGIN = 0.6;

export function randomWanderPoint() {
  return {
    x: MathUtils.randFloat(CAGE_BOUNDS.minX + WANDER_MARGIN, CAGE_BOUNDS.maxX - WANDER_MARGIN),
    z: MathUtils.randFloat(CAGE_BOUNDS.minZ + WANDER_MARGIN, CAGE_BOUNDS.maxZ - WANDER_MARGIN),
  };
}
