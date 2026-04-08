import type { World, Entity } from "@jael-ecs/core";
import { Object3D, Vector3 } from "three";
import RapierEngine from "../helpers/rapier";
import * as RAPIER from "@dimforge/rapier3d";
import { meshMap } from "../utils";
import type { LoadedAssets } from "../game";
import { SkeletonUtils } from "three/examples/jsm/Addons.js";
import { type ArrowSchema, type TransformComponent } from "../components";

export default function Arrow(world: World, startPos: Vector3): Entity {
  const engine = world.include("isEngine").entities[0];
  const assets = engine.getComponent<LoadedAssets>("assets") as LoadedAssets;

  let mesh = meshMap.get("arrow");

  if (!mesh) {
    mesh = assets.loaded_models.arrow.scene;

    mesh.traverse((node: Object3D) => {
      if (node.isObject3D) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });

    meshMap.set("arrow", mesh);
  }

  // Components
  const arrowSchema = {
    transform: SkeletonUtils.clone(mesh),
    isBullet: true,
    lifetime: { current: 1, decreaseSpeed: 1.5 },
    velocity: new Vector3(),
    damage: 10,
  };

  arrowSchema.transform.position.copy(startPos);

  const arrowId = world.createWith<ArrowSchema>(arrowSchema);
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
  arrowProxy
    .getComponent<TransformComponent>("transform")
    ?.position.copy(startPos);

  kinematicRigidBody.lockRotations(true, true);
  kinematicRigidBody.setLinearDamping(0.25);
  kinematicRigidBody.enableCcd(true);

  collider.setFriction(0.7);
  collider.setDensity(0);
  collider.setRadius(0.25);
  collider.setSensor(true);

  arrowProxy.addComponent("rigidbody", kinematicRigidBody);
  arrowProxy.addComponent("collider", collider);

  return arrowProxy as Entity;
}
