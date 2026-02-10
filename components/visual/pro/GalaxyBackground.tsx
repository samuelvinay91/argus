'use client';

import { Stars, Sparkles, Cloud } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

export default function GalaxyBackground() {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.02;
        }
    });

    return (
        <group>
            {/* Deep Space Background Stars */}
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

            {/* Floating Particles/Dust - Near Field */}
            <Sparkles
                count={200}
                scale={20}
                size={2}
                speed={0.4}
                opacity={0.4}
                color="#00ffff"
            />

            {/* Distant Nebula Dust - Far Field */}
            <Sparkles
                count={500}
                scale={50}
                size={5}
                speed={0.2}
                opacity={0.2}
                color="#8a2be2"
            />

            {/* Rotating Group for subtle motion */}
            <group ref={groupRef}>
                {/* Could add volumetric clouds here if 'Cloud' from drei plays nice, keeping it simple for perf first */}
            </group>
        </group>
    );
}
