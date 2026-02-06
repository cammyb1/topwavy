import type { Collider, RigidBody } from "@dimforge/rapier3d";
import type { World } from "@jael-ecs/core";
import RapierEngine from "./helpers/rapier";

export function destroyEntityWithCollider(
  entityId: number,
  world: World,
): boolean {
  if (world.exist(entityId)) {
    const proxy = world.getEntity(entityId);
    if (proxy) {
      const rb = proxy.get<RigidBody>("rigidbody");
      const col = proxy.get<Collider>("collider");
      if (rb) {
        RapierEngine.world.removeRigidBody(rb);
      }
      if (col) {
        RapierEngine.world.removeCollider(col, true);
      }
      world.destroy(entityId);
    }
    return true;
  }
  return false;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
