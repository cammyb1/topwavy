import type { World, Entity } from "@jael-ecs/core";
import { Vector2, Vector3 } from "three";
import type { LoadedAssets } from "../game";
import { createStaticBox, meshMap } from "../utils";
import { ActiveCollisionTypes, ActiveEvents } from "@dimforge/rapier3d";
import { type ArrowBundleSchema, type TransformComponent } from "../components";
import { SkeletonUtils } from "three/examples/jsm/Addons.js";

const bundleSize = new Vector2(1, 1);

export default function ArrowBundle(world: World, startPos: Vector3): Entity {
  const engine = world.include("isEngine").entities[0];
  const assets = engine.getComponent<LoadedAssets>("assets") as LoadedAssets;
  let mesh = meshMap.get("bundle");

  if (!mesh) {
    mesh = assets.loaded_models.arrow_bundle.scene;

    mesh.traverse((node) => {
      if (node.isObject3D) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    meshMap.set("bundle", mesh);
  }

  const arrowSchema = {
    transform: SkeletonUtils.clone(mesh),
    isBundle: true,
  };

  arrowSchema.transform.position.copy(startPos);

  const bundleIf = world.createWith<ArrowBundleSchema>(arrowSchema);
  const bundleProxy = world.getEntity(bundleIf) as Entity;
  const transform = bundleProxy.getComponent<TransformComponent>("transform");
  const phyInfo = createStaticBox(bundleSize);

  phyInfo.rb.setTranslation(startPos, true);
  phyInfo.col.setTranslation(startPos);
  phyInfo.col.setSensor(true);
  phyInfo.col.setActiveCollisionTypes(ActiveCollisionTypes.ALL);
  phyInfo.col.setActiveEvents(ActiveEvents.COLLISION_EVENTS);
  transform?.position.copy(startPos);

  bundleProxy.addComponent("rigidbody", phyInfo.rb);
  bundleProxy.addComponent("collider", phyInfo.col);

  return bundleProxy as Entity;
}
