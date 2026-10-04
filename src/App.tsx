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
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden' }}>
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
    </div>
  );
}

export default App;
