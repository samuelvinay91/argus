// @ts-nocheck
'use client';

import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Line, Html } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import EnergyWave from './EnergyWave';
import GalaxyBackground from './GalaxyBackground';
import styles from '../SolarSystem.module.css'; // Reusing CSS for tooltips

// Mock Data
const AGENTS = [
    { id: 'agent-1', name: 'Tester Alpha', type: 'TESTING', status: 'RUNNING', color: '#00ffff', distance: 6, speed: 0.5, size: 0.6 },
    { id: 'agent-2', name: 'Healer Bot', type: 'HEALING', status: 'HEALING', color: '#8a2be2', distance: 8, speed: 0.3, size: 0.5 },
    { id: 'agent-3', name: 'Reporter X', type: 'REPORTING', status: 'IDLE', color: '#ffaa00', distance: 10, speed: 0.2, size: 0.4 },
    { id: 'agent-4', name: 'Crawler V2', type: 'DISCOVERY', status: 'RUNNING', color: '#00ff88', distance: 12, speed: 0.4, size: 0.45 },
    { id: 'agent-5', name: 'Security Sentinel', type: 'SECURITY', status: 'WARNING', color: '#ff4444', distance: 14, speed: 0.1, size: 0.7 },
];

function AgentPlanet({ agent, onHover, onLeave }: { agent: typeof AGENTS[number]; onHover: (agent: typeof AGENTS[number]) => void; onLeave: () => void }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const [angle, setAngle] = useState(Math.random() * Math.PI * 2);

    useFrame((state, delta) => {
        // Rotation logic
        setAngle((prev) => prev + agent.speed * delta);

        if (meshRef.current) {
            meshRef.current.position.x = Math.cos(angle) * agent.distance;
            meshRef.current.position.z = Math.sin(angle) * agent.distance;
            meshRef.current.rotation.y += delta;
        }
    });

    const position = [Math.cos(angle) * agent.distance, 0, Math.sin(angle) * agent.distance] as [number, number, number];

    return (
        <group>
            {/* Orbit Path - Static Circle */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[agent.distance - 0.05, agent.distance + 0.05, 64]} />
                <meshBasicMaterial color="white" transparent opacity={0.05} side={THREE.DoubleSide} />
            </mesh>

            {/* Connector Line (Dynamic) */}
            <Line
                points={[[0, 0, 0], position]}
                color={agent.color}
                transparent
                opacity={0.3}
                lineWidth={1}
            />

            {/* The Planet */}
            <mesh
                ref={meshRef}
                position={position}
                onPointerOver={(e) => { e.stopPropagation(); onHover(agent); document.body.style.cursor = 'pointer'; }}
                onPointerOut={(e) => { onLeave(); document.body.style.cursor = 'default'; }}
            >
                <sphereGeometry args={[agent.size, 32, 32]} />
                <meshStandardMaterial
                    color={agent.color}
                    emissive={agent.color}
                    emissiveIntensity={2} // High intensity for Bloom
                    toneMapped={false}
                />
            </mesh>
        </group>
    );
}

function Sun() {
    const sunRef = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if (sunRef.current) {
            const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.02;
            sunRef.current.scale.set(scale, scale, scale);
        }
    });

    return (
        <group>
            {/* Core Sun */}
            <mesh ref={sunRef}>
                <sphereGeometry args={[1.5, 32, 32]} />
                <meshStandardMaterial
                    color="#ffffff"
                    emissive="#ffffff"
                    emissiveIntensity={3}
                    toneMapped={false}
                />
            </mesh>
            {/* Outer Glow Area (Bloom Target) */}
            <mesh scale={[1.2, 1.2, 1.2]}>
                <sphereGeometry args={[1.5, 32, 32]} />
                <meshBasicMaterial color="#00ffff" transparent opacity={0.1} />
            </mesh>
        </group>
    );
}

export default function SolarSystemV2() {
    const [hoveredAgent, setHoveredAgent] = useState<typeof AGENTS[0] | null>(null);

    return (
        <div className={styles.container}> {/* Reuse container styles */}
            <Canvas camera={{ position: [0, 15, 20], fov: 45 }} dpr={[1, 2]}>
                {/* 1. Lighting */}
                <ambientLight intensity={0.5} />
                <pointLight position={[0, 10, 0]} intensity={2} color="white" />

                {/* 2. Background */}
                <GalaxyBackground />

                {/* 3. Objects */}
                <Sun />
                <EnergyWave color="#00ffff" scale={0.5} speed={0.5} />
                <EnergyWave color="#8a2be2" scale={1.2} speed={0.3} />

                {AGENTS.map((agent) => (
                    <AgentPlanet
                        key={agent.id}
                        agent={agent}
                        onHover={setHoveredAgent}
                        onLeave={() => setHoveredAgent(null)}
                    />
                ))}

                {/* 4. Controls */}
                <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 2.5} minDistance={10} maxDistance={50} autoRotate={!hoveredAgent} autoRotateSpeed={0.5} />

                {/* 5. Post Processing (The Magic) */}
                <EffectComposer disableNormalPass>
                    {/* Bloom: Creates the neon glow */}
                    <Bloom
                        luminanceThreshold={1}
                        mipmapBlur
                        intensity={1.5}
                        radius={0.6}
                    />
                    {/* Vignette: Cinematic darken corners */}
                    <Vignette eskil={false} offset={0.1} darkness={1.1} />
                    {/* Noise: Film grail feeling */}
                    <Noise opacity={0.02} />
                </EffectComposer>
            </Canvas>

            {/* HTML Overlay for Tooltip (Reusing CSS from previously created prototype) */}
            {hoveredAgent && (
                <div
                    className={`${styles.tooltip} ${styles.visible}`}
                    style={{
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)', // Center it for now, simple implementation. Better would be tracking 3D pos.
                        marginTop: '100px'
                    }}
                >
                    <h3>{hoveredAgent.name}</h3>
                    <p><span className={styles.statusIndicator} style={{ backgroundColor: hoveredAgent.color }}></span>{hoveredAgent.status}</p>
                    <p style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>{hoveredAgent.type}</p>
                </div>
            )}
        </div>
    );
}
