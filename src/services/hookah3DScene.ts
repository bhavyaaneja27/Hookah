import * as THREE from 'three';
import type { AppState, PipePosition, Point2D } from '../types/hookah';

export class Hookah3DScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  // Main hookah group (base + stem + bowl)
  private hookahGroup: THREE.Group;

  // Mouthpiece
  private mouthpieceGroup: THREE.Group;

  // Hose mesh (rebuilt each frame)
  private hoseMesh: THREE.Mesh | null = null;
  private hoseMaterial: THREE.MeshStandardMaterial;

  // Animated parts
  private coalEmbersMesh: THREE.Mesh;
  private waterMesh: THREE.Mesh;

  // Smoothed 3D positions to avoid jitter
  private smoothedHookahPos: THREE.Vector3 = new THREE.Vector3();
  private smoothedPipePos: THREE.Vector3 = new THREE.Vector3();
  private posLerp = 0.12; // Position smoothing factor

  private canvasWidth = 1280;
  private canvasHeight = 720;

  constructor(canvas: HTMLCanvasElement) {
    this.canvasWidth = canvas.width || window.innerWidth;
    this.canvasHeight = canvas.height || window.innerHeight;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      42,
      this.canvasWidth / this.canvasHeight,
      0.1,
      500
    );
    this.camera.position.set(0, 0, 11);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.canvasWidth, this.canvasHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // ─── Lighting ────────────────────────────────────────────────────────────
    // Warm overhead fill
    const ambient = new THREE.AmbientLight(0xfff8f0, 1.4);
    this.scene.add(ambient);

    // Key light (upper right, warm)
    const keyLight = new THREE.DirectionalLight(0xfff3d0, 2.6);
    keyLight.position.set(6, 14, 10);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    this.scene.add(keyLight);

    // Cool fill light (left)
    const fillLight = new THREE.DirectionalLight(0xb0d8ff, 0.7);
    fillLight.position.set(-8, 3, 5);
    this.scene.add(fillLight);

    // Rim back light
    const rimLight = new THREE.DirectionalLight(0xffd590, 0.6);
    rimLight.position.set(2, -4, -8);
    this.scene.add(rimLight);

    // Coal ember glow
    const coalGlow = new THREE.PointLight(0xff5500, 3.5, 4.5);
    coalGlow.position.set(0, 5.5, 0.2);
    this.scene.add(coalGlow);

    // ─── Shared Materials ────────────────────────────────────────────────────

    // Polished gold / brass
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xc8960c,
      metalness: 0.92,
      roughness: 0.18
    });

    // Bright polished brass (lighter highlight areas)
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xe8b820,
      metalness: 0.88,
      roughness: 0.22
    });

    // Deep cobalt blue enamel (stem sections & bowl)
    const blueMat = new THREE.MeshStandardMaterial({
      color: 0x1a2fa0,
      metalness: 0.15,
      roughness: 0.35
    });

    // Accent turquoise enamel
    const tealMat = new THREE.MeshStandardMaterial({
      color: 0x00897b,
      metalness: 0.1,
      roughness: 0.4
    });

    // Orange-red base with slight transparency (decorated glass/ceramic)
    const baseMat = new THREE.MeshPhysicalMaterial({
      color: 0xd4380a,
      roughness: 0.28,
      metalness: 0.08,
      transparent: true,
      opacity: 0.92,
      clearcoat: 0.7,
      clearcoatRoughness: 0.15,
      reflectivity: 0.6
    });

    // Water inside base
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x00bcd4,
      roughness: 0.08,
      metalness: 0.0,
      transparent: true,
      opacity: 0.78
    });

    // Braided rope hose (golden-brown)
    this.hoseMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b6914,
      metalness: 0.3,
      roughness: 0.75
    });

    // ─── Hookah Group ────────────────────────────────────────────────────────
    this.hookahGroup = new THREE.Group();

    // --- Contact shadow ellipse ---
    const shadowGeo = new THREE.CircleGeometry(1.4, 32);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.38,
      depthWrite: false
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -0.02;
    this.hookahGroup.add(shadowMesh);

    // ─── A. Spherical Base ────────────────────────────────────────────────────
    // Outer sphere (orange-red decorated glass)
    const sphereGeo = new THREE.SphereGeometry(1.22, 48, 48);
    this.waterMesh = new THREE.Mesh(sphereGeo, baseMat); // assign to ref for animation
    this.waterMesh.position.y = 1.22;
    this.waterMesh.castShadow = true;
    this.hookahGroup.add(this.waterMesh);

    // Inner water visible through glass
    const waterSphereGeo = new THREE.SphereGeometry(1.05, 32, 32);
    const waterMesh2 = new THREE.Mesh(waterSphereGeo, waterMat);
    waterMesh2.position.y = 1.05;
    this.hookahGroup.add(waterMesh2);

    // Decorative teal floral band (torus ring)
    const floralBand = new THREE.TorusGeometry(1.15, 0.08, 16, 64);
    const floralMesh = new THREE.Mesh(floralBand, tealMat);
    floralMesh.position.y = 1.22;
    floralMesh.rotation.x = Math.PI / 2;
    this.hookahGroup.add(floralMesh);

    // Gold rim at equator of base sphere
    const baseRimGeo = new THREE.TorusGeometry(1.18, 0.055, 12, 64);
    const baseRimMesh = new THREE.Mesh(baseRimGeo, goldMat);
    baseRimMesh.position.y = 1.22;
    baseRimMesh.rotation.x = Math.PI / 2;
    this.hookahGroup.add(baseRimMesh);

    // Gold base bottom collar
    const bottomCollarGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.22, 32);
    const bottomCollar = new THREE.Mesh(bottomCollarGeo, goldMat);
    bottomCollar.position.y = 0.11;
    this.hookahGroup.add(bottomCollar);

    // Gold neck / throat collar at top of sphere
    const neckCollarGeo = new THREE.CylinderGeometry(0.28, 0.36, 0.25, 32);
    const neckCollar = new THREE.Mesh(neckCollarGeo, goldMat);
    neckCollar.position.y = 2.42;
    this.hookahGroup.add(neckCollar);

    // ─── B. Stem ─────────────────────────────────────────────────────────────
    this.hookahGroup.add(this.buildStem(goldMat, brassMat, blueMat, tealMat));

    // ─── C. Tray ─────────────────────────────────────────────────────────────
    // Wide gold disc tray
    const trayGeo = new THREE.CylinderGeometry(1.15, 1.1, 0.07, 64);
    const trayMesh = new THREE.Mesh(trayGeo, brassMat);
    trayMesh.position.y = 5.5;
    trayMesh.castShadow = true;
    this.hookahGroup.add(trayMesh);

    // Tray rim ring
    const trayRimGeo = new THREE.TorusGeometry(1.1, 0.06, 12, 64);
    const trayRim = new THREE.Mesh(trayRimGeo, goldMat);
    trayRim.position.y = 5.53;
    trayRim.rotation.x = Math.PI / 2;
    this.hookahGroup.add(trayRim);

    // ─── D. Bowl ─────────────────────────────────────────────────────────────
    const bowlPoints: THREE.Vector2[] = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.22, 0.04),
      new THREE.Vector2(0.35, 0.32),
      new THREE.Vector2(0.42, 0.55),
      new THREE.Vector2(0.38, 0.72),
      new THREE.Vector2(0.22, 0.78),
      new THREE.Vector2(0.0, 0.78)
    ];
    const bowlGeo = new THREE.LatheGeometry(bowlPoints, 36);
    const bowlMesh = new THREE.Mesh(bowlGeo, blueMat);
    bowlMesh.position.y = 5.57;
    bowlMesh.castShadow = true;
    this.hookahGroup.add(bowlMesh);

    // Bowl gold rim
    const bowlRimGeo = new THREE.TorusGeometry(0.39, 0.045, 12, 48);
    const bowlRim = new THREE.Mesh(bowlRimGeo, goldMat);
    bowlRim.position.y = 6.28;
    bowlRim.rotation.x = Math.PI / 2;
    this.hookahGroup.add(bowlRim);

    // ─── E. Charcoal Embers ───────────────────────────────────────────────────
    const coalGeo = new THREE.DodecahedronGeometry(0.26, 1);
    const coalMat = new THREE.MeshStandardMaterial({
      color: 0x1a1008,
      roughness: 0.9,
      emissive: new THREE.Color(0xff4400),
      emissiveIntensity: 2.0
    });
    this.coalEmbersMesh = new THREE.Mesh(coalGeo, coalMat);
    this.coalEmbersMesh.position.y = 6.52;
    this.hookahGroup.add(this.coalEmbersMesh);

    this.scene.add(this.hookahGroup);

    // ─── Mouthpiece ──────────────────────────────────────────────────────────
    this.mouthpieceGroup = new THREE.Group();
    this.buildMouthpiece(goldMat, brassMat);
    this.scene.add(this.mouthpieceGroup);
  }

  private buildStem(
    goldMat: THREE.MeshStandardMaterial,
    brassMat: THREE.MeshStandardMaterial,
    blueMat: THREE.MeshStandardMaterial,
    tealMat: THREE.MeshStandardMaterial
  ): THREE.Group {
    const stemGroup = new THREE.Group();

    // Lower stem shaft (gold/brass, from neck collar up)
    const lowerStemGeo = new THREE.CylinderGeometry(0.1, 0.13, 0.8, 28);
    const lowerStem = new THREE.Mesh(lowerStemGeo, goldMat);
    lowerStem.position.y = 2.95;
    stemGroup.add(lowerStem);

    // ── Decorated Stem Section 1 (blue enamel barrel) ──
    const barrel1Geo = new THREE.CylinderGeometry(0.22, 0.22, 0.65, 32);
    const barrel1 = new THREE.Mesh(barrel1Geo, blueMat);
    barrel1.position.y = 3.55;
    stemGroup.add(barrel1);
    const ring1a = this.makeRing(0.235, goldMat, 3.28);
    const ring1b = this.makeRing(0.235, goldMat, 3.88);
    stemGroup.add(ring1a, ring1b);

    // Teal accent ring in mid section
    const tealRing1Geo = new THREE.TorusGeometry(0.228, 0.032, 10, 40);
    const tealRing1 = new THREE.Mesh(tealRing1Geo, tealMat);
    tealRing1.position.y = 3.55;
    tealRing1.rotation.x = Math.PI / 2;
    stemGroup.add(tealRing1);

    // ── Mid gold connector ──
    const midConnGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.38, 28);
    const midConn = new THREE.Mesh(midConnGeo, brassMat);
    midConn.position.y = 4.07;
    stemGroup.add(midConn);

    // ── Hose port connector (gold cylinder, angled outward) ──
    const portGroup = new THREE.Group();
    portGroup.position.set(0, 4.1, 0);
    const portGeo = new THREE.CylinderGeometry(0.09, 0.11, 0.48, 16);
    const portMesh = new THREE.Mesh(portGeo, goldMat);
    portMesh.rotation.z = -Math.PI / 2.5;
    portMesh.position.set(0.28, 0.1, 0);
    portGroup.add(portMesh);
    stemGroup.add(portGroup);

    // ── Decorated Stem Section 2 (blue enamel barrel, slightly larger) ──
    const barrel2Geo = new THREE.CylinderGeometry(0.2, 0.2, 0.6, 32);
    const barrel2 = new THREE.Mesh(barrel2Geo, blueMat);
    barrel2.position.y = 4.56;
    stemGroup.add(barrel2);
    stemGroup.add(this.makeRing(0.218, goldMat, 4.28));
    stemGroup.add(this.makeRing(0.218, goldMat, 4.86));

    // Teal accent
    const tealRing2Geo = new THREE.TorusGeometry(0.21, 0.03, 10, 40);
    const tealRing2 = new THREE.Mesh(tealRing2Geo, tealMat);
    tealRing2.position.y = 4.56;
    tealRing2.rotation.x = Math.PI / 2;
    stemGroup.add(tealRing2);

    // ── Upper gold connector ──
    const upperConnGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.5, 28);
    const upperConn = new THREE.Mesh(upperConnGeo, brassMat);
    upperConn.position.y = 5.1;
    stemGroup.add(upperConn);

    return stemGroup;
  }

  private makeRing(radius: number, mat: THREE.MeshStandardMaterial, y: number): THREE.Mesh {
    const geo = new THREE.TorusGeometry(radius, 0.045, 12, 48);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = y;
    mesh.rotation.x = Math.PI / 2;
    return mesh;
  }

  private buildMouthpiece(
    goldMat: THREE.MeshStandardMaterial,
    brassMat: THREE.MeshStandardMaterial
  ) {
    // Main handle grip
    const handleGeo = new THREE.CylinderGeometry(0.07, 0.09, 1.05, 20);
    const handle = new THREE.Mesh(handleGeo, goldMat);
    handle.rotation.z = Math.PI / 2;
    this.mouthpieceGroup.add(handle);

    // Grip texture rings
    for (let i = 0; i < 4; i++) {
      const gRingGeo = new THREE.TorusGeometry(0.09, 0.022, 8, 24);
      const gRing = new THREE.Mesh(gRingGeo, brassMat);
      gRing.rotation.y = Math.PI / 2;
      gRing.position.x = -0.3 + i * 0.18;
      this.mouthpieceGroup.add(gRing);
    }

    // Taper tip
    const tipGeo = new THREE.ConeGeometry(0.06, 0.5, 20);
    const tip = new THREE.Mesh(tipGeo, brassMat);
    tip.rotation.z = -Math.PI / 2;
    tip.position.x = 0.75;
    this.mouthpieceGroup.add(tip);
  }

  resize(width: number, height: number) {
    if (width <= 0 || height <= 0) return;
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private screenToWorld(screenX: number, screenY: number, targetZ = 0): THREE.Vector3 {
    const ndcX = (screenX / this.canvasWidth) * 2 - 1;
    const ndcY = -(screenY / this.canvasHeight) * 2 + 1;
    const vec = new THREE.Vector3(ndcX, ndcY, 0.5);
    vec.unproject(this.camera);
    const dir = vec.sub(this.camera.position).normalize();
    const distance = (targetZ - this.camera.position.z) / dir.z;
    return this.camera.position.clone().add(dir.multiplyScalar(distance));
  }

  update(
    base2DPos: Point2D,
    pipePos: PipePosition,
    appState: AppState,
    timestampMs: number
  ) {
    // ── 1. Smooth hookah base position ────────────────────────────────────────
    const targetHookahPos = this.screenToWorld(base2DPos.x, base2DPos.y, 0);
    // Offset downward so the sphere sits on the "table"
    targetHookahPos.y -= 1.22;

    this.smoothedHookahPos.lerp(targetHookahPos, this.posLerp);
    this.hookahGroup.position.copy(this.smoothedHookahPos);

    // ── 2. Smooth mouthpiece position ─────────────────────────────────────────
    const targetPipePos = this.screenToWorld(pipePos.x, pipePos.y, 0.5);
    this.smoothedPipePos.lerp(targetPipePos, pipePos.isHeld ? 0.28 : 0.10);
    this.mouthpieceGroup.position.copy(this.smoothedPipePos);
    this.mouthpieceGroup.rotation.z = pipePos.angle || -Math.PI / 4;

    // ── 3. Rebuild flexible braided hose ─────────────────────────────────────
    // Port position is offset from the hookah base on the stem section 1
    const hosePort = this.smoothedHookahPos.clone().add(new THREE.Vector3(0.38, 4.1, 0.1));
    const mouthEnd = this.smoothedPipePos.clone();

    // Two gravity control points for realistic rope drape
    const segLen = hosePort.distanceTo(mouthEnd);
    const cp1 = hosePort.clone().add(new THREE.Vector3(0.6, -segLen * 0.35, 0));
    const cp2 = mouthEnd.clone().add(new THREE.Vector3(-0.4, -segLen * 0.4, 0));

    const curve = new THREE.CubicBezierCurve3(hosePort, cp1, cp2, mouthEnd);

    if (this.hoseMesh) {
      this.scene.remove(this.hoseMesh);
      this.hoseMesh.geometry.dispose();
    }

    const tubeGeo = new THREE.TubeGeometry(curve, 48, 0.065, 12, false);
    this.hoseMesh = new THREE.Mesh(tubeGeo, this.hoseMaterial);
    this.hoseMesh.castShadow = true;
    this.scene.add(this.hoseMesh);

    // ── 4. Animate coal embers ────────────────────────────────────────────────
    const isSipping = appState === 'SIP_DETECTED' || appState === 'PIPE_AT_MOUTH';
    const isVapour = appState === 'VAPOUR';

    const baseEmissive = isSipping || isVapour ? 3.2 : 1.8;
    const pulse = baseEmissive + Math.sin(timestampMs * 0.008) * (isSipping ? 1.2 : 0.4);
    (this.coalEmbersMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse;

    // Subtle base sphere shimmer when sipping
    if (isSipping) {
      const shimmer = 0.92 + Math.sin(timestampMs * 0.018) * 0.05;
      (this.waterMesh.material as THREE.MeshPhysicalMaterial).opacity = shimmer;
    } else {
      (this.waterMesh.material as THREE.MeshPhysicalMaterial).opacity = 0.92;
    }

    // ── 5. Render ─────────────────────────────────────────────────────────────
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    this.renderer.dispose();
  }
}
