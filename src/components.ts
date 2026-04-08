import type { Object3D, Object3DEventMap, Vector3 } from "three";

export type TransformComponent = Object3D<Object3DEventMap>;
export type LifetimeComponent = { current: number; decreaseSpeed: number };
export type HealthComponent = { current: number; max?: number };

export type ArrowSchema = {
  transform: TransformComponent;
  isBullet: boolean;
  lifetime: LifetimeComponent;
  velocity: Vector3;
  damage: number;
};

export type ArrowBundleSchema = {
  transform: TransformComponent;
  isBundle: boolean;
};

export type EnemySchema = {
  transform: TransformComponent;
  isEnemy: boolean;
  velocity: Vector3;
  health: HealthComponent;
  damage: number;
};

export type PlayerSchema = {
  transform: TransformComponent;
  velocity: Vector3;
  health: HealthComponent;
  isPlayer: boolean;
};
