// Prueba de los Mínimos semanales (Node): extrae las funciones puras de index.html.
// Las sesiones llegan ya normalizadas por el Informe (fecha local 'AAAA-MM-DD'), así que acá no hay husos horarios en juego.
// Correr con: node tests/minimos.js
const fs = require('fs'), assert = require('assert');
const s = fs.readFileSync(__dirname + '/../index.html', 'utf8');
const corte = (desde, hasta) => { const a = s.indexOf(desde), b = s.indexOf(hasta); assert(a >= 0 && b > a, 'no encontré ' + desde); return s.slice(a, b); };
const codigo = corte('function sumarDiasISO', 'function configDesdeFormulario') +
  corte('function utcDeISO', 'function rangoDiasISO') +
  corte('// ===== INICIO MÍNIMOS PURO =====', '// ===== FIN MÍNIMOS PURO =====');
const M = new Function(codigo + '; return {inicioSemanaISO, sumarDiasISO, mnNormalizar, mnCfgEfectiva, mnNutriDia, mnResumenSemana, mnRacha, mnHorasDeHM, mnFmtHM};')();

let n = 0;
const t = (nombre, fn) => { try { fn(); n++; console.log('ok  - ' + nombre); } catch (e) { console.log('FALLA - ' + nombre + '\n   ' + e.message); process.exitCode = 1; } };

const HOY = '2026-11-02'; // lunes: la semana en curso es dom 1/11 al sáb 7/11; la anterior, dom 25/10 al sáb 31/10
const SEM_ANT = '2026-10-25', SEM_ACT = '2026-11-01';

t('la semana arranca el domingo, como el calendario', () => {
  assert.strictEqual(M.inicioSemanaISO('2026-11-02'), '2026-11-01'); // lunes
  assert.strictEqual(M.inicioSemanaISO('2026-11-01'), '2026-11-01'); // domingo
  assert.strictEqual(M.inicioSemanaISO('2026-10-31'), '2026-10-25'); // sábado
});

const informe = [ // lo que devuelve informeContexto().sesiones (solo los campos que usa Mínimos)
  { deporte: 'carrera', fecha: '2026-10-26', duracionSeg: 2700 },  // 45 min
  { deporte: 'carrera', fecha: '2026-10-31', duracionSeg: 3600 },  // 60 min, sábado: última del domingo-sábado
  { deporte: 'bici', fecha: '2026-10-28', duracionSeg: 3600 },     // 60 min
  { deporte: 'kayak', fecha: '2026-10-30', duracionSeg: 1800 },    // 30 min
  { deporte: 'fuerza', fecha: '2026-10-27', duracionSeg: 2100 },   // 35 min
  { deporte: 'fuerza', fecha: '2026-10-31', duracionSeg: 1800 },   // 30 min
];
const nutri = {
  '2026-10-25': { consumido: 2500, gastoTotal: 2800, proteinasG: 150 },
  '2026-10-26': { consumido: 3000, gastoTotal: 2800, proteinasG: 160 },
  '2026-10-27': { proteinasG: 100 },
  '2026-10-28': { proteinasG: 148 },
  '2026-10-29': { proteinasG: 170 },
  '2026-10-30': { proteinasG: 147 },
  '2026-11-01': { consumido: 2000, gastoTotal: 2500, proteinasG: 90 },
  '2026-11-02': { consumido: 300, gastoTotal: 2800, proteinasG: 20 },
};
const datos = { sueno: { '2026-10-25': 8, '2026-10-26': 7, '2026-10-27': 6.5 }, perfil: { pesoKg: 92 }, pesoNutri: null, factorProt: null, nutriDia: M.mnNutriDia(nutri) };
const cfg = M.mnCfgEfectiva(datos, {});
const ses = M.mnNormalizar(informe);
const sem = M.mnResumenSemana(ses, SEM_ANT, datos, cfg, HOY);

