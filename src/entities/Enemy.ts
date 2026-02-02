import type { World, Entity } from "@jael-ecs/core";
import { BoxGeometry, Mesh, MeshLambertMaterial, Vector3 } from "three";
import BoxLikeEntity from "./BoxLikeEntity";

export default function Enemy(world: World): Entity {
  const size = new Vector3(1.5, 1.5, 1.5);
  const enemy = BoxLikeEntity(world, size);
  const mesh = enemy.get<Mesh<BoxGeometry, MeshLambertMaterial>>("transform");
  mesh.scale.copy(size);
  mesh.material = mesh.material.clone();
  mesh.material.color.set("green");

  enemy.add("health", { current: 100 });
  enemy.add("isEnemy", true);

  return enemy;
}
