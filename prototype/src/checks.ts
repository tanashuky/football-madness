// dogruluk testleri: determinizm, kaleci kirmizi, devre sonu bekleyen duran top, NaN
import { createMatch, step, simulate, makeTeam, NAMES_B } from './engine.ts';
// 1) determinizm
let det = 0;
for (let i = 0; i < 50; i++) {
  const a = simulate(makeTeam('A','A',60), makeTeam('B','B',60,{},NAMES_B), 100 + i);
  const b = simulate(makeTeam('A','A',60), makeTeam('B','B',60,{},NAMES_B), 100 + i);
  if (JSON.stringify(a.events) !== JSON.stringify(b.events) || JSON.stringify(a.stats) !== JSON.stringify(b.stats)) det++;
}
console.log('determinizm bozuk mac:', det);
// 2) kaleci kirmizi (zorla)
for (const victim of [0, 1] as const) {
  const st: any = createMatch(makeTeam('A','A',60), makeTeam('B','B',60,{},NAMES_B), 42);
  for (let i = 0; i < 200; i++) step(st);
  const g = st.players.find((p: any) => p.side === victim && p.pos === 'GK');
  // sendOff disari aktarilmadigi icin ayni etkiyi elle: off + yedek kaleci
  g.off = true; g.x = -10; g.y = -10; if (st.owner === g) st.owner = null;
  const cands = st.players.filter((p: any) => p.side === victim && !p.off);
  const sub = cands.reduce((b: any, q: any) => (q.egBase < b.egBase ? q : b), cands[0]); sub.pos = 'GK'; sub.emergencyGk = true;
  let ownerOff = 0, ballOut = 0, nan = 0;
  while (!st.done) { step(st); if (st.owner && st.owner.off) ownerOff++; if (st.ball.x < -1 || st.ball.y < -1) ballOut++; if (Number.isNaN(st.ball.x)) nan++; }
  console.log('kaleci atildi', victim, 'gol', st.stats.map((s: any) => s.goals), 'sahipsiz-atilmis', ownerOff, 'top disarida', ballOut, 'nan', nan);
}
// 3) devre sonunda bekleyen duran top: olaylarda 'penalty' olup sonrasinda sut/gol olmayan var mi
let lost = 0, pens = 0;
for (let i = 0; i < 300; i++) {
  const st = simulate(makeTeam('A','A',60), makeTeam('B','B',60,{},NAMES_B), 7000 + i);
  const ev = st.events;
  for (let k = 0; k < ev.length; k++) if (ev[k].type === 'penalty') { pens++; const nx = ev.slice(k + 1, k + 4).map((e) => e.type); if (!nx.some((t) => t === 'goal' || t === 'save' || t === 'miss')) lost++; }
}
console.log('penalti', pens, 'kullanilmayan', lost);
// 4) uzatma dagilimi
const ex: number[] = [];
for (let i = 0; i < 100; i++) { const st = simulate(makeTeam('A','A',60), makeTeam('B','B',60,{},NAMES_B), 9000 + i); ex.push(Math.round(st.halfEnd / 60 - 45)); }
const h: any = {}; for (const e of ex) h[e] = (h[e] ?? 0) + 1; console.log('2. yari uzatma dagilimi (dk)', JSON.stringify(h));