t('normalizar: fuerza es fuerza, todo lo demás es aeróbico, y se ignora la basura', () => {
  assert.strictEqual(ses.filter((x) => x.tipo === 'fuerza').length, 2);
  assert.strictEqual(ses.filter((x) => x.tipo === 'aerobico').length, 4);
  assert.strictEqual(M.mnNormalizar(null).length, 0);
  assert.strictEqual(M.mnNormalizar([null, 5, 'a', {}, { deporte: 'bici' }, { fecha: '2026-10-26' }]).length, 0);
});
t('meta de proteína = 1,6 g/kg x 92 kg = 147 g, con el peso del perfil', () => {
  assert.strictEqual(cfg.proteinaMetaG, 147); assert.strictEqual(cfg.pesoOrigen, 'perfil');
});
t('el sábado cae en la semana que termina; el domingo siguiente, en la nueva', () => {
  assert.strictEqual(sem.aerobico.porDeporte.carrera, 105); // 45 + 60 (el del sábado 31/10 entra)
  const nueva = M.mnResumenSemana(ses, SEM_ACT, datos, cfg, HOY);
  assert.strictEqual(nueva.aerobico.min, 0); assert.strictEqual(nueva.fuerza.sesiones, 0);
  const dom = M.mnNormalizar([{ deporte: 'carrera', fecha: '2026-11-01', duracionSeg: 600 }]);
  assert.strictEqual(M.mnResumenSemana(dom, SEM_ACT, datos, cfg, HOY).aerobico.min, 10);
  assert.strictEqual(M.mnResumenSemana(dom, SEM_ANT, datos, cfg, HOY).aerobico.min, 0);
});
t('aeróbico suma carrera + bici + kayak = 195 min y está cumplido', () => {
  assert.strictEqual(sem.aerobico.min, 195); assert.strictEqual(sem.aerobico.estado, 'ok');
});
t('fuerza: 2 sesiones y 65 min está cumplido', () => {
  assert.strictEqual(sem.fuerza.sesiones, 2); assert.strictEqual(sem.fuerza.min, 65); assert.strictEqual(sem.fuerza.estado, 'ok');
});
t('proteína: 5 días llegando a la meta (147 cuenta, 100 no), con 6 días con dato', () => {
  assert.strictEqual(sem.proteina.diasCumplidos, 5); assert.strictEqual(sem.proteina.diasConDato, 6); assert.strictEqual(sem.proteina.estado, 'ok');
});
t('calorías: promedio de -300 y +200 = -50', () => {
  assert.strictEqual(sem.calorias.dias, 2); assert.strictEqual(sem.calorias.superavitPromedio, -50);
});
t('semana cerrada con todo en verde: cumplida', () => { assert.strictEqual(sem.cumplida, true); });
t('sueño: promedio 7,2 h con meta 7 es ok', () => {
  assert.strictEqual(sem.sueno.noches, 3); assert.strictEqual(sem.sueno.promedio, 7.2); assert.strictEqual(sem.sueno.estado, 'ok');
});

const cur = M.mnResumenSemana(ses, SEM_ACT, datos, cfg, HOY);
t('semana en curso sin nada hecho: "en camino", no "sin hacer" (no desmotiva)', () => {
  assert.ok(cur.enCurso); assert.strictEqual(cur.fuerza.estado, 'curso'); assert.strictEqual(cur.aerobico.estado, 'curso');
});
t('semana en curso: el domingo ya terminado cuenta en calorías y hoy no', () => {
  assert.strictEqual(cur.calorias.dias, 1); assert.strictEqual(cur.calorias.superavitPromedio, -500);
});
t('semana futura no es "en curso"', () => {
  const fut = M.mnResumenSemana(ses, '2026-11-08', datos, cfg, HOY); assert.ok(fut.futura); assert.ok(!fut.enCurso);
});

