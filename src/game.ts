import { type Entity, Time, World, type System } from "@jael-ecs/core";
import {
  AmbientLight,
  BoxGeometry,
  CameraHelper,
  DirectionalLight,
  DirectionalLightHelper,
  Mesh,
  MeshLambertMaterial,
  Plane,
  PlaneGeometry,
  // PlaneHelper,
  Raycaster,
  ShadowMaterial,
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
  const whiteBasicMaterial = new MeshLambertMaterial({ color: "white" });

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

  // state.scene.add(new PlaneHelper(plane, 10));
  // state.scene.add(new DirectionalLightHelper(directional));
  // state.scene.add(new CameraHelper(directional.shadow.camera));

  // Bullet Factory
  function createBullet(pos: Vector3): Entity {
    const bullet = world.create();
    const mat = whiteBasicMaterial.clone();
    mat.color.set("yellow");
    bullet.add("transform", new Mesh(boxGeometry, mat));
    bullet.add("isBullet", true);
    bullet.add("lifetime", { current: 1, decreaseSpeed: 0.5 });
    bullet.add("velocity", new Vector3());
    bullet.get("transform").castShadow = true;
    bullet.get("transform").position.copy(pos);
    bullet.get("transform").scale.multiplyScalar(0.25);

    return bullet;
  }

  // PlayerEntity
  const player: Entity = world.create();
  player.add("transform", new Mesh(boxGeometry, whiteBasicMaterial));
  player.add("velocity", new Vector3());
  player.add("isPlayer", true);
  player.get("transform").castShadow = true;

  function PlayerController(): System {
    const player = world.include("isPlayer");
    const hit = new Vector3();
    const direction = new Vector3();
    const speed = 5;
    const bulletSpeed = 10;
    let multiplier = 1;

    Input.register("forward", ["KeyW", "ArrowUp"]);
    Input.register("backward", ["KeyS", "ArrowDown"]);
    Input.register("left", ["KeyA", "ArrowLeft"]);
    Input.register("right", ["KeyD", "ArrowRight"]);
    Input.register("run", ["ShiftLeft"]);

    Input.pointer.on("down", () => {
      const self: Entity = player.entities.first();
      if (!self) return;

      const transform = self.get<Mesh>("transform");
      const dir = transform.getWorldDirection(new Vector3());
      const bullet = createBullet(transform.position);
      bullet.get("transform").lookAt(dir);
      bullet.get("velocity").copy(dir.multiplyScalar(bulletSpeed * Time.delta));
    });

    return {
      priority: 2,
      update() {
        const self: Entity = player.entities.first();
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

  function MovementSystem(): System {
    const movable = world.include("transform", "velocity");

    return {
      priority: 1,
      update() {
        movable.entities.forEach((entity: Entity) => {
          const transform = entity.get("transform");
          const velocity = entity.get("velocity");
          transform.position.add(velocity);
        });
      },
    };
  }

  function LifeTimeSystem(): System {
    return {
      priority: 3,
      update() {
        const { entities } = world.include("lifetime");
        entities.forEach((entity: Entity) => {
          const lifetime = entity.get("lifetime");
          lifetime.current -= lifetime.decreaseSpeed * Time.delta;
          if (lifetime.current < 0) {
            world.destroy(entity);
          }
        });
      },
    };
  }

  function RenderSystem(): System {
    const renderables = world.include("transform");

    return {
      priority: 0,
      init() {
        renderables.entities.forEach((entity: Entity) => {
          state.scene.add(entity.get("transform"));
        });
        renderables.on("added", (entity: Entity) => {
          state.scene.add(entity.get("transform"));
        });
        renderables.on("removed", (entity: Entity) => {
          state.scene.remove(entity.get("transform"));
        });
      },
      update() {},
    };
  }

  world.addSystem(RenderSystem());
  world.addSystem(PlayerController());
  world.addSystem(MovementSystem());
  world.addSystem(LifeTimeSystem());

  Time.on("update", () => {
    world.update();
  });
}
