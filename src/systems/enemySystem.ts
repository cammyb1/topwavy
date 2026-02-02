import { Time, type System, type World, type Entity } from "@jael-ecs/core";
import { Vector3 } from "three";

export default function EnemyAI(world: World): System {
  const targetDir = new Vector3();
  const speed = 13;
  const query = world.include("isEnemy");

  return {
    priority: 2,
    update() {
      query.entities.forEach((enemy: Entity) => {
        const mesh = enemy.get("transform");
        const velocity = enemy.get("velocity");
        const targetMesh = enemy.get("target").get("transform");

        if (targetMesh) {
          if (targetMesh.position.distanceTo(mesh.position) < 20) {
            mesh.lookAt(targetMesh.position);
            mesh.getWorldDirection(targetDir);
            velocity.copy(targetDir.multiplyScalar(speed * Time.delta));
          } else {
            velocity.set(0, 0, 0);
          }
        }
      });
    },
  };
}
