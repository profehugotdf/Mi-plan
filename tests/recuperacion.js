// Prueba de la recuperación estimada (Node): extrae las funciones puras de index.html
const fs = require('fs'), assert = require('assert');
const s = fs.readFileSync(__dirname + '/../index.html', 'utf8');
const a = s.indexOf('const REC_CAP_H'), b = s.indexOf('function calcularReadinessHoy');
const { horasRecuperacionSesion, calcularRecuperacion, textoListoEn } = new Function(s.slice(a, b) + '; return {horasRecuperacionSesion, calcularRecuperacion, textoListoEn};')();
const ok = (x, y, m) => assert(Math.abs(x - y) < 0.05, m + ': ' + x + ' != ' + y);
ok(horasRecuperacionSesion(0), 0, 'tss 0'); ok(horasRecuperacionSesion(50), 15, '50'); ok(horasRecuperacionSesion(100), 30, '100');
ok(horasRecuperacionSesion(150), 52.5, '150'); ok(horasRecuperacionSesion(900), 96, 'tope');
const T = (f, h) => new Date(f + 'T' + h).getTime();
// sin sesiones
assert.strictEqual(calcularRecuperacion([], Date.now(), null).ultimaMs, null);
// una sesión TSS 100 de 10:00 a 11:00 → 30 h; a las 17:00 pasaron 6 h → faltan 24
let r = calcularRecuperacion([{ fecha: '2026-10-30', horaInicio: '10:00', duracionSeg: 3600, tss: 100 }], T('2026-10-30', '17:00'), null);
ok(r.horas, 24, 'una sesión');
// HRV baja ×1,25
ok(calcularRecuperacion([{ fecha: '2026-10-30', horaInicio: '10:00', duracionSeg: 3600, tss: 100 }], T('2026-10-30', '17:00'), 'Bajo').horas, 30, 'hrv bajo');
// ya recuperado
ok(calcularRecuperacion([{ fecha: '2026-10-30', horaInicio: '10:00', duracionSeg: 3600, tss: 50 }], T('2026-11-02', '10:00'), null).horas, 0, 'recuperado');
// acumula: dos sesiones; 2.ª a las 11:00→ queda 30-... 
r = calcularRecuperacion([
  { fecha: '2026-10-30', horaInicio: '09:00', duracionSeg: 3600, tss: 100 },
  { fecha: '2026-10-30', horaInicio: '18:00', duracionSeg: 3600, tss: 50 }], T('2026-10-30', '19:00'), null);
ok(r.horas, (30 - 9) + 15, 'acumula'); // a las 19:00: 30-9=21 restantes + 15
// sesión futura se ignora; fuerza sin hora usa 12:00
r = calcularRecuperacion([{ fecha: '2026-10-31', duracionSeg: 0, tss: 60 }], T('2026-10-30', '12:00'), null);
assert.strictEqual(r.ultimaMs, null);
console.log('recuperación OK');
