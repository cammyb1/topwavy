import { Time, type Entity, type System, type World } from "@jael-ecs/core";
import { Group, Plane, Raycaster, Vector3 } from "three";
import type { GLState } from "../mount3";
import Arrow from "../entities/Arrow";
import { Input } from "../helpers/Input";
import { FiniteState } from "../helpers/state";
import { Collider, RigidBody } from "@dimforge/rapier3d";
import {
  destroyEntityWithCollider,
  isGameActive,
  PRIORITY_LIST,
} from "../utils";
import type { RBUserdataEvents } from "./collisionSystem";

const zeroVector = new Vector3();
const lookAtVector = new Vector3();
const directionFromPlayer = new Vector3();
const bowPoint = new Vector3();

export default function PlayerController(world: World): System {
  const playerQuery = world.include("isPlayer");
  const engine = world.include("isEngine").entities[0];

  const caster = new Raycaster();
  const plane = new Plane(new Vector3(0, 1, 0), 1);

  const hit = new Vector3();
  const direction = new Vector3();
  const worldDir = new Vector3();

  const speed = 1.25;
  const bulletSpeed = 10;
  const shootingRate = 0.2;
  const damageTickerRate = 0.75;
  const bulletOffset = new Vector3(0, 0, -0.2);
  const arrowMag = 30;

  let shooting = false;
  let shootingStarted = 0;
  let multiplier = 1.75;
  let currentArrows = arrowMag;

  let recievingDmgTimer = 0;
  let collidingEntity: Entity | undefined;

  Input.pointer.on("down", () => {
    if (playerQuery.size() <= 0 || !isGameActive(engine)) return;
    shooting = true;

    const player = playerQuery.entities[0];
    const machine = player.get<FiniteState>("machine");
    machine.setActiveState("draw_bow");

    shootArrow();
  });

  Input.pointer.on("up", () => {
    if (playerQuery.size() <= 0 || !isGameActive(engine)) return;
    shooting = false;

    const player = playerQuery.entities[0];
    const machine = player.get<FiniteState>("machine");
    machine.setActiveState("release_bow");
  });

  function damagePlayer(dmg: number) {
    if (!playerQuery.entities[0]) return;
    const health = playerQuery.entities[0].get("health");
    const machine = playerQuery.entities[0].get("machine");
    health.current -= dmg;
    machine.setActiveState("hit");
    console.log("Damagin player with ", dmg, " current Health: ", health);
  }

  function shootArrow() {
    if (currentArrows <= 0) return;
    const player = playerQuery.entities[0];
    const transform = player.get<Group>("transform");
    const bow = transform.getObjectByName("bow_withString");
    if (bow) {
      bow.updateMatrixWorld(true);
      bow?.getWorldPosition(bowPoint);
      transform.getWorldDirection(worldDir);

      const startPos = bowPoint.clone().add(bulletOffset.clone().add(worldDir));
      const velocity = worldDir.clone().multiplyScalar(bulletSpeed);
      const arrowE = Arrow(world, startPos);
      const arrowTransform = arrowE.get<Group>("transform");
      const vel = arrowE.get<Vector3>("velocity");
      const rb = arrowE.get<RigidBody & RBUserdataEvents>("rigidbody");
      vel.y = rb.linvel().y;
      vel.copy(velocity);
      arrowTransform.lookAt(velocity);

      rb.userData = {
        onCollisionStart: (e: Entity) => {
          if (e.get("isEnemy")) {
            const damage = arrowE.get<number>("damage");
            e.get("health").current -= damage;
            destroyEntityWithCollider(arrowE.id, world);
          }
        },
      };

      currentArrows -= 1;
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
          collidingEntity = e;
        }
        if (e.get("isBundle")) {
          currentArrows = arrowMag;
          const transform = e.get<Group>("transform");
          const col = e.get<Collider>("collider");
          transform.visible = false;
          col.setEnabled(false);
          e.add("hidden", true)
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
            damagePlayer(collidingEntity.get("damage"));
          }
        }

        const isRunning = Input.isPressed("run");

        if (direction.equals(zeroVector)) {
          machine.setActiveState("idle");
        } else if (!isRunning) {
          machine.setActiveState("walk");
        } else {
          machine.setActiveState("run");
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
