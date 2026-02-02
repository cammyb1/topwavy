import { Time, type System, type World } from "@jael-ecs/core";
import { Mesh, Plane, Raycaster, Vector3 } from "three";
import type { GLState } from "../mount3";
import Enemy from "../entities/Enemy";
import Bullet from "../entities/Bullet";
import { Input } from "../Input";
import * as RAPIER from "@dimforge/rapier3d";

export default function PlayerController(world: World): System {
  const player = world.include("isPlayer").entities[0];
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
    shootingStarted = Time.elapsed;
    shooting = true;

    // First Bullet
    const transform = player.get<Mesh>("transform");
    transform.getWorldDirection(worldDir);
    createBullet(transform.position, worldDir);
  });

  Input.pointer.on("up", () => {
    shooting = false;
  });

  Input.on("down", (event) => {
    if (event.code === "Space" && !event.repeated) {
      if (!player) return;
      const entEnemy = Enemy(world);
      entEnemy.add("target", player);
      const rb = entEnemy.get<RAPIER.RigidBody>("rigidbody");
      const transform = entEnemy.get<Mesh>("transform");
      const startPos = { x: Math.random() * 10, y: 0, z: Math.random() * 10 };
      transform.position.copy(startPos);
      rb.setTranslation(startPos, true);
    }
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
    init() {
      const collider = player.get<RAPIER.Collider>("collider");
      collider.setFriction(0.5);
    },
    update() {
      const state = engine.get<GLState>("gl");
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
