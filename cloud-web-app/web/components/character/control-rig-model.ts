import * as THREE from 'three';
import type { BoneNode, IKChain } from './ControlRigEditor';

export const HUMANOID_BONES: BoneNode[] = [
  { id: 'hips', name: 'Hips', parentId: null, position: new THREE.Vector3(0, 1, 0), rotation: new THREE.Euler(), length: 0.1, ikEnabled: false, fkWeight: 1, locked: false, visible: true, children: ['spine', 'leftUpperLeg', 'rightUpperLeg'] },
  { id: 'spine', name: 'Spine', parentId: 'hips', position: new THREE.Vector3(0, 0.1, 0), rotation: new THREE.Euler(), length: 0.15, ikEnabled: false, fkWeight: 1, locked: false, visible: true, children: ['spine1'] },
  { id: 'spine1', name: 'Spine1', parentId: 'spine', position: new THREE.Vector3(0, 0.15, 0), rotation: new THREE.Euler(), length: 0.15, ikEnabled: false, fkWeight: 1, locked: false, visible: true, children: ['spine2'] },
  { id: 'spine2', name: 'Spine2', parentId: 'spine1', position: new THREE.Vector3(0, 0.15, 0), rotation: new THREE.Euler(), length: 0.15, ikEnabled: false, fkWeight: 1, locked: false, visible: true, children: ['neck', 'leftShoulder', 'rightShoulder'] },
  { id: 'neck', name: 'Neck', parentId: 'spine2', position: new THREE.Vector3(0, 0.15, 0), rotation: new THREE.Euler(), length: 0.08, ikEnabled: false, fkWeight: 1, locked: false, visible: true, children: ['head'] },
  { id: 'head', name: 'Head', parentId: 'neck', position: new THREE.Vector3(0, 0.08, 0), rotation: new THREE.Euler(), length: 0.2, ikEnabled: false, fkWeight: 1, locked: false, visible: true, children: [] },

  // Left Arm
  { id: 'leftShoulder', name: 'Left Shoulder', parentId: 'spine2', position: new THREE.Vector3(0.1, 0.12, 0), rotation: new THREE.Euler(0, 0, -Math.PI / 6), length: 0.1, ikEnabled: false, fkWeight: 1, locked: false, visible: true, children: ['leftUpperArm'] },
  { id: 'leftUpperArm', name: 'Left Upper Arm', parentId: 'leftShoulder', position: new THREE.Vector3(0.1, 0, 0), rotation: new THREE.Euler(), length: 0.28, ikEnabled: true, fkWeight: 0, locked: false, visible: true, children: ['leftLowerArm'] },
  { id: 'leftLowerArm', name: 'Left Lower Arm', parentId: 'leftUpperArm', position: new THREE.Vector3(0.28, 0, 0), rotation: new THREE.Euler(), length: 0.25, ikEnabled: true, fkWeight: 0, locked: false, visible: true, children: ['leftHand'] },
  { id: 'leftHand', name: 'Left Hand', parentId: 'leftLowerArm', position: new THREE.Vector3(0.25, 0, 0), rotation: new THREE.Euler(), length: 0.1, ikEnabled: true, fkWeight: 0, locked: false, visible: true, children: [] },

  // Right Arm
  { id: 'rightShoulder', name: 'Right Shoulder', parentId: 'spine2', position: new THREE.Vector3(-0.1, 0.12, 0), rotation: new THREE.Euler(0, 0, Math.PI / 6), length: 0.1, ikEnabled: false, fkWeight: 1, locked: false, visible: true, children: ['rightUpperArm'] },
  { id: 'rightUpperArm', name: 'Right Upper Arm', parentId: 'rightShoulder', position: new THREE.Vector3(-0.1, 0, 0), rotation: new THREE.Euler(), length: 0.28, ikEnabled: true, fkWeight: 0, locked: false, visible: true, children: ['rightLowerArm'] },
  { id: 'rightLowerArm', name: 'Right Lower Arm', parentId: 'rightUpperArm', position: new THREE.Vector3(-0.28, 0, 0), rotation: new THREE.Euler(), length: 0.25, ikEnabled: true, fkWeight: 0, locked: false, visible: true, children: ['rightHand'] },
  { id: 'rightHand', name: 'Right Hand', parentId: 'rightLowerArm', position: new THREE.Vector3(-0.25, 0, 0), rotation: new THREE.Euler(), length: 0.1, ikEnabled: true, fkWeight: 0, locked: false, visible: true, children: [] },

  // Left Leg
  { id: 'leftUpperLeg', name: 'Left Upper Leg', parentId: 'hips', position: new THREE.Vector3(0.1, 0, 0), rotation: new THREE.Euler(Math.PI, 0, 0), length: 0.4, ikEnabled: true, fkWeight: 0, locked: false, visible: true, children: ['leftLowerLeg'] },
  { id: 'leftLowerLeg', name: 'Left Lower Leg', parentId: 'leftUpperLeg', position: new THREE.Vector3(0, -0.4, 0), rotation: new THREE.Euler(), length: 0.4, ikEnabled: true, fkWeight: 0, locked: false, visible: true, children: ['leftFoot'] },
  { id: 'leftFoot', name: 'Left Foot', parentId: 'leftLowerLeg', position: new THREE.Vector3(0, -0.4, 0), rotation: new THREE.Euler(-Math.PI / 2, 0, 0), length: 0.15, ikEnabled: true, fkWeight: 0, locked: false, visible: true, children: [] },

  // Right Leg
  { id: 'rightUpperLeg', name: 'Right Upper Leg', parentId: 'hips', position: new THREE.Vector3(-0.1, 0, 0), rotation: new THREE.Euler(Math.PI, 0, 0), length: 0.4, ikEnabled: true, fkWeight: 0, locked: false, visible: true, children: ['rightLowerLeg'] },
  { id: 'rightLowerLeg', name: 'Right Lower Leg', parentId: 'rightUpperLeg', position: new THREE.Vector3(0, -0.4, 0), rotation: new THREE.Euler(), length: 0.4, ikEnabled: true, fkWeight: 0, locked: false, visible: true, children: ['rightFoot'] },
  { id: 'rightFoot', name: 'Right Foot', parentId: 'rightLowerLeg', position: new THREE.Vector3(0, -0.4, 0), rotation: new THREE.Euler(-Math.PI / 2, 0, 0), length: 0.15, ikEnabled: true, fkWeight: 0, locked: false, visible: true, children: [] },
];

