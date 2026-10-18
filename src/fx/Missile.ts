import * as THREE from 'three';
import maplibregl from 'maplibre-gl';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { FrameCtx, FxModule } from './types';
import { legAt, type FlightPlan } from '../data/flight';
import { greatCirclePath } from '../data/launch';
import type { Attempt } from '../data/defense';

/**
 * Vuelo del arma en 3D: el arco real por el aire (o por el espacio, a cientos de km de altura), con
 * la estela del tramo recorrido, la llama del cohete en la fase propulsada y el brillo de cada ojiva
 * al reentrar en la atmósfera. Con varias ojivas (MIRV), el «bus» las suelta a mitad del vuelo y
 * cada una cae hacia su objetivo, una tras otra.
 *
 * Las posiciones se calculan en el sistema local de la capa (metros: x este, y arriba, z sur): en el
 * mapa plano, a partir de las coordenadas Mercator (así coinciden con el mapa aunque estén a miles
 * de km); en el globo, con la curvatura de la Tierra.
 */
const R_EARTH = 6371008.8;
const RAD = Math.PI / 180;

function glowTexture(white = false) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.18, white ? 'rgba(255,255,255,0.9)' : 'rgba(255,240,200,0.95)');
  gr.addColorStop(0.45, white ? 'rgba(255,255,255,0.35)' : 'rgba(255,150,40,0.45)');
  gr.addColorStop(1, white ? 'rgba(255,255,255,0)' : 'rgba(255,90,0,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

export class Missile implements FxModule {
  object = new THREE.Group();
  private plan: FlightPlan;
  private origin: { lng: number; lat: number; alt: number };
  private tStart: number;
  private flightS: number;
  private canvas: HTMLCanvasElement;
  private pts: THREE.Vector3[][] = [];
  private globe: boolean | null = null;
  private planned: Line2[] = [];
  private flown: Line2[] = [];
  private heads: THREE.Mesh[] = [];
  private mats: LineMaterial[] = [];
  private tex = glowTexture();
  private texW = glowTexture(true);
  /** interceptores de la defensa antimisiles */
  private icpt: { a: Attempt; line: Line2; mat: LineMaterial; head: THREE.Mesh; flash: THREE.Mesh; pts: THREE.Vector3[] }[] = [];
  /** posición (local) de la cabeza que va delante, para colocar el rótulo */
  lead: THREE.Vector3 | null = null;
  /** distancia máxima (m) de la trayectoria al origen, para el plano lejano */
  extentM = 0;

  constructor(plan: FlightPlan, origin: { lng: number; lat: number; alt: number }, tStart: number, flightS: number, canvas: HTMLCanvasElement, intercepts: Attempt[] = []) {
    this.plan = plan; this.origin = origin; this.tStart = tStart; this.flightS = flightS; this.canvas = canvas;
    for (const a of intercepts) {
      const mat = new LineMaterial({ color: 0x67e8f9, linewidth: 2, transparent: true, opacity: 0.9, depthWrite: false });
      const line = new Line2(new LineGeometry(), mat);
      line.frustumCulled = false; line.renderOrder = 5;
      const mk = () => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.texW, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
        m.matrixAutoUpdate = false; m.frustumCulled = false; m.renderOrder = 7;
        return m;
      };
      const head = mk(), flash = mk();
      (head.material as THREE.MeshBasicMaterial).color.setRGB(0.55, 0.95, 1);
      this.icpt.push({ a, line, mat, head, flash, pts: [] });
      this.object.add(line, head, flash);
    }
    for (const _ of plan.legs) {
      const pm = new LineMaterial({ color: 0xffb020, linewidth: 1.2, transparent: true, opacity: 0.32, depthWrite: false });
      const fm = new LineMaterial({ color: 0xffc04a, linewidth: 2.6, transparent: true, opacity: 0.95, depthWrite: false });
      this.mats.push(pm, fm);
      const pl = new Line2(new LineGeometry(), pm), fl = new Line2(new LineGeometry(), fm);
      pl.frustumCulled = fl.frustumCulled = false;
      pl.renderOrder = fl.renderOrder = 5;
      this.planned.push(pl); this.flown.push(fl);
      const head = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      head.matrixAutoUpdate = false; head.frustumCulled = false; head.renderOrder = 6;
      this.heads.push(head);
      this.object.add(pl, fl, head);
    }
  }

  /** punto [lon, lat] a altura (m) → coordenadas locales de la capa */
  private local(lon: number, lat: number, altM: number, globe: boolean): THREE.Vector3 {
    const o = this.origin;
    // misma vuelta del mundo que el origen
    while (lon - o.lng > 180) lon -= 360;
    while (lon - o.lng < -180) lon += 360;
    if (!globe) {
      const mo = maplibregl.MercatorCoordinate.fromLngLat([o.lng, o.lat], o.alt);
      const s = mo.meterInMercatorCoordinateUnits();
      const mc = maplibregl.MercatorCoordinate.fromLngLat([lon, lat], altM);
      return new THREE.Vector3((mc.x - mo.x) / s, ((mc.z ?? 0) - (mo.z ?? 0)) / s, (mc.y - mo.y) / s);
    }
    const ecef = (lo: number, la: number, h: number) => {
      const r = R_EARTH + h, cl = Math.cos(la * RAD);
      return new THREE.Vector3(r * cl * Math.cos(lo * RAD), r * cl * Math.sin(lo * RAD), r * Math.sin(la * RAD));
    };
    const O = ecef(o.lng, o.lat, o.alt), P = ecef(lon, lat, altM).sub(O);
    const sl = Math.sin(o.lng * RAD), cl = Math.cos(o.lng * RAD), sp = Math.sin(o.lat * RAD), cp = Math.cos(o.lat * RAD);
    const e = -sl * P.x + cl * P.y;
    const n = -sp * cl * P.x - sp * sl * P.y + cp * P.z;
    const u = cp * cl * P.x + cp * sl * P.y + sp * P.z;
    return new THREE.Vector3(e, u, -n);
  }

  /** calcula la trayectoria en la escena (también al cambiar entre mapa plano y globo) */
  rebuild(globe: boolean) {
    this.globe = globe;
    this.extentM = 0;
    this.pts = this.plan.legs.map((L) => L.pts.map(([lo, la], i) => this.local(lo, la, L.alt[i] * 1000, globe)));
    this.pts.forEach((P, k) => {
      const arr: number[] = [];
      for (const p of P) { arr.push(p.x, p.y, p.z); this.extentM = Math.max(this.extentM, p.length()); }
      (this.planned[k].geometry as LineGeometry).setPositions(arr);
      this.planned[k].computeLineDistances();
    });
    // interceptor: de su base al punto de encuentro, subiendo deprisa y después casi en horizontal
    for (const I of this.icpt) {
      const { a } = I;
      const n = 48;
      const g = greatCirclePath(a.site[0], a.site[1], a.pt[1], a.pt[0], n);
      I.pts = g.map(([lo, la], i) => { const u = i / n; return this.local(lo, la, a.altKm * 1000 * (1 - (1 - u) ** 2.2), globe); });
    }
  }

  /** cambia los puntos de una línea; con otro número de puntos se crea una geometría nueva (si no, el número de tramos dibujados se queda en el primero) */
  private setLine(l: Line2, arr: number[]) {
    const g = l.geometry as LineGeometry;
    if ((g.userData.n ?? -1) !== arr.length) {
      g.dispose();
      l.geometry = new LineGeometry();
      (l.geometry as LineGeometry).userData.n = arr.length;
    }
    (l.geometry as LineGeometry).setPositions(arr);
  }

  /** coloca un brillo orientado a la cámara */
  private billboard(m: THREE.Mesh, p: THREE.Vector3, sizeM: number, ctx: FrameCtx) {
    const r = ctx.right.clone().multiplyScalar(sizeM), up = ctx.up.clone().multiplyScalar(sizeM), n = new THREE.Vector3().crossVectors(r, up).normalize();
    m.matrix.makeBasis(r, up, n).setPosition(p);
    m.matrixWorldNeedsUpdate = true;
  }

  update(ctx: FrameCtx) {
    if (this.globe !== ctx.globe) this.rebuild(ctx.globe);
    const W = this.canvas.width, H = this.canvas.height;
    // con la cámara lejana, la profundidad del relieve no es fiable: la trayectoria se dibuja siempre encima
    const dt = !ctx.farView;
    for (const m of this.mats) { m.resolution.set(W, H); if (m.depthTest !== dt) { m.depthTest = dt; m.needsUpdate = true; } }
    for (const h of this.heads) { const hm = h.material as THREE.MeshBasicMaterial; if (hm.depthTest !== dt) { hm.depthTest = dt; hm.needsUpdate = true; } }
    const t = ctx.t;
    const f = (t - this.tStart) / this.flightS;
    const endF = Math.max(...this.plan.legs.map((L) => L.f1));
    // después de la última detonación, las estelas se apagan poco a poco
    const fEnd = Math.max(endF, ...this.icpt.map((I) => I.a.fHit + 0.06));
    const fade = f <= fEnd ? 1 : Math.max(0, 1 - ((f - fEnd) * this.flightS) / 90);
    this.object.visible = fade > 0 && f >= 0;
    if (!this.object.visible) { this.lead = null; return; }
    this.lead = null;
    const camD = (v: THREE.Vector3) => Math.max(1, ctx.camPos.distanceTo(v));
    const pxM = (v: THREE.Vector3, px: number) => camD(v) * 0.667 * px / Math.max(1, this.canvas.clientHeight);
    this.plan.legs.forEach((L, k) => {
      const P = this.pts[k];
      this.mats[2 * k].opacity = 0.32 * fade;
      this.mats[2 * k + 1].opacity = 0.95 * fade;
      const a = legAt(L, f);
      const head = this.heads[k];
      if (!a) { this.flown[k].visible = false; head.visible = false; return; }
      // tramo recorrido hasta la posición actual
      const g = Math.min(1, (f - L.f0) / Math.max(1e-6, L.f1 - L.f0));
      const x = g * (P.length - 1), i = Math.min(P.length - 2, Math.floor(x)), u = x - i;
      const hp = P[i].clone().lerp(P[i + 1], u);
      const arr: number[] = [];
      for (let j = 0; j <= i; j++) arr.push(P[j].x, P[j].y, P[j].z);
      arr.push(hp.x, hp.y, hp.z);
      if (arr.length < 6) arr.push(hp.x, hp.y, hp.z);
      this.setLine(this.flown[k], arr);
      this.flown[k].visible = true;
      // cabeza: llama del cohete al principio, brillo de reentrada al final; el «bus» desaparece al soltar las ojivas
      const busDone = L.target < 0 && f >= L.f1;
      const arrived = L.target >= 0 && g >= 1;
      head.visible = !busDone && !arrived;
      if (!head.visible) return;
      const boost = f < this.plan.boostMin * 60 / this.flightS;
      const reentry = this.plan.profile === 'ballistic' && L.target >= 0 && g > 0.9;
      const px = boost ? 26 : reentry ? 20 : 12;
      const s = pxM(hp, px);
      const r = ctx.right.clone().multiplyScalar(s), up = ctx.up.clone().multiplyScalar(s), n = new THREE.Vector3().crossVectors(r, up).normalize();
      head.matrix.makeBasis(r, up, n).setPosition(hp);
      head.matrixWorldNeedsUpdate = true;
      (head.material as THREE.MeshBasicMaterial).color.setRGB(boost ? 1 : reentry ? 1 : 1, boost ? 0.75 : reentry ? 0.62 : 0.88, boost ? 0.45 : reentry ? 0.3 : 0.6);
      if (!this.lead && (L.target <= 0)) this.lead = hp;
    });
    // interceptores: estela cian, cabeza brillante y destello al llegar (grande si acierta)
    for (const I of this.icpt) {
      const { a } = I;
      const hm = I.head.material as THREE.MeshBasicMaterial, fm = I.flash.material as THREE.MeshBasicMaterial;
      I.mat.resolution.set(W, H);
      if (I.mat.depthTest !== dt) { I.mat.depthTest = dt; I.mat.needsUpdate = true; }
      for (const m of [hm, fm]) if (m.depthTest !== dt) { m.depthTest = dt; m.needsUpdate = true; }
      if (f < a.fLaunch || !I.pts.length) { I.line.visible = I.head.visible = I.flash.visible = false; continue; }
      const u = Math.min(1, (f - a.fLaunch) / Math.max(1e-6, a.fHit - a.fLaunch));
      const P = I.pts, x = u * (P.length - 1), i = Math.min(P.length - 2, Math.floor(x));
      const hp = P[i].clone().lerp(P[i + 1], x - i);
      const arr: number[] = [];
      for (let j = 0; j <= i; j++) arr.push(P[j].x, P[j].y, P[j].z);
      arr.push(hp.x, hp.y, hp.z);
      if (arr.length < 6) arr.push(hp.x, hp.y, hp.z);
      this.setLine(I.line, arr);
      I.line.visible = true;
      const after = Math.max(0, f - a.fHit);
      I.mat.opacity = 0.9 * fade * Math.max(0.15, 1 - after / 0.12);
      I.head.visible = u < 1;
      if (I.head.visible) this.billboard(I.head, hp, pxM(hp, 12), ctx);
      const age = after / 0.05;
      I.flash.visible = u >= 1 && age < 1;
      if (I.flash.visible) {
        this.billboard(I.flash, P[P.length - 1], pxM(P[P.length - 1], a.hit ? 34 + 110 * age : 12 + 26 * age), ctx);
        fm.opacity = (1 - age) ** 1.5;
        fm.color.setRGB(a.hit ? 1 : 0.6, a.hit ? 0.97 : 0.9, 1);
      }
    }
    if (!this.lead) {
      const k = this.plan.legs.findIndex((L, j) => this.heads[j].visible);
      if (k >= 0) this.lead = this.heads[k].matrix.elements ? new THREE.Vector3().setFromMatrixPosition(this.heads[k].matrix) : null;
    }
  }

  dispose() {
    for (const l of [...this.planned, ...this.flown]) l.geometry.dispose();
    for (const m of [...this.mats, ...this.icpt.map((I) => I.mat)]) m.dispose();
    for (const h of [...this.heads, ...this.icpt.flatMap((I) => [I.head, I.flash])]) { h.geometry.dispose(); (h.material as THREE.Material).dispose(); }
    for (const I of this.icpt) I.line.geometry.dispose();
    this.tex.dispose(); this.texW.dispose();
  }
}
