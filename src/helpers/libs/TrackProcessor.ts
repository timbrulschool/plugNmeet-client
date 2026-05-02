import {
  GaussianBlurBackgroundProcessor,
  ImageFit,
  VirtualBackgroundProcessor,
  isSupported,
} from '@twilio/video-processors';
import { Track, TrackProcessor, VideoProcessorOptions } from 'livekit-client';

import { getConfigValue } from '../utils';

export type BackgroundConfig = {
  type: 'none' | 'blur' | 'image';
  url?: string;
};

const assetPath = getConfigValue(
  'staticAssetsPath',
  '/assets',
  'STATIC_ASSETS_PATH',
);
const vbPaths = `${assetPath}/backgrounds/assets`;

// ─── Twilio virtual-background processor (blur / image) ──────────────────────

class TwilioTrackProcessor implements TrackProcessor<Track.Kind.Video> {
  name = 'pnm-virtual-background';

  private processor:
    | GaussianBlurBackgroundProcessor
    | VirtualBackgroundProcessor
    | null = null;
  private sourceElement: HTMLVideoElement | undefined = undefined;
  // Twilio draws to intermediateCanvas; we optionally flip before copying to canvas.
  private canvas = document.createElement('canvas');
  private intermediateCanvas = document.createElement('canvas');
  private isProcessing = false;
  private isDestroyed = false;
  private loopPromise: Promise<void> | null = null;

  readonly processedTrack: MediaStreamTrack;

  constructor(
    private backgroundConfig: BackgroundConfig,
    private mirror: boolean = false,
  ) {
    this.processedTrack = this.canvas.captureStream().getVideoTracks()[0];
  }

  async init(opts: VideoProcessorOptions) {
    if (opts.element) {
      this.sourceElement = opts.element as HTMLVideoElement;
    } else {
      this.sourceElement = document.createElement('video');
    }

    this.sourceElement.srcObject = new MediaStream([opts.track]);
    this.sourceElement.autoplay = true;
    this.sourceElement.muted = true;
    await this.sourceElement.play();

    await this.initTwilioProcessor();
    this.startProcessingLoop();
  }

  private async loadImage(src: string): Promise<HTMLImageElement | null> {
    const img = new Image();
    try {
      const imageUrl = new URL(src, window.location.href);
      if (imageUrl.origin !== window.location.origin) {
        img.crossOrigin = 'anonymous';
      }
    } catch (e) {
      console.error(`[loadImage] Invalid URL provided: ${src}`, e);
      return null;
    }

    img.src = src;
    await img.decode();
    return img;
  }

  private async initTwilioProcessor() {
    if (this.backgroundConfig.type === 'blur') {
      this.processor = new GaussianBlurBackgroundProcessor({
        assetsPath: vbPaths,
        useWebWorker: true,
      });
    } else if (
      this.backgroundConfig.type === 'image' &&
      this.backgroundConfig.url
    ) {
      const backgroundImage = await this.loadImage(this.backgroundConfig.url);
      if (!backgroundImage) {
        return;
      }

      this.processor = new VirtualBackgroundProcessor({
        assetsPath: vbPaths,
        backgroundImage: backgroundImage,
        fitType: ImageFit.Fill,
        useWebWorker: true,
      });
    }

    if (this.processor) {
      await this.processor.loadModel();
    }
  }

  private renderLoop = async () => {
    while (this.isProcessing) {
      if (
        !this.processor ||
        !this.sourceElement ||
        this.sourceElement.videoWidth === 0
      ) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        continue;
      }

      const w = this.sourceElement.videoWidth;
      const h = this.sourceElement.videoHeight;

      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
        this.intermediateCanvas.width = w;
        this.intermediateCanvas.height = h;
      }

