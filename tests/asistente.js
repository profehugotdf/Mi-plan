// Prueba del asistente de entrenamiento (bloque ASIS de index.html): node tests/asistente.js
const fs = require('fs'), path = require('path'), assert = require('assert');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const i = html.indexOf('/*ASIS-INI*/'), j = html.indexOf('/*ASIS-FIN*/');
assert(i > 0 && j > i, 'no encuentro el bloque ASIS');
const A = new Function(html.slice(i, j) + '; return { asisPlan, asisSesionesSemana, asisSesionesDia, asisValidar, asisZonaTxt, asisSumar, asisConfigCiclo };')();
let n = 0; const ok = (c, m) => { assert(c, m); n++; };

const inicio = '2026-11-23';
const tri = { objetivo: 'olimpico', nivel: 'medio', horas: 8, dias: [1, 2, 3, 4, 6, 0], diaLargo: 6, deportes: ['natacion', 'bici', 'carrera', 'fuerza'], inicio, eventoFecha: A.asisSumar(inicio, 104) };
const ctxSin = { u: {}, edad: 45 };
const P = A.asisPlan(tri, ctxSin);
ok(A.asisValidar(tri).length === 0, 'perfil válido');
ok(P.fases.reduce((a, f) => a + f.semanas, 0) === P.n, 'las fases suman todas las semanas');
ok(P.modelo === 'tradicional', 'carrera corta → lineal');
const ult = P.semanas[P.n - 1];
ok(ult.tipo === 'evento' && ult.hasta === tri.eventoFecha, 'la última semana termina el día de la carrera');
const sesUlt = A.asisSesionesSemana(P, ult, ctxSin);
ok(sesUlt.some((s) => s.tipo === 'evento' && s.fecha === tri.eventoFecha), 'la carrera está el día de la carrera');
ok(sesUlt.every((s) => s.fecha <= tri.eventoFecha), 'nada después de la carrera');
ok(sesUlt.filter((s) => s.fecha === A.asisSumar(tri.eventoFecha, -1)).every((s) => s.tipo === 'activacion'), 'el día antes, solo activación');
// descarga más liviana que la carga anterior
P.semanas.forEach((w, k) => { if (w.tipo === 'descarga') ok(w.horas < P.semanas[k - 1].horas, 'descarga S' + w.n + ' más liviana'); });
// test de umbral en la semana 1 si falta, y no si está
const s1 = A.asisSesionesSemana(P, P.semanas[0], ctxSin);
ok(s1.filter((s) => s.tipo === 'test').length === 2, 'semana 1 con test de carrera y de bici sin umbrales');
const P2 = A.asisPlan(tri, { u: { pulsoUmbralCarrera: 160, pulsoUmbralBici: 150 }, edad: 45 });
ok(!A.asisSesionesSemana(P2, P2.semanas[0], { u: { pulsoUmbralCarrera: 160, pulsoUmbralBici: 150 }, edad: 45 }).some((s) => s.tipo === 'test'), 'con umbrales no hay test');
// ninguna sesión de calidad pasa su tope y siempre hay una larga mayor que las demás del deporte
P.semanas.forEach((w) => {
  const ss = A.asisSesionesSemana(P, w, ctxSin);
  ss.filter((s) => /umbral|vo2|ritmo|tempo/.test(s.tipo)).forEach((s) => ok(s.min <= ({ natacion: 60, bici: 90, carrera: 60, kayak: 75 })[s.dep], 'tope de calidad S' + w.n));
  ['bici', 'carrera'].forEach((d) => { const l = ss.find((s) => s.dep === d && s.larga); if (l) ok(ss.filter((s) => s.dep === d && !s.larga && !s.extra).every((s) => s.min <= l.min), 'la larga es la más larga (' + d + ' S' + w.n + ')'); });
});
// larga distancia y no principiante → inversa; principiante → lineal y 2:1
ok(A.asisPlan(Object.assign({}, tri, { objetivo: 'medio', eventoFecha: A.asisSumar(inicio, 140) }), ctxSin).modelo === 'inversa', '70.3 → inversa');
const Pi = A.asisPlan(Object.assign({}, tri, { objetivo: 'medio', nivel: 'inicio', eventoFecha: A.asisSumar(inicio, 140) }), ctxSin);
ok(Pi.modelo === 'tradicional' && Pi.ciclo === 2, 'principiante → lineal 2:1');
ok(A.asisPlan(tri, { u: {}, edad: 58 }).ciclo === 2, '50 años o más → 2:1');
// zonas: pulso del umbral, ritmo y RPE; sin umbral, estimado con ≈
const z = A.asisZonaTxt('carrera', 4, { u: { pulsoUmbralCarrera: 160, ritmoUmbralCarreraSegKm: 300 } });
ok(/152–158 lpm/.test(z) && /4:57–5:15\/km/.test(z) && /RPE 7–8/.test(z), 'zona 4 de carrera: ' + z);
ok(/≈/.test(A.asisZonaTxt('bici', 2, { u: {}, edad: 40 })), 'sin umbral, pulso estimado');
ok(!/lpm/.test(A.asisZonaTxt('natacion', 2, { u: {}, edad: 40 })), 'natación solo con RPE');
// sesiones con bloques
const dia = A.asisSesionesDia(P, s1[0].fecha, ctxSin);
ok(dia.length && dia.every((s) => s.bloques.length >= 2 && s.porque), 'sesiones con bloques y por qué');
// validar
ok(A.asisValidar(Object.assign({}, tri, { eventoFecha: A.asisSumar(inicio, 5) })).length > 0, 'carrera demasiado cerca');
ok(A.asisValidar(Object.assign({}, tri, { dias: [1] })).length > 0, 'un solo día no alcanza');
// sin carrera: 12 semanas, sin afinación
const Pb = A.asisPlan({ objetivo: 'base', nivel: 'medio', horas: 5, dias: [1, 3, 5, 6], diaLargo: 6, deportes: ['bici', 'carrera'], inicio }, ctxSin);
ok(Pb.n === 12 && !Pb.semanas.some((w) => w.tipo === 'afinacion' || w.tipo === 'evento'), 'base: 12 semanas sin afinación');
// el ciclo con el formato de siempre
const base = { disciplinas: { natacion: {}, bici: {}, carrera: {}, fuerza: {}, kayak: {} } };
const cfg = A.asisConfigCiclo(P, base);
ok(cfg.totalDias === 105 && cfg.fechaInicio === inicio && cfg.asistente.perfil.objetivo === 'olimpico', 'config del ciclo');
ok(Math.abs(Object.values(cfg.disciplinas).reduce((a, d) => a + d.pctInicio, 0) - 100) <= 2, 'los % suman ~100');
console.log('asistente: ' + n + ' pruebas OK');
