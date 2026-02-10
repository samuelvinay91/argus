'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'; // We'll implement basic rotation or just auto-rotate for now to keep it simple/robust without extra imports if standard three is tricky with SSR
import styles from './SolarSystem.module.css';

// Mock Data for "Planets" (Agents)
const AGENTS = [
    { id: 'agent-1', name: 'Tester Alpha', type: 'TESTING', status: 'RUNNING', color: 0x00ffff, distance: 12, speed: 0.005, size: 1.2 },
    { id: 'agent-2', name: 'Healer Bot', type: 'HEALING', status: 'HEALING', color: 0x8a2be2, distance: 16, speed: 0.003, size: 1.0 },
    { id: 'agent-3', name: 'Reporter X', type: 'REPORTING', status: 'IDLE', color: 0xffaa00, distance: 20, speed: 0.002, size: 0.8 },
    { id: 'agent-4', name: 'Crawler V2', type: 'DISCOVERY', status: 'RUNNING', color: 0x00ff88, distance: 24, speed: 0.004, size: 0.9 },
    { id: 'agent-5', name: 'Security Sentinel', type: 'SECURITY', status: 'WARNING', color: 0xff4444, distance: 28, speed: 0.001, size: 1.5 },
];

export default function SolarSystem() {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const requestRef = useRef<number>(0);
    const planetsRef = useRef<{ mesh: THREE.Mesh; data: typeof AGENTS[0]; angle: number }[]>([]);
    const connectorsRef = useRef<THREE.Line[]>([]);

    const [hoveredAgent, setHoveredAgent] = useState<typeof AGENTS[0] | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (!containerRef.current) return;

        // --- INIT ---
        const scene = new THREE.Scene();
        sceneRef.current = scene;
        // scene.background = new THREE.Color(0x050510); // Managed by CSS gradient instead for transparency

        // Camera
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.set(0, 20, 40);
        camera.lookAt(0, 0, 0);
        cameraRef.current = camera;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        const pointLight = new THREE.PointLight(0xffffff, 2, 100);
        pointLight.position.set(0, 0, 0);
        scene.add(pointLight);

        // --- OBJECTS ---

        // Sun (Central Core)
        const sunGeometry = new THREE.SphereGeometry(3, 32, 32);
        const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const sun = new THREE.Mesh(sunGeometry, sunMaterial);

        // Glow effect for sun (simple duplicate larger mesh with transparency)
        const sunGlowGeo = new THREE.SphereGeometry(3.5, 32, 32);
        const sunGlowMat = new THREE.MeshBasicMaterial({
            color: 0x00aaff,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });
        const sunGlow = new THREE.Mesh(sunGlowGeo, sunGlowMat);
        sun.add(sunGlow);
        scene.add(sun);

        // Planets
        AGENTS.forEach((agent) => {
            // Orbit Ring
            const orbitGeo = new THREE.RingGeometry(agent.distance - 0.1, agent.distance + 0.1, 64);
            const orbitMat = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.1,
                side: THREE.DoubleSide
            });
            const orbit = new THREE.Mesh(orbitGeo, orbitMat);
            orbit.rotation.x = Math.PI / 2;
            scene.add(orbit);

            // Planet Mesh
            const geometry = new THREE.SphereGeometry(agent.size, 16, 16);
            const material = new THREE.MeshPhongMaterial({
                color: agent.color,
                emissive: agent.color,
                emissiveIntensity: 0.5
            });
            const mesh = new THREE.Mesh(geometry, material);

            // Initial Position
            const angle = Math.random() * Math.PI * 2;
            mesh.position.x = Math.cos(angle) * agent.distance;
            mesh.position.z = Math.sin(angle) * agent.distance;

            scene.add(mesh);
            planetsRef.current.push({ mesh, data: agent, angle });

            // Connector (Line to center)
            const points = [new THREE.Vector3(0, 0, 0), mesh.position];
            const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
            const lineMat = new THREE.LineBasicMaterial({
                color: agent.color,
                transparent: true,
                opacity: 0.2
            });
            const line = new THREE.Line(lineGeo, lineMat);
            scene.add(line);
            connectorsRef.current.push(line);
        });

        // --- ANIMATION LOOP ---
        const animate = () => {
            requestRef.current = requestAnimationFrame(animate);

            // Rotate Planets
            planetsRef.current.forEach((planet, index) => {
                planet.angle += planet.data.speed;

                planet.mesh.position.x = Math.cos(planet.angle) * planet.data.distance;
                planet.mesh.position.z = Math.sin(planet.angle) * planet.data.distance;

                // Self rotation
                planet.mesh.rotation.y += 0.02;

                // Update Connector
                const line = connectorsRef.current[index];
                const positions = line.geometry.attributes.position.array as Float32Array;
                positions[3] = planet.mesh.position.x;
                positions[4] = planet.mesh.position.y;
                positions[5] = planet.mesh.position.z;
                line.geometry.attributes.position.needsUpdate = true;
            });

            // Pulse Sun
            const time = Date.now() * 0.001;
            const scale = 1 + Math.sin(time * 2) * 0.05;
            sun.scale.set(scale, scale, scale);

            renderer.render(scene, camera);
        };
        animate();

        // --- HANDLERS ---
        const handleResize = () => {
            if (!containerRef.current) return;
            const w = containerRef.current.clientWidth;
            const h = containerRef.current.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };

        window.addEventListener('resize', handleResize);

        // Raycaster for Hover
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        const handleMouseMove = (event: MouseEvent) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(planetsRef.current.map(p => p.mesh));

            if (intersects.length > 0) {
                const object = intersects[0].object;
                const planet = planetsRef.current.find(p => p.mesh === object);
                if (planet) {
                    setHoveredAgent(planet.data);
                    setTooltipPos({ x: event.clientX, y: event.clientY });
                    document.body.style.cursor = 'pointer';
                }
            } else {
                setHoveredAgent(null);
                document.body.style.cursor = 'default';
            }
        };

        // Attach listener to canvas
        renderer.domElement.addEventListener('mousemove', handleMouseMove);

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            if (rendererRef.current) {
                rendererRef.current.domElement.removeEventListener('mousemove', handleMouseMove);
                // eslint-disable-next-line react-hooks/exhaustive-deps
                containerRef.current?.removeChild(rendererRef.current.domElement);
            }
            cancelAnimationFrame(requestRef.current);
            // Optional: Dispose geometries/materials to avoid leaks
        };
    }, []);

    return (
        <div className={styles.container} ref={containerRef}>
            {/* Tooltip Overlay */}
            <div
                className={`${styles.tooltip} ${hoveredAgent ? styles.visible : ''}`}
                style={{ top: tooltipPos.y, left: tooltipPos.x }}
            >
                {hoveredAgent && (
                    <>
                        <h3>{hoveredAgent.name}</h3>
                        <p><span className={styles.statusIndicator} style={{ backgroundColor: '#' + hoveredAgent.color.toString(16) }}></span>{hoveredAgent.status}</p>
                        <p style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>{hoveredAgent.type}</p>
                    </>
                )}
            </div>

            {/* Legend */}
            <div className={styles.legend}>
                <div className={styles.legendItem}>
                    <div className={styles.legendColor} style={{ background: '#00ffff' }}></div>
                    <span>Running</span>
                </div>
                <div className={styles.legendItem}>
                    <div className={styles.legendColor} style={{ background: '#8a2be2' }}></div>
                    <span>Healing</span>
                </div>
                <div className={styles.legendItem}>
                    <div className={styles.legendColor} style={{ background: '#ff4444' }}></div>
                    <span>Critical</span>
                </div>
            </div>
        </div>
    );
}
