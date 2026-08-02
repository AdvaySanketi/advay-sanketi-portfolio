"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Color,
  Object3D,
  Vector3,
  WebGLRenderTarget,
  type Group,
  type Mesh,
} from "three";

import { createBrilliantCut } from "@/components/effects/brilliantCut";
import {
  BackfaceMaterial,
  RefractionMaterial,
  SpillMaterial,
} from "@/components/effects/refraction";

const ENV_LAYER = 0;
const GEM_LAYER = 1;
const SPILL_LAYER = 2;
const EDGE_LAYER = 3;

const CULET_LOCAL = new Vector3(0, -1.02, 0);

function Gem() {
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
  const spillRef = useRef<Mesh>(null);
  const edgeRef = useRef<Mesh>(null);
  const culetRef = useRef<Object3D>(null);
  const culetWorld = useMemo(() => new Vector3(), []);

  const hoverRef = useRef(0);

  const size = useThree((state) => state.size);
  const ratio = useThree((state) => state.viewport.dpr);

  const geometry = useMemo(() => createBrilliantCut({ segments: 8 }), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const [envFbo, backfaceFbo, backfaceMaterial, refractionMaterial, spillMaterial] =
    useMemo(() => {
      const width = Math.max(1, Math.floor(size.width * ratio));
      const height = Math.max(1, Math.floor(size.height * ratio));

      const env = new WebGLRenderTarget(width, height);
      const back = new WebGLRenderTarget(width, height);

      return [
        env,
        back,
        new BackfaceMaterial(),
        new RefractionMaterial({
          envMap: env.texture,
          backfaceMap: back.texture,
          resolution: [width, height],
        }),
        new SpillMaterial({ resolution: [width, height] }),
      ] as const;
    }, [size.width, size.height, ratio]);

  useEffect(
    () => () => {
      envFbo.dispose();
      backfaceFbo.dispose();
      backfaceMaterial.dispose();
      refractionMaterial.dispose();
      spillMaterial.dispose();
    },
    [envFbo, backfaceFbo, backfaceMaterial, refractionMaterial, spillMaterial]
  );

  useEffect(() => {
    meshRef.current?.layers.set(GEM_LAYER);
    spillRef.current?.layers.set(SPILL_LAYER);
    edgeRef.current?.layers.set(EDGE_LAYER);
  }, []);

  useFrame(({ gl, scene, camera, pointer }, delta) => {
    const group = groupRef.current;
    const mesh = meshRef.current;
    if (!group || !mesh) return;

    mesh.rotation.y += delta * 0.4;

    const targetX = 0.34 + pointer.y * 0.28;
    const targetY = pointer.x * 0.4;
    const step = Math.min(1, delta * 2.5);
    group.rotation.x += (targetX - group.rotation.x) * step;
    group.rotation.y += (targetY - group.rotation.y) * step;

    const culet = culetRef.current;
    if (culet) {
      culet.updateWorldMatrix(true, false);
      culetWorld.setFromMatrixPosition(culet.matrixWorld).project(camera);
      const uv = [culetWorld.x * 0.5 + 0.5, culetWorld.y * 0.5 + 0.5];
      refractionMaterial.uniforms.culet.value = uv;
      spillMaterial.uniforms.culet.value = uv;
    }

    const shine = refractionMaterial.uniforms.shine.value as number;
    const eased = shine + (hoverRef.current - shine) * Math.min(1, delta * 3.4);
    refractionMaterial.uniforms.shine.value = eased;
    spillMaterial.uniforms.shine.value = eased;

    refractionMaterial.uniforms.time.value += delta;
    spillMaterial.uniforms.time.value += delta;

    gl.autoClear = false;

    camera.layers.set(ENV_LAYER);
    gl.setRenderTarget(envFbo);
    gl.clear();
    gl.render(scene, camera);

    mesh.material = backfaceMaterial;
    camera.layers.set(GEM_LAYER);
    gl.setRenderTarget(backfaceFbo);
    gl.clear();
    gl.render(scene, camera);

    mesh.material = refractionMaterial;
    camera.layers.enable(SPILL_LAYER);
    camera.layers.enable(EDGE_LAYER);
    gl.setRenderTarget(null);
    gl.clear();
    gl.render(scene, camera);

    camera.layers.set(ENV_LAYER);
  }, 1);

  return (
    <group ref={groupRef} rotation={[0.34, 0, 0]}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={refractionMaterial}
        scale={1.32}
        position={[0, 0.36, 0]}
        onPointerOver={() => (hoverRef.current = 1)}
        onPointerOut={() => (hoverRef.current = 0)}
      >
        <object3D ref={culetRef} position={CULET_LOCAL} />

        <mesh ref={edgeRef} geometry={geometry} scale={1.004}>
          <meshBasicMaterial
            color="#14140f"
            wireframe
            transparent
            opacity={0.18}
            depthWrite={false}
          />
        </mesh>
      </mesh>

      <mesh ref={spillRef} material={spillMaterial} position={[0, 0, -1]}>
        <planeGeometry args={[9, 9]} />
      </mesh>
    </group>
  );
}

export default function GemScene({ lowPower }: { lowPower?: boolean }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 4], fov: 42 }}
      dpr={lowPower ? [1, 1.25] : [1, 1.75]}
      gl={{
        antialias: !lowPower,
        alpha: true,
        powerPreference: "high-performance",
      }}
      style={{ background: "transparent" }}
      onCreated={(state) => {
        state.gl.setClearColor(new Color(0x000000), 0);
        state.raycaster.layers.enableAll();
      }}
    >
      <Gem />
    </Canvas>
  );
}
