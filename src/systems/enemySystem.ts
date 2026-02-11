import { RigidBody } from "@dimforge/rapier3d";
import { Time, type System, type World, type Entity } from "@jael-ecs/core";
import { Vector3 } from "three";
import { PRIORITY_LIST } from "../utils";

export default function EnemyAI(world: World): System {
  const targetDir = new Vector3();
  const speed = 1;
  const lookAtSpeed = 2;
  const lookAtVector = new Vector3();
  const query = world.include("isEnemy");

  return {
    priority: PRIORITY_LIST.REST,
    update() {
      query.entities.forEach((enemy: Entity) => {
        const mesh = enemy.get("transform");
        const velocity = enemy.get("velocity");
        const machine = enemy.get("machine");
        const rb = enemy.get<RigidBody>("rigidbody");
        const targetMesh = enemy.get("target").get("transform");

        if (targetMesh) {
          if (targetMesh.position.distanceTo(mesh.position) < 20) {
            if (machine.active?.name !== "punch") {
              machine.setActiveState("walk");
            }
            lookAtVector.lerp(targetMesh.position, Time.delta * lookAtSpeed);
            lookAtVector.y = -0.5;
            mesh.lookAt(lookAtVector);
            mesh.getWorldDirection(targetDir);
            targetDir.multiplyScalar(speed);
            targetDir.y = rb.linvel().y;
            velocity.copy(targetDir);
          } else {
            machine.setActiveState("idle");
            velocity.set(0, 0, 0);
          }
        }
      });
    },
  };
}
