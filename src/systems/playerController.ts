import { Time, type System, type World } from "@jael-ecs/core";
import { Group, Plane, Raycaster, Vector3 } from "three";
import type { GLState } from "../mount3";
import Bullet from "../entities/Bullet";
import { Input } from "../helpers/Input";
import { FiniteState } from "../helpers/state";

export default function PlayerController(world: World): System {
  const playerQuery = world.include("isPlayer");
  const engine = world.include("isEngine").entities[0];

  const caster = new Raycaster();
  const plane = new Plane(new Vector3(0, 1, 0), 1);

  const hit = new Vector3();
  const direction = new Vector3();
  const worldDir = new Vector3();
  const cameraOffset = new Vector3(0, 50, 20);
  const cameraLerpVector = new Vector3();
  const cameraFollowSpeed = 5;

  const speed = 15;
  const bulletSpeed = 70;
  const shootingRate = 0.25;

  let shooting = false;
  let shootingStarted = 0;
  let multiplier = 1;

  Input.register("forward", ["KeyW", "ArrowUp"]);
  Input.register("backward", ["KeyS", "ArrowDown"]);
  Input.register("left", ["KeyA", "ArrowLeft"]);
  Input.register("right", ["KeyD", "ArrowRight"]);
  Input.register("run", ["ShiftLeft"]);

  Input.pointer.on("down", () => {
    if (
      playerQuery.size() <= 0 ||
      engine.get<FiniteState>("state").active?.name !== "start"
    )
      return;
    shootingStarted = Time.elapsed;
    shooting = true;

    // First Bullet
    const player = playerQuery.entities[0];
    const transform = player.get<Group>("transform");
    const gunPoint = player.get<Vector3>("gunPoint");
    transform.getWorldDirection(worldDir);

    console.log(gunPoint);
    createBullet(transform.position, gunPoint.clone().add(worldDir));
  });

  Input.pointer.on("up", () => {
    shooting = false;
  });

  function createBullet(pos: Vector3, dir: Vector3) {
    const startPos = pos.clone().add(dir);
    const velocity = dir.clone().multiplyScalar(bulletSpeed * Time.delta);
    const bulletE = Bullet(world, startPos);
    const vel = bulletE.get<Vector3>("velocity");
    vel.copy(velocity);
  }

  return {
    priority: 2,
    update() {
      const state = engine.get<GLState>("gl");
      const player = playerQuery.entities[0];

      if (player && state) {
        const transform = player.get<Group>("transform");
        const velocity = player.get<Vector3>("velocity");

        cameraLerpVector.copy(transform.position).add(cameraOffset);

        state.camera.position.lerp(
          cameraLerpVector,
          Time.delta * cameraFollowSpeed,
        );

        // Movement
        if (Input.isPressed("forward")) {
          direction.z = -1;
        }
        if (Input.isPressed("backward")) {
          direction.z = 1;
        }
        if (Input.isPressed("left")) {
          direction.x = -1;
        }
        if (Input.isPressed("right")) {
          direction.x = 1;
        }

        if (
          shooting &&
          Math.abs(shootingStarted - Time.elapsed) > shootingRate
        ) {
          shootingStarted = Time.elapsed;

          const transform = player.get<Group>("transform");
          transform.getWorldDirection(worldDir);
          createBullet(transform.position, worldDir);
        }

        if (Input.isPressed("run")) {
          multiplier = 1.25;
        } else {
          multiplier = 1;
        }

        velocity.copy(
          direction.multiplyScalar(speed * multiplier * Time.delta),
        );
        direction.set(0, 0, 0);

        // Look at logic
        caster.setFromCamera(Input.pointer.position, state.camera);
        caster.ray.intersectPlane(plane, hit);
        hit.y = transform.scale.y / 2; // Avoid loking down

        transform.lookAt(hit);
      }
    },
  };
}
