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
        const machine = enemy.get("machine");
        const targetMesh = enemy.get("target").get("transform");

        if (targetMesh) {
          if (targetMesh.position.distanceTo(mesh.position) < 20) {
            if (machine.active?.name !== "punch") {
              machine.setActiveState("walk");
            }
            mesh.lookAt(targetMesh.position);
            mesh.getWorldDirection(targetDir);
            velocity.copy(targetDir.multiplyScalar(speed * Time.delta));
          } else {
            machine.setActiveState("idle");
            velocity.set(0, 0, 0);
          }
        }
      });
    },
  };
}
