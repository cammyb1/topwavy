import { type World, type System, type Entity, Time } from "@jael-ecs/core";
import type { GLState } from "../mount3";
import { AnimationMixer, Vector3, type Mesh } from "three";
import * as RAPIER from "@dimforge/rapier3d";
import RapierEngine from "../helpers/rapier";
import { destroyEntityWithCollider } from "../utils";
import { FiniteState } from "../helpers/state";

export default function GameEngine(world: World): System {
  const renderables = world.include("transform");
  const lifeTimers = world.include("lifetime");
  const movables = world.include("transform", "rigidbody", "velocity");
  const healthEs = world.include("health");
  const mixers = world.include("mixer");
  const engine = world.include("isEngine").entities[0];
  const playerQuery = world.include("isPlayer");

  const enemies = world.include("isEnemy", "collider");
  const bullets = world.include("isBullet", "collider");

  let collidingEnemy: Entity | null;
  let recievingDmgTimer = 0;
  const damageTickerRate = 0.5;

  function damagePlayer(dmg: number) {
    if (playerQuery.size() <= 0 || !dmg) return;
    const health = playerQuery.entities[0].get("health");
    console.log("Damage Player", health.current);
    health.current -= dmg;
  }

  // Hide debug mesh
  RapierEngine.debugMesh.visible = false;

  playerQuery.on("removed", () => {
    engine.get<FiniteState>("state").setActiveState("finish");
  });

  const state = engine.get<GLState>("gl");

  // Rendering
  renderables.entities.forEach((entity: Entity) => {
    state.scene.add(entity.get("transform"));
  });

  renderables.on("added", (entityId) => {
    const transform = world.getComponent<Mesh>(entityId, "transform");
    state.scene.add(transform);
  });
  renderables.on("removed", (entityId) => {
    const transform = world.getComponent<Mesh>(entityId, "transform");
    state.scene.remove(transform);
  });

  return {
    priority: 0,
    update() {
      // Collisions
      RapierEngine.onCollisionDrain((handle1, handle2, started) => {
        const bullet = bullets.entities.find((e) =>
          [handle1, handle2].includes(
            e.get<RAPIER.Collider>("collider").handle,
          ),
        );
        const enemy = enemies.entities.find((e) =>
          [handle1, handle2].includes(
            e.get<RAPIER.Collider>("collider").handle,
          ),
        );

        if (playerQuery.size() > 0) {
          const isPlayer = [handle1, handle2].includes(
            playerQuery.entities[0].get<RAPIER.Collider>("collider").handle,
          );

          if (isPlayer && enemy) {
            const enemyMachine = enemy.get<FiniteState>("machine");
            if (started) {
              // First Touch
              enemyMachine.setActiveState("punch");
              damagePlayer(enemy.get<number>("damage"));
            } else {
              enemyMachine.setActiveState("walk");
            }
            collidingEnemy = started ? enemy : null;
          }
        }

        if (bullet && enemy && started) {
          const damage = bullet.get<number>("damage");
          enemy.get("health").current -= damage;
          destroyEntityWithCollider(bullet.id, world);
        }
      });

      if (collidingEnemy) {
        recievingDmgTimer += Time.delta;
        if (recievingDmgTimer > damageTickerRate) {
          const enemyMachine = collidingEnemy.get<FiniteState>("machine");
          enemyMachine?.setActiveState("punch");
          damagePlayer(collidingEnemy.get<number>("damage"));
          recievingDmgTimer = 0;
        }
      }

      // Lifetime entities
      lifeTimers.entities.forEach((entity: Entity) => {
        const lifetime = entity.get("lifetime");
        lifetime.current -= lifetime.decreaseSpeed * Time.delta;
        if (lifetime.current < 0) {
          destroyEntityWithCollider(entity.id, world);
        }
      });

      // Health
      healthEs.entities.forEach((entity: Entity) => {
        const health = entity.get("health");
        if (health.current < 0) {
          destroyEntityWithCollider(entity.id, world);
        }
      });

      mixers.entities.forEach((entity: Entity) => {
        const mixer = entity.get<AnimationMixer>("mixer");
        mixer.update(Time.delta);
      });

      // Movement sync with mesh and physics
      movables.entities.forEach((entity: Entity) => {
        const transform = entity.get("transform");
        const rb = entity.get<RAPIER.RigidBody>("rigidbody");
        const velocity = entity.get("velocity");
        rb.setRotation(transform.quaternion, true);
        rb.setLinvel(velocity, true);
        transform.position.copy(rb.translation());
      });
    },
  };
}
