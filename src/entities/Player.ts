import type { World, Entity } from "@jael-ecs/core";
import { Vector3 } from "three";
import BoxLikeEntity from "./BoxLikeEntity";

export default function Player(world: World): Entity {
  const player = BoxLikeEntity(world, new Vector3(1, 1, 1));
  player.add("health", { current: 100 });
  player.add("isPlayer", true);

  return player;
}
