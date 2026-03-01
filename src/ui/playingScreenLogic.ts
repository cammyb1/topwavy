import type { Entity } from "@jael-ecs/core";
import type { GLState } from "../mount3";
import type { World } from "@jael-ecs/core";
import { Group, Vector3 } from "three";
import Player from "../entities/Player";
import type { RigidBody } from "@dimforge/rapier3d";

export default function (engine: Entity, world: World) {
  const glstate = engine.getComponent<GLState>("gl");
  const playerQuery = world.include("isPlayer");

  if (!glstate || !engine) return;

  const zeroVector = new Vector3(0, 0, 0);

  if (playerQuery.size() <= 0) {
    // Enter/restart game
    glstate.camera.position.set(0, 50, 20);
    glstate.camera.lookAt(zeroVector);

    Player(world);
  } else {
    const player = playerQuery.entities[0];
    const pTransform = player.getComponent<Group>("transform");
    const pRb = player.getComponent<RigidBody>("rb");
    if (pTransform) {
      pTransform.position.set(0, 0, 0);
    }
    pRb?.setTranslation({ x: 0, y: 0, z: 0 }, true);
  }
}
