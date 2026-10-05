import React, { useEffect, useRef, useState } from 'react';
import { WebcamService } from '../services/webcam';
import { HandTrackerService } from '../services/handTracker';
import { FaceTrackerService } from '../services/faceTracker';
import { GestureDetector } from '../services/gestureDetector';
import { MouthDetector } from '../services/mouthDetector';
import { HookahInteractionManager } from '../services/hookahInteraction';
import { VapourParticleSystem } from '../services/vapourParticleSystem';
import { Hookah3DScene } from '../services/hookah3DScene';
import { drawHookahBase, drawHoseAndMouthpiece, drawLandmarksDebug } from '../utils/drawHookah';
import type { AppState, MouthState, PinchState } from '../types/hookah';

interface ARCanvasProps {
  showLandmarks: boolean;
  onStateChange: (state: AppState) => void;
  onMetricsUpdate: (pinch: PinchState | null, mouth: MouthState | null) => void;
  manualSmokeTrigger: boolean;
  onManualSmokeTriggered: () => void;
}

export const ARCanvas: React.FC<ARCanvasProps> = ({
  showLandmarks,
  onStateChange,
  onMetricsUpdate,
  manualSmokeTrigger,
  onManualSmokeTriggered
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const webglCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingStep, setLoadingStep] = useState<string>('Initializing camera...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Services refs
  const webcamServiceRef = useRef<WebcamService>(new WebcamService());
  const handTrackerRef = useRef<HandTrackerService>(new HandTrackerService());
  const faceTrackerRef = useRef<FaceTrackerService>(new FaceTrackerService());
  const gestureDetectorRef = useRef<GestureDetector>(new GestureDetector());
  const mouthDetectorRef = useRef<MouthDetector>(new MouthDetector());
  const hookahManagerRef = useRef<HookahInteractionManager>(new HookahInteractionManager());
  const particleSystemRef = useRef<VapourParticleSystem>(new VapourParticleSystem());
  const hookah3DSceneRef = useRef<Hookah3DScene | null>(null);

  const animFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function initAR() {
      try {
        setLoadingStep('Accessing webcam feed...');
        if (videoRef.current) {
          const success = await webcamServiceRef.current.initialize(videoRef.current);
          if (!success) throw new Error('Webcam initialization failed');
        }

        if (!isMounted) return;

        setLoadingStep('Initializing 3D Engine...');
        if (webglCanvasRef.current) {
          webglCanvasRef.current.width = window.innerWidth;
          webglCanvasRef.current.height = window.innerHeight;
          try {
            hookah3DSceneRef.current = new Hookah3DScene(webglCanvasRef.current);
          } catch (e) {
            console.warn('3D WebGL scene initialization failed, using 2D high-res fallback:', e);
          }
        }

        setLoadingStep('Loading AI Vision models (Hand & Face)...');
        await Promise.all([
          handTrackerRef.current.initialize(),
          faceTrackerRef.current.initialize()
        ]);

        if (!isMounted) return;

        setIsLoading(false);
        startRenderLoop();
      } catch (err: any) {
        console.error('AR initialization error:', err);
        if (isMounted) {
          setErrorMsg(err?.message || 'Failed to start AR experience');
          setIsLoading(false);
        }
      }
    }

    initAR();

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      if (webglCanvasRef.current) {
        webglCanvasRef.current.width = width;
        webglCanvasRef.current.height = height;
      }
      if (overlayCanvasRef.current) {
        overlayCanvasRef.current.width = width;
        overlayCanvasRef.current.height = height;
      }
      if (hookah3DSceneRef.current) {
        hookah3DSceneRef.current.resize(width, height);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      isMounted = false;
      window.removeEventListener('resize', handleResize);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      if (hookah3DSceneRef.current) {
        hookah3DSceneRef.current.destroy();
      }
      webcamServiceRef.current.stop();
    };
  }, []);

  // Handle manual smoke trigger from Debug HUD
  useEffect(() => {
    if (manualSmokeTrigger) {
      if (overlayCanvasRef.current) {
        const cx = overlayCanvasRef.current.width / 2;
        const cy = overlayCanvasRef.current.height * 0.5;
        // Emit to both sides for the manual test trigger
        particleSystemRef.current.emit(cx, cy, 30, 180);
        hookahManagerRef.current.setAppState('VAPOUR');
        onStateChange('VAPOUR');
      }
      onManualSmokeTriggered();
    }
  }, [manualSmokeTrigger]);

  const startRenderLoop = () => {
    const loop = () => {
      const video = videoRef.current;
      const webglCanvas = webglCanvasRef.current;
      const overlayCanvas = overlayCanvasRef.current;

      const width = window.innerWidth;
      const height = window.innerHeight;

      // Ensure canvas pixel dimensions match viewport
      if (webglCanvas && (webglCanvas.width !== width || webglCanvas.height !== height)) {
        webglCanvas.width = width;
        webglCanvas.height = height;
        if (hookah3DSceneRef.current) {
          hookah3DSceneRef.current.resize(width, height);
        }
      }

      if (overlayCanvas && (overlayCanvas.width !== width || overlayCanvas.height !== height)) {
        overlayCanvas.width = width;
        overlayCanvas.height = height;
      }

      if (video && webcamServiceRef.current.isReady()) {
        const timestampMs = performance.now();

        // 1. Run Computer Vision Landmarkers
        const handResults = handTrackerRef.current.detect(video, timestampMs);
        const faceResults = faceTrackerRef.current.detect(video, timestampMs);

        // 2. Process Pinch & Mouth detection
        const pinchState = gestureDetectorRef.current.detectPinch(
          handResults?.landmarks || [],
          width,
          height,
          true // Mirrored view matching webcam display
        );

        const mouthState = mouthDetectorRef.current.detectMouth(
          faceResults?.faceLandmarks || [],
          width,
          height,
          true // Mirrored view matching webcam display
        );

        // Notify parent of metrics
        onMetricsUpdate(pinchState, mouthState);

        // 3. Update Hookah Interaction State Machine
        const { appState, shouldEmitVapour, vapourEmitterPos } = hookahManagerRef.current.update(
          pinchState,
          mouthState,
          width,
          height
        );

        onStateChange(appState);

        // 4. Emit Vapour if active — pass mouth width so particles go around face
        if (shouldEmitVapour) {
          const faceW = mouthState ? mouthState.width * 3.5 : 160;
          particleSystemRef.current.emit(vapourEmitterPos.x, vapourEmitterPos.y, 14, faceW);
        }

        // Update particle physics
        particleSystemRef.current.update();

        // 5. RENDER 3D HOOKAH SCENE
        const basePos = hookahManagerRef.current.getBasePosition();
        const pipePos = hookahManagerRef.current.getPipePosition();

        if (hookah3DSceneRef.current) {
          hookah3DSceneRef.current.update(basePos, pipePos, appState, timestampMs);
        }

        // 6. RENDER 2D OVERLAY (Particles, Backup Hookah, Debug Landmarks)
        if (overlayCanvas) {
          const ctx = overlayCanvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, width, height);

            const isSipping = appState === 'SIP_DETECTED' || appState === 'PIPE_AT_MOUTH';

            // Draw Backup Hookah graphic if 3D scene is not active
            if (!hookah3DSceneRef.current) {
              drawHookahBase(ctx, basePos, isSipping, timestampMs);
              drawHoseAndMouthpiece(ctx, basePos, pipePos, appState);
            }

            // Draw Vapour Particles (Smoke overlay)
            particleSystemRef.current.draw(ctx);

            // Draw Hand & Face Landmark debugging if enabled
            if (showLandmarks) {
              drawLandmarksDebug(ctx, pinchState, mouthState);
            }
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#000' }}>
      {/* Fullscreen Webcam Video */}
      <video
        ref={videoRef}
        playsInline
        muted
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'scaleX(-1)' // Mirror video feed naturally for selfie experience
        }}
      />

      {/* Photorealistic 3D WebGL Canvas Layer */}
      <canvas
        ref={webglCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 10
        }}
      />

      {/* 2D Vapour Particles & Backup Overlay Canvas Layer */}
      <canvas
        ref={overlayCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 15
        }}
      />

      {/* Minimalist Loading Screen */}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0a0a0c',
            color: '#fff',
            zIndex: 30,
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              border: '4px solid rgba(255, 255, 255, 0.1)',
              borderTopColor: '#e91e63',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}
          />
          <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          <h2 style={{ marginTop: 24, fontSize: '1.25rem', fontWeight: 600, letterSpacing: '0.05em' }}>
            Hookah Bar AR
          </h2>
          <p style={{ marginTop: 8, color: '#9e9e9e', fontSize: '0.9rem' }}>{loadingStep}</p>
          <p style={{ marginTop: 18, color: '#616161', fontSize: '0.78rem' }}>
            Created by <span style={{ color: '#bdbdbd' }}>Bhavya Aneja</span> (<span style={{ color: '#e91e63' }}>@bhavya.aneja</span>)
          </p>
        </div>
      )}

      {/* Error Overlay */}
      {errorMsg && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(10, 10, 12, 0.95)',
            color: '#ff5252',
            padding: 24,
            textAlign: 'center',
            zIndex: 40,
            fontFamily: 'system-ui, sans-serif'
          }}
        >
          <h3 style={{ fontSize: '1.2rem', marginBottom: 8 }}>Camera / AR Access Error</h3>
          <p style={{ color: '#e0e0e0', maxWidth: 400 }}>{errorMsg}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 20,
              padding: '10px 24px',
              backgroundColor: '#e91e63',
              color: '#fff',
              border: 'none',
              borderRadius: 20,
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Retry Permission
          </button>
        </div>
      )}
    </div>
  );
};
