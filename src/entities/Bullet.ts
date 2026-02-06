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

export default function Bullet(world: World, startPos: Vector3Like): Entity {
  const bulletId = world.create();
  const bullet: Entity = world.getEntity(bulletId) as Entity;

  const sphereGeometry = new SphereGeometry(1, 32, 32);
  const bulletMaterial = new MeshLambertMaterial({ color: "yellow" });

  const mesh = new Mesh(sphereGeometry, bulletMaterial);

  // Physics world stuff
  mesh.castShadow = true;
  mesh.scale.multiplyScalar(0.15);
  mesh.position.copy(startPos);

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
  collider.setDensity(0);
  collider.setRadius(mesh.scale.y / 2);
  collider.setSensor(true);

  // Components
  bullet.add("transform", mesh);
  bullet.add("isBullet", true);
  bullet.add("lifetime", { current: 1, decreaseSpeed: 2.5 });
  bullet.add("velocity", new Vector3());
  bullet.add("rigidbody", kinematicRigidBody);
  bullet.add("damage", 10);
  bullet.add("collider", collider);

  return bullet;
}