t('semana cerrada: 1 sola sesión de fuerza = "a medias"; ninguna = "sin hacer"', () => {
  const uno = M.mnNormalizar([{ deporte: 'fuerza', fecha: '2026-10-27', duracionSeg: 1800 }]);
  assert.strictEqual(M.mnResumenSemana(uno, SEM_ANT, datos, cfg, HOY).fuerza.estado, 'parcial');
  assert.strictEqual(M.mnResumenSemana([], SEM_ANT, datos, cfg, HOY).fuerza.estado, 'falta');
});
t('2 sesiones pero con pocos minutos NO cumple fuerza', () => {
  const x = M.mnNormalizar([{ deporte: 'fuerza', fecha: '2026-10-27', duracionSeg: 600 }, { deporte: 'fuerza', fecha: '2026-10-28', duracionSeg: 600 }]);
  assert.strictEqual(M.mnResumenSemana(x, SEM_ANT, datos, cfg, HOY).fuerza.estado, 'parcial');
});
t('sueño: promedio 6,2 = a medias; 5 = sin hacer', () => {
  const mk = (h) => Object.assign({}, datos, { sueno: { '2026-10-25': h, '2026-10-26': h } });
  assert.strictEqual(M.mnResumenSemana([], SEM_ANT, mk(6.2), cfg, HOY).sueno.estado, 'parcial');
  assert.strictEqual(M.mnResumenSemana([], SEM_ANT, mk(5), cfg, HOY).sueno.estado, 'falta');
});
t('sin datos de Nutrición: proteína "sin datos" y no bloquea la semana cumplida', () => {
  const d = Object.assign({}, datos, { nutriDia: M.mnNutriDia({}) });
  const r = M.mnResumenSemana(ses, SEM_ANT, d, cfg, HOY);
  assert.strictEqual(r.proteina.estado, 'sin'); assert.strictEqual(r.cumplida, true);
});
t('sin peso conocido: proteína "sin datos" en vez de inventar una meta', () => {
  const c2 = M.mnCfgEfectiva({ perfil: {}, pesoNutri: null, factorProt: null }, {});
  assert.strictEqual(c2.proteinaMetaG, null);
  assert.strictEqual(M.mnResumenSemana(ses, SEM_ANT, datos, c2, HOY).proteina.estado, 'sin');
});

t('el peso sale del perfil, luego de Nutrición, luego del manual', () => {
  assert.strictEqual(M.mnCfgEfectiva({ perfil: { pesoKg: 92 }, pesoNutri: 90 }, { pesoKg: 88 }).pesoKg, 92);
  assert.strictEqual(M.mnCfgEfectiva({ perfil: {}, pesoNutri: 90 }, { pesoKg: 88 }).pesoOrigen, 'nutricion');
  assert.strictEqual(M.mnCfgEfectiva({ perfil: {}, pesoNutri: null }, { pesoKg: 88 }).pesoOrigen, 'manual');
});
t('g/kg guardado manda sobre el de Nutrición y el 1,6 por defecto', () => {
  assert.strictEqual(M.mnCfgEfectiva({ perfil: { pesoKg: 92 }, factorProt: 1.2 }, { proteinaGkg: 2 }).proteinaMetaG, 184);
  assert.strictEqual(M.mnCfgEfectiva({ perfil: { pesoKg: 92 }, factorProt: 1.2 }, {}).proteinaMetaG, 110);
});

