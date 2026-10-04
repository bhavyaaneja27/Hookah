import React from 'react';
import type { AppState, MouthState, PinchState } from '../types/hookah';
import { Eye, EyeOff, Wind } from 'lucide-react';

interface DebugHUDProps {
  appState: AppState;
  showLandmarks: boolean;
  onToggleLandmarks: () => void;
  onTriggerSmoke: () => void;
  pinchState: PinchState | null;
  mouthState: MouthState | null;
}

export const DebugHUD: React.FC<DebugHUDProps> = ({
  appState,
  showLandmarks,
  onToggleLandmarks,
  onTriggerSmoke,
  pinchState,
  mouthState
}) => {
  const getStateColor = (state: AppState): string => {
    switch (state) {
      case 'IDLE':
        return '#757575';
      case 'HAND_DETECTED':
        return '#29b6f6';
      case 'PIPE_GRABBED':
        return '#ab47bc';
      case 'PIPE_AT_MOUTH':
        return '#ffa726';
      case 'SIP_DETECTED':
        return '#00e676';
      case 'VAPOUR':
        return '#ff1744';
      default:
        return '#9e9e9e';
    }
  };

  const isPinching = pinchState?.isPinching || false;
  const isMouthOpen = mouthState?.isOpen || false;

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        right: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 20,
        pointerEvents: 'none',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      {/* Left: Brand + Status Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          pointerEvents: 'auto'
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(10, 10, 15, 0.75)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            padding: '6px 14px',
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: getStateColor(appState),
              boxShadow: `0 0 10px ${getStateColor(appState)}`
            }}
          />
          <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.04em' }}>
            HOOKAH BAR AR
          </span>
          <span
            style={{
              color: getStateColor(appState),
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              padding: '2px 8px',
              borderRadius: 10,
              border: `1px solid ${getStateColor(appState)}44`
            }}
          >
            {appState.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Right: Controls & Metrics */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          pointerEvents: 'auto'
        }}
      >
        {/* Pinch metric indicator */}
        <div
          style={{
            backgroundColor: 'rgba(10, 10, 15, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '6px 12px',
            borderRadius: 16,
            color: isPinching ? '#00e676' : '#9e9e9e',
            fontSize: '0.75rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <span>Pinch:</span>
          <span>{isPinching ? 'GRABBED' : 'RELEASED'}</span>
        </div>

        {/* Mouth metric indicator */}
        <div
          style={{
            backgroundColor: 'rgba(10, 10, 15, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '6px 12px',
            borderRadius: 16,
            color: isMouthOpen ? '#ff9100' : '#9e9e9e',
            fontSize: '0.75rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <span>Mouth:</span>
          <span>{isMouthOpen ? 'OPEN' : 'CLOSED'}</span>
        </div>

        {/* Landmark Toggle */}
        <button
          onClick={onToggleLandmarks}
          title={showLandmarks ? 'Hide Landmarks' : 'Show Landmarks'}
          style={{
            backgroundColor: showLandmarks ? 'rgba(41, 121, 255, 0.3)' : 'rgba(10, 10, 15, 0.75)',
            border: `1px solid ${showLandmarks ? '#2979ff' : 'rgba(255, 255, 255, 0.15)'}`,
            color: showLandmarks ? '#90caf9' : '#e0e0e0',
            padding: '7px 12px',
            borderRadius: 16,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.75rem',
            fontWeight: 600
          }}
        >
          {showLandmarks ? <Eye size={14} /> : <EyeOff size={14} />}
          <span>{showLandmarks ? 'Landmarks ON' : 'Landmarks OFF'}</span>
        </button>

        {/* Manual Vapour Smoke Trigger */}
        <button
          onClick={onTriggerSmoke}
          title="Trigger Vapour Smoke"
          style={{
            backgroundColor: 'rgba(233, 30, 99, 0.25)',
            border: '1px solid #e91e63',
            color: '#ff80ab',
            padding: '7px 14px',
            borderRadius: 16,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.75rem',
            fontWeight: 600
          }}
        >
          <Wind size={14} />
          <span>Test Smoke</span>
        </button>
      </div>
    </div>
  );
};
