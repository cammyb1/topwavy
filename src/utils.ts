import {
  ActiveCollisionTypes,
  ActiveEvents,
  type Collider,
  type RigidBody,
} from "@dimforge/rapier3d";
import type { World } from "@jael-ecs/core";
import RapierEngine from "./helpers/rapier";
import type { Vector2 } from "three";

type ReturnedPhy = {
  rb: RigidBody;
  col: Collider;
};

export function createDynamicBox(size: Vector2): ReturnedPhy {
  const rb = RapierEngine.world.createRigidBody(
    RapierEngine.rigidbody.dynamic(),
  );
  const col = RapierEngine.world.createCollider(
    RapierEngine.collider
      .capsule(size.y, size.x)
      .setTranslation(0, size.y * 3, 0),
    rb,
  );
  col.setActiveEvents(ActiveEvents.COLLISION_EVENTS);
  col.setActiveCollisionTypes(ActiveCollisionTypes.ALL);

  return { rb, col };
}

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
