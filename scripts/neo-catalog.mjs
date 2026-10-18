// Genera src/data/neo-catalog.json con los asteroides reales de la NASA/JPL: la lista de riesgo Sentry
// (todos los objetos con alguna probabilidad de impacto), las fechas de impacto posibles de los más
// peligrosos, los acercamientos a la Tierra de los próximos 10 años y unos cuantos asteroides famosos
// con sus datos físicos (SBDB). Las API de JPL no permiten consultas desde el navegador (CORS), por
// eso se descargan aquí y se publican con la aplicación.
// Uso: node scripts/neo-catalog.mjs
import { writeFileSync } from 'node:fs';

const API = 'https://ssd-api.jpl.nasa.gov';
const get = async (path) => {
  for (let k = 0; k < 3; k++) {
    try { const r = await fetch(API + path); if (r.ok) return await r.json(); } catch { /* reintento */ }
    await new Promise((res) => setTimeout(res, 800));
  }
  return null;
};
const num = (x) => (x == null || x === '' ? null : +x);
const today = new Date().toISOString().slice(0, 10);

// 1. lista de riesgo Sentry
const S = await get('/sentry.api');
const sentry = S.data.map((o) => [o.des, Math.round((num(o.diameter) ?? 0) * 1000 * 10) / 10, num(o.v_inf), num(o.ip), o.n_imp, o.range, num(o.ps_cum), num(o.ps_max), num(o.ts_max), num(o.h), o.last_obs, o.fullname?.trim().replace(/^\((.*)\)$/, '$1') ?? o.des])
  .sort((a, b) => b[6] - a[6]);

// 2. fechas de impacto posibles de los 40 más peligrosos (escala de Palermo acumulada)
const vi = {};
for (const o of sentry.slice(0, 40)) {
  const d = await get(`/sentry.api?des=${encodeURIComponent(o[0])}`);
  if (!d?.data) continue;
  vi[o[0]] = d.data.map((v) => [v.date, num(v.ip), num(v.ps), num(v.ts), num(v.energy)]).sort((a, b) => b[1] - a[1]).slice(0, 6);
}

// 3. acercamientos de los próximos 10 años a menos de 0,05 ua (unas 19 distancias lunares)
const y = new Date().getFullYear();
const C = await get(`/cad.api?date-min=${today}&date-max=${y + 10}-12-31&dist-max=0.05&h-max=24&diameter=true&fullname=true&sort=date`);
const LD = 384400 / 149597870.7;
const approaches = (C?.data ?? []).map((r) => {
  const f = Object.fromEntries(C.fields.map((k, i) => [k, r[i]]));
  return [f.des, f.fullname?.trim() ?? f.des, f.cd, Math.round((+f.dist / LD) * 100) / 100, num(f.v_rel), num(f.v_inf), num(f.h), f.diameter ? Math.round(+f.diameter * 1000) : null];
});

// 4. asteroides famosos: datos físicos (SBDB) y velocidad de encuentro con la Tierra (acercamiento más cercano)
const FAMOUS = [
  ['99942', 'Apophis', 3200], ['101955', 'Bennu', 1190], ['2024 YR4', '2024 YR4', 2600], ['65803', 'Didymos', 2400],
  ['433', 'Eros', 2670], ['25143', 'Itokawa', 1900], ['162173', 'Ryugu', 1190], ['29075', '1950 DA', 1700],
  ['4179', 'Toutatis', 2100], ['3200', 'Phaethon', 2600], ['1036', 'Ganymed', 2600], ['2023 DW', '2023 DW', 2600],
];
const famous = [];
for (const [des, name, rho] of FAMOUS) {
  const b = await get(`/sbdb.api?sstr=${encodeURIComponent(des)}&phys-par=1`);
  if (!b?.object) continue;
  const pp = Object.fromEntries((b.phys_par ?? []).map((p) => [p.name, p.value]));
  const el = Object.fromEntries((b.orbit?.elements ?? []).map((e) => [e.name, e.value]));
  const ca = await get(`/cad.api?des=${encodeURIComponent(des)}&date-min=1900-01-01&date-max=2200-01-01&dist-max=0.2&sort=dist&limit=1`);
  const c0 = ca?.data?.[0] ? Object.fromEntries(ca.fields.map((k, i) => [k, ca.data[0][i]])) : null;
  // diámetro: el medido si lo hay; si no, por el brillo con un albedo de 0,14
  const H = num(pp.H);
  const dKm = num(pp.diameter) ?? (H != null ? (1329 / Math.sqrt(num(pp.albedo) ?? 0.14)) * 10 ** (-H / 5) : null);
  famous.push({
    des, name, full: b.object.fullname, dM: dKm != null ? Math.round(dKm * 1000) : null, albedo: num(pp.albedo), rho, H,
    cls: b.object.orbit_class?.name ?? '', pha: !!b.object.pha, moidAu: num(b.orbit?.moid), a: num(el.a), e: num(el.e), i: num(el.i),
    vInf: c0 ? num(c0.v_inf) : null, closest: c0 ? [c0.cd, Math.round((+c0.dist / LD) * 100) / 100] : null,
    sentry: sentry.some((s) => s[0] === des || s[0] === name),
  });
}

writeFileSync(new URL('../src/data/neo-catalog.json', import.meta.url), JSON.stringify({ fetched: today, sentry, vi, approaches, famous }));
console.log('Sentry', sentry.length, '· VI', Object.keys(vi).length, '· acercamientos', approaches.length, '· famosos', famous.length);
