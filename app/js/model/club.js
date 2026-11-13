// Kadro ve dizilis: kalici kadro (RosterPlayer, 18 futbolcu, sabit id), forma numarasi yalnizca etikettir; motor numarayla calisir.
import { FORMATIONS, FORM_POS, RULE_TEMPLATES, attackShapeOf, makeTeam, NAMES_A, DOCTRINES } from '../engine.js';
// makeTeam iskeleti + oyuncu basina deterministik GG sapmasi
export function mkSquad(club, base, names = NAMES_A) {
    const t = makeTeam(club.name, club.short, base, { formation: club.formation || '4-3-3' }, names, club.color, club.color2);
    const off = [3, 1, 4, 2, -2, 5, 0, 3, -1, 6, 4, -3, -4, -2, -1, 0, -5, -2];
    t.players.forEach((p, i) => { p.gg = base + off[i % off.length]; p.age = 21 + ((i * 7) % 13); });
    (t.bench || []).forEach((p, i) => { p.gg = base + off[(i + 11) % off.length]; p.age = 19 + ((i * 5) % 14); });
    return t;
}
export function newRoster(club) {
    const base = mkSquad({ ...club, formation: '4-3-3' }, club.gg || 62, NAMES_A);
    return [...base.players, ...(base.bench || [])].map((p, i) => ({ id: 'p' + (i + 1), num: p.num, name: p.name, natPos: p.pos, gg: p.gg, age: p.age, traits: p.traits || [], fatigue: p.fatigue ?? 20 }));
}
export function newTeamSetup() { return { formation: '4-3-3', doctrine: 'balanced', tactic: { ...DOCTRINES.balanced.tactic }, duties: {}, rules: ['counterpress', 'chase', 'protect', 'tired'] }; }
// varsayilan dizilis: her slota dogal mevkisi uyan en guclu bos oyuncu, sonra yakin mevki, sonra kalanlar
export function defaultLineup(roster, slots) {
    const free = new Set(roster.map((p) => p.id));
    const out = new Array(slots.length).fill(null);
    const pick = (pred) => { let best = null; for (const p of roster)
        if (free.has(p.id) && pred(p) && (!best || p.gg > best.gg))
            best = p; if (best)
        free.delete(best.id); return best ? best.id : null; };
    slots.forEach((sp, i) => { out[i] = pick((p) => p.natPos === sp); });
    const near = { FB: ['W', 'CB'], CB: ['DM', 'FB'], DM: ['CM', 'CB'], CM: ['DM', 'W'], W: ['CM', 'ST', 'FB'], ST: ['W', 'CM'], GK: [] };
    slots.forEach((sp, i) => { if (out[i] === null)
        out[i] = pick((p) => p.natPos !== 'GK' && (near[sp] || []).includes(p.natPos)); });
    slots.forEach((sp, i) => { if (out[i] === null)
        out[i] = pick((p) => (sp === 'GK' ? p.natPos === 'GK' : p.natPos !== 'GK')); });
    slots.forEach((_sp, i) => { if (out[i] === null)
        out[i] = pick(() => true); });
    return out;
}
// formasyon degisince secili 11 korunur, slotlara dogal mevkiye gore yeniden dagitilir
export function reslot(roster, ids, slots) {
    const byId = Object.fromEntries(roster.map((p) => [p.id, p]));
    const chosen = ids.map((id) => byId[id]).filter(Boolean);
    if (chosen.length !== slots.length)
        return ids;
    return defaultLineup(chosen, slots);
}
// dizilis dogrulama ve numara benzersizligi: bozuksa onarir; true donerse kayit degisti
export function ensureLineup(roster, tt) {
    let changed = false;
    if (!FORMATIONS[tt.formation]) {
        tt.formation = '4-3-3';
        changed = true;
    }
    if (tt.formationAtt && !FORMATIONS[tt.formationAtt]) {
        delete tt.formationAtt;
        changed = true;
    }
    const byId = Object.fromEntries(roster.map((p) => [p.id, p]));
    const lu = tt.lineup;
    const valid = Array.isArray(lu) && lu.length === 11 && new Set(lu).size === 11 && lu.every((id) => byId[id]);
    if (!valid) {
        tt.lineup = defaultLineup(roster, FORM_POS[tt.formation]);
        changed = true;
    }
    const used = new Set();
    for (const p of roster) {
        if (used.has(p.num) || !Number.isFinite(p.num) || p.num < 1 || p.num > 99) {
            let n = 1;
            while (used.has(n) || roster.some((q) => q !== p && q.num === n))
                n++;
            p.num = n;
            changed = true;
        }
        used.add(p.num);
    }
    return changed;
}
export function setShirtNumber(roster, id, num) {
    num = Math.round(+num);
    if (!Number.isFinite(num) || num < 1 || num > 99)
        return { err: 'range' };
    const other = roster.find((p) => p.id !== id && p.num === num);
    if (other)
        return { err: 'taken', taken: other };
    const p = roster.find((q) => q.id === id);
    if (p)
        p.num = num;
    return {};
}
export function swapPlayers(tt, a, b) {
    const lu = tt.lineup;
    const ia = lu.indexOf(a), ib = lu.indexOf(b);
    if (ia >= 0 && ib >= 0) {
        lu[ia] = b;
        lu[ib] = a;
    }
    else if (ia >= 0)
        lu[ia] = b;
    else if (ib >= 0)
        lu[ib] = a;
}
export function userShapes(tt) {
    const def = tt.shapeDef || FORMATIONS[tt.formation];
    const fa = tt.formationAtt || tt.formation;
    const att = tt.shapeAtt || attackShapeOf(FORMATIONS[fa], FORM_POS[fa], tt.doctrine);
    return { def, att };
}
// kullanici takimi -> motor girdisi (kimlik -> numara cevirisi burada)
export function userTeamIn(club, roster, tt, m, benchCap = 0, out) {
    ensureLineup(roster, tt);
    const t = mkSquad({ ...club, formation: tt.formation }, club.gg || 62, NAMES_A);
    const slots = FORM_POS[tt.formation];
    const byId = Object.fromEntries(roster.map((p) => [p.id, p]));
    const mk = (p, pos) => ({ num: p.num, name: p.name, pos, natPos: p.natPos, gg: Math.round(p.gg), age: p.age, traits: p.traits, fatigue: Math.round(p.fatigue), id: p.id });
    const lineup = tt.lineup;
    t.players = lineup.map((id, i) => mk(byId[id], slots[i]));
    if (out)
        t.players.forEach((pl, i) => { if (out(byId[lineup[i]]))
            pl.absent = true; }); // eksik kadro: yerine konacak saglam oyuncu yoksa mevki bos baslar
    t.bench = roster.filter((p) => !lineup.includes(p.id) && !(out && out(p))).sort((a, b) => (a.natPos === 'GK' ? -1 : b.natPos === 'GK' ? 1 : 0)).map((p) => mk(p, p.natPos));
    const duties = {};
    for (const [id, d] of Object.entries(tt.duties || {})) {
        const p = byId[id];
        if (p)
            duties[p.num] = d;
    }
    const sh = userShapes(tt);
    const rotations = (tt.rotations || []).map((c) => c.filter((id) => lineup.includes(id) && byId[id]).map((id) => byId[id].num)).filter((c) => c.length >= 2);
    t.tactic = { ...tt.tactic, doctrine: tt.doctrine, shapeDef: sh.def, shapeAtt: sh.att, rotations: rotations.length ? rotations : undefined };
    t.mainTactic = { ...tt.tactic, doctrine: tt.doctrine };
    t.duties = duties;
    t.rules = (tt.rules || []).map((id) => RULE_TEMPLATES.find((r) => r.id === id)).filter(Boolean);
    t.U = m ? m.U : 60;
    t.T = m ? m.T : 60;
    t.F = m ? m.F : 60;
    t.M = m ? m.M : 70;
    // mac kadrosu: yedek kulubesi sinirli (kaleci + en gucluler)
    if (benchCap && t.bench && t.bench.length > benchCap) {
        const gk = t.bench.find((p) => p.pos === 'GK');
        const rest = t.bench.filter((p) => p !== gk).sort((a, b) => b.gg - a.gg).slice(0, benchCap - (gk ? 1 : 0));
        t.bench = gk ? [gk, ...rest] : rest;
    }
    return t;
}
export const avgGG = (t) => Math.round(t.players.reduce((a, p) => a + p.gg, 0) / 11);
