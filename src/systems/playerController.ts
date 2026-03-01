import { Time, type Entity, type World, Input } from "@jael-ecs/core";
import { Group, Plane, Raycaster, Vector2, Vector3 } from "three";
import type { GLState } from "../mount3";
import Arrow from "../entities/Arrow";
import { FiniteState } from "../helpers/state";
import { RigidBody } from "@dimforge/rapier3d";
import { destroyEntityWithCollider, isGameActive } from "../utils";
import type { RBUserdataEvents } from "./collisionSystem";

const zeroVector = new Vector3();
const lookAtVector = new Vector3();
const directionFromPlayer = new Vector3();
const bowPoint = new Vector3();

export default function PlayerController(world: World) {
  const playerQuery = world.include("isPlayer");
  const engine = world.include("isEngine").entities[0];

  const caster = new Raycaster();
  const plane = new Plane(new Vector3(0, 1, 0), 1);

  const hit = new Vector3();
  const direction = new Vector3();
  const worldDir = new Vector3();

  const speed = 1.75;
  const bulletSpeed = 10;
  const shootingRate = 0.1;
  const damageTickerRate = 1;
  const bulletOffset = new Vector3(0, 0, -0.2);
  const arrowMag = 50;

  let speedMultiplier = 1.75;
  let shooting = false;
  let shootingStarted = 0;
  let currentArrows = arrowMag;

  let recievingDmgTimer = 0;
  let collidingEntity: Entity | undefined;

  Input.pointer.on("down", () => {
    if (playerQuery.size() <= 0 || !isGameActive(engine)) return;
    shooting = true;

    const player = playerQuery.entities[0];
    const machine = player.getComponent<FiniteState>("machine");
    machine?.setActiveState("draw_bow");
  });

  Input.pointer.on("up", () => {
    if (playerQuery.size() <= 0 || !isGameActive(engine)) return;
    shooting = false;

    const player = playerQuery.entities[0];
    const machine = player.getComponent<FiniteState>("machine");
    machine?.setActiveState("release_bow");
  });

  function damagePlayer(dmg: number) {
    if (!playerQuery.entities[0]) return;
    const health = playerQuery.entities[0].getComponent("health");
    const machine = playerQuery.entities[0].getComponent("machine");
    health.current -= dmg;
    machine.setActiveState("hit");
    console.log("Damagin player with ", dmg, " current Health: ", health);
  }

  function shootArrow() {
    if (currentArrows <= 0) return;
    const player = playerQuery.entities[0];
    const transform = player.getComponent<Group>("transform") as Group;
    const bow = transform.getObjectByName("bow_withString");
    if (bow) {
      bow.updateMatrixWorld(true);
      bow?.getWorldPosition(bowPoint);
      transform.getWorldDirection(worldDir);

      const startPos = bowPoint.clone().add(bulletOffset.clone().add(worldDir));
      const velocity = worldDir.clone().multiplyScalar(bulletSpeed);
      const arrowE = Arrow(world, startPos);
      const arrowTransform = arrowE.getComponent<Group>("transform") as Group;
      const vel = arrowE.getComponent<Vector3>("velocity");
      const rb = arrowE.getComponent<RigidBody & RBUserdataEvents>("rigidbody");
      if (!rb || !vel) return;

      vel.y = rb.linvel().y;
      vel.copy(velocity);
      arrowTransform.lookAt(arrowTransform.position.clone().add(velocity));

      rb.userData = {
        onCollisionStart: (e: Entity) => {
          if (e.getComponent("isEnemy")) {
            const damage = arrowE.getComponent<number>("damage") || 0;
            e.getComponent("health").current -= damage;
            destroyEntityWithCollider(arrowE.id, world);
          }
        },
      };

      currentArrows -= 1;

      updateArrowHTML();
    }
  }

  function updateArrowHTML() {
    const arrows_left_container = document.getElementById("arrows-left");
    const arrows_total_container = document.getElementById("arrows-total");

    if (arrows_left_container) {
      arrows_left_container.innerHTML = currentArrows.toString();
    }

    if (arrows_total_container) {
      arrows_total_container.innerHTML = arrowMag.toString();
    }
  }

  playerQuery.on("added", (id: number) => {
    const player = world.getEntity(id) as Entity;
    const rb = player.getComponent("rigidbody");

    if (!rb) return;

    updateArrowHTML();

    rb.userData = {
      onCollisionStart: (e: Entity) => {
        if (e.getComponent("isEnemy")) {
          const enemyMachine = e.getComponent<FiniteState>("machine");
          enemyMachine?.setActiveState("punch");
          collidingEntity = e;
        }
        if (e.getComponent("isBundle")) {
          currentArrows = arrowMag;
          e.addComponent("hidden", true);
          updateArrowHTML();
        }
      },
      onCollisionEnd: (e: Entity) => {
        if (e.getComponent("isEnemy")) {
          const enemyMachine = e.getComponent<FiniteState>("machine");
          enemyMachine?.setActiveState("walk");
          recievingDmgTimer = 0;
          collidingEntity = undefined;
        }
      },
    };
  });

  const gameMachine = engine.getComponent<FiniteState>("state");

  gameMachine?.on("change", () => {
    if (gameMachine?.active?.name === "finish") {
      shooting = false;
      currentArrows = arrowMag;
      shootingStarted = 0;
      recievingDmgTimer = 0;
      updateArrowHTML();
    }
  });

  return () => {
    const gl = engine.getComponent<GLState>("gl");
    const player = playerQuery.entities[0];

    if (player && gl) {
      const transform = player.getComponent<Group>("transform") as Group;
      const velocity = player.getComponent<Vector3>("velocity");
      const machine = player.getComponent<FiniteState>("machine");
      const rb = player.getComponent<RigidBody>("rigidbody");

      // Movement
      if (Input.keyboard.isPressed("forward")) {
        direction.z = -1;
      }
      if (Input.keyboard.isPressed("backward")) {
        direction.z = 1;
      }
      if (Input.keyboard.isPressed("left")) {
        direction.x = -1;
      }
      if (Input.keyboard.isPressed("right")) {
        direction.x = 1;
      }

      let activeShooting = shooting && currentArrows > 0;

      if (activeShooting) {
        shootingStarted += Time.delta;
        if (shootingStarted > shootingRate) {
          shootArrow();
          shootingStarted = 0;
        }
      }

      if (collidingEntity) {
        recievingDmgTimer += Time.delta;
        if (recievingDmgTimer > damageTickerRate) {
          recievingDmgTimer = 0;
          damagePlayer(collidingEntity.getComponent("damage") || 0);
        }
      }

      const isRunning = Input.keyboard.isPressed("run");

      if (direction.equals(zeroVector)) {
        machine?.setActiveState("idle");
      } else if (!isRunning) {
        machine?.setActiveState("walk");
      } else {
        machine?.setActiveState("run");
      }

      if (isRunning) {
        speedMultiplier = 1.25;
      } else {
        speedMultiplier = 1;
      }

      if (velocity && rb) {
        velocity.x = direction.x * speed * speedMultiplier;
        velocity.z = direction.z * speed * speedMultiplier;
        velocity.y = rb.linvel().y;
      }

      direction.set(0, 0, 0);

      caster.setFromCamera(Input.pointer.position as Vector2, gl.camera);
      caster.ray.intersectPlane(plane, hit);
      const distanceToHit = hit.distanceTo(transform.position);

      if (distanceToHit < 2) {
        directionFromPlayer.set(0, 0, 0);
        directionFromPlayer.subVectors(hit, transform.position).normalize();
        hit.copy(transform.position).add(directionFromPlayer.multiplyScalar(2));
      }

      hit.y = 0;

      lookAtVector.lerp(hit, Time.delta * 15);
      transform.lookAt(lookAtVector);
    }
  };
}
