import type { World, Entity } from "@jael-ecs/core";
import {
  Mesh,
  MeshLambertMaterial,
  SphereGeometry,
  Vector3,
  type Vector3Like,
} from "three";
import RapierEngine from "../helpers/rapier";
import * as RAPIER from "@dimforge/rapier3d";

const scale = new Vector3(1, 1, 1);
const sphereGeometry = new SphereGeometry(1, 32, 32);
const bulletMaterial = new MeshLambertMaterial({ color: "yellow" });

export default function Bullet(world: World, startPos: Vector3Like): Entity {
  const prefab = world.getPrefab("bullet");

  if (!prefab) {
    const mesh = new Mesh(sphereGeometry, bulletMaterial);

    // Physics world stuff
    mesh.castShadow = true;
    mesh.scale.copy(scale.multiplyScalar(0.1));
    mesh.position.copy(startPos);

    // Components
    const bulletSchema = {
      transform: mesh,
      isBullet: true,
      lifetime: { current: 1, decreaseSpeed: 1.5 },
      velocity: new Vector3(),
      damage: 10,
    };
    world.createPrefab("bullet", bulletSchema);
  }

  const bulletId = world.instantiate("bullet") as number;
  const bulletProxy = world.getEntity(bulletId) as Entity;

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
  bulletProxy.get<Mesh>("transform").position.copy(startPos);

  kinematicRigidBody.lockRotations(true, true);
  kinematicRigidBody.setLinearDamping(0.25);
  kinematicRigidBody.enableCcd(true);
  collider.setFriction(0.7);
  collider.setDensity(0);
  collider.setRadius(0.25);
  collider.setSensor(true);

  bulletProxy.add("rigidbody", kinematicRigidBody);
  bulletProxy.add("collider", collider);

  scale.set(1, 1, 1);

  return bulletProxy as Entity;
}
