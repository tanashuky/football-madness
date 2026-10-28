// Metrik testi: A takiminda tek bir metrik degisir, B temel takimdir (her sey 60, moral 70)
import { simulate, makeTeam, NAMES_B, playerEG } from './engine.ts';
import { writeFileSync } from 'node:fs';
const [list, n, out] = [process.argv[2].split(','), Number(process.argv[3]), process.argv[4]];
const variants: Record<string, any> = {
  'uyum 40': { U: 40 }, 'uyum 80': { U: 80 },
  'taktik 40': { T: 40 }, 'taktik 80': { T: 80 },
  'fiziksel 40': { F: 40 }, 'fiziksel 80': { F: 80 },
  'moral 30': { M: 30 }, 'moral 95': { M: 95 },
  'ic saha (stad 8 taraftar 85)': { home: true, stadium: 8, TM: 85 },
  'yorgun (Y=60)': { fatigue: 60 },
};
const res: any[] = [];
for (const name of list) {
  const v = variants[name];
  let w = 0, d = 0, gf = 0, ga = 0;
  let egRatio = 1;
  for (let i = 0; i < n; i++) {
    const opts = { ...v };
    delete opts.fatigue;
    const a = makeTeam('A', 'A', 60, opts);
    if (v.fatigue) a.players.forEach((p) => (p.fatigue = v.fatigue));
    const b = makeTeam('B', 'B', 60, {}, NAMES_B);
    if (i === 0) egRatio = playerEG(a, a.players[5]) / playerEG(b, b.players[5]);
    const flip = i % 2 === 1; // taraf yanliligina karsi yarisi ters
    const st = flip ? simulate(b, a, 70000 + i) : simulate(a, b, 70000 + i);
    const x = st.stats[flip ? 1 : 0].goals, y = st.stats[flip ? 0 : 1].goals;
    gf += x; ga += y; if (x > y) w++; else if (x === y) d++;
  }
  res.push({ name, egRatio, w: (100 * w) / n, d: (100 * d) / n, l: (100 * (n - w - d)) / n, gf: gf / n, ga: ga / n });
}
writeFileSync(out, JSON.stringify(res));
