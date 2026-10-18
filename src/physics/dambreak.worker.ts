/// <reference lib="webworker" />
/** cálculo hidráulico de la rotura de presa en segundo plano (ver `dambreak.ts`) */
import { simulateDamBreak, type DamSimInput } from './dambreak';

self.onmessage = (e: MessageEvent<DamSimInput>) => {
  try {
    const out = simulateDamBreak(e.data);
    const transfer = [out.maxDepth.buffer, out.arrivalH.buffer, ...out.snaps.map((s) => s.depth.buffer)];
    (self as unknown as Worker).postMessage({ done: true, ...out }, transfer as Transferable[]);
  } catch (err) {
    (self as unknown as Worker).postMessage({ error: String(err) });
  }
};
