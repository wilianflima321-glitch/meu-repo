'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { useTranslation } from 'react-i18next';

export default function VRPreview() {
  const { t } = useTranslation();

  return (
    <div className='w-full h-full'>
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <OrbitControls />
        <Text
          position={[0, 0, 0]}
          fontSize={0.5}
          color='white'
          anchorX='center'
          anchorY='middle'
        >
          {t('vrPreview.placeholder')}
        </Text>
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color='orange' />
        </mesh>
      </Canvas>
    </div>
  );
}