// Takim sablonlari (Mac Modu ve Kariyer ligi botlari) ve zorluk kademeleri.
import { DOCTRINES, NAMES_B, botRules } from '../engine.js';
import { mkSquad } from './club.js';
export const TEMPLATES = [
    { id: 'kartal', name: 'Kartal SK', short: 'KSK', color: '#d2433d', color2: '#ffffff', formation: '4-3-3', doctrine: 'gegenpress', gg: 62, blurb: { tr: 'Yüksek pres, önde hat, hızlı tempo. Kondisyonu erken biter.', en: 'High press, high line, fast tempo. Runs out of legs early.' } },
    { id: 'liman', name: 'Liman FK', short: 'LFK', color: '#3b6fd6', color2: '#ffffff', formation: '4-4-2', doctrine: 'direct', gg: 60, blurb: { tr: 'Uzun top, iki forvet, ikinci top. Hava hakimi stoperlere karşı zorlanır.', en: 'Long ball, two strikers, second balls. Struggles against aerial centre-backs.' } },
    { id: 'yildiz', name: 'Yıldız Gücü', short: 'YLD', color: '#f2d94e', color2: '#1b1a0c', formation: '4-2-3-1', doctrine: 'possession', gg: 64, blurb: { tr: 'Kısa pas, sabırlı oyun, geniş. Yüksek prese karşı top kaybeder.', en: 'Short passing, patient, wide. Loses the ball under a high press.' } },
    { id: 'kale', name: 'Kale Spor', short: 'KAL', color: '#2f6b3a', color2: '#ffffff', formation: '5-3-2', doctrine: 'bus', gg: 58, blurb: { tr: 'Derin blok, otobüs. Az pozisyon verir, az üretir.', en: 'Deep block, parks the bus. Concedes little, creates little.' } },
    { id: 'ruzgar', name: 'Rüzgâr Spor', short: 'RZG', color: '#6fa8ff', color2: '#0e1512', formation: '3-5-2', doctrine: 'wings', gg: 61, blurb: { tr: 'Kanat oyunu, bindiren bekler, ortalar. Arkası boş.', en: 'Wing play, overlapping full-backs, crosses. Exposed at the back.' } },
    { id: 'bogaz', name: 'Boğaz SK', short: 'BGZ', color: '#9b59b6', color2: '#ffffff', formation: '4-3-3', doctrine: 'gegenpress', gg: 63, blurb: { tr: 'Yüksek pres, önde hat. Uzun topa ve arkaya koşuya açık.', en: 'High press, high line. Open to long balls and runs in behind.' } },
    { id: 'simsek', name: 'Şimşek FK', short: 'SMS', color: '#e0a63f', color2: '#1b1a0c', formation: '4-4-2', doctrine: 'counter', gg: 59, blurb: { tr: 'Derin hat, hızlı kontra, riskli koşular. Topu az tutar.', en: 'Deep line, quick counters, risky runs. Little possession.' } },
    { id: 'anadolu', name: 'Anadolu Birlik', short: 'ANB', color: '#e67e22', color2: '#ffffff', formation: '4-3-3', doctrine: 'balanced', gg: 60, blurb: { tr: 'Dengeli, belirgin zayıflığı yok; belirgin silahı da yok.', en: 'Balanced; no clear weakness, no clear weapon either.' } },
];
export const DIFFS = [1, 2, 3, 4, 5];
// 11 Kasim: her kademe bir alt kademenin parametrelerini alir (oyun zor geldi); Amator icin yeni taban.
const AI = {
    1: { noiseMult: 4, readAcc: 0.2, react: 0.85, timing: 0.3 },
    2: { noiseMult: 3, readAcc: 0.3, react: 0.7, timing: 0.4 },
    3: { noiseMult: 2, readAcc: 0.45, react: 0.6, timing: 0.55 },
    4: { noiseMult: 1, readAcc: 0.6, react: 0.5, timing: 0.7 },
    5: { noiseMult: 0.8, readAcc: 0.75, react: 0.42, timing: 0.8 },
};
export function botTeamIn(tpl, diff, names = NAMES_B) {
    const t = mkSquad({ name: tpl.name, short: tpl.short, color: tpl.color, color2: tpl.color2, formation: tpl.formation }, tpl.gg, names);
    t.tactic = { ...DOCTRINES[tpl.doctrine].tactic, doctrine: tpl.doctrine };
    t.mainTactic = { ...t.tactic };
    t.ai = AI[diff] || AI[2];
    const ggOff = (diff - 3) * 2;
    for (const p of [...t.players, ...(t.bench || [])])
        p.gg = Math.max(30, Math.min(99, p.gg + ggOff));
    t.rules = botRules(Math.max(0, diff - 2));
    t.think = Math.max(0, diff - 2);
    t.U = 53 + diff * 2;
    t.T = 46 + diff * 4;
    t.F = 53 + diff * 2;
    t.M = 70;
    return t;
}
export const tplById = (id) => TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
