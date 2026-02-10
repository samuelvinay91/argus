'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const GradientShader = {
    vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
    fragmentShader: `
    uniform float uTime;
    varying vec2 vUv;

    // Simplex noise function (simplified for brevity or use a library chunk in prod)
    // For now, simple sine combinations for fluid movement
    
    void main() {
      // Deep background color (Almost black, slight tint)
      vec3 colorA = vec3(0.02, 0.02, 0.04); 
      
      // Accent color (Deep Violet/Indigo)
      vec3 colorB = vec3(0.12, 0.05, 0.2);

      // Create a moving gradient blob at the bottom
      float noise = sin(vUv.x * 3.0 + uTime * 0.2) * cos(vUv.y * 2.0 + uTime * 0.3);
      float gradient = smoothstep(0.8, -0.2, vUv.y + noise * 0.2); // Fade from bottom up
      
      vec3 finalColor = mix(colorA, colorB, gradient * 0.4); // Very subtle mix
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

export default function GradientBackground() {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
        }
    });

    return (
        <mesh ref={meshRef} position={[0, 0, -50]} scale={[100, 100, 1]}>
            <planeGeometry args={[1, 1]} />
            <shaderMaterial
                ref={materialRef}
                vertexShader={GradientShader.vertexShader}
                fragmentShader={GradientShader.fragmentShader}
                uniforms={{
                    uTime: { value: 0 },
                }}
                depthWrite={false}
            />
        </mesh>
    );
}