t('Nutrición en formato objeto o en formato array', () => {
  assert.strictEqual(M.mnNutriDia({ '2026-10-25': { proteinasG: 1 } })('2026-10-25').proteinasG, 1);
  assert.strictEqual(M.mnNutriDia([{ fecha: '2026-10-25T10:00:00', proteinasG: 2 }])('2026-10-25').proteinasG, 2);
  assert.strictEqual(M.mnNutriDia(null)('2026-10-25'), null);
  assert.strictEqual(M.mnNutriDia('roto')('2026-10-25'), null);
});
t('sesión sin duración se cuenta como sesión con 0 min y se avisa', () => {
  const x = M.mnNormalizar([{ deporte: 'natacion', fecha: '2026-10-27' }]);
  const r = M.mnResumenSemana(x, SEM_ANT, datos, cfg, HOY);
  assert.strictEqual(r.aerobico.sesiones, 1); assert.strictEqual(r.aerobico.min, 0); assert.strictEqual(r.aerobico.sinDuracion, 1);
});
t('natación y deportes sin app (caminata) suman al aeróbico', () => {
  const x = M.mnNormalizar([{ deporte: 'natacion', fecha: '2026-10-27', duracionSeg: 2400 }, { deporte: 'caminata', fecha: '2026-10-28', duracionSeg: 3600 }]);
  assert.strictEqual(M.mnResumenSemana(x, SEM_ANT, datos, cfg, HOY).aerobico.min, 100);
});
t('datos rotos no tiran error', () => {
  const d = { sueno: [], perfil: null, pesoNutri: 'x', factorProt: {}, nutriDia: 'no es función' };
  const c = M.mnCfgEfectiva(d, null);
  M.mnResumenSemana([], SEM_ANT, d, c, HOY);
});

t('racha = 1 con solo la semana pasada cumplida; la semana en curso sin cumplir no la corta', () => {
  assert.strictEqual(M.mnRacha(ses, datos, cfg, HOY), 1);
});
t('racha = 2 con dos semanas seguidas, y corta en una semana a medias', () => {
  const mas = informe.concat([
    { deporte: 'fuerza', fecha: '2026-10-20', duracionSeg: 1800 }, { deporte: 'fuerza', fecha: '2026-10-22', duracionSeg: 1800 }, // semana dom 18/10
    { deporte: 'carrera', fecha: '2026-10-21', duracionSeg: 9000 },
    { deporte: 'carrera', fecha: '2026-10-13', duracionSeg: 600 },                                                                 // semana dom 11/10: a medias
  ]);
  assert.strictEqual(M.mnRacha(M.mnNormalizar(mas), datos, cfg, HOY), 2);
});
t('racha = 0 sin ninguna sesión', () => { assert.strictEqual(M.mnRacha([], datos, cfg, HOY), 0); });
t('si la semana en curso ya está cumplida, suma a la racha', () => {
  const x = M.mnNormalizar([
    { deporte: 'fuerza', fecha: '2026-11-01', duracionSeg: 2100 }, { deporte: 'fuerza', fecha: '2026-11-02', duracionSeg: 2100 },
    { deporte: 'carrera', fecha: '2026-11-02', duracionSeg: 9000 }]);
  assert.strictEqual(M.mnRacha(x, Object.assign({}, datos, { nutriDia: M.mnNutriDia({}) }), cfg, HOY), 1);
});

t('7 h 17 min se guarda como horas decimales y vuelve a mostrarse 7:17', () => {
  const h = M.mnHorasDeHM(7, 17);
  assert.ok(Math.abs(h - 7.2833) < 0.001);
  assert.strictEqual(M.mnFmtHM(h), '7:17');
});
t('mnHorasDeHM rechaza vacío, negativos y más de 16 h', () => {
  assert.strictEqual(M.mnHorasDeHM('', ''), null);
  assert.strictEqual(M.mnHorasDeHM(0, 0), null);
  assert.strictEqual(M.mnHorasDeHM(-1, 10), null);
  assert.strictEqual(M.mnHorasDeHM(16, 30), null);
  assert.strictEqual(M.mnHorasDeHM(7, 75), null);
});
t('solo minutos o solo horas es válido; 7,5 h se muestra 7:30', () => {
  assert.strictEqual(M.mnHorasDeHM('', 45), 0.75);
  assert.strictEqual(M.mnHorasDeHM(8, ''), 8);
  assert.strictEqual(M.mnFmtHM(7.5), '7:30');
});

console.log('\n' + n + ' pruebas pasaron' + (process.exitCode ? ' (hubo fallas)' : ''));
