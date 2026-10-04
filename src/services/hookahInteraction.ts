import type { AppState, MouthState, PinchState, PipePosition, Point2D } from '../types/hookah';

export class HookahInteractionManager {
  private pipeState: PipePosition;
  private appState: AppState = 'IDLE';
  
  // Distances in screen pixels (scalable based on canvas size)
  private grabRadius = 120; // Radius to grab mouthpiece when pinching
  private mouthProximityRadius = 85; // Radius to trigger PIPE_AT_MOUTH
  private lerpFactor = 0.22; // Smoothing factor (0..1) to prevent jitter
  private angleLerp = 0.12; // Angle smoothing to prevent rotation snap

  private baseRestPos: Point2D = { x: 260, y: 520 };
  private vapourStartTime: number | null = null;
  private sipCompleted: boolean = false;

  constructor(defaultWidth: number = 1280, defaultHeight: number = 720) {
    this.baseRestPos = {
      x: Math.max(180, defaultWidth * 0.2),
      y: defaultHeight * 0.72
    };
    this.pipeState = {
      x: this.baseRestPos.x + 40,
      y: this.baseRestPos.y - 120,
      targetX: this.baseRestPos.x + 40,
      targetY: this.baseRestPos.y - 120,
      angle: 0,
      isHeld: false
    };
    this.updateBasePosition(defaultWidth, defaultHeight);
  }

  updateBasePosition(canvasWidth: number, canvasHeight: number) {
    // Position hookah base nicely in bottom left region
    this.baseRestPos = {
      x: Math.max(180, canvasWidth * 0.2),
      y: canvasHeight * 0.72
    };

    // If pipe is not held, send target back to base rest position
    if (this.pipeState && !this.pipeState.isHeld) {
      this.pipeState.targetX = this.baseRestPos.x + 40;
      this.pipeState.targetY = this.baseRestPos.y - 120;
    }
  }

  getBasePosition(): Point2D {
    return { ...this.baseRestPos };
  }

  getPipePosition(): PipePosition {
    return { ...this.pipeState };
  }

  getAppState(): AppState {
    return this.appState;
  }

  update(
    pinchState: PinchState | null,
    mouthState: MouthState | null,
    canvasWidth: number,
    canvasHeight: number
  ): { appState: AppState; shouldEmitVapour: boolean; vapourEmitterPos: Point2D } {
    this.updateBasePosition(canvasWidth, canvasHeight);

    let shouldEmitVapour = false;
    let vapourEmitterPos: Point2D = mouthState ? mouthState.center : { x: canvasWidth / 2, y: canvasHeight / 2 };

    const currentTime = performance.now();

    // 1. Handle Pipe Grab / Release logic
    if (pinchState) {
      const distToPipe = Math.hypot(
        pinchState.pinchCenter.x - this.pipeState.x,
        pinchState.pinchCenter.y - this.pipeState.y
      );

      if (pinchState.isGrabbing) {
        // Can grab if already holding OR if grab/fist happens near mouthpiece
        if (this.pipeState.isHeld || distToPipe < this.grabRadius) {
          this.pipeState.isHeld = true;
          this.pipeState.targetX = pinchState.pinchCenter.x;
          this.pipeState.targetY = pinchState.pinchCenter.y;
        }
      } else {
        // Release pipe if hand is open
        this.pipeState.isHeld = false;
      }
    } else {
      this.pipeState.isHeld = false;
    }

    // 2. Smooth movement (Interpolation to eliminate jitter)
    if (this.pipeState.isHeld) {
      this.pipeState.x += (this.pipeState.targetX - this.pipeState.x) * this.lerpFactor;
      this.pipeState.y += (this.pipeState.targetY - this.pipeState.y) * this.lerpFactor;
    } else {
      // Gently float back to rest position near hookah top
      const restX = this.baseRestPos.x + 40;
      const restY = this.baseRestPos.y - 130;
      this.pipeState.x += (restX - this.pipeState.x) * 0.08;
      this.pipeState.y += (restY - this.pipeState.y) * 0.08;
    }

    // Smoothly rotate angle towards mouth (prevents snap)
    if (mouthState) {
      const dx = mouthState.center.x - this.pipeState.x;
      const dy = mouthState.center.y - this.pipeState.y;
      const targetAngle = Math.atan2(dy, dx);
      // Lerp via shortest angular path
      let da = targetAngle - this.pipeState.angle;
      if (da > Math.PI) da -= Math.PI * 2;
      if (da < -Math.PI) da += Math.PI * 2;
      this.pipeState.angle += da * this.angleLerp;
    }

    // 3. Proximity check (Pipe at mouth)
    let isPipeNearMouth = false;
    if (mouthState && this.pipeState.isHeld) {
      const distToMouth = Math.hypot(
        this.pipeState.x - mouthState.center.x,
        this.pipeState.y - mouthState.center.y
      );
      if (distToMouth < this.mouthProximityRadius) {
        isPipeNearMouth = true;
      }
    }

    // 4. State Machine Transitions
    // Check VAPOUR active duration
    if (this.appState === 'VAPOUR') {
      shouldEmitVapour = true;

      if (!this.vapourStartTime) {
        this.vapourStartTime = currentTime;
      }

      // Keep emitting vapour for ~3.0 seconds
      if (currentTime - this.vapourStartTime > 3000) {
        this.appState = this.pipeState.isHeld ? 'PIPE_GRABBED' : (pinchState ? 'HAND_DETECTED' : 'IDLE');
        this.vapourStartTime = null;
        this.sipCompleted = false;
        shouldEmitVapour = false;
      }
    } else if (this.sipCompleted && mouthState && mouthState.isOpen) {
      // INSTANT EXHALE TRIGGER: Moment mouth opens after sipping, start vapour instantly!
      this.appState = 'VAPOUR';
      this.vapourStartTime = currentTime;
      shouldEmitVapour = true;
    } else if (this.pipeState.isHeld) {
      if (isPipeNearMouth) {
        // Pipe is at mouth
        this.appState = 'PIPE_AT_MOUTH';

        // Check if mouth opens to take a sip OR if user holds at mouth
        if (mouthState && mouthState.isOpen) {
          this.appState = 'SIP_DETECTED';
          this.sipCompleted = true;
        } else if (this.sipCompleted) {
          this.appState = 'SIP_DETECTED';
        }
      } else {
        this.appState = 'PIPE_GRABBED';
      }
    } else {
      // Pipe not held
      if (pinchState || mouthState) {
        this.appState = 'HAND_DETECTED';
      } else {
        this.appState = 'IDLE';
      }
    }

    return {
      appState: this.appState,
      shouldEmitVapour,
      vapourEmitterPos
    };
  }

  setAppState(state: AppState) {
    this.appState = state;
  }
}
