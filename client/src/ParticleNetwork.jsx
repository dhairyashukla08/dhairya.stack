import { useEffect, useRef } from "react";
import * as THREE from "three";

function themeColor(varName, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return new THREE.Color(v || fallback);
}

// Ambient drifting dots that draw a line between any two that happen to be close —
// reads as a "network" without being literal about it. Sits behind the hero content.
export default function ParticleNetwork() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 60;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const COUNT = 60;
    const LINK_DIST = 17;
    const positions = new Float32Array(COUNT * 3);
    const velocities = [];
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 55;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 35;
      velocities.push(
        reduce
          ? { x: 0, y: 0, z: 0 }
          : {
              x: (Math.random() - 0.5) * 0.045,
              y: (Math.random() - 0.5) * 0.045,
              z: (Math.random() - 0.5) * 0.045,
            }
      );
    }

    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const dotMat = new THREE.PointsMaterial({
      color: themeColor("--lilac", "#a89bff"),
      size: 1.5,
      transparent: true,
      opacity: 0.75,
    });
    const points = new THREE.Points(dotGeo, dotMat);
    scene.add(points);

    const maxLines = (COUNT * (COUNT - 1)) / 2;
    const linePositions = new Float32Array(maxLines * 6);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: themeColor("--amber", "#ffb454"),
      transparent: true,
      opacity: 0.16,
    });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lines);

    const onThemeChange = () => {
      dotMat.color.copy(themeColor("--lilac", "#a89bff"));
      lineMat.color.copy(themeColor("--amber", "#ffb454"));
    };
    window.addEventListener("theme-changed", onThemeChange);

    let mouseX = 0, mouseY = 0;
    const onMouseMove = (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    if (!reduce) window.addEventListener("pointermove", onMouseMove);

    const posAttr = dotGeo.attributes.position;
    const arr = posAttr.array;

    const renderFrame = () => {
      for (let i = 0; i < COUNT; i++) {
        arr[i * 3] += velocities[i].x;
        arr[i * 3 + 1] += velocities[i].y;
        arr[i * 3 + 2] += velocities[i].z;
        if (Math.abs(arr[i * 3]) > 50) velocities[i].x *= -1;
        if (Math.abs(arr[i * 3 + 1]) > 28) velocities[i].y *= -1;
        if (Math.abs(arr[i * 3 + 2]) > 18) velocities[i].z *= -1;
      }
      posAttr.needsUpdate = true;

      let idx = 0;
      for (let i = 0; i < COUNT; i++) {
        for (let j = i + 1; j < COUNT; j++) {
          const dx = arr[i * 3] - arr[j * 3];
          const dy = arr[i * 3 + 1] - arr[j * 3 + 1];
          const dz = arr[i * 3 + 2] - arr[j * 3 + 2];
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d < LINK_DIST && idx < maxLines) {
            linePositions[idx * 6] = arr[i * 3];
            linePositions[idx * 6 + 1] = arr[i * 3 + 1];
            linePositions[idx * 6 + 2] = arr[i * 3 + 2];
            linePositions[idx * 6 + 3] = arr[j * 3];
            linePositions[idx * 6 + 4] = arr[j * 3 + 1];
            linePositions[idx * 6 + 5] = arr[j * 3 + 2];
            idx++;
          }
        }
      }
      lineGeo.setDrawRange(0, idx * 2);
      lineGeo.attributes.position.needsUpdate = true;

      camera.position.x += (mouseX * 7 - camera.position.x) * 0.02;
      camera.position.y += (-mouseY * 4 - camera.position.y) * 0.02;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };

    renderFrame();
    let raf;
    if (!reduce) {
      const loop = () => {
        renderFrame();
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMouseMove);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("theme-changed", onThemeChange);
      dotGeo.dispose();
      dotMat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="particle-net" aria-hidden="true" />;
}