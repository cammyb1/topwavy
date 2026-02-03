import type { Collider, RigidBody } from "@dimforge/rapier3d";
import type { Entity, World } from "@jael-ecs/core";
import RapierEngine from "./Rapier";

export function destroyEntityWithCollider(
  entity: Entity,
  world: World,
): boolean {
  if (world.exist(entity.id)) {
    const rb = entity.get<RigidBody>("rigidbody");
    const col = entity.get<Collider>("collider");
    if (rb) {
      RapierEngine.world.removeRigidBody(rb);
    }
    if (col) {
      RapierEngine.world.removeCollider(col, true);
    }
    world.destroy(entity.id);
    return true;
  }
  return false;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
