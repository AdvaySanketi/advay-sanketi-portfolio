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

/**
 * A brilliant-cut diamond that refracts a lit scene.
 *
 * Three things make a gem read as a gem rather than a lump of glass:
 *
 *   1. **The cut.** A real silhouette — table, crown, girdle, pavilion — with
 *      flat normals so every facet stays razor-edged. See `brilliantCut.ts`.
 *   2. **Refraction through the whole solid**, not just its front face. Handled
 *      by the three-pass setup in `refraction.ts`.
 *   3. **Something bright to refract.** A stone is dark; what you see inside it
 *      is the world behind, bent and split. Against a pale, low-contrast
 *      backdrop there is nothing for the facets to catch and it goes flat and
 *      grey.
 *
 * The backdrop is therefore a real mesh sitting behind the stone on layer 0 —
 * but layer 0 is only ever rendered into the environment buffer, never to the
 * canvas. So the page's paper still shows around the silhouette, and the dark
 * field with its luminous type exists only *inside* the stone.
 */

/**
 * The environment layer is intentionally empty: the stone refracts nothing but
 * its own light, so it reads as black with the fire from the culet inside it.
 *
 * The pass that fills the environment buffer is still here, and still costs
 * almost nothing when there is nothing on the layer to draw. To give the stone
 * a world again, put any mesh on `ENV_LAYER` — `gemBackdrop.ts` still holds the
 * studio-lit backdrop and is one line away from being used again.
 */

/**
 * Layer the environment is drawn on, the layer the stone is on, and the layer
 * its escaping light is on. The environment layer never reaches the canvas; the
 * other two are drawn to it together.
 */
const ENV_LAYER = 0;
const GEM_LAYER = 1;
const SPILL_LAYER = 2;
/**
 * Facet edges. Deliberately not on the stone's own layer: that layer is drawn
 * into the backface buffer, and a wireframe in there would corrupt the normals
 * the refraction reads back.
 */
const EDGE_LAYER = 3;

/**
 * Local position of the stone's tip, matching `pavilionDepth` in the cut. A
 * marker is parented to the mesh here so the light's screen position can be
 * read straight off the transform, rotation and pointer-tilt included.
 */
const CULET_LOCAL = new Vector3(0, -1.02, 0);

function Gem() {
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
  const spillRef = useRef<Mesh>(null);
  const edgeRef = useRef<Mesh>(null);
  const culetRef = useRef<Object3D>(null);
  const culetWorld = useMemo(() => new Vector3(), []);

  /** 1 while the pointer is over the stone; the shine eases toward it. */
  const hoverRef = useRef(0);

  const size = useThree((state) => state.size);
  const ratio = useThree((state) => state.viewport.dpr);

  const geometry = useMemo(() => createBrilliantCut({ segments: 8 }), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // Buffers and materials are rebuilt when the canvas resizes, because both the
  // targets and the shader's `resolution` are in drawing-buffer pixels.
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

  // The stone and its halo are moved off the default layer so the environment
  // can be rendered apart from them.
  useEffect(() => {
    meshRef.current?.layers.set(GEM_LAYER);
    spillRef.current?.layers.set(SPILL_LAYER);
    edgeRef.current?.layers.set(EDGE_LAYER);
  }, []);

  /**
   * Priority > 0 takes rendering over from the reconciler, which is required:
   * the frame is three passes, and only the last of them goes to the canvas.
   */
  useFrame(({ gl, scene, camera, pointer }, delta) => {
    const group = groupRef.current;
    const mesh = meshRef.current;
    if (!group || !mesh) return;

    mesh.rotation.y += delta * 0.4;

    // Ease the whole stone toward the pointer, on top of a fixed tilt that
    // keeps the table and the pavilion point both visible.
    const targetX = 0.34 + pointer.y * 0.28;
    const targetY = pointer.x * 0.4;
    const step = Math.min(1, delta * 2.5);
    group.rotation.x += (targetX - group.rotation.x) * step;
    group.rotation.y += (targetY - group.rotation.y) * step;

    // Where the light sits, in the same screen-space frame the shader samples
    // the environment in. Projected after the transforms above so it tracks the
    // tip exactly as the stone turns, and shared with the halo so both are
    // anchored to one source.
    const culet = culetRef.current;
    if (culet) {
      culet.updateWorldMatrix(true, false);
      culetWorld.setFromMatrixPosition(culet.matrixWorld).project(camera);
      const uv = [culetWorld.x * 0.5 + 0.5, culetWorld.y * 0.5 + 0.5];
      refractionMaterial.uniforms.culet.value = uv;
      spillMaterial.uniforms.culet.value = uv;
    }

    // Ease the shine rather than switching it, so hovering swells the light on
    // and off instead of snapping.
    const shine = refractionMaterial.uniforms.shine.value as number;
    const eased = shine + (hoverRef.current - shine) * Math.min(1, delta * 3.4);
    refractionMaterial.uniforms.shine.value = eased;
    spillMaterial.uniforms.shine.value = eased;

    refractionMaterial.uniforms.time.value += delta;
    spillMaterial.uniforms.time.value += delta;

    gl.autoClear = false;

    // 1. The world behind the stone.
    camera.layers.set(ENV_LAYER);
    gl.setRenderTarget(envFbo);
    gl.clear();
    gl.render(scene, camera);

    // 2. The stone's far side, as normals.
    mesh.material = backfaceMaterial;
    camera.layers.set(GEM_LAYER);
    gl.setRenderTarget(backfaceFbo);
    gl.clear();
    gl.render(scene, camera);

    // 3. The stone and its halo, to the canvas. Layer 0 is deliberately not
    // drawn here — the backdrop must stay inside the gem, not behind it on the
    // page. The stone is opaque and draws first, so its depth clips the halo
    // back to the area outside the silhouette.
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
      {/* Centred on the girdle-to-culet span rather than the origin. */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={refractionMaterial}
        scale={1.32}
        position={[0, 0.36, 0]}
        onPointerOver={() => (hoverRef.current = 1)}
        onPointerOut={() => (hoverRef.current = 0)}
      >
        {/* The light source itself: no geometry, just a point the shader
            tracks. It rides the mesh, so it stays pinned to the tip. */}
        <object3D ref={culetRef} position={CULET_LOCAL} />

        {/* Facet edges. A child of the stone, so it inherits the turn without
            being re-animated, and depth-tested against it, so only the edges on
            the face toward the camera are drawn. */}
        <mesh ref={edgeRef} geometry={geometry} scale={1.004}>
          {/* Low opacity on purpose: against a lifted interior rather than
              pure black, heavier lines read as a wireframe model. */}
          <meshBasicMaterial
            color="#14140f"
            wireframe
            transparent
            opacity={0.18}
            depthWrite={false}
          />
        </mesh>
      </mesh>

      {/* The escaping light. Sits behind the stone so the stone's own depth
          clips it, and covers the frame because its shader works in screen
          space — the quad's size only has to be big enough not to clip. */}
      <mesh ref={spillRef} material={spillMaterial} position={[0, 0, -1]}>
        <planeGeometry args={[9, 9]} />
      </mesh>

      {/* Nothing on ENV_LAYER: the environment buffer stays black, so the stone
          has only its own light to refract. See the note above the layers. */}
    </group>
  );
}

export default function GemScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 4], fov: 42 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
      onCreated={(state) => {
        state.gl.setClearColor(new Color(0x000000), 0);
        // The stone lives on layer 1, and a raycaster only tests layer 0 by
        // default — without this it is never hit and hover never fires.
        state.raycaster.layers.enableAll();
      }}
    >
      <Gem />
    </Canvas>
  );
}
