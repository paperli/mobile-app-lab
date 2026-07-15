import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

/**
 * The Game Master: a low-poly, glowing "ghost-flame" globe rendered in a 3D dark
 * scene with drifting particles and bloom. It lives as a single full-bleed canvas
 * behind the Studio content; the `variant` moves + resizes it (hero → thinking →
 * corner) with a smooth lerp so it flows between screens.
 */
export type GlobeVariant = 'hero' | 'thinking' | 'corner';

// Screen placement per variant: nx/ny are viewport fractions (−1..1 from center),
// scale is the globe radius in world units, spark scales the particle volume.
const VARIANTS: Record<GlobeVariant, { nx: number; ny: number; scale: number; spark: number }> = {
  hero: { nx: -0.42, ny: 0.04, scale: 1.55, spark: 5 },
  thinking: { nx: 0, ny: 0.26, scale: 1.15, spark: 4 },
  corner: { nx: 0.85, ny: -0.62, scale: 0.38, spark: 1.5 },
};

const FLAME = new THREE.Color('#3df5cf'); // ethereal teal-green ghost flame
const FLAME_DEEP = new THREE.Color('#0a5f63'); // dark facet base

function FlameGlobe({ variant, listening }: { variant: GlobeVariant; listening: boolean }) {
  const { viewport } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  // Low-poly icosahedron; keep the base vertex positions to drive the flicker.
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 2), []);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array), [geo]);
  const initialized = useRef(false);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const v = VARIANTS[variant];
    const g = groupRef.current;
    if (g) {
      const targetX = (v.nx * viewport.width) / 2;
      const targetY = (v.ny * viewport.height) / 2;
      const targetScale = v.scale * (listening ? 1.08 : 1);
      if (!initialized.current) {
        g.position.set(targetX, targetY, 0);
        g.scale.setScalar(targetScale);
        initialized.current = true;
      } else {
        g.position.x += (targetX - g.position.x) * 0.08;
        g.position.y += (targetY - g.position.y) * 0.08;
        const s = g.scale.x + (targetScale - g.scale.x) * 0.08;
        g.scale.setScalar(s);
      }
      g.rotation.y = t * 0.25;
      g.rotation.x = Math.sin(t * 0.3) * 0.15;
    }

    // Flame flicker: push each vertex in/out along its direction with layered noise.
    const amp = listening ? 0.22 : 0.13;
    const speed = listening ? 4 : 2.4;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const bx = base[i * 3];
      const by = base[i * 3 + 1];
      const bz = base[i * 3 + 2];
      const wob =
        Math.sin(t * speed + bx * 4) *
        Math.sin(t * speed * 0.8 + by * 4) *
        Math.cos(t * speed * 0.9 + bz * 4);
      const f = 1 + amp * wob;
      pos.setXYZ(i, bx * f, by * f, bz * f);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  });

  const emissiveIntensity = listening ? 1.7 : 1.2;
  const v = VARIANTS[variant];

  return (
    <group ref={groupRef}>
      {/* Faceted flame core */}
      <mesh geometry={geo}>
        <meshStandardMaterial
          color={FLAME_DEEP}
          emissive={FLAME}
          emissiveIntensity={emissiveIntensity}
          flatShading
          roughness={0.35}
          metalness={0.15}
        />
      </mesh>
      {/* Soft additive halo shell — the "shine" that bleeds into the dark */}
      <mesh scale={1.5}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color={FLAME}
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>
      {/* Colored light so the low-poly facets read + the scene picks up the glow */}
      <pointLight color={FLAME} intensity={listening ? 40 : 26} distance={30} decay={1.4} />
      {/* Fantasy particle field drifting very gently around the globe */}
      <Sparkles count={70} scale={v.spark} size={4} speed={0.05} color="#9ef9ff" opacity={0.9} noise={0.25} />
    </group>
  );
}

/**
 * `mode` controls layering:
 *  - 'background' — opaque 3D dark scene behind the content (creation screens),
 *    with bloom for a rich glow.
 *  - 'overlay' — a transparent canvas floating *on top* of the game as a small
 *    "you're in dev mode" indicator; `dim` fades it (full when developing).
 */
export function GameMasterGlobe({
  variant,
  listening = false,
  mode = 'background',
  dim = 1,
}: {
  variant: GlobeVariant;
  listening?: boolean;
  mode?: 'background' | 'overlay';
  dim?: number;
}) {
  const overlay = mode === 'overlay';
  return (
    <Canvas
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: overlay ? 6 : 0,
        opacity: dim,
        pointerEvents: 'none',
        transition: 'opacity 600ms ease',
      }}
      camera={{ position: [0, 0, 6], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: overlay }}
    >
      {!overlay && <color attach="background" args={['#07050f']} />}
      {!overlay && <fog attach="fog" args={['#07050f', 7, 17]} />}
      <ambientLight intensity={0.18} />
      <FlameGlobe variant={variant} listening={listening} />
      {!overlay && (
        <EffectComposer>
          <Bloom intensity={1.05} luminanceThreshold={0.22} luminanceSmoothing={0.55} mipmapBlur radius={0.7} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
