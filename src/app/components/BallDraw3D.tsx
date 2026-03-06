'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import useGameStore from '@/app/store/gameStore';

/**
 * BallDraw3D - Three.js 3D ball animation component
 * Features:
 * - PerspectiveCamera
 * - SphereGeometry balls with MeshPhysicalMaterial
 * - Glow effect, drop animation
 * - Socket-driven ball reveals (20 balls, 500ms each)
 */
export default function BallDraw3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const ballsRef = useRef<THREE.Mesh[]>([]);
  const animationRef = useRef<number>(0);
  const { drawnNumbers, currentBall, isDrawing } = useGameStore();

  // Canvas textures for ball numbers
  const createBallTexture = useMemo(() => {
    return (num: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;

      // Gradient background
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, '#4ade80');
      gradient.addColorStop(0.7, '#166534');
      gradient.addColorStop(1, '#0d1117');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(64, 64, 64, 0, Math.PI * 2);
      ctx.fill();

      // Number text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(num.toString(), 64, 64);

      return new THREE.CanvasTexture(canvas);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = 180;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1117);
    scene.fog = new THREE.FogExp2(0x0d1117, 0.02);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 2, 12);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x4ade80, 0.3);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x4ade80, 2, 30);
    pointLight.position.set(0, 5, 5);
    scene.add(pointLight);

    const spotLight = new THREE.SpotLight(0xffffff, 1);
    spotLight.position.set(0, 10, 5);
    spotLight.angle = 0.4;
    scene.add(spotLight);

    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(20, 20);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0d1117,
      roughness: 0.8,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    scene.add(ground);

    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      // Animate balls
      ballsRef.current.forEach((ball, i) => {
        ball.rotation.y += 0.01 * (i + 1);
        ball.rotation.z += 0.005;
        // Floating effect
        ball.position.y = -0.5 + Math.sin(Date.now() * 0.001 + i * 0.5) * 0.1;
      });

      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      const w = container.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  // Add balls when numbers are drawn
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || drawnNumbers.length === 0) return;

    // Remove old balls
    ballsRef.current.forEach(ball => scene.remove(ball));
    ballsRef.current = [];

    // Show last 5 drawn balls
    const visibleBalls = drawnNumbers.slice(-5);
    visibleBalls.forEach((num, i) => {
      const geometry = new THREE.SphereGeometry(0.6, 32, 32);
      const material = new THREE.MeshPhysicalMaterial({
        map: createBallTexture(num),
        roughness: 0.2,
        metalness: 0.1,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
        envMapIntensity: 1,
      });

      const ball = new THREE.Mesh(geometry, material);
      const xOffset = (i - 2) * 2;
      ball.position.set(xOffset, 5, 0); // Start from above

      // Animate drop
      const targetY = -0.5;
      const startTime = Date.now();
      const duration = 500;

      const dropAnimation = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        ball.position.y = 5 + (targetY - 5) * eased;

        if (progress < 1) {
          requestAnimationFrame(dropAnimation);
        }
      };
      dropAnimation();

      scene.add(ball);
      ballsRef.current.push(ball);
    });
  }, [drawnNumbers, createBallTexture]);

  if (!isDrawing && drawnNumbers.length === 0) {
    return null;
  }

  return (
    <div ref={containerRef} className="w-full" style={{ height: '180px', background: 'transparent' }} />
  );
}