      try {
        await this.processor.processFrame(
          this.sourceElement,
          this.intermediateCanvas,
        );

        const ctx = this.canvas.getContext('2d')!;
        if (this.mirror) {
          ctx.save();
          ctx.translate(w, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(this.intermediateCanvas, 0, 0);
          ctx.restore();
        } else {
          ctx.drawImage(this.intermediateCanvas, 0, 0);
        }
      } catch (e) {
        console.error('Failed to process frame for virtual background', e);
        this.isProcessing = false;
      }
    }
  };

  private startProcessingLoop() {
    if (this.processor) {
      this.isProcessing = true;
      this.loopPromise = this.renderLoop();
    }
  }

  private cleanupSourceStream() {
    if (this.sourceElement && this.sourceElement.srcObject) {
      this.sourceElement.pause();
      const stream = this.sourceElement.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      this.sourceElement.srcObject = null;
    }
  }

  async restart(opts: VideoProcessorOptions) {
    if (!this.sourceElement) {
      return;
    }

    this.isProcessing = false;
    if (this.loopPromise) {
      await this.loopPromise;
    }

    this.cleanupSourceStream();

    this.sourceElement.srcObject = new MediaStream([opts.track]);
    await this.sourceElement.play();

    this.startProcessingLoop();
  }

  async update(backgroundConfig: BackgroundConfig) {
    if (backgroundConfig.type === 'none') {
      await this.destroy();
      return;
    }

    this.isProcessing = false;
    if (this.loopPromise) {
      await this.loopPromise;
    }

    this.backgroundConfig = backgroundConfig;
    this.processor = null;

    await this.initTwilioProcessor();
    this.startProcessingLoop();
  }

  async onUnpublish() {
    await this.destroy();
  }

  async destroy() {
    if (this.isDestroyed) {
      return;
    }
    this.isDestroyed = true;

    this.isProcessing = false;
    if (this.loopPromise) {
      await this.loopPromise;
    }
    this.processor = null;
    this.cleanupSourceStream();
    this.processedTrack?.stop();
  }
}

// ─── Standalone mirror processor (no background change, just flip) ────────────

class MirrorProcessor implements TrackProcessor<Track.Kind.Video> {
  name = 'pnm-mirror';

  private canvas = document.createElement('canvas');
  private sourceElement: HTMLVideoElement | undefined = undefined;
  private isProcessing = false;
  private isDestroyed = false;
  private loopPromise: Promise<void> | null = null;

  readonly processedTrack: MediaStreamTrack;

  constructor() {
    this.processedTrack = this.canvas.captureStream().getVideoTracks()[0];
  }

  async init(opts: VideoProcessorOptions) {
    this.sourceElement =
      (opts.element as HTMLVideoElement) ?? document.createElement('video');
    this.sourceElement.srcObject = new MediaStream([opts.track]);
    this.sourceElement.autoplay = true;
    this.sourceElement.muted = true;
    await this.sourceElement.play();
    this.startLoop();
  }

  private renderLoop = async () => {
    while (this.isProcessing) {
      const src = this.sourceElement;
      if (!src || src.videoWidth === 0 || src.readyState < 2) {
        await new Promise<void>((r) => setTimeout(r, 50));
        continue;
      }

      const w = src.videoWidth;
      const h = src.videoHeight;

      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
      }

      const ctx = this.canvas.getContext('2d')!;
      ctx.save();
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(src, 0, 0, w, h);
      ctx.restore();

      await new Promise<void>((r) => setTimeout(r, 0));
    }
  };

  private startLoop() {
    this.isProcessing = true;
    this.loopPromise = this.renderLoop();
  }

  private cleanupSourceStream() {
    if (this.sourceElement?.srcObject) {
      this.sourceElement.pause();
      (this.sourceElement.srcObject as MediaStream)
        .getTracks()
        .forEach((t) => t.stop());
      this.sourceElement.srcObject = null;
    }
  }

  async restart(opts: VideoProcessorOptions) {
    this.isProcessing = false;
    if (this.loopPromise) await this.loopPromise;
    this.cleanupSourceStream();
    this.sourceElement!.srcObject = new MediaStream([opts.track]);
    await this.sourceElement!.play();
    this.startLoop();
  }

  async onUnpublish() {
    await this.destroy();
  }

  async destroy() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.isProcessing = false;
    if (this.loopPromise) await this.loopPromise;
    this.cleanupSourceStream();
    this.processedTrack?.stop();
  }
}

// ─── Factories ────────────────────────────────────────────────────────────────

export function createVirtualBackgroundProcessor(
  backgroundConfig: BackgroundConfig,
  mirror: boolean = false,
): TwilioTrackProcessor {
  return new TwilioTrackProcessor(backgroundConfig, mirror);
}

export function createMirrorProcessor(): MirrorProcessor {
  return new MirrorProcessor();
}

export type TwilioBackgroundProcessor = TwilioTrackProcessor;
export type MirrorTrackProcessor = MirrorProcessor;

// ─── Pre-load models at boot so first activation is fast ─────────────────────

if (isSupported) {
  (async () => {
    try {
      const blur = new GaussianBlurBackgroundProcessor({
        assetsPath: vbPaths,
      });

      const blankImage = new Image();
      blankImage.src =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      await blankImage.decode();

      const imageVb = new VirtualBackgroundProcessor({
        assetsPath: vbPaths,
        backgroundImage: blankImage,
      });

      Promise.all([blur.loadModel(), imageVb.loadModel()]).then();
    } catch (e) {
      console.error(e);
    }
  })();
}
