'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const EnergyWaveShader = {
    vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
    fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    varying vec2 vUv;

    void main() {
      float dist = distance(vUv, vec2(0.5));
      
      // Create a ripple ring effect
      float ring = sin(dist * 20.0 - uTime * 3.0);
      
      // Soften edges
      float alpha = smoothstep(0.5, 0.0, dist);
      
      // Make the ring glow
      alpha *= smoothstep(0.1, 1.0, ring);
      
      // Add some noise distortion (simulated simple noise for speed)
      float noise = sin(vUv.x * 10.0 + uTime) * cos(vUv.y * 10.0 + uTime) * 0.1;
      
      gl_FragColor = vec4(uColor, alpha * 0.8 + noise);
    }
  `
};

export default function EnergyWave({ color = '#00ffff', scale = 1, speed = 1 }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime() * speed;
        }
        if (meshRef.current) {
            meshRef.current.rotation.z += 0.001;
        }
    });

    return (
        <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} scale={scale}>
            <planeGeometry args={[10, 10, 32, 32]} />
            <shaderMaterial
                ref={materialRef}
                vertexShader={EnergyWaveShader.vertexShader}
                fragmentShader={EnergyWaveShader.fragmentShader}
                uniforms={{
                    uTime: { value: 0 },
                    uColor: { value: new THREE.Color(color) }
                }}
                transparent
                side={THREE.DoubleSide}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </mesh>
    );
}
