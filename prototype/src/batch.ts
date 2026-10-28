// Toplu test: verilen oranlarda maclari oynatir, ham sonuclari JSON olarak yazar
import { simulate, makeTeam, NAMES_B, P } from './engine.ts';
import { writeFileSync } from 'node:fs';
const [ratiosArg, nArg, seedArg, out, over] = process.argv.slice(2);
if (over) Object.assign(P, JSON.parse(over));
const ratios = ratiosArg.split(',').map(Number);
const N = Number(nArg);
const seed0 = Number(seedArg);
const res: any[] = [];
for (const r of ratios) {
  for (let i = 0; i < N; i++) {
    // ev sahibi avantaji olmadan, guc orani yalniz GG ile; yari maclarda guclu takim B tarafinda
    const flip = i % 2 === 1;
    const strong = makeTeam('Guclu', 'GUC', 60 * r);
    const weak = makeTeam('Zayif', 'ZAY', 60, {}, NAMES_B);
    const st = flip ? simulate(weak, strong, seed0 + i + Math.round(r * 1e5)) : simulate(strong, weak, seed0 + i + Math.round(r * 1e5));
    const [s0, s1] = st.stats;
    const S = flip ? s1 : s0;
    const Wk = flip ? s0 : s1;
    res.push({ r, gs: S.goals, gw: Wk.goals, sh: S.shots + Wk.shots, ot: S.onTarget + Wk.onTarget, xg: S.xg + Wk.xg, pas: S.passes + Wk.passes, pok: S.passesOk + Wk.passesOk, fo: S.fouls + Wk.fouls, ye: S.yellows + Wk.yellows, re: S.reds + Wk.reds, co: S.corners + Wk.corners, of: S.offsides + Wk.offsides, sp: S.setPieceGoals + Wk.setPieceGoals, poss: S.possTicks / (S.possTicks + Wk.possTicks) });
  }
}
writeFileSync(out, JSON.stringify(res));
