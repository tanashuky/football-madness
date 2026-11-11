export const CAP = { day: 10, season: 250, boostDay: 2 };
export const PP = { win: 2, draw: 1, cup: 5, cupTitle: 25, title: 50 };
const dayKey = (now) => new Date(now).toISOString().slice(0, 10);
// sezon anahtari: online sezon takvimi gelene kadar takvim ceyregi
const seasonKey = (now) => { const d = new Date(now); return `${d.getUTCFullYear()}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`; };
export function rollCaps(r, now = Date.now()) {
    const dk = dayKey(now);
    if (r.day.d !== dk)
        r.day = { d: dk, pp: 0, boosts: 0 };
    const sk = seasonKey(now);
    if (r.season.key !== sk)
        r.season = { key: sk, pp: 0 };
}
// Kariyer odulu: tavana kadar yazilir; donus gercekten yazilan PP
export function grantCareer(r, kind, now = Date.now()) {
    rollCaps(r, now);
    const want = PP[kind];
    const room = Math.max(0, Math.min(CAP.day - r.day.pp, CAP.season - r.season.pp));
    const pp = Math.min(want, room);
    if (pp > 0) {
        r.pp += pp;
        r.day.pp += pp;
        r.season.pp += pp;
    }
    r.entries.unshift({ t: now, src: 'career', kind, pp });
    if (r.entries.length > 60)
        r.entries.length = 60;
    return pp;
}
export function grantBoost(r, n = 1, now = Date.now()) {
    rollCaps(r, now);
    const b = Math.min(n, Math.max(0, CAP.boostDay - r.day.boosts));
    if (b > 0) {
        r.boosts += b;
        r.day.boosts += b;
        r.entries.unshift({ t: now, src: 'career', kind: 'boost', pp: 0, boost: b });
    }
    return b;
}
