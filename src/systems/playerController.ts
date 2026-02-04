import { Time, type System, type World } from "@jael-ecs/core";
import { Mesh, Plane, Raycaster, Vector3 } from "three";
import type { GLState } from "../mount3";
import Bullet from "../entities/Bullet";
import { Input } from "../Input";
import { isPaused } from "../utils";

export default function PlayerController(world: World): System {
  const playerQuery = world.include("isPlayer");
  const engine = world.include("isEngine").entities[0];

  const caster = new Raycaster();
  const plane = new Plane(new Vector3(0, 1, 0), 1);

  const hit = new Vector3();
  const direction = new Vector3();
  const worldDir = new Vector3();

  const speed = 15;
  const bulletSpeed = 50;
  let shooting = false;
  let shootingStarted = 0;
  const shootingRate = 0.1;
  let multiplier = 1;

  Input.register("forward", ["KeyW", "ArrowUp"]);
  Input.register("backward", ["KeyS", "ArrowDown"]);
  Input.register("left", ["KeyA", "ArrowLeft"]);
  Input.register("right", ["KeyD", "ArrowRight"]);
  Input.register("run", ["ShiftLeft"]);

  Input.pointer.on("down", () => {
    if (playerQuery.size() <= 0 || isPaused(engine.get("state").current))
      return;
    shootingStarted = Time.elapsed;
    shooting = true;

    // First Bullet
    const transform = playerQuery.entities[0].get<Mesh>("transform");
    transform.getWorldDirection(worldDir);
    createBullet(transform.position, worldDir);
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
    priority: 1,
    update() {
      const state = engine.get<GLState>("gl");
      const player = playerQuery.entities[0];

      if (player && state) {
        const transform = player.get<Mesh>("transform");
        const velocity = player.get<Vector3>("velocity");

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

          const transform = player.get<Mesh>("transform");
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
        hit.y = 0; // Avoid loking down

        transform.lookAt(hit);
      }
    },
  };
}
