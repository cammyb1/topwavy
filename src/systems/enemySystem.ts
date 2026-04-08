import { RigidBody } from "@dimforge/rapier3d";
import { type Entity, type World } from "@jael-ecs/core";
import { Vector3 } from "three";
import { Time } from "../utils";
import { type TransformComponent } from "../components";
import { FiniteState } from "../helpers/state";

export default function EnemyAI(world: World) {
  const targetDir = new Vector3();
  const speed = 1.25;
  const lookAtSpeed = 2;
  const lookAtVector = new Vector3();
  const query = world.include("isEnemy");

  return () => {
    query.entities.forEach((enemy: Entity) => {
      const mesh = enemy.getComponent<TransformComponent>("transform")!;
      const velocity = enemy.getComponent<Vector3>("velocity")!;
      const machine = enemy.getComponent<FiniteState>("machine")!;
      const rb = enemy.getComponent<RigidBody>("rigidbody");
      const targetMesh = enemy
        .getComponent<Entity>("target")
        ?.getComponent<TransformComponent>("transform");

      if (targetMesh && rb) {
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
  };
}
