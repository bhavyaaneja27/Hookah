import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

export class HandTrackerService {
  private handLandmarker: HandLandmarker | null = null;
  private isInitializing = false;

  async initialize(): Promise<void> {
    if (this.handLandmarker || this.isInitializing) return;
    this.isInitializing = true;

    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );

      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 2
      });
      console.log('HandLandmarker initialized successfully');
    } catch (err) {
      console.error('Failed to initialize HandLandmarker:', err);
      // Fallback to CPU if GPU fails
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'CPU'
          },
          runningMode: 'VIDEO',
          numHands: 2
        });
      } catch (fallbackErr) {
        console.error('HandLandmarker CPU fallback failed:', fallbackErr);
      }
    } finally {
      this.isInitializing = false;
    }
  }

  detect(videoElement: HTMLVideoElement, timestampMs: number) {
    if (!this.handLandmarker) return null;
    try {
      return this.handLandmarker.detectForVideo(videoElement, timestampMs);
    } catch (e) {
      console.warn('Error during hand detection:', e);
      return null;
    }
  }
}
