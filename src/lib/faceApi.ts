import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

export function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return Promise.resolve();
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const modelUrl = new URL('/models', window.location.origin).href;
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelUrl),
      faceapi.nets.faceExpressionNet.loadFromUri(modelUrl),
    ]);
    modelsLoaded = true;
  })();

  return loadingPromise;
}

export function areModelsLoaded(): boolean {
  return modelsLoaded;
}

export interface DetectionResult {
  emotions: Record<string, number>;
  dominantEmotion: string;
  confidence: number;
  box: { x: number; y: number; width: number; height: number };
}

export async function detectFacesInImage(
  input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
): Promise<DetectionResult[]> {
  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 320,
    scoreThreshold: 0.5,
  });

  const detections = await faceapi
    .detectAllFaces(input, options)
    .withFaceLandmarks(true)
    .withFaceExpressions();

  return detections.map((d) => {
    const emotions: Record<string, number> = {};
    let dominant = 'neutral';
    let max = -1;

    for (const [key, value] of Object.entries(d.expressions)) {
      emotions[key] = value;
      if (value > max) {
        max = value;
        dominant = key;
      }
    }

    return {
      emotions,
      dominantEmotion: dominant,
      confidence: max,
      box: {
        x: d.detection.box.x,
        y: d.detection.box.y,
        width: d.detection.box.width,
        height: d.detection.box.height,
      },
    };
  });
}

export { faceapi };
