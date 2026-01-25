import { Time } from "@jael-ecs/core";
import { WebGLRenderer, Scene, PerspectiveCamera } from "three";

export interface GLState {
  camera: PerspectiveCamera;
  scene: Scene;
  gl: WebGLRenderer;
}

export function initWebGL(canvas: HTMLCanvasElement): GLState {
  const width: number = window.innerWidth;
  const height: number = window.innerHeight;

  const camera = new PerspectiveCamera(35, width / height, 0.1, 1000);
  const scene = new Scene();
  const gl = new WebGLRenderer({ antialias: true, canvas });
  gl.setSize(width, height);
  gl.shadowMap.enabled = true;

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    gl.setSize(window.innerWidth, window.innerHeight, true);
    gl.render(scene, camera); // Avoid white flashes
  }

  const observer: ResizeObserver = new ResizeObserver(onResize);
  observer.observe(document.body);

  Time.on("update", () => {
    gl.render(scene, camera);
  });

  return { camera, scene, gl };
}
