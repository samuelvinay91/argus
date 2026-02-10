'use client';

import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Points, PointMaterial, Float, Text, Html } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import GradientBackground from './GradientBackground';
import styles from '../SolarSystem.module.css';

// --- MOCK DATA ---
interface NodeData {
    id: string;
    label: string;
    type: string;
    status: 'active' | 'warning' | 'idle';
    pos: [number, number, number];
}

const NODES: NodeData[] = [
    { id: '1', label: 'TEST_RUNNER', type: 'CORE', status: 'active', pos: [0, 0, 0] },
    { id: '2', label: 'AUTH_SERVICE', type: 'SERVICE', status: 'active', pos: [4, 2, 0] },
    { id: '3', label: 'DB_SHARD_01', type: 'DB', status: 'active', pos: [-4, 1, 2] },
    { id: '4', label: 'API_GATEWAY', type: 'GATEWAY', status: 'warning', pos: [2, -3, 3] },
    { id: '5', label: 'PAYMENT_PROC', type: 'SERVICE', status: 'active', pos: [-2, -2, -3] },
    { id: '6', label: 'ANALYTICS', type: 'SERVICE', status: 'idle', pos: [0, 4, -2] },
];

function ParticleCore() {
    // Generate thousands of points for the "Core Mesh"
    const count = 200;
    const [positions] = useState(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            // Sphere distribution
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            const r = 1.5 + Math.random() * 0.5; // Radius 1.5-2.0

            pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            pos[i * 3 + 2] = r * Math.cos(phi);
        }
        return pos;
    });

    const ref = useRef<THREE.Points>(null);
    useFrame((state) => {
        if (ref.current) {
            ref.current.rotation.y = state.clock.getElapsedTime() * 0.1;
            ref.current.rotation.z = state.clock.getElapsedTime() * 0.05;
        }
    });

    return (
        <group>
            {/* The dense core cluster */}
            <Points ref={ref} positions={positions} stride={3}>
                <PointMaterial
                    transparent
                    vertexColors={false}
                    color="#8a2be2" // Deep Violet
                    size={0.05}
                    sizeAttenuation={true}
                    depthWrite={false}
                    opacity={0.8}
                />
            </Points>
            {/* Inner glowing core */}
            <mesh>
                <sphereGeometry args={[1, 32, 32]} />
                <meshBasicMaterial color="#4b0082" transparent opacity={0.1} depthWrite={false} />
            </mesh>
        </group>
    );
}

interface DataNodeProps {
    position: [number, number, number];
    label: string;
    status: string;
}

function DataNode({ position, label, status }: DataNodeProps) {
    const color = status === 'warning' ? '#ffaa00' : '#ffffff';

    return (
        <group position={position}>
            <mesh>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
            {/* Subtle glow ring */}
            <mesh scale={[1.5, 1.5, 1.5]}>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshBasicMaterial color={color} transparent opacity={0.2} toneMapped={false} />
            </mesh>
            {/* Label - Floating text */}
            <Html distanceFactor={10} position={[0.2, 0.2, 0]}>
                <div className="pointer-events-none select-none">
                    <div className="text-[10px] font-mono text-[rgba(255,255,255,0.6)] tracking-widest whitespace-nowrap bg-black/50 px-1 rounded backdrop-blur-[2px]">
                        {label}
                    </div>
                </div>
            </Html>
        </group>
    );
}

function NetworkLines() {
    // Connect every node to the core (0,0,0) and some to each other
    return (
        <group>
            {NODES.filter(n => n.type !== 'CORE').map((node, i) => (
                <Line
                    key={i}
                    points={[[0, 0, 0], node.pos]}
                    color="#ffffff"
                    opacity={0.05} // Very faint
                    transparent
                    lineWidth={1}
                />
            ))}
            {/* Random cross connections for "mesh" look */}
            <Line points={[NODES[1].pos, NODES[2].pos]} color="#ffffff" opacity={0.03} transparent lineWidth={1} />
            <Line points={[NODES[2].pos, NODES[4].pos]} color="#ffffff" opacity={0.03} transparent lineWidth={1} />
        </group>
    );
}

export default function DataMeshNetwork() {
    return (
        <div className={styles.container}>
            <Canvas camera={{ position: [0, 0, 10], fov: 40 }} dpr={[1, 2]}>
                <fog attach="fog" args={['#050505', 5, 20]} />

                <GradientBackground />

                {/* Floating Animation for the whole system */}
                <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
                    <ParticleCore />
                    <NetworkLines />
                    {NODES.filter(n => n.type !== 'CORE').map(node => (
                        <DataNode key={node.id} position={node.pos} label={node.label} status={node.status} />
                    ))}
                </Float>

                <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 1.5} minPolarAngle={Math.PI / 3} rotateSpeed={0.2} />

                {/* Post Processing: Subtle, classy bloom */}
                <EffectComposer>
                    <Bloom
                        luminanceThreshold={0.2} // Bloom kicks in earlier
                        mipmapBlur
                        intensity={0.4} // But is softer
                        radius={0.5}
                    />
                    <Noise opacity={0.05} />
                    <Vignette eskil={false} offset={0.1} darkness={1.0} />
                </EffectComposer>
            </Canvas>
        </div>
    );
}
