import { Time, World } from "@jael-ecs/core";
import { Frustum, Matrix4, Vector3, type Group } from "three";
import { type GLState } from "../mount3";

export default function CameraSystem(world: World) {
  const playerQuery = world.include("isPlayer");
  const engine = world.include("isEngine").entities[0];

  const cameraOffset = new Vector3(0, 50, 20);
  const cameraLerpVector = new Vector3();
  const cameraFrustum = new Frustum();
  const playerOffset = new Vector3();
  const playerDirection = new Vector3();
  const dummyMat = new Matrix4();
  const cameraFollowSpeed = 7;
  let lerping = false;

  return () => {
    if (playerQuery.size() <= 0) return;

    const gl = engine.getComponent<GLState>("gl");
    const player = playerQuery.entities[0];
    const transform = player.getComponent<Group>("transform");

    if (!gl || !transform) return;

    transform.getWorldDirection(playerDirection);
    playerOffset
      .copy(transform.position)
      .add(playerDirection)
      .multiplyScalar(1.5);
    playerOffset.y = 0;
    cameraFrustum.setFromProjectionMatrix(
      dummyMat.multiplyMatrices(
        gl.camera.projectionMatrix,
        gl.camera.matrixWorldInverse,
      ),
    );

    if (!cameraFrustum.containsPoint(playerOffset) || lerping) {
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
  };
}
