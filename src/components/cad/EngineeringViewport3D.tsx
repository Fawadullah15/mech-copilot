import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  MousePointer,
  RotateCw,
  Move,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Box,
  Layers,
  Eye,
  EyeOff,
  Compass,
  Grid3X3,
  Crosshair,
  Camera,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';
import type { ComponentSelection, DesignParameters, Material } from '../../types';

interface EngineeringViewport3DProps {
  designParams: DesignParameters;
  selectedMaterial: Material;
  selectedComponent: ComponentSelection | null;
  onSelectComponent: (component: ComponentSelection) => void;
  isPass: boolean;
  isWarning: boolean;
  equivalentStress: number;
  criterion: 'Von Mises' | 'Tresca';
  theme?: 'light' | 'dark';
  shadingModeOverride?: ShadingMode | null;
}

export type ViewPreset = 'Iso' | 'Front' | 'Top' | 'Side' | 'Back' | 'Bottom';
export type ShadingMode = 'realistic' | 'edges' | 'wireframe' | 'stress';

interface FeatureVisibility {
  shaftBody: boolean;
  leftJournal: boolean;
  rightJournal: boolean;
  gearHub: boolean;
  leftBearing: boolean;
  rightBearing: boolean;
  keywaySlot: boolean;
}

export const EngineeringViewport3D: React.FC<EngineeringViewport3DProps> = ({
  designParams,
  selectedMaterial,
  selectedComponent,
  onSelectComponent,
  isPass,
  isWarning,
  equivalentStress,
  criterion,
  theme = 'light',
  shadingModeOverride = null,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<SVGSVGElement>(null);

  // Viewport states
  const [currentView, setCurrentView] = useState<ViewPreset>('Iso');
  const [shadingMode, setShadingMode] = useState<ShadingMode>('edges');
  const effectiveShadingMode = shadingModeOverride ?? shadingMode;
  const [activeTool, setActiveTool] = useState<'select' | 'orbit' | 'pan' | 'zoom'>('select');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showCenterline, setShowCenterline] = useState<boolean>(true);
  const [showDimensions, setShowDimensions] = useState<boolean>(true);
  const [showFeatureTree, setShowFeatureTree] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1536 : false
  );
  const [isDisplayDropdownOpen, setIsDisplayDropdownOpen] = useState<boolean>(false);
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState<boolean>(false);
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);

  // Component visibility state (SolidWorks-style eye toggles)
  const [visibility, setVisibility] = useState<FeatureVisibility>({
    shaftBody: true,
    leftJournal: true,
    rightJournal: true,
    gearHub: true,
    leftBearing: true,
    rightBearing: true,
    keywaySlot: true,
  });

  // Dynamic SVG dimension coordinates projected from 3D space
  const [dimCoords, setDimCoords] = useState<{
    spanStart: { x: number; y: number; visible: boolean };
    spanEnd: { x: number; y: number; visible: boolean };
    diamTop: { x: number; y: number; visible: boolean };
    diamBottom: { x: number; y: number; visible: boolean };
  }>({
    spanStart: { x: 0, y: 0, visible: false },
    spanEnd: { x: 0, y: 0, visible: false },
    diamTop: { x: 0, y: 0, visible: false },
    diamBottom: { x: 0, y: 0, visible: false },
  });

  // Orientation Triad projection vectors for the top-right gizmo
  const [triadAxes, setTriadAxes] = useState<{
    x: { x: number; y: number };
    y: { x: number; y: number };
    z: { x: number; y: number };
  }>({
    x: { x: 30, y: 15 },
    y: { x: 0, y: -35 },
    z: { x: -30, y: 15 },
  });

  // References for Three.js instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const centerlineRef = useRef<THREE.Line | null>(null);
  const meshesMapRef = useRef<Record<keyof FeatureVisibility, THREE.Object3D[]>>({
    shaftBody: [],
    leftJournal: [],
    rightJournal: [],
    gearHub: [],
    leftBearing: [],
    rightBearing: [],
    keywaySlot: [],
  });

  // Camera animation target for smooth transitions
  const cameraTargetRef = useRef<{
    pos: THREE.Vector3;
    lookAt: THREE.Vector3;
    isAnimating: boolean;
    startTime: number;
    startPos: THREE.Vector3;
    duration: number;
  }>({
    pos: new THREE.Vector3(),
    lookAt: new THREE.Vector3(),
    isAnimating: false,
    startTime: 0,
    startPos: new THREE.Vector3(),
    duration: 500,
  });

  // Calculate scaled dimensions for 3D units (1 unit = 10 mm for manageable scene coordinates)
  const scale = 0.1;
  const d_mm = Math.max(10, designParams.diameter);
  const l_mm = Math.max(50, designParams.length);
  const radius = (d_mm / 2) * scale;
  const length = l_mm * scale;
  const journalRadius = radius * 0.9;
  const journalLength = Math.min(length * 0.18, 50 * scale);
  const mainLength = length - 2 * journalLength;
  const gearRadius = Math.max(radius * 2.3, 55 * scale);
  const gearWidth = Math.max(14 * scale, 3.2);

  // Material color calculation based on physical alloy type
  const getMaterialColor = useCallback((matName: string): number => {
    const lower = matName.toLowerCase();
    if (lower.includes('aluminium') || lower.includes('aluminum')) return 0xE2E7EA;
    if (lower.includes('titanium')) return 0x9BA5A9;
    if (lower.includes('brass') || lower.includes('bronze')) return 0xC8A856;
    if (lower.includes('stainless')) return 0xDCE2E5;
    // Default alloy engineering steel (AISI 4140 / 1045)
    return 0xB8C2C6;
  }, []);

  // Set up Three.js scene, lights, and renderer
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const isDark = theme === 'dark';
    const bgColor = isDark ? 0x0F1929 : 0xF8FAFC;
    scene.background = new THREE.Color(bgColor);

    // Subtle atmospheric distance fog for depth perception
    const maxSpan = Math.max(length, gearRadius * 2.5, 42);
    scene.fog = new THREE.FogExp2(bgColor, 0.0018);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(38, width / Math.max(height, 1), 0.5, 3500);
    const initialDist = Math.max(maxSpan * 1.9, 54);
    camera.position.set(initialDist * 0.8, initialDist * 0.55, initialDist * 0.8);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. Renderer with antialiasing and soft shadows
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isDark ? 1.05 : 1.15;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxDistance = 600;
    controls.minDistance = 5;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // 5. Studio Atelier Lighting System (Precision CAD Lighting)
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, isDark ? 0.45 : 0.65);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(
      isDark ? 0x94A3B8 : 0xFFFFFF,
      isDark ? 0x1E293B : 0xCBD5E1,
      isDark ? 0.75 : 0.95
    );
    scene.add(hemiLight);

    // Main Studio Key Light (directional with crisp specular & soft shadow)
    const keyLight = new THREE.DirectionalLight(0xFFFFFF, isDark ? 1.35 : 1.55);
    keyLight.position.set(maxSpan * 0.9, maxSpan * 1.4, maxSpan * 1.1);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 10;
    keyLight.shadow.camera.far = maxSpan * 8;
    const shadowBound = Math.max(maxSpan * 1.5, 65);
    keyLight.shadow.camera.left = -shadowBound;
    keyLight.shadow.camera.right = shadowBound;
    keyLight.shadow.camera.top = shadowBound;
    keyLight.shadow.camera.bottom = -shadowBound;
    keyLight.shadow.bias = -0.0002;
    scene.add(keyLight);

    // Fill Light (soft cool tone from opposite side)
    const fillLight = new THREE.DirectionalLight(0x3B82F6, isDark ? 0.5 : 0.45);
    fillLight.position.set(-maxSpan * 0.9, maxSpan * 0.6, -maxSpan * 0.7);
    scene.add(fillLight);

    // Secondary Accent Light (subtle contrast fill from underneath-rear)
    const purpleAccent = new THREE.DirectionalLight(0x94A3B8, isDark ? 0.35 : 0.3);
    purpleAccent.position.set(0, -maxSpan * 0.5, maxSpan * 0.8);
    scene.add(purpleAccent);

    // Rim Specular Light (crisp metallic edge highlights)
    const rimLight = new THREE.DirectionalLight(0xFFFFFF, isDark ? 0.8 : 0.95);
    rimLight.position.set(0, maxSpan * 0.9, -maxSpan * 1.3);
    scene.add(rimLight);

    // Studio Ground Contact Shadow & Reflection Disc
    const groundGeo = new THREE.PlaneGeometry(350, 350);
    const groundMat = new THREE.ShadowMaterial({
      opacity: isDark ? 0.4 : 0.16,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -gearRadius - 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Subtle Precision Engineering Ground Grid
    const gridDim = Math.max(220, length * 2.6);
    const gridHelper = new THREE.GridHelper(
      gridDim,
      44,
      isDark ? 0x315EDE : 0x315EDE,
      isDark ? 0x28344E : 0xD9DFED
    );
    gridHelper.position.y = -gearRadius - 1.95;
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;

    // Raycasting for Component Selection & Interactive Hover
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      if (!modelGroupRef.current) return;

      const intersects = raycaster.intersectObjects(modelGroupRef.current.children, true);
      if (intersects.length > 0) {
        let obj: THREE.Object3D | null = intersects[0].object;
        while (obj && !obj.userData?.partId && obj.parent !== modelGroupRef.current) {
          obj = obj.parent;
        }
        if (obj?.userData?.partId) {
          setHoveredPart(obj.userData.partId);
          renderer.domElement.style.cursor = 'pointer';
          return;
        }
      }
      setHoveredPart(null);
      renderer.domElement.style.cursor = 'default';
    };

    const handleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      if (!modelGroupRef.current) return;

      const intersects = raycaster.intersectObjects(modelGroupRef.current.children, true);
      if (intersects.length > 0) {
        let obj: THREE.Object3D | null = intersects[0].object;
        while (obj && !obj.userData?.partId && obj.parent !== modelGroupRef.current) {
          obj = obj.parent;
        }
        if (obj?.userData?.partId) {
          const partId = obj.userData.partId;
          if (partId === 'shaft') {
            onSelectComponent({
              id: 'shaft',
              name: 'Power Transmission Main Span',
              type: 'Rotary Stepped Shaft Cylinder',
              material: selectedMaterial.name,
              status: isPass ? 'pass' : 'warning',
              specs: {
                Diameter: `⌀${designParams.diameter.toFixed(1)} mm`,
                Length: `${designParams.length.toFixed(1)} mm`,
                Material: selectedMaterial.name,
                [criterion === 'Tresca' ? 'Tresca Stress' : 'Von Mises Stress']: `${equivalentStress.toFixed(1)} MPa`,
              },
              suggestedPrompt: `Check stress and deflection for ${designParams.diameter}mm shaft body`,
            });
          } else if (partId === 'gear') {
            onSelectComponent({
              id: 'gear',
              name: 'Spur Gear Midspan Hub',
              type: 'Involute Spur Gear Hub (DIN 5480 / ISO 53)',
              material: selectedMaterial.name,
              status: 'pass',
              specs: {
                PitchDiameter: `⌀${(d_mm * 2.4).toFixed(0)} mm`,
                FaceWidth: `${(gearWidth / scale).toFixed(0)} mm`,
                RadialLoad: `${designParams.force} N`,
                AppliedTorque: `${designParams.torque} N·m`,
              },
              suggestedPrompt: 'Analyze gear tooth contact pressure and root bending stress',
            });
          } else if (partId === 'bearing-left') {
            onSelectComponent({
              id: 'bearing-left',
              name: 'Deep Groove Ball Bearing (Support A)',
              type: 'Radial Deep Groove Bearing (ISO 281)',
              material: '100Cr6 High-Carbon Bearing Steel',
              status: 'pass',
              specs: {
                Bore: `⌀${(d_mm * 0.9).toFixed(0)} mm`,
                JournalWidth: `${(journalLength / scale).toFixed(0)} mm`,
                RadialReaction: `${(designParams.force / 2).toFixed(1)} N`,
              },
              suggestedPrompt: 'Calculate ISO 281 L10 rating life for left journal bearing',
            });
          } else if (partId === 'bearing-right') {
            onSelectComponent({
              id: 'bearing-right',
              name: 'Deep Groove Ball Bearing (Support B)',
              type: 'Radial Deep Groove Bearing (ISO 281)',
              material: '100Cr6 High-Carbon Bearing Steel',
              status: 'pass',
              specs: {
                Bore: `⌀${(d_mm * 0.9).toFixed(0)} mm`,
                JournalWidth: `${(journalLength / scale).toFixed(0)} mm`,
                RadialReaction: `${(designParams.force / 2).toFixed(1)} N`,
              },
              suggestedPrompt: 'Calculate ISO 281 L10 rating life for right journal bearing',
            });
          } else if (partId === 'keyway') {
            onSelectComponent({
              id: 'keyway',
              name: 'DIN 6885-1 Parallel Keyway',
              type: 'Form A Round-Ended Keyway Seat',
              material: 'C45+C Drawn Keyway Steel',
              status: 'pass',
              specs: {
                Standard: 'DIN 6885-1',
                FilletRadius: `r ≥ ${(d_mm * 0.05).toFixed(1)} mm`,
                Width: `${(d_mm * 0.25).toFixed(1)} mm`,
              },
              suggestedPrompt: 'Calculate keyway shear stress and shaft torsional notch factor Kt',
            });
          }
        }
      }
    };

    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('click', handleClick);

    // 8. Animation & Render Loop with Vector Projection
    const animate = (time: number) => {
      animFrameRef.current = requestAnimationFrame(animate);

      // Handle smooth camera transition interpolation
      const anim = cameraTargetRef.current;
      if (anim.isAnimating) {
        const elapsed = time - anim.startTime;
        const progress = Math.min(elapsed / anim.duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);

        camera.position.lerpVectors(anim.startPos, anim.pos, ease);
        controls.target.lerp(anim.lookAt, ease);
        controls.update();

        if (progress >= 1) {
          anim.isAnimating = false;
        }
      } else {
        controls.update();
      }

      // Project 3D dimension anchor coordinates to 2D screen coordinates
      if (container) {
        const w = container.clientWidth;
        const h = container.clientHeight;

        const p1 = new THREE.Vector3(-length / 2, radius, 0).project(camera);
        const p2 = new THREE.Vector3(length / 2, radius, 0).project(camera);
        const p3 = new THREE.Vector3(-length / 2, radius, 0).project(camera);
        const p4 = new THREE.Vector3(-length / 2, -radius, 0).project(camera);

        setDimCoords({
          spanStart: {
            x: ((p1.x + 1) * w) / 2,
            y: ((-p1.y + 1) * h) / 2,
            visible: p1.z < 1,
          },
          spanEnd: {
            x: ((p2.x + 1) * w) / 2,
            y: ((-p2.y + 1) * h) / 2,
            visible: p2.z < 1,
          },
          diamTop: {
            x: ((p3.x + 1) * w) / 2,
            y: ((-p3.y + 1) * h) / 2,
            visible: p3.z < 1,
          },
          diamBottom: {
            x: ((p4.x + 1) * w) / 2,
            y: ((-p4.y + 1) * h) / 2,
            visible: p4.z < 1,
          },
        });

        // Compute 3D orientation triad projection
        const rotMat = new THREE.Matrix4().extractRotation(camera.matrixWorldInverse);
        const vecX = new THREE.Vector3(1, 0, 0).applyMatrix4(rotMat);
        const vecY = new THREE.Vector3(0, 1, 0).applyMatrix4(rotMat);
        const vecZ = new THREE.Vector3(0, 0, 1).applyMatrix4(rotMat);

        setTriadAxes({
          x: { x: vecX.x * 28, y: -vecX.y * 28 },
          y: { x: vecY.x * 28, y: -vecY.y * 28 },
          z: { x: vecZ.x * 28, y: -vecZ.y * 28 },
        });
      }

      renderer.render(scene, camera);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      if (newWidth <= 0 || newHeight <= 0) return;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Clean up Three.js resources
    return () => {
      resizeObserver.disconnect();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('click', handleClick);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [theme, length, radius]);

  // Build / Update the 3D Parametric CAD Model whenever geometry, material, or shading mode changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (modelGroupRef.current) {
      scene.remove(modelGroupRef.current);
      modelGroupRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
    }

    const modelGroup = new THREE.Group();
    modelGroupRef.current = modelGroup;

    // Reset mesh maps
    meshesMapRef.current = {
      shaftBody: [],
      leftJournal: [],
      rightJournal: [],
      gearHub: [],
      leftBearing: [],
      rightBearing: [],
      keywaySlot: [],
    };

    const baseMetalColor = getMaterialColor(selectedMaterial.name);
    const isWire = effectiveShadingMode === 'wireframe';
    const showEdges = effectiveShadingMode === 'edges';

    // Lathe turned metallic finish
    const createShaftMaterial = (partId: string) => {
      const isSelected = selectedComponent?.id === partId;
      const isHovered = hoveredPart === partId;

      if (effectiveShadingMode === 'stress') {
        const stressRatio = Math.min(equivalentStress / selectedMaterial.yieldStrength, 1.2);
        const stressColor = stressRatio > 1.0 ? 0xDC2626 : stressRatio > 0.75 ? 0xD97706 : 0x2563EB;
        return new THREE.MeshStandardMaterial({
          color: stressColor,
          metalness: 0.45,
          roughness: 0.35,
          wireframe: false,
        });
      }

      return new THREE.MeshStandardMaterial({
        color: isSelected ? 0x2563EB : isHovered ? 0x7C3AED : baseMetalColor,
        metalness: 0.68,
        roughness: 0.28,
        wireframe: isWire,
        emissive: isSelected ? 0x2563EB : isHovered ? 0x7C3AED : 0x000000,
        emissiveIntensity: isSelected ? 0.4 : isHovered ? 0.2 : 0.0,
      });
    };

    // Helper to add CAD outline edges
    const attachEdges = (mesh: THREE.Mesh) => {
      if (!showEdges) return;
      const edges = new THREE.EdgesGeometry(mesh.geometry, 28);
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({
          color: theme === 'dark' ? 0x28344E : 0x172033,
          linewidth: 1,
        })
      );
      mesh.add(line);
    };

    // 1. Center Main Shaft Span (Horizontal along X-axis)
    const shaftGeo = new THREE.CylinderGeometry(radius, radius, mainLength, 48);
    shaftGeo.rotateZ(Math.PI / 2);
    const shaftMesh = new THREE.Mesh(shaftGeo, createShaftMaterial('shaft'));
    shaftMesh.castShadow = true;
    shaftMesh.receiveShadow = true;
    shaftMesh.position.set(0, 0, 0);
    shaftMesh.userData = { partId: 'shaft', title: 'Main Shaft Span' };
    attachEdges(shaftMesh);
    modelGroup.add(shaftMesh);
    meshesMapRef.current.shaftBody.push(shaftMesh);

    // 2. Left Stepped Journal Shoulder
    const leftJournalGeo = new THREE.CylinderGeometry(journalRadius, journalRadius, journalLength, 48);
    leftJournalGeo.rotateZ(Math.PI / 2);
    const leftJournalMesh = new THREE.Mesh(leftJournalGeo, createShaftMaterial('shaft'));
    leftJournalMesh.castShadow = true;
    leftJournalMesh.receiveShadow = true;
    leftJournalMesh.position.set(-mainLength / 2 - journalLength / 2, 0, 0);
    leftJournalMesh.userData = { partId: 'shaft' };
    attachEdges(leftJournalMesh);
    modelGroup.add(leftJournalMesh);
    meshesMapRef.current.leftJournal.push(leftJournalMesh);

    // 3. Right Stepped Journal Shoulder
    const rightJournalGeo = new THREE.CylinderGeometry(journalRadius, journalRadius, journalLength, 48);
    rightJournalGeo.rotateZ(Math.PI / 2);
    const rightJournalMesh = new THREE.Mesh(rightJournalGeo, createShaftMaterial('shaft'));
    rightJournalMesh.castShadow = true;
    rightJournalMesh.receiveShadow = true;
    rightJournalMesh.position.set(mainLength / 2 + journalLength / 2, 0, 0);
    rightJournalMesh.userData = { partId: 'shaft' };
    attachEdges(rightJournalMesh);
    modelGroup.add(rightJournalMesh);
    meshesMapRef.current.rightJournal.push(rightJournalMesh);

    // 4. Stepped Transition Chamfer Rings
    const chamferLeftGeo = new THREE.CylinderGeometry(radius, journalRadius, 1.2 * scale, 48);
    chamferLeftGeo.rotateZ(Math.PI / 2);
    const chamferLeft = new THREE.Mesh(chamferLeftGeo, createShaftMaterial('shaft'));
    chamferLeft.position.set(-mainLength / 2, 0, 0);
    attachEdges(chamferLeft);
    modelGroup.add(chamferLeft);
    meshesMapRef.current.shaftBody.push(chamferLeft);

    const chamferRightGeo = new THREE.CylinderGeometry(journalRadius, radius, 1.2 * scale, 48);
    chamferRightGeo.rotateZ(Math.PI / 2);
    const chamferRight = new THREE.Mesh(chamferRightGeo, createShaftMaterial('shaft'));
    chamferRight.position.set(mainLength / 2, 0, 0);
    attachEdges(chamferRight);
    modelGroup.add(chamferRight);
    meshesMapRef.current.shaftBody.push(chamferRight);

    // 5. Midspan Spur Gear Hub Assembly
    const gearGroup = new THREE.Group();
    gearGroup.userData = { partId: 'gear' };

    const gearBodyGeo = new THREE.CylinderGeometry(gearRadius, gearRadius, gearWidth, 48);
    gearBodyGeo.rotateZ(Math.PI / 2);
    const gearMat = createShaftMaterial('gear');
    const gearMesh = new THREE.Mesh(gearBodyGeo, gearMat);
    gearMesh.castShadow = true;
    gearMesh.receiveShadow = true;
    attachEdges(gearMesh);
    gearGroup.add(gearMesh);

    // Lightening hub recess
    const recessGeo = new THREE.CylinderGeometry(gearRadius * 0.74, gearRadius * 0.74, gearWidth * 1.05, 36);
    recessGeo.rotateZ(Math.PI / 2);
    const recessMat = new THREE.MeshStandardMaterial({
      color: 0x1B2436,
      metalness: 0.8,
      roughness: 0.3,
    });
    const recessMesh = new THREE.Mesh(recessGeo, recessMat);
    attachEdges(recessMesh);
    gearGroup.add(recessMesh);

    // 20 Precision Involute Gear Teeth
    const numTeeth = 20;
    const toothHeight = Math.max(3.5 * scale, 1.2);
    const toothWidth = gearWidth * 0.98;
    const toothThickness = ((2 * Math.PI * gearRadius) / (numTeeth * 2)) * 0.85;

    for (let i = 0; i < numTeeth; i++) {
      const angle = (i / numTeeth) * Math.PI * 2;
      const toothGeo = new THREE.BoxGeometry(toothWidth, toothThickness, toothHeight);
      const toothMesh = new THREE.Mesh(toothGeo, gearMat);
      toothMesh.position.set(
        0,
        Math.cos(angle) * (gearRadius + toothHeight / 2 - 0.2),
        Math.sin(angle) * (gearRadius + toothHeight / 2 - 0.2)
      );
      toothMesh.rotation.x = -angle;
      toothMesh.castShadow = true;
      attachEdges(toothMesh);
      gearGroup.add(toothMesh);
    }
    modelGroup.add(gearGroup);
    meshesMapRef.current.gearHub.push(gearGroup);

    // 6. Deep Groove Ball Bearings (Support A & Support B)
    const createBearing = (xPos: number, partId: 'bearing-left' | 'bearing-right') => {
      const bearingGroup = new THREE.Group();
      bearingGroup.position.set(xPos, 0, 0);
      bearingGroup.userData = { partId };

      const bWidth = Math.max(journalLength * 0.55, 12 * scale);
      const bOuterR = journalRadius * 1.85;
      const bInnerR = journalRadius * 1.02;

      // Outer race
      const outerRaceGeo = new THREE.CylinderGeometry(bOuterR, bOuterR, bWidth, 36);
      outerRaceGeo.rotateZ(Math.PI / 2);
      const bearingMat = new THREE.MeshStandardMaterial({
        color: selectedComponent?.id === partId ? 0x315EDE : hoveredPart === partId ? 0x7653C9 : 0x8A96A0,
        metalness: 0.95,
        roughness: 0.15,
        wireframe: isWire,
      });
      const outerRace = new THREE.Mesh(outerRaceGeo, bearingMat);
      outerRace.castShadow = true;
      attachEdges(outerRace);
      bearingGroup.add(outerRace);

      // Inner bore groove
      const grooveGeo = new THREE.CylinderGeometry(bOuterR * 0.92, bOuterR * 0.92, bWidth * 1.02, 36);
      grooveGeo.rotateZ(Math.PI / 2);
      const grooveMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5 });
      const groove = new THREE.Mesh(grooveGeo, grooveMat);
      bearingGroup.add(groove);

      // Inner race
      const innerRaceGeo = new THREE.CylinderGeometry(bInnerR * 1.35, bInnerR * 1.35, bWidth * 1.05, 36);
      innerRaceGeo.rotateZ(Math.PI / 2);
      const innerRace = new THREE.Mesh(innerRaceGeo, bearingMat);
      attachEdges(innerRace);
      bearingGroup.add(innerRace);

      return bearingGroup;
    };

    const leftBearingX = -mainLength / 2 - journalLength * 0.5;
    const rightBearingX = mainLength / 2 + journalLength * 0.5;
    const leftBearingMesh = createBearing(leftBearingX, 'bearing-left');
    const rightBearingMesh = createBearing(rightBearingX, 'bearing-right');

    modelGroup.add(leftBearingMesh);
    modelGroup.add(rightBearingMesh);
    meshesMapRef.current.leftBearing.push(leftBearingMesh);
    meshesMapRef.current.rightBearing.push(rightBearingMesh);

    // 7. DIN 6885-1 Precision Keyway Slot
    const keywayWidth = (d_mm * 0.25) * scale;
    const keywayDepth = (d_mm * 0.1) * scale;
    const keywayLength = Math.max(30 * scale, gearWidth * 1.6);
    const keywayGeo = new THREE.BoxGeometry(keywayLength, keywayDepth, keywayWidth);
    const keywayMat = new THREE.MeshStandardMaterial({
      color: selectedComponent?.id === 'keyway' ? 0x315EDE : 0xC78B3B,
      metalness: 0.5,
      roughness: 0.4,
      wireframe: isWire,
    });
    const keywayMesh = new THREE.Mesh(keywayGeo, keywayMat);
    keywayMesh.position.set(0, radius - keywayDepth / 2, 0);
    keywayMesh.userData = { partId: 'keyway' };
    attachEdges(keywayMesh);
    modelGroup.add(keywayMesh);
    meshesMapRef.current.keywaySlot.push(keywayMesh);

    scene.add(modelGroup);

    // 8. ISO Engineering Centerline Indicator
    if (centerlineRef.current) {
      scene.remove(centerlineRef.current);
      centerlineRef.current.geometry.dispose();
    }
    if (showCenterline) {
      const linePoints = [
        new THREE.Vector3(-length * 0.72, 0, 0),
        new THREE.Vector3(length * 0.72, 0, 0),
      ];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
      const lineMat = new THREE.LineDashedMaterial({
        color: theme === 'dark' ? 0x64708A : 0x8A96A0,
        dashSize: 2,
        gapSize: 0.8,
        linewidth: 1,
      });
      const centerline = new THREE.Line(lineGeo, lineMat);
      centerline.computeLineDistances();
      scene.add(centerline);
      centerlineRef.current = centerline;
    }
  }, [
    designParams.diameter,
    designParams.length,
    designParams.force,
    designParams.torque,
    selectedMaterial.name,
    effectiveShadingMode,
    selectedComponent,
    hoveredPart,
    showCenterline,
    theme,
    getMaterialColor,
    scale,
    radius,
    length,
    journalRadius,
    journalLength,
    mainLength,
    gearRadius,
    gearWidth,
    d_mm,
    equivalentStress,
    selectedMaterial.yieldStrength,
  ]);

  // Sync OrbitControls mouse interaction mode with selected CAD tool
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    if (activeTool === 'pan') {
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE,
      };
    } else if (activeTool === 'zoom') {
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.DOLLY,
        MIDDLE: THREE.MOUSE.PAN,
        RIGHT: THREE.MOUSE.ROTATE,
      };
    } else {
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      };
    }
    controls.update();
  }, [activeTool]);

  // Handle visibility changes in Three.js meshes
  useEffect(() => {
    Object.entries(visibility).forEach(([key, isVis]) => {
      const meshes = meshesMapRef.current[key as keyof FeatureVisibility];
      if (meshes) {
        meshes.forEach((m) => {
          m.visible = isVis;
        });
      }
    });
  }, [visibility]);

  // Update grid visibility
  useEffect(() => {
    if (gridHelperRef.current) {
      gridHelperRef.current.visible = showGrid;
    }
  }, [showGrid]);

  // Smooth Camera Transition presets
  const triggerCameraTransition = (preset: ViewPreset) => {
    setCurrentView(preset);
    const camera = cameraRef.current;
    if (!camera) return;

    const maxSpan = Math.max(length, gearRadius * 2.5, 42);
    const dist = Math.max(maxSpan * 1.9, 54);
    const targetPos = new THREE.Vector3();

    switch (preset) {
      case 'Front':
        targetPos.set(0, 0, dist);
        break;
      case 'Back':
        targetPos.set(0, 0, -dist);
        break;
      case 'Side':
        targetPos.set(dist, 0, 0);
        break;
      case 'Top':
        targetPos.set(0, dist, 0.001);
        break;
      case 'Bottom':
        targetPos.set(0, -dist, 0.001);
        break;
      case 'Iso':
      default:
        targetPos.set(dist * 0.8, dist * 0.55, dist * 0.8);
        break;
    }

    cameraTargetRef.current = {
      pos: targetPos,
      lookAt: new THREE.Vector3(0, 0, 0),
      isAnimating: true,
      startTime: performance.now(),
      startPos: camera.position.clone(),
      duration: 500,
    };
  };

  // Fit to View (Auto-frame entire assembly)
  const handleFitToView = () => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const maxSpan = Math.max(length, gearRadius * 2.5, 42);
    const dist = Math.max(maxSpan * 1.85, 52);
    const currentAngle = camera.position.clone().normalize();
    const targetPos = currentAngle.multiplyScalar(dist);

    cameraTargetRef.current = {
      pos: targetPos,
      lookAt: new THREE.Vector3(0, 0, 0),
      isAnimating: true,
      startTime: performance.now(),
      startPos: camera.position.clone(),
      duration: 450,
    };
  };

  const handleZoom = (delta: number) => {
    const camera = cameraRef.current;
    if (!camera) return;
    const dir = camera.position.clone().normalize();
    const currentDist = camera.position.length();
    const newDist = Math.max(10, currentDist + delta);
    camera.position.copy(dir.multiplyScalar(newDist));
  };

  const handleCaptureScreenshot = () => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer || !scene || !camera) return;
    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `mech-copilot-cad-${designParams.diameter}x${designParams.length}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleVisibility = (key: keyof FeatureVisibility, e: React.MouseEvent) => {
    e.stopPropagation();
    setVisibility((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const viewPresets: ViewPreset[] = ['Iso', 'Front', 'Side', 'Top', 'Back', 'Bottom'];
  const stressRatioPct = Math.min(
    Math.round((equivalentStress / Math.max(selectedMaterial.yieldStrength, 1)) * 100),
    100
  );

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-[#F8FAFC] dark:bg-[#0F1929] overflow-hidden select-none min-h-0 min-w-0">
      {/* 1. COMPACT DOCKED CAD TOOLBAR ROW */}
      <div className="h-9 px-2 bg-white dark:bg-[#101A2B] border-b border-[#E2E8F0] dark:border-[#1E2D45] flex items-center justify-between gap-1 shrink-0 z-20 relative">
        {/* Left Navigation & Camera Tools */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => setActiveTool('select')}
            className={`flex items-center gap-1 px-2 py-1 rounded-[5px] text-[11px] font-medium transition-colors shrink-0 ${
              activeTool === 'select'
                ? 'bg-[#2563EB] text-white'
                : 'text-[#64748B] hover:text-[#172033] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1B2942]'
            }`}
            title="Select Component (Orbit + Click)"
          >
            <MousePointer size={12} />
            <span className="hidden 2xl:inline">Select</span>
          </button>

          <button
            onClick={() => setActiveTool('orbit')}
            className={`flex items-center gap-1 px-1.5 py-1 rounded-[5px] text-[11px] font-medium transition-colors shrink-0 ${
              activeTool === 'orbit'
                ? 'bg-[#EFF6FF] dark:bg-[#1B2942] text-[#2563EB] font-semibold'
                : 'text-[#64748B] hover:text-[#172033] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1B2942]'
            }`}
            title="Orbit Camera Mode"
          >
            <RotateCw size={12} />
            <span className="hidden 2xl:inline">Orbit</span>
          </button>

          <button
            onClick={() => setActiveTool('pan')}
            className={`flex items-center gap-1 px-1.5 py-1 rounded-[5px] text-[11px] font-medium transition-colors shrink-0 ${
              activeTool === 'pan'
                ? 'bg-[#EFF6FF] dark:bg-[#1B2942] text-[#2563EB] font-semibold'
                : 'text-[#64748B] hover:text-[#172033] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1B2942]'
            }`}
            title="Pan Camera Mode"
          >
            <Move size={12} />
            <span className="hidden 2xl:inline">Pan</span>
          </button>

          <div className="w-px h-4 bg-[#E2E8F0] dark:bg-[#334155] mx-0.5 shrink-0" />

          {/* View Orientation Dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => {
                setIsViewDropdownOpen(!isViewDropdownOpen);
                setIsDisplayDropdownOpen(false);
              }}
              className="flex items-center gap-1 px-1.5 py-1 rounded-[5px] text-[11px] font-medium text-[#64748B] hover:text-[#172033] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1B2942] transition-colors"
              title="Camera View Orientation"
            >
              <Box size={12} />
              <span>{currentView}</span>
              <ChevronDown size={10} />
            </button>

            {isViewDropdownOpen && (
              <div className="absolute top-full mt-1 left-0 w-32 bg-white dark:bg-[#101A2B] border border-[#E2E8F0] dark:border-[#1E2D45] rounded-[6px] shadow-[0_8px_24px_-4px_rgba(15,23,42,0.12)] py-1 z-50">
                {viewPresets.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => {
                      triggerCameraTransition(preset);
                      setIsViewDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left text-[11px] flex items-center justify-between ${
                      currentView === preset
                        ? 'text-[#2563EB] font-semibold bg-[#EFF6FF] dark:bg-[#1B2942]'
                        : 'text-[#172033] dark:text-[#F0F4FA] hover:bg-[#F8FAFC] dark:hover:bg-[#1B2942]'
                    }`}
                  >
                    <span>{preset}</span>
                    {currentView === preset && <CheckCircle2 size={11} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => handleZoom(-12)}
            className="hidden sm:inline-flex p-1.5 rounded-[5px] text-[#64748B] hover:text-[#172033] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1B2942] transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={13} />
          </button>

          <button
            onClick={() => handleZoom(12)}
            className="hidden sm:inline-flex p-1.5 rounded-[5px] text-[#64748B] hover:text-[#172033] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1B2942] transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={13} />
          </button>

          <button
            onClick={handleFitToView}
            className="flex items-center gap-1 px-1.5 py-1 rounded-[5px] text-[11px] font-medium text-[#64748B] hover:text-[#172033] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1B2942] transition-colors"
            title="Fit Assembly to Viewport"
          >
            <Maximize2 size={12} />
            <span className="hidden 2xl:inline">Fit</span>
          </button>
        </div>

        {/* Right: Display Shading & Dock Toggles */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Shading Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsDisplayDropdownOpen(!isDisplayDropdownOpen);
                setIsViewDropdownOpen(false);
              }}
              className="flex items-center gap-1 px-1.5 py-1 rounded-[5px] text-[11px] font-medium text-[#64748B] hover:text-[#172033] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1B2942] transition-colors"
              title="CAD Display Shading"
            >
              <span className="capitalize font-mono">{effectiveShadingMode}</span>
              <ChevronDown size={10} />
            </button>

            {isDisplayDropdownOpen && (
              <div className="absolute top-full mt-1 right-0 w-44 bg-white dark:bg-[#101A2B] border border-[#E2E8F0] dark:border-[#1E2D45] rounded-[6px] shadow-[0_8px_24px_-4px_rgba(15,23,42,0.12)] py-1 z-50">
                {(
                  [
                    { id: 'edges', label: 'Shaded with Edges' },
                    { id: 'realistic', label: 'Shaded PBR' },
                    { id: 'wireframe', label: 'Wireframe' },
                    { id: 'stress', label: 'Stress Heatmap' },
                  ] as const
                ).map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => {
                      setShadingMode(mode.id);
                      setIsDisplayDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left text-[11px] flex items-center justify-between ${
                      effectiveShadingMode === mode.id
                        ? 'text-[#2563EB] font-semibold bg-[#EFF6FF] dark:bg-[#1B2942]'
                        : 'text-[#172033] dark:text-[#F0F4FA] hover:bg-[#F8FAFC] dark:hover:bg-[#1B2942]'
                    }`}
                  >
                    <span>{mode.label}</span>
                    {effectiveShadingMode === mode.id && <CheckCircle2 size={11} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded-[5px] transition-colors ${
              showGrid
                ? 'bg-[#EFF6FF] text-[#2563EB] dark:bg-[#1B2942]'
                : 'text-[#64748B] hover:text-[#172033] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1B2942]'
            }`}
            title="Toggle Floor Grid"
          >
            <Grid3X3 size={13} />
          </button>

          <button
            onClick={() => setShowCenterline(!showCenterline)}
            className={`hidden sm:inline-flex p-1.5 rounded-[5px] transition-colors ${
              showCenterline
                ? 'bg-[#EFF6FF] text-[#2563EB] dark:bg-[#1B2942]'
                : 'text-[#64748B] hover:text-[#172033] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1B2942]'
            }`}
            title="Toggle Axis Centerline"
          >
            <Crosshair size={13} />
          </button>

          <button
            onClick={() => setShowDimensions(!showDimensions)}
            className={`hidden sm:inline-flex p-1.5 rounded-[5px] transition-colors ${
              showDimensions
                ? 'bg-[#EFF6FF] text-[#2563EB] dark:bg-[#1B2942]'
                : 'text-[#64748B] hover:text-[#172033] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1B2942]'
            }`}
            title="Toggle 3D Dimension Callouts"
          >
            <Compass size={13} />
          </button>

          <button
            onClick={() => setShowFeatureTree(!showFeatureTree)}
            className={`flex items-center gap-1 px-1.5 py-1 rounded-[5px] text-[11px] font-medium transition-colors ${
              showFeatureTree
                ? 'bg-[#EFF6FF] text-[#2563EB] dark:bg-[#1B2942] font-semibold'
                : 'text-[#64748B] hover:text-[#172033] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1B2942]'
            }`}
            title="Toggle Docked FeatureManager Tree"
          >
            <Layers size={13} />
            <span className="hidden 2xl:inline">Tree</span>
          </button>

          <button
            onClick={handleCaptureScreenshot}
            className="p-1.5 rounded-[5px] text-[#64748B] hover:text-[#172033] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1B2942] transition-colors"
            title="Export Viewport Snapshot (PNG)"
          >
            <Camera size={13} />
          </button>
        </div>
      </div>

      {/* 2. DOCKED BODY ROW: Left Feature Tree Column + Center 3D WebGL Viewport */}
      <div className="flex-1 flex min-h-0 min-w-0 relative overflow-hidden">
        {/* Docked FeatureManager Tree (No overlap over model) */}
        {showFeatureTree && (
          <aside className="w-[208px] shrink-0 h-full bg-white dark:bg-[#101A2B] border-r border-[#E2E8F0] dark:border-[#1E2D45] flex flex-col overflow-hidden">
            <div className="h-8 px-2.5 bg-[#F8FAFC] dark:bg-[#162236] border-b border-[#E2E8F0] dark:border-[#1E2D45] flex items-center justify-between text-[11px] font-semibold text-[#172033] dark:text-white shrink-0">
              <div className="flex items-center gap-1.5 truncate">
                <Layers size={12} className="text-[#2563EB] shrink-0" />
                <span className="truncate">Feature Tree</span>
              </div>
              <span className="text-[10px] font-mono text-[#64748B]">ASM</span>
            </div>

            <div className="flex-1 p-2 overflow-y-auto space-y-1 text-[11px]">
              {/* Assembly Root */}
              <div className="flex items-center gap-1.5 px-2 py-1 font-semibold text-[#172033] dark:text-white bg-[#F8FAFC] dark:bg-[#1B2942] rounded-[5px] border border-[#E2E8F0] dark:border-[#24344F]">
                <Box size={12} className="text-[#2563EB] shrink-0" />
                <span className="truncate">Shaft Assembly</span>
              </div>

              {/* Shaft Body */}
              <div
                onClick={() =>
                  onSelectComponent({
                    id: 'shaft',
                    name: 'Power Transmission Main Span',
                    type: 'Rotary Stepped Shaft Cylinder',
                    material: selectedMaterial.name,
                    status: isPass ? 'pass' : 'warning',
                    specs: {
                      Diameter: `⌀${designParams.diameter.toFixed(1)} mm`,
                      Length: `${designParams.length.toFixed(1)} mm`,
                      Material: selectedMaterial.name,
                    },
                    suggestedPrompt: `Check stress and deflection for ${designParams.diameter}mm shaft body`,
                  })
                }
                className={`flex items-center justify-between px-2 py-1 rounded-[5px] cursor-pointer transition-colors ${
                  selectedComponent?.id === 'shaft'
                    ? 'bg-[#EFF6FF] dark:bg-[#2563EB]/20 text-[#2563EB] font-semibold'
                    : 'hover:bg-[#F8FAFC] dark:hover:bg-[#1B2942] text-[#172033] dark:text-[#E2E8F0]'
                }`}
              >
                <div className="flex items-center gap-1 truncate">
                  <ChevronRight size={11} className="text-[#64748B] shrink-0" />
                  <span className="truncate">Shaft (⌀{designParams.diameter}×{designParams.length})</span>
                </div>
                <button
                  onClick={(e) => toggleVisibility('shaftBody', e)}
                  className="p-0.5 text-[#64748B] hover:text-[#2563EB] shrink-0"
                  title="Toggle Shaft Visibility"
                >
                  {visibility.shaftBody ? <Eye size={12} /> : <EyeOff size={12} className="text-[#DC2626]" />}
                </button>
              </div>

              {/* Journals */}
              <div
                onClick={() =>
                  onSelectComponent({
                    id: 'shaft',
                    name: 'Left Stepped Journal Shoulder',
                    type: 'Bearing Fit Journal',
                    material: selectedMaterial.name,
                    status: 'pass',
                    specs: {
                      Diameter: `⌀${(d_mm * 0.9).toFixed(1)} mm`,
                      Length: `${(journalLength / scale).toFixed(1)} mm`,
                    },
                    suggestedPrompt: 'Inspect journal shoulder stress concentration factor',
                  })
                }
                className="flex items-center justify-between px-2 py-1 rounded-[5px] cursor-pointer hover:bg-[#F8FAFC] dark:hover:bg-[#1B2942] text-[#172033] dark:text-[#E2E8F0]"
              >
                <div className="flex items-center gap-1 truncate">
                  <ChevronRight size={11} className="text-[#64748B] shrink-0" />
                  <span className="truncate">Journals (⌀{(d_mm * 0.9).toFixed(1)})</span>
                </div>
                <button
                  onClick={(e) => {
                    toggleVisibility('leftJournal', e);
                    toggleVisibility('rightJournal', e);
                  }}
                  className="p-0.5 text-[#64748B] hover:text-[#2563EB] shrink-0"
                  title="Toggle Journal Visibility"
                >
                  {visibility.leftJournal && visibility.rightJournal ? (
                    <Eye size={12} />
                  ) : (
                    <EyeOff size={12} className="text-[#DC2626]" />
                  )}
                </button>
              </div>

              {/* Keyway */}
              <div
                onClick={() =>
                  onSelectComponent({
                    id: 'keyway',
                    name: 'DIN 6885-1 Parallel Keyway',
                    type: 'Form A Round-Ended Keyway Seat',
                    material: 'C45+C Drawn Keyway Steel',
                    status: 'pass',
                    specs: {
                      Standard: 'DIN 6885-1',
                      FilletRadius: `r ≥ ${(d_mm * 0.05).toFixed(1)} mm`,
                      Width: `${(d_mm * 0.25).toFixed(1)} mm`,
                    },
                    suggestedPrompt: 'Calculate keyway shear stress and shaft torsional notch factor Kt',
                  })
                }
                className={`flex items-center justify-between px-2 py-1 rounded-[5px] cursor-pointer transition-colors ${
                  selectedComponent?.id === 'keyway'
                    ? 'bg-[#EFF6FF] dark:bg-[#2563EB]/20 text-[#2563EB] font-semibold'
                    : 'hover:bg-[#F8FAFC] dark:hover:bg-[#1B2942] text-[#172033] dark:text-[#E2E8F0]'
                }`}
              >
                <div className="flex items-center gap-1 truncate">
                  <ChevronRight size={11} className="text-[#64748B] shrink-0" />
                  <span className="truncate">DIN 6885-1 Keyway</span>
                </div>
                <button
                  onClick={(e) => toggleVisibility('keywaySlot', e)}
                  className="p-0.5 text-[#64748B] hover:text-[#2563EB] shrink-0"
                  title="Toggle Keyway Visibility"
                >
                  {visibility.keywaySlot ? <Eye size={12} /> : <EyeOff size={12} className="text-[#DC2626]" />}
                </button>
              </div>

              {/* Spur Gear Hub */}
              <div
                onClick={() =>
                  onSelectComponent({
                    id: 'gear',
                    name: 'Spur Gear Midspan Hub',
                    type: 'Involute Spur Gear Hub (DIN 5480 / ISO 53)',
                    material: selectedMaterial.name,
                    status: 'pass',
                    specs: {
                      PitchDiameter: `⌀${(d_mm * 2.4).toFixed(0)} mm`,
                      FaceWidth: `${(gearWidth / scale).toFixed(0)} mm`,
                      RadialLoad: `${designParams.force} N`,
                      AppliedTorque: `${designParams.torque} N·m`,
                    },
                    suggestedPrompt: 'Analyze gear tooth contact pressure and root bending stress',
                  })
                }
                className={`flex items-center justify-between px-2 py-1 rounded-[5px] cursor-pointer transition-colors ${
                  selectedComponent?.id === 'gear'
                    ? 'bg-[#EFF6FF] dark:bg-[#2563EB]/20 text-[#2563EB] font-semibold'
                    : 'hover:bg-[#F8FAFC] dark:hover:bg-[#1B2942] text-[#172033] dark:text-[#E2E8F0]'
                }`}
              >
                <div className="flex items-center gap-1 truncate">
                  <ChevronRight size={11} className="text-[#64748B] shrink-0" />
                  <span className="truncate">Spur Gear Hub</span>
                </div>
                <button
                  onClick={(e) => toggleVisibility('gearHub', e)}
                  className="p-0.5 text-[#64748B] hover:text-[#2563EB] shrink-0"
                  title="Toggle Gear Hub Visibility"
                >
                  {visibility.gearHub ? <Eye size={12} /> : <EyeOff size={12} className="text-[#DC2626]" />}
                </button>
              </div>

              {/* Left Ball Bearing */}
              <div
                onClick={() =>
                  onSelectComponent({
                    id: 'bearing-left',
                    name: 'Deep Groove Ball Bearing (Support A)',
                    type: 'Radial Deep Groove Bearing (ISO 281)',
                    material: '100Cr6 High-Carbon Bearing Steel',
                    status: 'pass',
                    specs: {
                      Bore: `⌀${(d_mm * 0.9).toFixed(0)} mm`,
                      JournalWidth: `${(journalLength / scale).toFixed(0)} mm`,
                      RadialReaction: `${(designParams.force / 2).toFixed(1)} N`,
                    },
                    suggestedPrompt: 'Calculate ISO 281 L10 rating life for left journal bearing',
                  })
                }
                className={`flex items-center justify-between px-2 py-1 rounded-[5px] cursor-pointer transition-colors ${
                  selectedComponent?.id === 'bearing-left'
                    ? 'bg-[#EFF6FF] dark:bg-[#2563EB]/20 text-[#2563EB] font-semibold'
                    : 'hover:bg-[#F8FAFC] dark:hover:bg-[#1B2942] text-[#172033] dark:text-[#E2E8F0]'
                }`}
              >
                <div className="flex items-center gap-1 truncate">
                  <ChevronRight size={11} className="text-[#64748B] shrink-0" />
                  <span className="truncate">Bearing A (ISO 281)</span>
                </div>
                <button
                  onClick={(e) => toggleVisibility('leftBearing', e)}
                  className="p-0.5 text-[#64748B] hover:text-[#2563EB] shrink-0"
                  title="Toggle Bearing A Visibility"
                >
                  {visibility.leftBearing ? <Eye size={12} /> : <EyeOff size={12} className="text-[#DC2626]" />}
                </button>
              </div>

              {/* Right Ball Bearing */}
              <div
                onClick={() =>
                  onSelectComponent({
                    id: 'bearing-right',
                    name: 'Deep Groove Ball Bearing (Support B)',
                    type: 'Radial Deep Groove Bearing (ISO 281)',
                    material: '100Cr6 High-Carbon Bearing Steel',
                    status: 'pass',
                    specs: {
                      Bore: `⌀${(d_mm * 0.9).toFixed(0)} mm`,
                      JournalWidth: `${(journalLength / scale).toFixed(0)} mm`,
                      RadialReaction: `${(designParams.force / 2).toFixed(1)} N`,
                    },
                    suggestedPrompt: 'Calculate ISO 281 L10 rating life for right journal bearing',
                  })
                }
                className={`flex items-center justify-between px-2 py-1 rounded-[5px] cursor-pointer transition-colors ${
                  selectedComponent?.id === 'bearing-right'
                    ? 'bg-[#EFF6FF] dark:bg-[#2563EB]/20 text-[#2563EB] font-semibold'
                    : 'hover:bg-[#F8FAFC] dark:hover:bg-[#1B2942] text-[#172033] dark:text-[#E2E8F0]'
                }`}
              >
                <div className="flex items-center gap-1 truncate">
                  <ChevronRight size={11} className="text-[#64748B] shrink-0" />
                  <span className="truncate">Bearing B (ISO 281)</span>
                </div>
                <button
                  onClick={(e) => toggleVisibility('rightBearing', e)}
                  className="p-0.5 text-[#64748B] hover:text-[#2563EB] shrink-0"
                  title="Toggle Bearing B Visibility"
                >
                  {visibility.rightBearing ? <Eye size={12} /> : <EyeOff size={12} className="text-[#DC2626]" />}
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* 3D WebGL Stage Wrapper */}
        <div className="flex-1 min-w-0 min-h-0 relative overflow-hidden">
          {/* Interactive 3D Orientation Triad */}
          <div className="absolute top-3 right-3 z-20">
            <div className="relative w-20 h-20 bg-white/90 dark:bg-[#101A2B]/90 backdrop-blur-sm rounded-[8px] border border-[#E2E8F0] dark:border-[#1E2D45] shadow-xs flex items-center justify-center">
              <svg width="70" height="70" viewBox="-40 -40 80 80" className="overflow-visible select-none">
                <circle cx="0" cy="0" r="2.5" fill="#172033" className="dark:fill-white" />

                <line x1="0" y1="0" x2={triadAxes.x.x} y2={triadAxes.x.y} stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" />
                <circle cx={triadAxes.x.x} cy={triadAxes.x.y} r="5.5" fill="#DC2626" />
                <text x={triadAxes.x.x} y={triadAxes.x.y + 3} fill="#FFFFFF" fontSize="8" fontWeight="bold" textAnchor="middle" className="cursor-pointer" onClick={() => triggerCameraTransition('Side')}>
                  X
                </text>

                <line x1="0" y1="0" x2={triadAxes.y.x} y2={triadAxes.y.y} stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" />
                <circle cx={triadAxes.y.x} cy={triadAxes.y.y} r="5.5" fill="#16A34A" />
                <text x={triadAxes.y.x} y={triadAxes.y.y + 3} fill="#FFFFFF" fontSize="8" fontWeight="bold" textAnchor="middle" className="cursor-pointer" onClick={() => triggerCameraTransition('Top')}>
                  Y
                </text>

                <line x1="0" y1="0" x2={triadAxes.z.x} y2={triadAxes.z.y} stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round" />
                <circle cx={triadAxes.z.x} cy={triadAxes.z.y} r="5.5" fill="#2563EB" />
                <text x={triadAxes.z.x} y={triadAxes.z.y + 3} fill="#FFFFFF" fontSize="8" fontWeight="bold" textAnchor="middle" className="cursor-pointer" onClick={() => triggerCameraTransition('Front')}>
                  Z
                </text>
              </svg>

              <button
                onClick={() => triggerCameraTransition('Iso')}
                className="absolute bottom-1 right-1 text-[8px] font-mono font-bold px-1 rounded bg-[#F1F5F9] dark:bg-[#1B2942] text-[#2563EB] hover:bg-[#2563EB] hover:text-white transition-colors"
                title="Reset to Isometric View"
              >
                ISO
              </button>
            </div>
          </div>

          {/* Stress Heatmap Legend when in Stress mode */}
          {effectiveShadingMode === 'stress' && (
            <div className="absolute bottom-3 left-3 z-20 px-3 py-2 rounded-[8px] bg-white/95 dark:bg-[#101A2B]/95 border border-[#E2E8F0] dark:border-[#1E2D45] shadow-xs font-mono text-[10px]">
              <div className="font-bold text-[#172033] dark:text-white mb-1 flex items-center justify-between gap-4">
                <span>{criterion} Stress</span>
                <span className="text-[#2563EB] tabular-nums">{equivalentStress.toFixed(1)} MPa ({stressRatioPct}% Sy)</span>
              </div>
              <div className="w-44 h-2 rounded-full bg-gradient-to-r from-[#2563EB] via-[#D97706] to-[#DC2626] mb-1" />
              <div className="flex justify-between text-[#64748B] text-[9px] tabular-nums">
                <span>0 MPa</span>
                <span>{(selectedMaterial.yieldStrength * 0.75).toFixed(0)} MPa</span>
                <span>{selectedMaterial.yieldStrength} MPa</span>
              </div>
            </div>
          )}

          {/* Projected 3D Dimension Callout Overlay */}
          {showDimensions && (
            <svg ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none z-10">
              <defs>
                <marker
                  id="cad-dim-arrow"
                  viewBox="0 0 10 10"
                  refX="5"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#172033" className="dark:fill-white" />
                </marker>
              </defs>

              {dimCoords.spanStart.visible && dimCoords.spanEnd.visible && (
                <g className="span-dim-group">
                  <line
                    x1={dimCoords.spanStart.x}
                    y1={dimCoords.spanStart.y}
                    x2={dimCoords.spanStart.x}
                    y2={Math.min(dimCoords.spanStart.y, dimCoords.spanEnd.y) - 54}
                    stroke="#64748B"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <line
                    x1={dimCoords.spanEnd.x}
                    y1={dimCoords.spanEnd.y}
                    x2={dimCoords.spanEnd.x}
                    y2={Math.min(dimCoords.spanStart.y, dimCoords.spanEnd.y) - 54}
                    stroke="#64748B"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <line
                    x1={dimCoords.spanStart.x}
                    y1={Math.min(dimCoords.spanStart.y, dimCoords.spanEnd.y) - 46}
                    x2={dimCoords.spanEnd.x}
                    y2={Math.min(dimCoords.spanStart.y, dimCoords.spanEnd.y) - 46}
                    stroke="#172033"
                    className="dark:stroke-white"
                    strokeWidth="1.2"
                    markerStart="url(#cad-dim-arrow)"
                    markerEnd="url(#cad-dim-arrow)"
                  />
                  <rect
                    x={(dimCoords.spanStart.x + dimCoords.spanEnd.x) / 2 - 38}
                    y={Math.min(dimCoords.spanStart.y, dimCoords.spanEnd.y) - 60}
                    width="76"
                    height="17"
                    rx="4"
                    fill="#FFFFFF"
                    className="dark:fill-[#101A2B]"
                  />
                  <text
                    x={(dimCoords.spanStart.x + dimCoords.spanEnd.x) / 2}
                    y={Math.min(dimCoords.spanStart.y, dimCoords.spanEnd.y) - 48}
                    fill="#172033"
                    className="dark:fill-white"
                    fontSize="11"
                    fontFamily="IBM Plex Mono, monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {designParams.length.toFixed(1)} mm
                  </text>
                </g>
              )}

              {dimCoords.diamTop.visible && dimCoords.diamBottom.visible && (
                <g className="diam-dim-group">
                  <line
                    x1={dimCoords.diamTop.x}
                    y1={dimCoords.diamTop.y}
                    x2={dimCoords.diamTop.x - 46}
                    y2={dimCoords.diamTop.y}
                    stroke="#64748B"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <line
                    x1={dimCoords.diamBottom.x}
                    y1={dimCoords.diamBottom.y}
                    x2={dimCoords.diamBottom.x - 46}
                    y2={dimCoords.diamBottom.y}
                    stroke="#64748B"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <line
                    x1={dimCoords.diamTop.x - 36}
                    y1={dimCoords.diamTop.y}
                    x2={dimCoords.diamTop.x - 36}
                    y2={dimCoords.diamBottom.y}
                    stroke="#172033"
                    className="dark:stroke-white"
                    strokeWidth="1.2"
                    markerStart="url(#cad-dim-arrow)"
                    markerEnd="url(#cad-dim-arrow)"
                  />
                  <text
                    x={dimCoords.diamTop.x - 44}
                    y={(dimCoords.diamTop.y + dimCoords.diamBottom.y) / 2}
                    fill="#172033"
                    className="dark:fill-white"
                    fontSize="10"
                    fontFamily="IBM Plex Mono, monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                    transform={`rotate(-90, ${dimCoords.diamTop.x - 44}, ${(dimCoords.diamTop.y + dimCoords.diamBottom.y) / 2})`}
                  >
                    ⌀ {designParams.diameter.toFixed(1)} mm
                  </text>
                </g>
              )}
            </svg>
          )}

          {/* WebGL Canvas Container */}
          <div
            ref={mountRef}
            className="w-full h-full cursor-grab active:cursor-grabbing outline-none"
          />
        </div>
      </div>

      {/* Click-outside to close viewport dropdowns */}
      {(isDisplayDropdownOpen || isViewDropdownOpen) && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setIsDisplayDropdownOpen(false);
            setIsViewDropdownOpen(false);
          }}
        />
      )}
    </div>
  );
};
