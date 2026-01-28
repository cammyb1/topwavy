import { type Entity, Time, World, type System, Query } from "@jael-ecs/core";
import {
  AmbientLight,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  DirectionalLight,
  LineBasicMaterial,
  LineSegments,
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
import * as Rapier from "@dimforge/rapier3d";

export function mountExperience(state: GLState) {
  const gravity = new Vector3(0, -9.81, 0);

  const world = new World();
  const integrationParameters = new Rapier.IntegrationParameters();
  integrationParameters.dt = 1 / 60;
  integrationParameters.maxCcdSubsteps = 10;
  const physicsWorld = new Rapier.World(gravity, integrationParameters.raw);

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

  // GroundCollider
  const groundColliderDesc = Rapier.ColliderDesc.cuboid(
    100,
    0.5,
    100,
  ).setTranslation(0, -1, 0);
  physicsWorld.createCollider(groundColliderDesc);

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

  // Physics debug
  const debugLines = new LineSegments(
    new BufferGeometry(),
    new LineBasicMaterial({ vertexColors: true }),
  );
  // state.scene.add(debugLines);

  // Collision Queue
  let collisionQueue = new Rapier.EventQueue(true);

  // Queries
  const queries: { [k: string]: Query } = {
    renderables: world.include("transform"),
    movable: world.include("transform", "velocity", "rigidbody"),
    colliders: world.include("transform", "bbox"),
    enemies: world.include("isEnemy"),
    bullets: world.include("isBullet"),
    lifetime: world.include("lifetime"),
    hasHealth: world.include("health"),
    player: world.include("isPlayer"),
  };

  // Create dynamic rigidBodys
  function createRigidBody(): Rapier.RigidBody {
    const rigidBodyDesc = Rapier.RigidBodyDesc.dynamic();
    return physicsWorld.createRigidBody(rigidBodyDesc);
  }

  function boxCollider(
    parent: Rapier.RigidBody,
    size: Vector3,
  ): Rapier.Collider {
    const collider = Rapier.ColliderDesc.cuboid(
      size.x,
      size.y,
      size.z,
    ).setActiveCollisionTypes(Rapier.ActiveCollisionTypes.ALL);
    return physicsWorld.createCollider(collider, parent);
  }

  function ballCollider(parent: Rapier.RigidBody): Rapier.Collider {
    const collider = Rapier.ColliderDesc.ball(1.0)
      .setDensity(1)
      .setActiveCollisionTypes(Rapier.ActiveCollisionTypes.ALL);
    return physicsWorld.createCollider(collider, parent);
  }

  // PlayerEntity
  const playerID = world.create();
  const player: Entity = world.getEntity(playerID) as Entity;
  const playerMesh = new Mesh(boxGeometry, basicMaterial);
  const playerRb = createRigidBody();
  const playercollider = boxCollider(playerRb, new Vector3(0.5, 0.5, 0.5));
  player.add("transform", playerMesh);
  player.add("velocity", new Vector3());
  player.add("rigidbody", playerRb);
  player.add("health", { current: 100 });
  player.add("collider", playercollider);
  player.add("isPlayer", true);

  playercollider.setActiveEvents(Rapier.ActiveEvents.COLLISION_EVENTS);

  player
    .get<Rapier.RigidBody>("rigidbody")
    .setTranslation({ x: 0, y: 2, z: 0 }, true);

  playerMesh.castShadow = true;

  function destroyEntityWithCollider(entity: Entity) {
    const rb = entity.get<Rapier.RigidBody>("rigidbody");
    const col = entity.get<Rapier.Collider>("collider");
    if (rb) {
      physicsWorld.removeRigidBody(rb);
    }
    if (col) {
      physicsWorld.removeCollider(col, true);
    }
    world.destroy(entity.id);
  }

  // Bullet Factory
  function createBullet(pos: Vector3): Entity {
    const bulletId = world.create();
    const bullet: Entity = world.getEntity(bulletId) as Entity;
    const mesh = new Mesh(sphereGeometry, bulletMaterial);

    // Pos
    mesh.castShadow = true;
    mesh.scale.multiplyScalar(0.15);
    mesh.position.copy(pos);

    const kinematicDesc =
      Rapier.RigidBodyDesc.kinematicVelocityBased().setGravityScale(0);
    const kinematicRigidBody = physicsWorld.createRigidBody(kinematicDesc);
    const collider = ballCollider(kinematicRigidBody);
    collider.setActiveEvents(Rapier.ActiveEvents.COLLISION_EVENTS);

    // Components
    bullet.add("transform", mesh);
    bullet.add("isBullet", true);
    bullet.add("lifetime", { current: 1, decreaseSpeed: 2.5 });
    bullet.add("velocity", new Vector3());
    bullet.add("rigidbody", kinematicRigidBody);
    bullet.add("collider", collider);

    kinematicRigidBody.setTranslation(pos, true);
    collider.setDensity(0);
    collider.setRadius(mesh.scale.y / 2);
    collider.setSensor(true);

    return bullet;
  }

  // Enemy Factory
  function createEnemy(pos: Vector3): Entity {
    const enemyId = world.create();
    const enemy: Entity = world.getEntity(enemyId) as Entity;
    const mesh = new Mesh(boxGeometry, enemyMaterial);

    mesh.castShadow = true;
    mesh.position.copy(pos);
    mesh.scale.multiplyScalar(1.5);

    const rb = createRigidBody();
    const collider = boxCollider(rb, new Vector3(1, 1, 1));
    collider.setActiveEvents(Rapier.ActiveEvents.COLLISION_EVENTS);
    collider.setFriction(0.5);
    rb.setTranslation(pos, true);
    rb.enableCcd(true);

    enemy.add("transform", mesh);
    enemy.add("isEnemy", true);
    enemy.add("target", player);
    enemy.add("health", { current: 100 });
    enemy.add("velocity", new Vector3());
    enemy.add("rigidbody", rb);
    enemy.add("collider", collider);

    return enemy;
  }

  function PlayerController(): System {
    const hit = new Vector3();
    const direction = new Vector3();
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
    });

    Input.pointer.on("up", () => {
      shooting = false;
    });

    Input.on("down", (event) => {
      if (event.code === "Space" && !event.repeated) {
        const self: Entity = queries.player.entities[0];
        if (!self) return;
        createEnemy(new Vector3(Math.random() * 10, 0.5, Math.random() * 10));
      }
    });

    return {
      priority: 1,
      init() {
        const self: Entity = queries.player.entities[0];
        const collider = self.get<Rapier.Collider>("collider");
        collider.setFriction(0.5);
      },
      update() {
        const self: Entity = queries.player.entities[0];
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

          if (
            shooting &&
            Math.abs(shootingStarted - Time.elapsed) > shootingRate
          ) {
            shootingStarted = Time.elapsed;
            const self: Entity = queries.player.entities[0];
            if (!self) return;

            const transform = self.get<Mesh>("transform");
            const dir = transform.getWorldDirection(new Vector3());
            const bullet = createBullet(transform.position.clone().add(dir));
            bullet
              .get("velocity")
              .copy(dir.multiplyScalar(bulletSpeed * Time.delta));
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
          raycaster.setFromCamera(Input.pointer.position, state.camera);
          raycaster.ray.intersectPlane(plane, hit);
          hit.y = 0; // Avoid loking down

          transform.lookAt(hit);
        }
      },
    };
  }

  function EnemyAI(): System {
    const targetDir = new Vector3();
    const speed = 13;
    return {
      priority: 2,
      update() {
        queries.enemies.entities.forEach((enemy: Entity) => {
          const mesh = enemy.get("transform");
          const velocity = enemy.get("velocity");
          const targetMesh = enemy.get("target").get("transform");

          if (targetMesh) {
            if (targetMesh.position.distanceTo(mesh.position) < 20) {
              mesh.lookAt(targetMesh.position);
              mesh.getWorldDirection(targetDir);
              velocity.copy(targetDir.multiplyScalar(speed * Time.delta));
            } else {
              velocity.set(0, 0, 0);
            }
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

        queries.renderables.on("added", (entityId) => {
          const transform = world.getComponent<Mesh>(entityId, "transform");
          state.scene.add(transform);
        });
        queries.renderables.on("removed", (entityId) => {
          const transform = world.getComponent<Mesh>(entityId, "transform");
          state.scene.remove(transform);
        });
      },
      update() {
        // Physics debug update
        const buffers = physicsWorld.debugRender();
        const geo = new BufferGeometry();
        geo.setAttribute("position", new BufferAttribute(buffers.vertices, 3));
        geo.setAttribute("color", new BufferAttribute(buffers.colors, 4));
        debugLines.geometry.dispose();
        debugLines.geometry = geo;

        // Collision management
        collisionQueue.drainCollisionEvents((handle1, handl2, started) => {
          const isPlayer = handle1 === playercollider.handle;
          const bullet = queries.bullets.entities.find((e) =>
            [handle1, handl2].includes(
              e.get<Rapier.Collider>("collider").handle,
            ),
          );
          console.log(handle1, handl2, true);
          const enemy = queries.enemies.entities.find((entity) => {
            const collider = entity.get<Rapier.Collider>("collider");
            return [handle1, handl2].includes(collider.handle);
          });

          if (bullet && enemy && started) {
            const hp = enemy.get("health");
            hp.current -= 10;
            destroyEntityWithCollider(bullet);
          }

          // Player vs Enemy collision
          if (isPlayer && enemy && started) {
            const hp = player.get("health");
            hp.current -= 10;
          }
        });

        collisionQueue.drainContactForceEvents((e) => {
          console.log(e);
        });

        // Lifetime entities
        queries.lifetime.entities.forEach((entity: Entity) => {
          const lifetime = entity.get("lifetime");
          lifetime.current -= lifetime.decreaseSpeed * Time.delta;
          if (lifetime.current < 0) {
            destroyEntityWithCollider(entity);
          }
        });

        // Health
        queries.hasHealth.entities.forEach((entity: Entity) => {
          const health = entity.get("health");
          if (health.current < 0) {
            destroyEntityWithCollider(entity);
          }
        });

        // Movement
        queries.movable.entities.forEach((entity: Entity) => {
          const transform = entity.get("transform");
          const rb = entity.get<Rapier.RigidBody>("rigidbody");
          const velocity = entity.get("velocity");
          const linearVelocity = new Vector3().copy(rb.linvel());
          rb.setLinvel(linearVelocity.add(velocity), true);

          transform.position.copy(rb.translation());
        });
      },
    };
  }

  world.addSystem(GameEngine());
  world.addSystem(PlayerController());
  world.addSystem(EnemyAI());

  Time.on("update", () => {
    physicsWorld.step(collisionQueue);
    world.update();
  });
}
