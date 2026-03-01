import { RigidBody } from "@dimforge/rapier3d";
import { type Entity, Time, type World } from "@jael-ecs/core";
import { Vector3 } from "three";

export default function EnemyAI(world: World) {
  const targetDir = new Vector3();
  const speed = 1.25;
  const lookAtSpeed = 2;
  const lookAtVector = new Vector3();
  const query = world.include("isEnemy");

  return () => {
    query.entities.forEach((enemy: Entity) => {
      const mesh = enemy.getComponent("transform");
      const velocity = enemy.getComponent("velocity");
      const machine = enemy.getComponent("machine");
      const rb = enemy.getComponent<RigidBody>("rigidbody");
      const targetMesh = enemy
        .getComponent<Entity>("target")
        ?.getComponent("transform");

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
