"use client";

import { useRef, useState, Suspense } from "react";
import { Canvas, useFrame, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";

interface PlanetMeshProps {
  spinning: boolean;
  onTap: () => void;
}

function PlanetMesh({ spinning, onTap }: PlanetMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const velocityY = useRef(0);
  const velocityX = useRef(0);
  const idleSpeed = useRef(0.003);
  const burstRef = useRef(0);

  const dragging = useRef(false);
  const dragDistance = useRef(0);
  const lastPointer = useRef({ x: 0, y: 0 });
  const pointerDown = useRef({ x: 0, y: 0 });

  useFrame(() => {
    if (!meshRef.current) return;

    // Decay burst
    if (burstRef.current > 0) burstRef.current *= 0.93;

    // Apply idle rotation + momentum
    if (!dragging.current) {
      meshRef.current.rotation.y += idleSpeed.current + burstRef.current;
      meshRef.current.rotation.x += velocityX.current;
      meshRef.current.rotation.y += velocityY.current;

      // Friction / inertia decay
      velocityX.current *= 0.94;
      velocityY.current *= 0.94;

      // Clamp tiny values
      if (Math.abs(velocityX.current) < 0.0001) velocityX.current = 0;
      if (Math.abs(velocityY.current) < 0.0001) velocityY.current = 0;
    }
  });

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragging.current = true;
    dragDistance.current = 0;
    pointerDown.current = { x: e.clientX, y: e.clientY };
    lastPointer.current = { x: e.clientX, y: e.clientY };
    velocityX.current = 0;
    velocityY.current = 0;
  };

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging.current || !meshRef.current) return;
    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    dragDistance.current += Math.abs(dx) + Math.abs(dy);
    meshRef.current.rotation.y += dx * 0.005;
    meshRef.current.rotation.x += dy * 0.005;
    velocityY.current = dx * 0.005;
    velocityX.current = dy * 0.005;
    lastPointer.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging.current) return;
    dragging.current = false;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);

    // Only trigger click if it was a tap (not a drag)
    if (dragDistance.current < 8) {
      burstRef.current = 0.15;
      onTap();
    }
  };

  // Subtle scale pulse during spin burst
  const scale = spinning ? 1.04 : 1;

  return (
    <mesh
      ref={meshRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      scale={scale}
    >
      <sphereGeometry args={[1.4, 64, 64]} />
      <meshStandardMaterial
        color="#0a0818"
        roughness={0.4}
        metalness={0.6}
        emissive="#1a0f2e"
        emissiveIntensity={0.15}
      />
    </mesh>
  );
}

function GlowSphere() {
  return (
    <mesh scale={1.55}>
      <sphereGeometry args={[1.4, 32, 32]} />
      <meshBasicMaterial
        color="#5a4090"
        transparent
        opacity={0.06}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

export default function Planet3D({ onSpin }: { onSpin: () => void }) {
  const [spinning, setSpinning] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);

  const handleTap = () => {
    setSpinning(true);
    onSpin();
    setTimeout(() => setSpinning(false), 900);
  };

  if (webglFailed) {
    return null; // Parent component will render CSS fallback
  }

  return (
    <div className="w-40 h-40 sm:w-44 sm:h-44" style={{ cursor: "grab", touchAction: "none" }}>
      <Suspense fallback={null}>
        <Canvas
          camera={{ position: [0, 0, 4], fov: 45 }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          dpr={[1, 2]}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
          }}
          onError={() => setWebglFailed(true)}
        >
          {/* Lighting */}
          <ambientLight intensity={0.25} color="#8a7ac0" />
          <directionalLight position={[3, 2, 4]} intensity={1.1} color="#c9b8ff" />
          <directionalLight position={[-3, -1, 2]} intensity={0.3} color="#6b4c9f" />
          <pointLight position={[0, 0, 3]} intensity={0.4} color="#a890ff" />

          {/* Atmosphere glow */}
          <GlowSphere />

          {/* The planet */}
          <PlanetMesh spinning={spinning} onTap={handleTap} />
        </Canvas>
      </Suspense>
    </div>
  );
}
