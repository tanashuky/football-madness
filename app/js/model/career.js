// Kariyer: botlara karsi lig; cihazda oynanir, ilerleme aninda yazilir. Ekonomi dokumandaki Online formullerinin carpanlı halidir
// (gelir x1,25, maliyet x0,8, sure x0,6). Odul defteri rewards.ts'de.
import { P, NAMES_A, NAMES_B, simulate } from '../engine.js';
import { newRoster, newTeamSetup } from './club.js';
import { TEMPLATES, botTeamIn } from './templates.js';
import { STADIUM_CAP, afterWeek, fixLineup, occupancy, paySponsor, refreshPool, seasonPrize, seasonTurn } from './manage.js';
import { newCup } from './cup.js';
export { STADIUM_CAP };
export const CAREER_K = { income: 1.25, cost: 0.8, time: 0.6 };
// gelir: mac primi (galibiyet 500 / beraberlik 200 / maglubiyet 100 FM) ve ic sahada bilet (seyirci x 0,1 FM; seyirci = kapasite x doluluk)
export const WEEKLY_WAGE = 0; // Surum 1 kapanisinda: maas ve tesis giderleri (dokumandaki tablo)
export function roundRobin(n) {
    const ids = [...Array(n).keys()];
    if (n % 2)
        ids.push(-1);
    const m = ids.length, rounds = [];
    for (let r = 0; r < m - 1; r++) {
        const pairs = [];
        for (let i = 0; i < m / 2; i++) {
            const a = ids[i], b = ids[m - 1 - i];
            if (a >= 0 && b >= 0)
                pairs.push(r % 2 ? [a, b] : [b, a]);
        }
        rounds.push(pairs);
        ids.splice(1, 0, ids.pop());
    }
    return rounds.concat(rounds.map((rd) => rd.map(([a, b]) => [b, a])));
}
const emptyTable = (n) => Array.from({ length: n }, () => ({ p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }));
export function newLeague(club, tt, size, diff, season = 1) {
    const notMine = (t) => t.short !== club.short && t.name !== club.name;
    const pool = TEMPLATES.filter(notMine).slice(0, size - 1).map((t) => ({ name: t.name, short: t.short, color: t.color, color2: t.color2, formation: t.formation, doctrine: t.doctrine, gg: 56 + diff * 2 + ((t.short.charCodeAt(0) % 5) - 2) }));
    const teams = [{ name: club.name, short: club.short, color: club.color, color2: club.color2, formation: tt.formation, doctrine: tt.doctrine, gg: club.gg || 62, me: true }, ...pool];
    return { size, teams, fixtures: roundRobin(size), week: 0, season, results: [], table: emptyTable(size) };
}
export function newCareer(club, o, seed) {
    const roster = seed?.roster && seed.roster.length >= 11 ? seed.roster : newRoster(club);
    const team = seed?.team ? { ...newTeamSetup(), ...seed.team } : newTeamSetup();
    const c = {
        startedAt: Date.now(), diff: o.diff, minutes: o.minutes, roster, team, league: newLeague(club, team, o.size, o.diff),
        fm: Math.round(2000 * CAREER_K.income), ledger: [], facilities: { stadium: { level: 1 }, academy: { level: 0 } }, tm: 52,
        stats: { played: 0, won: 0, drawn: 0, lost: 0, seasons: 1 }, trophies: [], history: [],
        metrics: { U: 55, T: 55, F: 55, M: 70 }, train: { day: '', count: 0, job: null, last: null }, scout: { job: null, found: null }, pool: [], nextId: 1, lastTick: Date.now(),
        staff: { tactic: 0, physical: 0, psych: 0, physio: 0, fans: 0 }, scoutFree: 0, news: [], cup: null,
    };
    refreshPool(c);
    paySponsor(c);
    return c;
}
export function order(l) { return l.teams.map((_, i) => i).sort((a, b) => l.table[b].pts - l.table[a].pts || (l.table[b].gf - l.table[b].ga) - (l.table[a].gf - l.table[a].ga) || l.table[b].gf - l.table[a].gf); }
export function rank(l) { return order(l).indexOf(0) + 1; }
export function form(l, i) { return l.results.filter((m) => m.a === i || m.b === i).slice(-5).map((m) => { const gf = m.a === i ? m.ga_ : m.gb_, ga = m.a === i ? m.gb_ : m.ga_; return gf > ga ? 'W' : gf < ga ? 'L' : 'D'; }); }
export const seasonDone = (l) => l.week >= l.fixtures.length;
export function nextFixture(l) { if (seasonDone(l))
    return null; const f = l.fixtures[l.week].find(([a, b]) => a === 0 || b === 0); if (!f)
    return null; return f[0] === 0 ? { oppIdx: f[1], home: true } : { oppIdx: f[0], home: false }; }
