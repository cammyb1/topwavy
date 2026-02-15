import type { World, Entity } from "@jael-ecs/core";
import { Group, Vector2, Vector3 } from "three";
import type { LoadedAssets } from "../game";
import { createStaticBox } from "../utils";
import { ActiveCollisionTypes, ActiveEvents } from "@dimforge/rapier3d";

const bundleSize = new Vector2(1, 1);

export default function ArrowBundle(world: World, startPos: Vector3): Entity {
  const prefab = world.getPrefab("bundle");
  const engine = world.include("isEngine").entities[0];
  const assets = engine.get<LoadedAssets>("assets");

  if (!prefab) {
    const mesh = assets.loaded_models.arrow_bundle.scene;

    // Physics world stuff
    mesh.traverse((node) => {
      if (node.isObject3D) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    mesh.position.copy(startPos);

    // Components
    const arrowSchema = {
      transform: mesh,
      isBundle: true,
    };
    world.createPrefab("bundle", arrowSchema);
  }

  const bundleIf = world.instantiate("bundle") as number;
  const bundleProxy = world.getEntity(bundleIf) as Entity;
  const transform = bundleProxy.get<Group>("transform");
  const phyInfo = createStaticBox(bundleSize);

  phyInfo.rb.setTranslation(startPos, true);
  phyInfo.col.setTranslation(startPos);
  phyInfo.col.setSensor(true);
  phyInfo.col.setActiveCollisionTypes(ActiveCollisionTypes.ALL);
  phyInfo.col.setActiveEvents(ActiveEvents.COLLISION_EVENTS);
  transform.position.copy(startPos);

  bundleProxy.add("rigidbody", phyInfo.rb);
  bundleProxy.add("collider", phyInfo.col);

  return bundleProxy as Entity;
}
