import { Time, type Entity, type System, type World } from "@jael-ecs/core";
import { Group, Plane, Raycaster, Vector3 } from "three";
import type { GLState } from "../mount3";
import Bullet from "../entities/Bullet";
import { Input } from "../helpers/Input";
import { FiniteState } from "../helpers/state";
import { RigidBody } from "@dimforge/rapier3d";
import { destroyEntityWithCollider, PRIORITY_LIST } from "../utils";
import type { RBUserdataEvents } from "./collisionSystem";

const zeroVector = new Vector3();
const lookAtVector = new Vector3();
const directionFromPlayer = new Vector3();
const gunPoint = new Vector3();

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
  const cameraFollowSpeed = 0.5;

  const speed = 1.5;
  const bulletSpeed = 6;
  const shootingRate = 0.2;
  const bulletOffset = new Vector3(0, 0, -0.2);

  let shooting = false;
  let shootingStarted = 0;
  let multiplier = 1.5;

  let recievingDmgTimer: number = 0;
  let collidingEntity: Entity | undefined;
  const damageTickerRate = 0.5;

  Input.pointer.on("down", () => {
    if (
      playerQuery.size() <= 0 ||
      engine.get<FiniteState>("state").active?.name !== "start"
    )
      return;
    shootingStarted = Time.elapsed;
    shooting = true;

    shootBullet();
  });

  Input.pointer.on("up", () => {
    shooting = false;
  });

  function damagePlayer(dmg: number) {
    if (!playerQuery.entities[0]) return;
    const health = playerQuery.entities[0].get("health");
    const machine = playerQuery.entities[0].get("machine")
    health.current -= dmg;
    machine.setActiveState('hit')
    console.log("Damagin player with ", dmg, " current Health: ", health);
  }

  function shootBullet() {
    // First Bullet
    const player = playerQuery.entities[0];
    const transform = player.get<Group>("transform");
    const gun = transform.getObjectByName("Pistol");
    if (gun) {
      gun.updateMatrixWorld(true);
      gun?.getWorldPosition(gunPoint);
      transform.getWorldDirection(worldDir);

      const startPos = gunPoint.clone().add(bulletOffset.clone().add(worldDir));
      const velocity = worldDir.clone().multiplyScalar(bulletSpeed);
      const bulletE = Bullet(world, startPos);
      const vel = bulletE.get<Vector3>("velocity");
      const rb = bulletE.get<RigidBody & RBUserdataEvents>("rigidbody");

      rb.userData = {
        onCollisionStart: (e: Entity) => {
          if (e.get("isEnemy")) {
            const damage = bulletE.get<number>("damage");
            e.get("health").current -= damage;
            destroyEntityWithCollider(bulletE.id, world);
          }
        },
      };

      vel.y = rb.linvel().y;
      vel.copy(velocity);
    }
  }

  playerQuery.on("added", (id: number) => {
    const player = world.getEntity(id) as Entity;
    const rb = player.get("rigidbody");

    if (!rb) return;

    rb.userData = {
      onCollisionStart: (e: Entity) => {
        if (e.get("isEnemy")) {
          const enemyMachine = e.get<FiniteState>("machine");
          enemyMachine.setActiveState("punch");
          damagePlayer(e.get<number>("damage"));
          collidingEntity = e;
        }
      },
      onCollisionEnd: (e: Entity) => {
        if (e.get("isEnemy")) {
          const enemyMachine = e.get<FiniteState>("machine");
          enemyMachine.setActiveState("walk");
          recievingDmgTimer = 0;
          collidingEntity = undefined;
        }
      },
    };
  });

  return {
    priority: PRIORITY_LIST.REST,
    update() {
      const gl = engine.get<GLState>("gl");
      const player = playerQuery.entities[0];

      if (player && gl) {
        const transform = player.get<Group>("transform");
        const velocity = player.get<Vector3>("velocity");
        const machine = player.get<FiniteState>("machine");
        const rb = player.get<RigidBody>("rigidbody");

        cameraLerpVector.copy(transform.position).add(cameraOffset);

        gl.camera.position.lerp(
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
          shootBullet();
        }

        if (collidingEntity) {
          recievingDmgTimer += Time.delta;
          if (recievingDmgTimer > damageTickerRate) {
            damagePlayer(collidingEntity.get("damage"));
            recievingDmgTimer = 0;
          }
        }

        const isRunning = Input.isPressed("run");

        if (direction.equals(zeroVector)) {
          if (shooting) {
            machine.setActiveState("idle-shoot");
          } else {
            machine.setActiveState("idle");
          }
        } else if (!isRunning) {
          if (shooting) {
            machine.setActiveState("walk-shoot");
          } else {
            machine.setActiveState("walk");
          }
        } else {
          if (shooting) {
            machine.setActiveState("run-shoot");
          } else {
            machine.setActiveState("run");
          }
        }

        if (isRunning) {
          multiplier = 1.25;
        } else {
          multiplier = 1;
        }

        velocity.x = direction.x * speed * multiplier;
        velocity.z = direction.z * speed * multiplier;
        velocity.y = rb.linvel().y;
        direction.set(0, 0, 0);

        caster.setFromCamera(Input.pointer.position, gl.camera);
        caster.ray.intersectPlane(plane, hit);
        const distanceToHit = hit.distanceTo(transform.position);

        if (distanceToHit < 2) {
          directionFromPlayer.set(0, 0, 0);
          directionFromPlayer.subVectors(hit, transform.position).normalize();
          hit
            .copy(transform.position)
            .add(directionFromPlayer.multiplyScalar(2));
        }

        hit.y = 0;

        lookAtVector.lerp(hit, Time.delta * 15);
        transform.lookAt(lookAtVector);
      }
    },
  };
}
