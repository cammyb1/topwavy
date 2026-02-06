import type { World, Entity } from "@jael-ecs/core";
import { BoxGeometry, Mesh, MeshLambertMaterial, Vector3 } from "three";
import RapierEngine from "../helpers/rapier";
import { ActiveCollisionTypes, ActiveEvents } from "@dimforge/rapier3d";

const boxGeometry = new BoxGeometry(1, 1, 1);
const basicMaterial = new MeshLambertMaterial({ color: "white" });

export default function BoxLikeEntity(world: World, size: Vector3): Entity {
  const entityID = world.create();
  const entityProxy: Entity = world.getEntity(entityID) as Entity;

  const entityMesh = new Mesh(boxGeometry, basicMaterial);
  const entityRb = RapierEngine.world.createRigidBody(
    RapierEngine.rigidbody.dynamic(),
  );

  entityMesh.scale.copy(size);

  const entityCollider = RapierEngine.world.createCollider(
    RapierEngine.collider.box(size.clone().multiplyScalar(0.5)),
    entityRb,
  );
  entityCollider.setActiveEvents(ActiveEvents.COLLISION_EVENTS);
  entityCollider.setActiveCollisionTypes(ActiveCollisionTypes.ALL);

  entityMesh.castShadow = true;

  entityProxy.add("transform", entityMesh);
  entityProxy.add("velocity", new Vector3());
  entityProxy.add("rigidbody", entityRb);
  entityProxy.add("collider", entityCollider);

  return entityProxy;
}
