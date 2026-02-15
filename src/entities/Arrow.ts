import type { World, Entity } from "@jael-ecs/core";
import { Mesh, Vector3 } from "three";
import RapierEngine from "../helpers/rapier";
import * as RAPIER from "@dimforge/rapier3d";
import type { LoadedAssets } from "../game";

export default function Arrow(world: World, startPos: Vector3): Entity {
  const prefab = world.getPrefab("arrow");
  const engine = world.include("isEngine").entities[0];
  const assets = engine.get<LoadedAssets>("assets");

  if (!prefab) {
    const mesh = assets.loaded_models.arrow.scene;

    // Physics world stuff
    mesh.traverse((node) => {
      if (node.isObject3D) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    mesh.position.copy(startPos);

    // Components
    const arrowSchema = {
      transform: mesh,
      isBullet: true,
      lifetime: { current: 1, decreaseSpeed: 1.5 },
      velocity: new Vector3(),
      damage: 10,
    };
    world.createPrefab("arrow", arrowSchema);
  }

  const arrowId = world.instantiate("arrow") as number;
  const arrowProxy = world.getEntity(arrowId) as Entity;

  const kinematicDesc = RapierEngine.rigidbody
    .velKinematic()
    .setGravityScale(0);
  const kinematicRigidBody = RapierEngine.world.createRigidBody(kinematicDesc);
  const collider = RapierEngine.world.createCollider(
    RapierEngine.collider.ball(1),
    kinematicRigidBody,
  );
  collider.setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
  collider.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

  kinematicRigidBody.setTranslation(startPos, true);
  collider.setTranslation(startPos);
  arrowProxy.get<Mesh>("transform").position.copy(startPos);

  kinematicRigidBody.lockRotations(true, true);
  kinematicRigidBody.setLinearDamping(0.25);
  kinematicRigidBody.enableCcd(true);

  collider.setFriction(0.7);
  collider.setDensity(0);
  collider.setRadius(0.25);
  collider.setSensor(true);

  arrowProxy.add("rigidbody", kinematicRigidBody);
  arrowProxy.add("collider", collider);

  return arrowProxy as Entity;
}
