import { useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * A celebratory scene for the created-game preview: a big low-poly gold trophy
 * that slowly, constantly spins (with a slight 3D tilt), plus confetti drifting
 * down with random tumbling rotation. Transparent canvas so it floats over the
 * preview. No postprocessing → composites cleanly with alpha.
 */
function Trophy({ spin = 'slow', scale = 1 }: { spin?: 'slow' | 'celebrate'; scale?: number }) {
  const group = useRef<THREE.Group>(null);
  // Angular velocity — 'celebrate' starts fast and eases down to the slow rate.
  const SLOW = 0.5;
  const vel = useRef(spin === 'celebrate' ? 7 : SLOW);
  const gold = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#f7c948',
        emissive: '#3a2600',
        emissiveIntensity: 0.5,
        metalness: 0.5,
        roughness: 0.3,
        flatShading: true,
      }),
    [],
  );

  useFrame((_, dt) => {
    if (!group.current) return;
    vel.current += (SLOW - vel.current) * Math.min(1, dt * 1.1); // ease toward slow, keep spinning
    group.current.rotation.y += vel.current * dt;
  });

  return (
    // Slight fixed tilt in 3D; the y-rotation is animated on top of this.
    <group ref={group} rotation={[0.16, 0, 0.05]} position={[0, -0.35, 0]} scale={scale}>
      {/* Cup bowl */}
      <mesh material={gold} position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.72, 0.4, 0.9, 8]} />
      </mesh>
      {/* Rim */}
      <mesh material={gold} position={[0, 1.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.72, 0.07, 6, 8]} />
      </mesh>
      {/* Handles */}
      <mesh material={gold} position={[-0.78, 1.05, 0]}>
        <torusGeometry args={[0.26, 0.07, 6, 10]} />
      </mesh>
      <mesh material={gold} position={[0.78, 1.05, 0]}>
        <torusGeometry args={[0.26, 0.07, 6, 10]} />
      </mesh>
      {/* Stem */}
      <mesh material={gold} position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.42, 8]} />
      </mesh>
      {/* Base disc */}
      <mesh material={gold} position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.42, 0.52, 0.16, 8]} />
      </mesh>
      {/* Plinth */}
      <mesh material={gold} position={[0, 0.0, 0]}>
        <cylinderGeometry args={[0.62, 0.62, 0.18, 8]} />
      </mesh>
    </group>
  );
}

const CONFETTI_COLORS = ['#FFDA0A', '#3df5cf', '#ff6ec7', '#8b5cf6', '#ffffff', '#4ea8ff'];

function Confetti({ count = 80 }: { count?: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 8,
        y: Math.random() * 9 - 4,
        z: (Math.random() - 0.5) * 3,
        rx: Math.random() * Math.PI,
        ry: Math.random() * Math.PI,
        rz: Math.random() * Math.PI,
        rsx: (Math.random() - 0.5) * 1.8,
        rsy: (Math.random() - 0.5) * 1.8,
        rsz: (Math.random() - 0.5) * 1.8,
        fall: 0.5 + Math.random() * 0.6,
        size: 0.09 + Math.random() * 0.08,
      })),
    [count],
  );

  // Per-piece color (once).
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      c.set(CONFETTI_COLORS[i % CONFETTI_COLORS.length]);
      mesh.current.setColorAt(i, c);
    }
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [count]);

  useFrame((_, dt) => {
    if (!mesh.current) return;
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      p.y -= p.fall * dt;
      if (p.y < -4) p.y = 5;
      p.rx += p.rsx * dt;
      p.ry += p.rsy * dt;
      p.rz += p.rsz * dt;
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.rx, p.ry, p.rz);
      dummy.scale.setScalar(p.size);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial side={THREE.DoubleSide} roughness={0.6} metalness={0.1} emissiveIntensity={0.2} />
    </instancedMesh>
  );
}

export function Trophy3D({ spin = 'slow', scale = 1 }: { spin?: 'slow' | 'celebrate'; scale?: number }) {
  return (
    <Canvas
      style={{ width: '100%', height: '100%' }}
      camera={{ position: [0, 0.4, 5], fov: 42 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 5, 4]} intensity={2.2} color="#fff4d6" />
      <pointLight position={[-4, 1, 3]} intensity={30} color="#7ec8ff" distance={20} decay={1.5} />
      <pointLight position={[3, -1, 2]} intensity={18} color="#ffd76a" distance={20} decay={1.5} />
      <Confetti />
      <Trophy spin={spin} scale={scale} />
    </Canvas>
  );
}
