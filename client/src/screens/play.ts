// Mac akisi: oda -> (anlik simulasyon | mac ekrani) -> sonuc isleme (Elo / lig / odul) -> rapor. Tekrar kaydi localStorage'da.
import { P, replayOf, setControl, simulate, step, validateTeam, verifyReplay, type MatchState, type Replay, type TeamIn } from '../engine.js';
import { store, save } from '../core/store.js';
import { go, render } from '../core/router.js';
import { toast } from '../core/ui.js';
import { t } from '../core/i18n.js';
import * as sim from '../match/sim.js';
import { buildReport, mmElo, type Report } from '../model/report.js';
import { applyMyResult } from '../model/career.js';
import { grantCareer } from '../model/rewards.js';

export interface RoomCtx { kind: 'mm' | 'career'; mine?: string; tpl?: string; diff: number; minutes: number; oppIdx?: number; home?: boolean; week?: number; seed?: number }
const REPLAY_KEY = 'fm.lastReplay';
export function saveReplay(st: MatchState) { try { const r = replayOf(st); if (r) localStorage.setItem(REPLAY_KEY, JSON.stringify(r)); } catch (e) { console.error('replay', e); } }
export function loadReplay(): Replay | null { try { return JSON.parse(localStorage.getItem(REPLAY_KEY) || 'null'); } catch (e) { return null; } }
export function clearReplay() { try { localStorage.removeItem(REPLAY_KEY); } catch (e) {} }
export function verifyLast(): { ok: boolean; n: number; ms: number } | null { const rep = loadReplay(); if (!rep) return null; const t0 = performance.now(); const v = verifyReplay(rep); return { ok: v.ok, n: rep.cmds.length, ms: Math.round(performance.now() - t0) }; }

export function startMatchFlow(c: RoomCtx, me: TeamIn, opp: TeamIn, home: boolean, instant: boolean) {
  const s = store.db.settings;
  const teams: [TeamIn, TeamIn] = home ? [me, opp] : [opp, me];
  const side: 0 | 1 = home ? 0 : 1;
  if (home) me.home = true; else opp.home = true;
  const seed = (c.seed ?? (Date.now() % 1000000)) | 0;
  const minutes = c.minutes || s.minutes;
  const finish = (st: MatchState, inst: boolean) => { const rep = buildReport(st, side, c.kind, inst, minutes); afterMatch(c, rep); go('report', { rep, c }, false); };
  if (instant) { P.clockRate = 90 / minutes; P.dt = 0.1; P.playSpeed = 1; const st = simulate(teams[0], teams[1], seed); P.clockRate = 6; clearReplay(); finish(st, true); return; }
  try { validateTeam(teams[0], teams[0].name); validateTeam(teams[1], teams[1].name); } catch (e: any) { console.error(e); toast(t('match.startFail') + ': ' + (e && e.message ? e.message : e), 'err'); return; }
  try {
    sim.startMatch({ teams, side, minutes, seed, mode: s.mode, keys: s.keys, assistP: s.assistP, assistS: s.assistS, autoSwitch: s.autoSwitch, vibration: s.vibration, cam: s.cam, names: s.names, ball: s.ball, reduceMotion: s.reduceMotion,
      onEnd: (st) => { saveReplay(st); finish(st, false); },
      onExit: (st) => { if (st && !st.done) { setControl(st, side, 'none'); let g = 0; while (!st.done && g++ < 40000) step(st); toast(t('match.abandoned')); } if (st) { saveReplay(st); finish(st, false); } else render(); } });
  } catch (e: any) { console.error(e); try { sim.exit(); } catch (e2) {} render(); toast(t('match.startFail') + ': ' + (e && e.message ? e.message : e), 'err'); }
}
export function watchLastReplay() {
  const r = loadReplay(); if (!r) { toast(t('report.verify.none')); return; }
  const s = store.db.settings;
  try { sim.watchReplay(r, { side: 0, cam: s.cam, names: s.names, ball: s.ball, reduceMotion: s.reduceMotion, onEnd: () => render(), onExit: () => render() }); }
  catch (e: any) { console.error(e); try { sim.exit(); } catch (e2) {} render(); toast(t('match.startFail') + ': ' + (e && e.message ? e.message : e), 'err'); }
}
function afterMatch(c: RoomCtx, rep: Report) {
  const db = store.db;
  if (c.kind === 'mm') {
    const d = mmElo(db.mm.elo, c.diff, rep.result); db.mm.elo += d; db.mm.played++; rep.elo = d;
    db.mm.last = `${rep.teams[0].short} ${rep.goals[0]}–${rep.goals[1]} ${rep.teams[1].short} (${d >= 0 ? '+' : ''}${d})`;
  } else if (db.career) {
    const r = applyMyResult(db.career, c.oppIdx!, c.home !== false, rep.goals);
    rep.rank = r.rank; rep.fm = r.fm;
    if (r.result !== 'loss') rep.pp = grantCareer(db.rewards, r.result === 'win' ? 'win' : 'draw');
  }
  save();
}