export const weekSeed = (l, x = 0) => (l.season * 1000 + l.week * 10 + x) | 0;
function record(l, a, b, ga_, gb_) { l.results.push({ week: l.week, a, b, ga_, gb_ }); const A = l.table[a], B = l.table[b]; A.p++; B.p++; A.gf += ga_; A.ga += gb_; B.gf += gb_; B.ga += ga_; if (ga_ > gb_) {
    A.w++;
    B.l++;
    A.pts += 3;
}
else if (ga_ < gb_) {
    B.w++;
    A.l++;
    B.pts += 3;
}
else {
    A.d++;
    B.d++;
    A.pts++;
    B.pts++;
} }
// haftanin diger maclari aninda simule edilir (deterministik tohum)
function simOthers(c, skipMine) {
    const l = c.league;
    for (const [x, y] of l.fixtures[l.week]) {
        if (skipMine && (x === 0 || y === 0))
            continue;
        const A = botTeamIn(l.teams[x], c.diff, NAMES_B), B = botTeamIn(l.teams[y], c.diff, NAMES_A);
        P.clockRate = 90 / c.minutes;
        P.dt = 0.1;
        const st = simulate(A, B, weekSeed(l, x));
        P.clockRate = 6;
        record(l, x, y, st.stats[0].goals, st.stats[1].goals);
    }
}
export function addLedger(c, text, fm) { c.fm = Math.round(c.fm + fm); c.ledger.unshift({ t: Date.now(), text, fm: Math.round(fm) }); if (c.ledger.length > 40)
    c.ledger.length = 40; }
// kendi macimin sonucu: tablo, istatistik, gelir, taraftar morali; donus: { fm, rank }
export function applyMyResult(c, oppIdx, home, goals) {
    const l = c.league;
    const a = home ? 0 : oppIdx, b = home ? oppIdx : 0;
    record(l, a, b, goals[0], goals[1]);
    simOthers(c, true);
    const gf = home ? goals[0] : goals[1], ga = home ? goals[1] : goals[0];
    const result = gf > ga ? 'win' : gf < ga ? 'loss' : 'draw';
    c.stats.played++;
    if (result === 'win')
        c.stats.won++;
    else if (result === 'draw')
        c.stats.drawn++;
    else
        c.stats.lost++;
    let fm = (result === 'win' ? 500 : result === 'draw' ? 200 : 100) * CAREER_K.income;
    if (home)
        fm += STADIUM_CAP[c.facilities.stadium.level] * occupancy(c) * 0.1 * CAREER_K.income;
    fm = Math.round(fm);
    addLedger(c, `${l.season}.${l.week + 1} ${home ? 'H' : 'A'} ${gf}-${ga}`, fm);
    // taraftar morali: ic saha G +3 / B -1 / M -4, deplasman +2 / 0 / -2; moral: G +2 / M -2
    c.tm = Math.max(0, Math.min(100, c.tm + (home ? (result === 'win' ? 3 : result === 'draw' ? -1 : c.staff.fans >= 3 ? -3 : -4) : result === 'win' ? 2 : result === 'draw' ? 0 : -2)));
    c.metrics.M = Math.max(30, Math.min(95, c.metrics.M + (result === 'win' ? 2 : result === 'loss' ? -2 : 0)));
    afterWeek(c, c.team.lineup || []);
    l.week++;
    return { fm, rank: rank(l), result };
}
export function skipWeek(c) { simOthers(c, false); afterWeek(c, [], false); c.league.week++; }
// sezon sonu: kupa ve tarihce; ayni lig yeni sezon (fikstur ayni siraya, tablo sifir)
export function closeSeason(c) {
    const l = c.league;
    const r = rank(l);
    const me = l.table[0];
    const pz = seasonPrize(c, r, l.teams.length);
    c.history.push({ season: l.season, rank: r, w: me.w, d: me.d, l: me.l });
    if (r === 1)
        c.trophies.push({ season: l.season, kind: 'league', name: 'Kariyer Ligi' });
    l.season++;
    l.week = 0;
    l.results = [];
    l.table = emptyTable(l.teams.length);
    c.stats.seasons = l.season;
    const youths = seasonTurn(c);
    fixLineup(c);
    paySponsor(c);
    c.cup = newCup(c, r); // kupa 2. sezondan itibaren, onceki sezon sirasina gore
    return { youths, prize: pz.fm, scouts: pz.scouts, rank: r };
}
