import type { MouthState, PinchState, PipePosition, Point2D } from '../types/hookah';

export function drawHookahBase(
  ctx: CanvasRenderingContext2D,
  basePos: Point2D,
  isSipping: boolean,
  timestampMs: number
) {
  ctx.save();
  const { x, y } = basePos;

  // 1. Table surface shadow / ambient occlusion
  const shadowGrad = ctx.createRadialGradient(x, y + 100, 10, x, y + 100, 110);
  shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
  shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(x, y + 100, 110, 25, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Glass Water Base Flask (Vibrant ruby glass with realistic reflections)
  const flaskWidth = 90;
  const flaskHeight = 120;

  ctx.save();
  ctx.translate(x, y + 20);

  // Outer Glass contour
  const baseGrad = ctx.createLinearGradient(-flaskWidth, 0, flaskWidth, 0);
  baseGrad.addColorStop(0, '#3a0815');
  baseGrad.addColorStop(0.3, '#c2185b');
  baseGrad.addColorStop(0.5, '#e91e63');
  baseGrad.addColorStop(0.7, '#880e4f');
  baseGrad.addColorStop(1, '#2a040f');

  ctx.beginPath();
  ctx.moveTo(-25, -flaskHeight / 2);
  ctx.bezierCurveTo(-35, -10, -flaskWidth, 20, -flaskWidth, 65);
  ctx.arcTo(-flaskWidth, 85, -flaskWidth + 20, 85, 20);
  ctx.lineTo(flaskWidth - 20, 85);
  ctx.arcTo(flaskWidth, 85, flaskWidth, 65, 20);
  ctx.bezierCurveTo(flaskWidth, 20, 35, -10, 25, -flaskHeight / 2);
  ctx.closePath();

  ctx.fillStyle = baseGrad;
  ctx.globalAlpha = 0.85;
  ctx.fill();

  // Glass specular highlight
  const glassReflect = ctx.createLinearGradient(-flaskWidth, -20, 0, 80);
  glassReflect.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
  glassReflect.addColorStop(0.4, 'rgba(255, 255, 255, 0.1)');
  glassReflect.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glassReflect;
  ctx.fill();

  // Water & Bubbles when sipping
  ctx.save();
  ctx.clip(); // Clip within flask shape

  // Water level
  const waterGrad = ctx.createLinearGradient(0, 0, 0, 85);
  waterGrad.addColorStop(0, 'rgba(0, 188, 212, 0.7)');
  waterGrad.addColorStop(1, 'rgba(0, 96, 100, 0.9)');
  ctx.fillStyle = waterGrad;
  ctx.fillRect(-flaskWidth, 15, flaskWidth * 2, 70);

  // Animated Bubbles if sipping
  if (isSipping) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < 12; i++) {
      const bubbleX = Math.sin(timestampMs * 0.005 + i * 2) * (flaskWidth * 0.5);
      const bubbleY = 75 - ((timestampMs * 0.08 + i * 15) % 60);
      const bubbleR = 3 + (i % 4);
      ctx.beginPath();
      ctx.arc(bubbleX, bubbleY, bubbleR, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  ctx.restore(); // Restore translate

  // 3. Hookah Central Metallic Stem
  const stemWidth = 14;
  const stemHeight = 150;
  const stemY = y - stemHeight / 2 - 20;

  const stemGrad = ctx.createLinearGradient(x - stemWidth, 0, x + stemWidth, 0);
  stemGrad.addColorStop(0, '#424242');
  stemGrad.addColorStop(0.3, '#e0e0e0');
  stemGrad.addColorStop(0.6, '#ffffff');
  stemGrad.addColorStop(0.8, '#9e9e9e');
  stemGrad.addColorStop(1, '#212121');

  ctx.fillStyle = stemGrad;
  ctx.fillRect(x - stemWidth / 2, stemY - 20, stemWidth, stemHeight);

  // Decorative Stem Ornaments / Knobs
  for (let i = 0; i < 3; i++) {
    const knobY = stemY + 10 + i * 40;
    ctx.beginPath();
    ctx.ellipse(x, knobY, stemWidth * 1.5, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Charcoal Tray & Coal Bowl Top
  const trayY = stemY - 25;
  // Metal Tray
  ctx.beginPath();
  ctx.ellipse(x, trayY, 65, 12, 0, 0, Math.PI * 2);
  ctx.fillStyle = stemGrad;
  ctx.fill();

  // Ceramic Clay Bowl
  const bowlY = trayY - 25;
  const bowlGrad = ctx.createLinearGradient(x - 20, 0, x + 20, 0);
  bowlGrad.addColorStop(0, '#bf360c');
  bowlGrad.addColorStop(0.5, '#ff7043');
  bowlGrad.addColorStop(1, '#4e1503');
  ctx.fillStyle = bowlGrad;
  ctx.beginPath();
  ctx.moveTo(x - 15, trayY - 2);
  ctx.lineTo(x - 25, bowlY);
  ctx.lineTo(x + 25, bowlY);
  ctx.lineTo(x + 15, trayY - 2);
  ctx.closePath();
  ctx.fill();

  // Glowing Coals Embers
  const coalGrad = ctx.createRadialGradient(x, bowlY - 5, 2, x, bowlY - 5, 18);
  coalGrad.addColorStop(0, '#ffffff');
  coalGrad.addColorStop(0.3, '#ff9100');
  coalGrad.addColorStop(0.7, '#ff3d00');
  coalGrad.addColorStop(1, 'rgba(191, 54, 12, 0)');
  ctx.fillStyle = coalGrad;
  ctx.beginPath();
  ctx.arc(x, bowlY - 5, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawHoseAndMouthpiece(
  ctx: CanvasRenderingContext2D,
  basePos: Point2D,
  pipePos: PipePosition,
  appState: string
) {
  ctx.save();

  // Hose outlet port on base stem
  const hosePortX = basePos.x + 18;
  const hosePortY = basePos.y - 30;

  const mouthX = pipePos.x;
  const mouthY = pipePos.y;

  // Calculate flexible curved spline (Cubic Bezier curve)
  // Control points add natural gravity sag to hose pipe
  const dist = Math.hypot(mouthX - hosePortX, mouthY - hosePortY);
  const sag = Math.min(220, Math.max(60, dist * 0.45));

  const cp1X = hosePortX + 60;
  const cp1Y = hosePortY + sag * 0.6;
  const cp2X = mouthX - 40;
  const cp2Y = mouthY + sag * 0.8;

  // Hose Shadow
  ctx.beginPath();
  ctx.moveTo(hosePortX, hosePortY + 12);
  ctx.bezierCurveTo(cp1X, cp1Y + 20, cp2X, cp2Y + 20, mouthX, mouthY + 12);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Hose Outer Braid (Velvet / Braided Silicone hose)
  const hoseGrad = ctx.createLinearGradient(hosePortX, hosePortY, mouthX, mouthY);
  hoseGrad.addColorStop(0, '#880e4f');
  hoseGrad.addColorStop(0.5, '#d81b60');
  hoseGrad.addColorStop(1, '#4a148c');

  ctx.beginPath();
  ctx.moveTo(hosePortX, hosePortY);
  ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, mouthX, mouthY);
  ctx.strokeStyle = hoseGrad;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Hose Inner Highlight Line
  ctx.beginPath();
  ctx.moveTo(hosePortX, hosePortY);
  ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, mouthX, mouthY);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // ----------------------------------------------------
  // DRAW MOUTHPIECE / HANDLE
  // ----------------------------------------------------
  ctx.save();
  ctx.translate(mouthX, mouthY);

  const angle = pipePos.angle || -Math.PI / 4;
  ctx.rotate(angle);

  const isHeld = pipePos.isHeld;
  const isAtMouth = appState === 'PIPE_AT_MOUTH' || appState === 'SIP_DETECTED';

  // Handle Base Grip (Metallic & Gold accents)
  const handleGrad = ctx.createLinearGradient(0, -12, 0, 12);
  handleGrad.addColorStop(0, '#ffd700');
  handleGrad.addColorStop(0.3, '#fff8e7');
  handleGrad.addColorStop(0.7, '#daa520');
  handleGrad.addColorStop(1, '#b8860b');

  // Mouthpiece Handle Body
  ctx.fillStyle = handleGrad;
  ctx.beginPath();
  ctx.roundRect(-45, -8, 55, 16, 4);
  ctx.fill();

  // Grip Ridges
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(-38 + i * 10, -8, 3, 16);
  }

  // Tapered Acrylic/Metal Tip
  const tipGrad = ctx.createLinearGradient(10, 0, 35, 0);
  tipGrad.addColorStop(0, '#e0e0e0');
  tipGrad.addColorStop(0.5, '#ffffff');
  tipGrad.addColorStop(1, '#9e9e9e');

  ctx.fillStyle = tipGrad;
  ctx.beginPath();
  ctx.moveTo(10, -6);
  ctx.lineTo(38, -3);
  ctx.lineTo(38, 3);
  ctx.lineTo(10, 6);
  ctx.closePath();
  ctx.fill();

  // Active / Touch Highlight Ring
  if (isHeld) {
    ctx.strokeStyle = isAtMouth ? '#00e676' : '#00b0ff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore(); // Restore mouthpiece rotate
  ctx.restore(); // Restore hose save
}

export function drawLandmarksDebug(
  ctx: CanvasRenderingContext2D,
  pinchState: PinchState | null,
  mouthState: MouthState | null
) {
  ctx.save();

  // Draw Hand Pinch Landmarks
  if (pinchState) {
    const { thumbTip, indexTip, pinchCenter, isPinching } = pinchState;

    // Line connecting thumb & index
    ctx.strokeStyle = isPinching ? 'rgba(0, 230, 118, 0.9)' : 'rgba(255, 235, 59, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(thumbTip.x, thumbTip.y);
    ctx.lineTo(indexTip.x, indexTip.y);
    ctx.stroke();

    // Thumb point
    ctx.fillStyle = '#ff1744';
    ctx.beginPath();
    ctx.arc(thumbTip.x, thumbTip.y, 6, 0, Math.PI * 2);
    ctx.fill();

    // Index point
    ctx.fillStyle = '#2979ff';
    ctx.beginPath();
    ctx.arc(indexTip.x, indexTip.y, 6, 0, Math.PI * 2);
    ctx.fill();

    // Pinch Center Marker
    ctx.fillStyle = isPinching ? '#00e676' : 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(pinchCenter.x, pinchCenter.y, isPinching ? 8 : 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw Mouth Landmarks
  if (mouthState) {
    const { center, isOpen, width, height } = mouthState;

    // Mouth Center Target Ring
    ctx.strokeStyle = isOpen ? '#ff9100' : 'rgba(0, 229, 255, 0.8)';
    ctx.lineWidth = isOpen ? 3 : 2;
    ctx.beginPath();
    ctx.ellipse(center.x, center.y, Math.max(12, width / 2), Math.max(8, height / 2), 0, 0, Math.PI * 2);
    ctx.stroke();

    // Center point
    ctx.fillStyle = isOpen ? '#ff3d00' : '#00e5ff';
    ctx.beginPath();
    ctx.arc(center.x, center.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
