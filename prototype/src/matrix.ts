// Matris testi: her taktik kombinasyonu rastgele rakiplere karsi oynar
import { simulate, makeTeam, NAMES_B, mulberry32 } from './engine.ts';
import { writeFileSync } from 'node:fs';
const [from, to, n, out] = [Number(process.argv[2]), Number(process.argv[3]), Number(process.argv[4]), process.argv[5]];
const combos: any[] = [];
for (const formation of ['4-3-3', '4-4-2']) for (let press = 0; press < 3; press++) for (let line = 0; line < 3; line++) for (let style = 0; style < 3; style++) for (let tempo = 0; tempo < 3; tempo++) combos.push({ formation, press, line, style, tempo });
const res: any[] = [];
for (let ci = from; ci < Math.min(to, combos.length); ci++) {
  const c = combos[ci];
  const rng = mulberry32(9000 + ci);
  let pts = 0, gf = 0, ga = 0;
  for (let i = 0; i < n; i++) {
    const o = combos[Math.floor(rng() * combos.length)];
    const me = makeTeam('A', 'A', 60, { formation: c.formation, tactic: { press: c.press, line: c.line, style: c.style, tempo: c.tempo, width: 1 } });
    const op = makeTeam('B', 'B', 60, { formation: o.formation, tactic: { press: o.press, line: o.line, style: o.style, tempo: o.tempo, width: 1 } }, NAMES_B);
    const flip = i % 2 === 1;
    const st = flip ? simulate(op, me, 50000 + ci * 1000 + i) : simulate(me, op, 50000 + ci * 1000 + i);
    const a = flip ? st.stats[1].goals : st.stats[0].goals;
    const b = flip ? st.stats[0].goals : st.stats[1].goals;
    gf += a; ga += b; pts += a > b ? 3 : a === b ? 1 : 0;
  }
  res.push({ ...c, ppg: pts / n, gf: gf / n, ga: ga / n, n });
}
writeFileSync(out, JSON.stringify(res));
