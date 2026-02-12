import { Time, type System, type World } from "@jael-ecs/core";
import { PRIORITY_LIST } from "../utils";
import { Box3, Frustum, Matrix4, Vector3, type Group } from "three";
import { type GLState } from "../mount3";

export default function CameraSystem(world: World): System {
  const playerQuery = world.include("isPlayer");
  const engine = world.include("isEngine").entities[0];

  const cameraOffset = new Vector3(0, 50, 20);
  const cameraLerpVector = new Vector3();
  const cameraFrustum = new Frustum();
  const playerBox = new Box3();
  const dummyMat = new Matrix4();
  const cameraFollowSpeed = 5;
  let lerping = false;

  return {
    priority: PRIORITY_LIST.REST,
    update() {
      if (playerQuery.size() <= 0) return;

      const gl = engine.get<GLState>("gl");
      const player = playerQuery.entities[0];
      const transform = player.get<Group>("transform");

      playerBox.setFromObject(transform);
      cameraFrustum.setFromProjectionMatrix(
        dummyMat.multiplyMatrices(
          gl.camera.projectionMatrix,
          gl.camera.matrixWorldInverse,
        ),
      );

      if (!cameraFrustum.intersectsBox(playerBox) || lerping) {
        if (cameraLerpVector.distanceTo(gl.camera.position) < 1) {
          cameraLerpVector.copy(transform.position).add(cameraOffset);
          lerping = false;
        } else {
          cameraLerpVector.copy(transform.position).add(cameraOffset);

          gl.camera.position.lerp(
            cameraLerpVector,
            Time.delta * cameraFollowSpeed,
          );
          lerping = true;
        }
      }
    },
  };
}
