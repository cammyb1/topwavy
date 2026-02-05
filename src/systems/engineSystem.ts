import { type World, type System, type Entity, Time } from "@jael-ecs/core";
import type { GLState } from "../mount3";
import { Vector3, type Mesh } from "three";
import * as RAPIER from "@dimforge/rapier3d";
import RapierEngine from "../Rapier";
import { destroyEntityWithCollider } from "../utils";
import { FiniteState } from "../state";

export default function GameEngine(world: World): System {
  const renderables = world.include("transform");
  const lifeTimers = world.include("lifetime");
  const movables = world.include("transform", "rigidbody", "velocity");
  const healthEs = world.include("health");
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

    if (health.current - dmg < 0) {
      collidingEnemy = null;
      // End Game
      engine.get<FiniteState>("state").setActiveState("finish");
    }
    health.current -= dmg;
  }

  // Hide debug mesh
  RapierEngine.debugMesh.visible = false;

  return {
    priority: 0,
    init() {
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
    },
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
            if (started) {
              // First Touch
              damagePlayer(enemy.get<number>("damage"));
            }
            collidingEnemy = started ? enemy : null;
          }
        }

        if (bullet && enemy && started) {
          const damage = bullet.get<number>("damage");
          enemy.get("health").current -= damage;
        }
      });

      if (collidingEnemy) {
        recievingDmgTimer += Time.delta;
        if (recievingDmgTimer > damageTickerRate) {
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

      // Movement sync with mesh and physics
      movables.entities.forEach((entity: Entity) => {
        const transform = entity.get("transform");
        const rb = entity.get<RAPIER.RigidBody>("rigidbody");
        const velocity = entity.get("velocity");
        const linearVelocity = new Vector3().copy(rb.linvel());
        transform.position.copy(rb.translation());
        rb.setLinvel(linearVelocity.add(velocity), true);
      });
    },
  };
}
