"use client";

// @aethel-heavy-async-boundary: destruction mesh surface loads only in Studio physics/editor surfaces.
import React, { useCallback, useMemo, useRef, useState } from "react";
import { ThreeEvent } from "@react-three/fiber";
import { Html as DreiHtml } from "@react-three/drei";
import * as THREE from "three";
import { Heart } from "lucide-react";

import { DestructibleConfig, VoronoiFractureGenerator } from "@/lib/destruction-system";
import type {
  DestructionToolType,
  FracturePattern,
  ImpactPoint,
} from "@/components/physics/DestructionEditor.model";

interface DestructibleMesh3DProps {
  config: DestructibleConfig;
  pattern: FracturePattern;
  fragments: THREE.Mesh[];
  showPreview: boolean;
  impactPoint: ImpactPoint | null;
  onImpactClick: (point: ImpactPoint) => void;
  selectedTool: DestructionToolType;
  health: number;
  maxHealth: number;
}

export function DestructibleMesh3D({
  config,
  pattern,
  fragments,
  showPreview,
  impactPoint,
  onImpactClick,
  selectedTool,
  health,
  maxHealth,
}: DestructibleMesh3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hoverPoint, setHoverPoint] = useState<THREE.Vector3 | null>(null);
  const [isExploded, setIsExploded] = useState(false);

  // Original mesh geometry
  const originalGeometry = useMemo(() => {
    return new THREE.BoxGeometry(2, 2, 2);
  }, []);

  // Generate fracture preview
  const fracturePreview = useMemo(() => {
    if (!showPreview) return null;

    const generator = new VoronoiFractureGenerator(42);
    const bounds = new THREE.Box3(
      new THREE.Vector3(-1, -1, -1),
      new THREE.Vector3(1, 1, 1),
    );

    const pointCount = config.fragmentCount;
    const points = generator.generatePoints(bounds, pointCount);
    const cells = generator.generateCells(points, bounds);

    return cells.map((cell, index) => {
      const geometry = generator.cellToGeometry(cell);
      const color = new THREE.Color().setHSL(index / cells.length, 0.7, 0.5);
      return { geometry, color, center: cell.center };
    });
  }, [showPreview, config.fragmentCount]);

  // Handle pointer events for impact point selection
  const handlePointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (selectedTool !== "impact") return;

      const point = event.point.clone();
      setHoverPoint(point);
    },
    [selectedTool],
  );

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (selectedTool !== "impact") return;

      event.stopPropagation();

      const point = event.point.clone();
      const normal = event.face?.normal?.clone() || new THREE.Vector3(0, 1, 0);

      // Transform normal to world space
      if (meshRef.current) {
        normal.applyQuaternion(meshRef.current.quaternion);
      }

      onImpactClick({
        position: point,
        normal: normal.normalize(),
        force: 100, // Default force
      });
    },
    [selectedTool, onImpactClick],
  );

  // Health bar color
  const healthPercent = health / maxHealth;
  const healthColor =
    healthPercent > 0.6
      ? "var(--aethel-success)"
      : healthPercent > 0.3
        ? "var(--aethel-warning)"
        : "var(--aethel-error)";

  return (
    <group>
      {/* Original mesh or fragments */}
      {!isExploded ? (
        <mesh
          ref={meshRef}
          geometry={originalGeometry}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverPoint(null)}
          onClick={handleClick}
        >
          <meshStandardMaterial
            color={0x4a6fa5}
            metalness={0.2}
            roughness={0.8}
            transparent={showPreview}
            opacity={showPreview ? 0.3 : 1}
          />
        </mesh>
      ) : (
        fragments.map((fragment, i) => <primitive key={i} object={fragment} />)
      )}

      {/* Fracture preview overlay */}
      {showPreview &&
        fracturePreview &&
        fracturePreview.map((cell, index) => (
          <mesh key={index} geometry={cell.geometry} position={cell.center}>
            <meshStandardMaterial
              color={cell.color}
              transparent
              opacity={0.7}
              wireframe
            />
          </mesh>
        ))}

      {/* Hover indicator for impact tool */}
      {hoverPoint && selectedTool === "impact" && (
        <group position={hoverPoint}>
          <mesh>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshBasicMaterial color={0xff0000} />
          </mesh>
          <mesh>
            <ringGeometry args={[0.15, 0.2, 32]} />
            <meshBasicMaterial color={0xff0000} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {/* Impact point marker */}
      {impactPoint && (
        <group position={impactPoint.position}>
          <mesh>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshBasicMaterial color={0xff4444} />
          </mesh>
          {/* Arrow showing impact direction */}
          <arrowHelper
            args={[
              impactPoint.normal.clone().negate(),
              new THREE.Vector3(0, 0, 0),
              0.5,
              0xff4444,
            ]}
          />
          <DreiHtml position={[0.3, 0.3, 0]}>
            <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_90%,transparent)] px-2 py-1 rounded text-xs text-[var(--aethel-text-primary)] whitespace-nowrap">
              Impact: {impactPoint.force.toFixed(0)} N
            </div>
          </DreiHtml>
        </group>
      )}

      {/* Health bar above mesh */}
      <DreiHtml position={[0, 1.8, 0]} center>
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1 text-xs text-[var(--aethel-text-primary)]">
            <Heart className="w-3 h-3" style={{ color: healthColor }} />
            <span>
              {health.toFixed(0)} / {maxHealth}
            </span>
          </div>
          <div className="w-24 h-1.5 bg-[var(--aethel-surface-tertiary)] rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${healthPercent * 100}%`,
                backgroundColor: healthColor,
              }}
            />
          </div>
        </div>
      </DreiHtml>
    </group>
  );
}