export const DEFAULT_IK_CHAINS: IKChain[] = [
  {
    id: 'leftArm',
    name: 'Left Arm IK',
    startBone: 'leftUpperArm',
    endBone: 'leftHand',
    poleVector: new THREE.Vector3(0, 0, -1),
    effectorPosition: new THREE.Vector3(0.7, 1.2, 0),
    iterations: 10,
    tolerance: 0.001,
    enabled: true,
  },
  {
    id: 'rightArm',
    name: 'Right Arm IK',
    startBone: 'rightUpperArm',
    endBone: 'rightHand',
    poleVector: new THREE.Vector3(0, 0, -1),
    effectorPosition: new THREE.Vector3(-0.7, 1.2, 0),
    iterations: 10,
    tolerance: 0.001,
    enabled: true,
  },
  {
    id: 'leftLeg',
    name: 'Left Leg IK',
    startBone: 'leftUpperLeg',
    endBone: 'leftFoot',
    poleVector: new THREE.Vector3(0, 0, 1),
    effectorPosition: new THREE.Vector3(0.1, 0, 0.15),
    iterations: 10,
    tolerance: 0.001,
    enabled: true,
  },
  {
    id: 'rightLeg',
    name: 'Right Leg IK',
    startBone: 'rightUpperLeg',
    endBone: 'rightFoot',
    poleVector: new THREE.Vector3(0, 0, 1),
    effectorPosition: new THREE.Vector3(-0.1, 0, 0.15),
    iterations: 10,
    tolerance: 0.001,
    enabled: true,
  },
];
