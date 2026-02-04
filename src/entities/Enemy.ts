import type { World, Entity } from "@jael-ecs/core";
import { BoxGeometry, Mesh, MeshLambertMaterial, Vector3 } from "three";
import BoxLikeEntity from "./BoxLikeEntity";
import { RigidBody } from "@dimforge/rapier3d";

export default function Enemy(world: World, startingPos?: Vector3): Entity {
  const size = new Vector3(1.5, 1.5, 1.5);
  const enemy = BoxLikeEntity(world, size);
  const mesh = enemy.get<Mesh<BoxGeometry, MeshLambertMaterial>>("transform");
  const rb = enemy.get<RigidBody>("rigidbody");

  rb.enableCcd(true);

  mesh.scale.copy(size);
  mesh.material = mesh.material.clone();
  mesh.material.color.set("green");

  if (startingPos) {
    rb.setTranslation(startingPos, true);
    mesh.position.copy(startingPos);
  }

  enemy.add("health", { current: 100 });
  enemy.add("damage", 15);
  enemy.add("isEnemy", true);

  return enemy;
}
