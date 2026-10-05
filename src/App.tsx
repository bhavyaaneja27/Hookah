import { useState } from 'react';
import { ARCanvas } from './components/ARCanvas';
import { DebugHUD } from './components/DebugHUD';
import type { AppState, MouthState, PinchState } from './types/hookah';

export function App() {
  const [appState, setAppState] = useState<AppState>('IDLE');
  const [showLandmarks, setShowLandmarks] = useState<boolean>(false);
  const [pinchState, setPinchState] = useState<PinchState | null>(null);
  const [mouthState, setMouthState] = useState<MouthState | null>(null);
  const [manualSmokeTrigger, setManualSmokeTrigger] = useState<boolean>(false);

  const handleMetricsUpdate = (pinch: PinchState | null, mouth: MouthState | null) => {
    setPinchState(pinch);
    setMouthState(mouth);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden', position: 'relative' }}>
      <DebugHUD
        appState={appState}
        showLandmarks={showLandmarks}
        onToggleLandmarks={() => setShowLandmarks((prev) => !prev)}
        onTriggerSmoke={() => setManualSmokeTrigger(true)}
        pinchState={pinchState}
        mouthState={mouthState}
      />
      <ARCanvas
        showLandmarks={showLandmarks}
        onStateChange={setAppState}
        onMetricsUpdate={handleMetricsUpdate}
        manualSmokeTrigger={manualSmokeTrigger}
        onManualSmokeTriggered={() => setManualSmokeTrigger(false)}
      />

      {/* Creator Attribution Badge */}
      <a
        href="https://instagram.com/bhavya.aneja"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(10, 10, 15, 0.78)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          padding: '6px 14px',
          borderRadius: 20,
          color: '#e0e0e0',
          fontSize: '0.8rem',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          zIndex: 25,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          transition: 'all 0.2s ease',
          userSelect: 'none'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(233, 30, 99, 0.5)';
          e.currentTarget.style.boxShadow = '0 4px 24px rgba(233, 30, 99, 0.3)';
          e.currentTarget.style.transform = 'translateX(-50%) translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.4)';
          e.currentTarget.style.transform = 'translateX(-50%) translateY(0)';
        }}
      >
        <span style={{ color: '#aaa', fontSize: '0.75rem' }}>Created by</span>
        <span style={{ color: '#fff', fontWeight: 600 }}>Bhavya Aneja</span>
        <span style={{ color: 'rgba(255, 255, 255, 0.25)' }}>•</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#f06292' }}>
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
          </svg>
          <span style={{ fontWeight: 600, fontSize: '0.75rem' }}>@bhavya.aneja</span>
        </div>
      </a>
    </div>
  );
}

export default App;

