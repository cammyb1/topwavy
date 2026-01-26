import { type Entity, Time, World, type System, Query } from "@jael-ecs/core";
import {
  AmbientLight,
  BoxGeometry,
  DirectionalLight,
  Mesh,
  MeshLambertMaterial,
  Plane,
  PlaneGeometry,
  Raycaster,
  ShadowMaterial,
  SphereGeometry,
  Vector3,
} from "three";
import type { GLState } from "./mount3";
import { Input } from "./Input";

export function mountExperience(state: GLState) {
  const world = new World();

  // Util classes
  const raycaster = new Raycaster();
  const plane = new Plane(new Vector3(0, 1, 0), 1);

  // Re-use Geometries
  const boxGeometry = new BoxGeometry(1, 1, 1);
  const sphereGeometry = new SphereGeometry(1, 32, 32);
  const basicMaterial = new MeshLambertMaterial({ color: "white" });
  const enemyMaterial = basicMaterial.clone();
  const bulletMaterial = basicMaterial.clone();

  enemyMaterial.color.set("green");
  bulletMaterial.color.set("yellow");

  // Ground shadow;
  const planeGeo = new PlaneGeometry(10, 10, 10);
  const shadowMaterial = new ShadowMaterial();

  const ground = new Mesh(planeGeo, shadowMaterial);
  ground.scale.addScalar(10);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.position.setY(-0.5);
  ground.material.transparent = true;
  ground.material.opacity = 0.5;

  // Lightset
  const ambient = new AmbientLight("white", 1);
  const directional = new DirectionalLight("white", 1);

  directional.position.set(10, 20, 2);
  directional.castShadow = true;
  directional.shadow.mapSize.set(1024, 1024);
  directional.shadow.camera.top = 50;
  directional.shadow.camera.bottom = -50;
  directional.shadow.camera.left = -50;
  directional.shadow.camera.right = 50;
  directional.shadow.camera.near = 0.1;
  directional.shadow.camera.far = 400;
  directional.shadow.bias = 0.001;

  // Set default scene

  state.camera.position.set(0, 50, 20);
  state.camera.lookAt(new Vector3(0, 0, 0));
  state.scene.add(ground);
  state.scene.add(ambient);
  state.scene.add(directional);

  // Queries
  const queries: { [k: string]: Query } = {
    renderables: world.include("transform"),
    movable: world.include("transform", "velocity"),
    colliders: world.include("transform", "bbox"),
    enemies: world.include("isEnemy"),
    lifetime: world.include("lifetime"),
    hasHealth: world.include("health"),
    player: world.include("isPlayer"),
  };

  // PlayerEntity
  const player: Entity = world.create();
  const playerMesh = new Mesh(boxGeometry, basicMaterial);
  player.add("transform", playerMesh);
  player.add("velocity", new Vector3());
  player.add("isPlayer", true);

  playerMesh.castShadow = true;

  // Bullet Factory
  function createBullet(pos: Vector3): Entity {
    const bullet = world.create();
    const mesh = new Mesh(sphereGeometry, bulletMaterial);

    // Pos
    mesh.castShadow = true;
    mesh.position.copy(pos);
    mesh.scale.multiplyScalar(0.15);

    // Components
    bullet.add("transform", mesh);
    bullet.add("isBullet", true);
    bullet.add("lifetime", { current: 1, decreaseSpeed: 0.5 });
    bullet.add("velocity", new Vector3());

    return bullet;
  }

  // Enemy Factory
  function createEnemy(pos: Vector3): Entity {
    const enemy = world.create();
    const mesh = new Mesh(boxGeometry, enemyMaterial);

    mesh.castShadow = true;
    mesh.position.copy(pos);
    mesh.scale.multiplyScalar(1.5);

    enemy.add("transform", mesh);
    enemy.add("isEnemy", true);
    enemy.add("target", player);
    enemy.add("health", { current: 100 });
    enemy.add("velocity", new Vector3());

    return enemy;
  }

  function PlayerController(): System {
    const hit = new Vector3();
    const direction = new Vector3();
    const speed = 5;
    const bulletSpeed = 15;
    let multiplier = 1;

    Input.register("forward", ["KeyW", "ArrowUp"]);
    Input.register("backward", ["KeyS", "ArrowDown"]);
    Input.register("left", ["KeyA", "ArrowLeft"]);
    Input.register("right", ["KeyD", "ArrowRight"]);
    Input.register("run", ["ShiftLeft"]);

    Input.pointer.on("down", () => {
      const self: Entity = queries.player.entities.first();
      if (!self) return;

      const transform = self.get<Mesh>("transform");
      const dir = transform.getWorldDirection(new Vector3());
      const bullet = createBullet(transform.position);
      bullet.get("transform").lookAt(dir);
      bullet.get("velocity").copy(dir.multiplyScalar(bulletSpeed * Time.delta));
    });

    Input.on("down", (event) => {
      if (event.code === "Space" && !event.repeated) {
        const self: Entity = queries.player.entities.first();
        if (!self) return;
        createEnemy(new Vector3(Math.random() * 10, 0.5, Math.random() * 10));
      }
    });

    return {
      priority: 1,
      update() {
        const self: Entity = queries.player.entities.first();
        if (self) {
          const transform = self.get<Mesh>("transform");
          const velocity = self.get<Vector3>("velocity");

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

          if (Input.isPressed("run")) {
            multiplier = 2;
          } else {
            multiplier = 1;
          }

          velocity.copy(
            direction.multiplyScalar(speed * multiplier * Time.delta),
          );
          direction.set(0, 0, 0);

          // Look at logic
          raycaster.setFromCamera(Input.pointer.position, state.camera);
          raycaster.ray.intersectPlane(plane, hit);
          hit.y = 0; // Avoid loking down

          transform.lookAt(hit);
        }
      },
    };
  }

  function EnemyAI(): System {
    const targetPos = new Vector3();
    const speed = 1;
    return {
      priority: 2,
      update() {
        queries.enemies.entities.forEach((enemy: Entity) => {
          const mesh = enemy.get("transform");
          const velocity = enemy.get("velocity");
          const targetMesh = enemy.get("target").get("transform");

          if (targetMesh) {
            mesh.lookAt(targetMesh.position);
            targetPos.copy(targetMesh.position).sub(mesh.position);

            velocity.copy(targetPos.multiplyScalar(speed * Time.delta));
          }
        });
      },
    };
  }

  function GameEngine(): System {
    return {
      priority: 0,
      init() {
        // Rendering
        queries.renderables.entities.forEach((entity: Entity) => {
          state.scene.add(entity.get("transform"));
        });
        queries.renderables.on("added", (entity: Entity) => {
          state.scene.add(entity.get("transform"));
        });
        queries.renderables.on("removed", (entity: Entity) => {
          state.scene.remove(entity.get("transform"));
        });
      },
      update() {
        // Lifetime entities
        queries.lifetime.entities.forEach((entity: Entity) => {
          const lifetime = entity.get("lifetime");
          lifetime.current -= lifetime.decreaseSpeed * Time.delta;
          if (lifetime.current < 0) {
            world.destroy(entity);
          }
        });

        // Health
        queries.hasHealth.entities.forEach((entity: Entity) => {
          const health = entity.get("health");
          if (health.current < 0) {
            world.destroy(entity);
          }
        });

        // Movement
        queries.movable.entities.forEach((entity: Entity) => {
          const transform = entity.get("transform");
          const velocity = entity.get("velocity");
          transform.position.add(velocity);
        });
      },
    };
  }

  world.addSystem(GameEngine());
  world.addSystem(PlayerController());
  world.addSystem(EnemyAI());

  Time.on("update", () => {
    world.update();
  });
}
