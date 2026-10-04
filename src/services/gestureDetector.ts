import type { PinchState, Point2D } from '../types/hookah';

export class GestureDetector {
  private pinchThreshold = 0.075;

  detectPinch(
    landmarksList: Array<Array<{ x: number; y: number; z?: number }>>,
    canvasWidth: number,
    canvasHeight: number,
    isMirrored: boolean = true
  ): PinchState | null {
    if (!landmarksList || landmarksList.length === 0) {
      return null;
    }

    let closestResult: PinchState | null = null;
    let minDistance = Infinity;

    for (const landmarks of landmarksList) {
      if (!landmarks || landmarks.length < 21) continue;

      const wristRaw = landmarks[0];
      const thumbRaw = landmarks[4];
      const indexMcpRaw = landmarks[5];
      const indexTipRaw = landmarks[8];
      const middleMcpRaw = landmarks[9];
      const middleTipRaw = landmarks[12];
      const ringMcpRaw = landmarks[13];
      const ringTipRaw = landmarks[16];
      const pinkyMcpRaw = landmarks[17];
      const pinkyTipRaw = landmarks[20];

      if (!wristRaw || !thumbRaw || !indexTipRaw) continue;

      // Convert to visual screen space
      const toScreen = (pt: { x: number; y: number }): Point2D => ({
        x: (isMirrored ? 1 - pt.x : pt.x) * canvasWidth,
        y: pt.y * canvasHeight
      });

      const thumbTip = toScreen(thumbRaw);
      const indexTip = toScreen(indexTipRaw);
      const wrist = toScreen(wristRaw);
      const indexMcp = toScreen(indexMcpRaw);
      const pinkyMcp = toScreen(pinkyMcpRaw);

      // 1. Pinch Detection (Thumb & Index tip distance)
      const dxPinch = thumbRaw.x - indexTipRaw.x;
      const dyPinch = thumbRaw.y - indexTipRaw.y;
      const pinchDistNorm = Math.sqrt(dxPinch * dxPinch + dyPinch * dyPinch);
      const isPinch = pinchDistNorm < this.pinchThreshold;

      // 2. Fist Detection (Folded fingers)
      const checkCurled = (tip: { x: number; y: number }, mcp: { x: number; y: number }) => {
        const dTipWrist = Math.hypot(tip.x - wristRaw.x, tip.y - wristRaw.y);
        const dMcpWrist = Math.hypot(mcp.x - wristRaw.x, mcp.y - wristRaw.y);
        return dTipWrist < dMcpWrist * 1.25;
      };

      let curledFingersCount = 0;
      if (checkCurled(indexTipRaw, indexMcpRaw)) curledFingersCount++;
      if (checkCurled(middleTipRaw, middleMcpRaw)) curledFingersCount++;
      if (checkCurled(ringTipRaw, ringMcpRaw)) curledFingersCount++;
      if (checkCurled(pinkyTipRaw, pinkyMcpRaw)) curledFingersCount++;

      const isFist = curledFingersCount >= 3;
      const isGrabbing = isFist || isPinch;

      // Calculate Grab Center: If forming a fist, use the palm/knuckles center
      const fistCenter: Point2D = {
        x: (indexMcp.x + pinkyMcp.x + wrist.x) / 3,
        y: (indexMcp.y + pinkyMcp.y + wrist.y) / 3
      };

      const pinchCenter: Point2D = {
        x: (thumbTip.x + indexTip.x) / 2,
        y: (thumbTip.y + indexTip.y) / 2
      };

      const finalGrabCenter = isFist ? fistCenter : pinchCenter;

      if (isGrabbing && pinchDistNorm < minDistance) {
        minDistance = pinchDistNorm;
        closestResult = {
          isPinching: isPinch,
          isGrabbing: true,
          isFist,
          pinchCenter: finalGrabCenter,
          distance: pinchDistNorm,
          thumbTip,
          indexTip
        };
      } else if (!closestResult) {
        closestResult = {
          isPinching: isPinch,
          isGrabbing: false,
          isFist,
          pinchCenter: finalGrabCenter,
          distance: pinchDistNorm,
          thumbTip,
          indexTip
        };
      }
    }

    return closestResult;
  }
}
