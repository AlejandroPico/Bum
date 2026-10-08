import { cloudNoiseData } from './noise3d';

self.onmessage = (e: MessageEvent<number>) => {
  const data = cloudNoiseData(e.data || 64);
  (self as unknown as Worker).postMessage(data, [data.buffer]);
};
