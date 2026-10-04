export class WebcamService {
  private videoElement: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;

  async initialize(videoElement: HTMLVideoElement): Promise<boolean> {
    this.videoElement = videoElement;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Webcam API is not supported in this browser environment.');
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });

      this.videoElement.srcObject = this.stream;

      return new Promise((resolve) => {
        if (!this.videoElement) {
          resolve(false);
          return;
        }

        const startPlay = () => {
          if (this.videoElement) {
            this.videoElement.play().then(() => resolve(true)).catch(() => resolve(true));
          } else {
            resolve(false);
          }
        };

        if (this.videoElement.readyState >= 1) {
          startPlay();
        } else {
          this.videoElement.onloadedmetadata = startPlay;
          // Fallback timer if event doesn't fire
          setTimeout(startPlay, 1500);
        }
      });
    } catch (err) {
      console.error('Error starting webcam:', err);
      throw err;
    }
  }

  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }

  isReady(): boolean {
    return (
      !!this.videoElement &&
      this.videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
    );
  }
}
