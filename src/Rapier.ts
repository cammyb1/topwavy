import RAPIER, * as Rapier from "@dimforge/rapier3d";
import {
  BufferAttribute,
  BufferGeometry,
  LineBasicMaterial,
  LineSegments,
  Vector3,
  type Vector3Like,
} from "three";

const gravity = new Vector3(0, -9.81, 0);

export type ColliderReturns = {
  ball: (radius: number) => Rapier.ColliderDesc;
  box: (size: Vector3Like) => Rapier.ColliderDesc;
  capsule: (yHeight: number, radius: number) => Rapier.ColliderDesc;
};

export type RigidBodyReturns = {
  dynamic: () => Rapier.RigidBodyDesc;
  posKinematic: () => Rapier.RigidBodyDesc;
  velKinematic: () => Rapier.RigidBodyDesc;
  fixed: () => Rapier.RigidBodyDesc;
};

export default abstract class RapierEngine {
  static world: Rapier.World = new Rapier.World(gravity);
  static debugMesh: LineSegments = new LineSegments(
    new BufferGeometry(),
    new LineBasicMaterial({ vertexColors: true }),
  );
  static eventQueue: Rapier.EventQueue = new Rapier.EventQueue(true);

  static step() {
    // Update Debug
    const buffers = this.world.debugRender();
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(buffers.vertices, 3));
    geo.setAttribute("color", new BufferAttribute(buffers.colors, 4));
    this.debugMesh.geometry.dispose();
    this.debugMesh.geometry = geo;

    RapierEngine.world.step(RapierEngine.eventQueue);
  }

  static onCollisionDrain(
    cb: (h1: number, h2: number, started: boolean) => void,
  ) {
    this.eventQueue.drainCollisionEvents((handle1, handle2, started) => {
      cb(handle1, handle2, started);
    });
  }

  static get collider(): ColliderReturns {
    const desc = Rapier.ColliderDesc;

    return {
      ball: (radius: number) => desc.ball(radius),
      box: (size: Vector3Like) => desc.cuboid(size.x, size.y, size.z),
      capsule: (yHeight: number, radius: number) =>
        desc.capsule(yHeight, radius),
    };
  }

  static get rigidbody(): RigidBodyReturns {
    const desc = Rapier.RigidBodyDesc;

    return {
      dynamic: () => desc.dynamic(),
      posKinematic: () => desc.kinematicPositionBased(),
      velKinematic: () => desc.kinematicVelocityBased(),
      fixed: () => desc.fixed(),
    };
  }
}
