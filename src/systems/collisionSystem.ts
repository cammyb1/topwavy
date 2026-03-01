import type { Entity, World } from "@jael-ecs/core";
import RapierEngine from "../helpers/rapier";
import { Collider, RigidBody } from "@dimforge/rapier3d";

export type RBUserdataEvents = {
  userData: {
    onCollisionStart?: (e: Entity) => void;
    onCollisionEnd?: (e: Entity) => void;
  };
};

export default function CollisionSystem(world: World) {
  const collidables = world.include("collider");
  const entityMap = new Map<string, Entity>();

  collidables.on("added", (entityId) => {
    const collider = world.getComponent<Collider>(entityId, "collider");
    if (!collider) return;
    entityMap.set(
      "entity_" + collider.handle,
      world.getEntity(entityId) as Entity,
    );
  });

  collidables.on("removed", (entityId) => {
    const collider = world.getComponent<Collider>(entityId, "collider");
    if (!collider) return;
    entityMap.delete("entity_" + collider.handle);
  });

  return () => {
    // Collisions
    RapierEngine.onCollisionDrain((handle1, handle2, started) => {
      let entityRecieving = entityMap.get("entity_" + handle1);
      let entityColliding = entityMap.get("entity_" + handle2);

      if (entityRecieving && entityColliding) {
        const rigidbody = entityRecieving.getComponent<
          RigidBody & RBUserdataEvents
        >("rigidbody");
        if (rigidbody?.userData?.onCollisionStart && started) {
          rigidbody.userData?.onCollisionStart?.(entityColliding);
        } else if (rigidbody?.userData?.onCollisionEnd && !started) {
          rigidbody.userData?.onCollisionEnd?.(entityColliding);
        }
      }
    });
  };
}
