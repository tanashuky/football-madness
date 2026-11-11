import { CAREER_K, addLedger } from './career.js';
const NAMES = [['Marmara SK', 'MRM', '#1f8a70'], ['Toros Gücü', 'TRS', '#c0392b'], ['Ege Yıldızı', 'EGE', '#2980b9'], ['Karadeniz FK', 'KDZ', '#16a085'], ['Başkent Spor', 'BSK', '#8e44ad'], ['Fırat SK', 'FRT', '#d35400'], ['Trakya Birlik', 'TRK', '#f39c12'], ['Akdeniz FK', 'AKD', '#27ae60'], ['Kapadokya SK', 'KPD', '#e84393']];
const FORMS = ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '5-3-2'], DOCS = ['gegenpress', 'possession', 'counter', 'direct', 'wings', 'balanced', 'bus'];
export const ROUNDS = ['qf', 'sf', 'final'];
const TIER = 0.34;
const PRIZE = { star: { entry: 3000, sf: 5000, title: 12000 }, cont: { entry: 1800, sf: 3000, title: 7000 } };
const fm = (v) => Math.round(v * TIER * CAREER_K.income);
export function newCup(c, prevRank) {
    const kind = prevRank <= Math.ceil(c.league.teams.length / 2) ? 'star' : 'cont';
    const club = c.league.teams[0];
    const base = 56 + c.diff * 2 + (kind === 'star' ? 3 : 0);
    const pool = NAMES.filter(([n, s]) => n !== club.name && s !== club.short).sort(() => Math.random() - 0.5).slice(0, 7);
    const opps = pool.map(([name, short, color], i) => ({ name, short, color, color2: '#ffffff', formation: FORMS[i % FORMS.length], doctrine: DOCS[i % DOCS.length], gg: base + Math.floor(Math.random() * 5) - 2 })).sort((a, b) => a.gg - b.gg); // zayiftan gucluye: turlar ilerledikce rakip guclenir
    const cup = { kind, season: c.league.season, round: 0, alive: true, done: false, opps: [opps[1], opps[4], opps[6]], home: [Math.random() < 0.5, Math.random() < 0.5, false], log: [] };
    addLedger(c, `cup:entry:${kind}`, fm(PRIZE[kind].entry));
    return cup;
}
// siradaki tur oynanmaya hazir mi (lig haftasina gore)
export function cupDue(c) {
    const cup = c.cup;
    if (!cup || !cup.alive || cup.done)
        return false;
    const total = c.league.fixtures.length;
    const at = [Math.ceil(total / 3), Math.ceil((2 * total) / 3), total][cup.round];
    return c.league.week >= at;
}
export function applyCupResult(c, goals, home, shootout) {
    const cup = c.cup;
    const gf = home ? goals[0] : goals[1], ga = home ? goals[1] : goals[0];
    const win = gf !== ga ? gf > ga : shootout ? (home ? shootout[0] > shootout[1] : shootout[1] > shootout[0]) : Math.random() < 0.5;
    cup.log.push({ round: cup.round, opp: cup.opps[cup.round].name, gf, ga, pens: shootout ? (home ? [shootout[0], shootout[1]] : [shootout[1], shootout[0]]) : null, win });
    let gain = (win ? 500 : 100) * CAREER_K.income;
    let title = false; // mac primi lig maci gibi
    if (!win)
        cup.alive = false;
    else if (cup.round === 0)
        gain += fm(PRIZE[cup.kind].sf);
    else if (cup.round === 2) {
        gain += fm(PRIZE[cup.kind].title);
        title = true;
        cup.done = true;
        c.trophies.push({ season: cup.season, kind: 'cup', name: cup.kind === 'star' ? 'Yıldızlar Kupası' : 'Kıta Kupası' });
        c.metrics.M = Math.min(95, c.metrics.M + 8);
    }
    if (win && !title)
        cup.round++;
    gain = Math.round(gain);
    addLedger(c, `cup:${ROUNDS[Math.min(2, cup.log[cup.log.length - 1].round)]}:${gf}-${ga}`, gain);
    c.stats.played++;
    if (win)
        c.stats.won++;
    else
        c.stats.lost++;
    return { win, fm: gain, title };
}
