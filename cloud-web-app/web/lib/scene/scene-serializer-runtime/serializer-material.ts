// @aethel-heavy-async-boundary Studio material serialization helpers.
import * as THREE from 'three';
import type { ColorSerialized, MaterialSerialized } from './types';

function serializeColor(c: THREE.Color): ColorSerialized {
  return { r: c.r, g: c.g, b: c.b };
}

export function serializeMaterial(material: THREE.Material): MaterialSerialized {
  const base: Partial<MaterialSerialized> = {
    opacity: material.opacity,
    transparent: material.transparent,
    wireframe: (material as THREE.MeshBasicMaterial).wireframe || false,
    side: material.side === THREE.FrontSide ? 'front' : material.side === THREE.BackSide ? 'back' : 'double',
  };

  if (material instanceof THREE.MeshStandardMaterial) {
    return {
      ...base,
      type: 'standard',
      color: serializeColor(material.color),
      metalness: material.metalness,
      roughness: material.roughness,
      emissive: serializeColor(material.emissive),
      emissiveIntensity: material.emissiveIntensity,
      envMapIntensity: material.envMapIntensity,
      flatShading: material.flatShading,
    } as MaterialSerialized;
  }

  if (material instanceof THREE.MeshPhysicalMaterial) {
    return {
      ...base,
      type: 'physical',
      color: serializeColor(material.color),
      metalness: material.metalness,
      roughness: material.roughness,
      emissive: serializeColor(material.emissive),
      emissiveIntensity: material.emissiveIntensity,
      envMapIntensity: material.envMapIntensity,
      flatShading: material.flatShading,
    } as MaterialSerialized;
  }

  if (material instanceof THREE.MeshPhongMaterial) {
    return {
      ...base,
      type: 'phong',
      color: serializeColor(material.color),
      emissive: serializeColor(material.emissive),
      emissiveIntensity: material.emissiveIntensity,
      flatShading: material.flatShading,
    } as MaterialSerialized;
  }

  if (material instanceof THREE.MeshLambertMaterial) {
    return {
      ...base,
      type: 'lambert',
      color: serializeColor(material.color),
      emissive: serializeColor(material.emissive),
      emissiveIntensity: material.emissiveIntensity,
    } as MaterialSerialized;
  }

  if (material instanceof THREE.MeshBasicMaterial) {
    return {
      ...base,
      type: 'basic',
      color: serializeColor(material.color),
    } as MaterialSerialized;
  }

  return {
    ...base,
    type: 'standard',
    color: { r: 0.5, g: 0.5, b: 0.5 },
    metalness: 0,
    roughness: 0.5,
  } as MaterialSerialized;
}

export function deserializeMaterial(data: MaterialSerialized): THREE.Material {
  const color = new THREE.Color(data.color.r, data.color.g, data.color.b);
  const emissive = data.emissive
    ? new THREE.Color(data.emissive.r, data.emissive.g, data.emissive.b)
    : new THREE.Color(0, 0, 0);

  const side = data.side === 'front' ? THREE.FrontSide
    : data.side === 'back' ? THREE.BackSide
      : THREE.DoubleSide;

  switch (data.type) {
    case 'standard':
      return new THREE.MeshStandardMaterial({
        color,
        metalness: data.metalness ?? 0,
        roughness: data.roughness ?? 0.5,
        emissive,
        emissiveIntensity: data.emissiveIntensity ?? 0,
        envMapIntensity: data.envMapIntensity ?? 1,
        opacity: data.opacity,
        transparent: data.transparent,
        wireframe: data.wireframe ?? false,
        side,
        flatShading: data.flatShading ?? false,
      });
    case 'physical':
      return new THREE.MeshPhysicalMaterial({
        color,
        metalness: data.metalness ?? 0,
        roughness: data.roughness ?? 0.5,
        emissive,
        emissiveIntensity: data.emissiveIntensity ?? 0,
        envMapIntensity: data.envMapIntensity ?? 1,
        opacity: data.opacity,
        transparent: data.transparent,
        wireframe: data.wireframe ?? false,
        side,
        flatShading: data.flatShading ?? false,
      });
    case 'phong':
      return new THREE.MeshPhongMaterial({
        color,
        emissive,
        emissiveIntensity: data.emissiveIntensity ?? 0,
        opacity: data.opacity,
        transparent: data.transparent,
        wireframe: data.wireframe ?? false,
        side,
        flatShading: data.flatShading ?? false,
      });
    case 'lambert':
      return new THREE.MeshLambertMaterial({
        color,
        emissive,
        emissiveIntensity: data.emissiveIntensity ?? 0,
        opacity: data.opacity,
        transparent: data.transparent,
        wireframe: data.wireframe ?? false,
        side,
      });
    case 'basic':
      return new THREE.MeshBasicMaterial({
        color,
        opacity: data.opacity,
        transparent: data.transparent,
        wireframe: data.wireframe ?? false,
        side,
      });
    default:
      return new THREE.MeshStandardMaterial({ color });
  }
}
