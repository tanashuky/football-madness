export function buildReport(st, side, kind, instant, minutes) {
    const opp = (1 - side), S = st.stats[side], O = st.stats[opp];
    const poss = S.possTicks + O.possTicks || 1;
    const pm = (i) => { let best = null, bv = -1; const sc = {}; for (const e of st.events)
        if (e.type === 'goal' && e.side === i && e.player)
            sc[e.player] = (sc[e.player] || 0) + 1; for (const p of st.players) {
        if (p.side !== i || p.pos === 'GK')
            continue;
        const v = (st.playerXg[i][p.num] || 0) + (sc[p.num] || 0) * 0.5;
        if (v > bv) {
            bv = v;
            best = p;
        }
    } return best ? `${best.num} ${best.name}` : '-'; };
    const evs = st.events.filter((e) => ['goal', 'yellow', 'red', 'penalty', 'half'].includes(e.type) || (e.type === 'miss' && e.text && /direk/.test(e.text)) || (e.type === 'rule' && e.text && !/Karşı pres|İkinci top/.test(e.text)))
        .map((e) => ({ t: Math.floor(e.t / 60) + 1, side: e.side, type: e.type, text: e.type === 'rule' ? (e.text || '') : e.type === 'miss' ? (e.text === 'üst direk' ? 'bar' : 'post') : '', who: e.player ? (st.players.find((p) => p.side === e.side && p.num === e.player)?.name || '') : '' }));
    const pct = (a, b) => `%${Math.round((100 * a) / Math.max(1, b))}`;
    return {
        kind, side, instant, minutes, seed: st.seed, teams: st.teams.map((t) => ({ name: t.name, short: t.short, color: t.color })), goals: [st.stats[0].goals, st.stats[1].goals],
        stats: [['report.poss', pct(st.stats[0].possTicks, poss), pct(st.stats[1].possTicks, poss)], ['report.shots', `${st.stats[0].shots} (${st.stats[0].onTarget})`, `${st.stats[1].shots} (${st.stats[1].onTarget})`], ['report.xg', st.stats[0].xg.toFixed(2), st.stats[1].xg.toFixed(2)], ['report.pass', pct(st.stats[0].passesOk, st.stats[0].passes), pct(st.stats[1].passesOk, st.stats[1].passes)], ['report.fouls', st.stats[0].fouls, st.stats[1].fouls], ['report.corners', st.stats[0].corners, st.stats[1].corners], ['report.offs', st.stats[0].offsides, st.stats[1].offsides], ['report.cards', `${st.stats[0].yellows}/${st.stats[0].reds}`, `${st.stats[1].yellows}/${st.stats[1].reds}`], ['report.wood', st.stats[0].woodwork ?? 0, st.stats[1].woodwork ?? 0]],
        potm: [pm(0), pm(1)], events: evs, result: S.goals > O.goals ? 'win' : S.goals < O.goals ? 'loss' : 'draw',
        tactics: st.events.filter((e) => e.side === side && (e.type === 'tactic' || (e.type === 'adjust' && e.text && !/^rotasyon/.test(e.text) && !/^(left|right|line|mark)$/.test(e.text)) || e.type === 'rule')).map((e) => ({ t: Math.floor(e.t / 60) + 1, text: e.type === 'tactic' ? (e.text === 'görev' ? 'duties' : e.text ? 'shape:' + e.text : 'instr') : e.type === 'rule' ? 'rule:' + (e.text || '') : 'slider:' + e.text })).filter((e) => !/Karşı pres|İkinci top/.test(e.text)),
        ruleCounts: Object.entries(st.events.filter((e) => e.side === side && e.type === 'rule' && e.text).reduce((a, e) => { a[e.text] = (a[e.text] || 0) + 1; return a; }, {})),
        rotations: { count: st.events.filter((e) => e.side === side && e.type === 'adjust' && e.text === 'rotasyon').length, oppCount: st.events.filter((e) => e.side !== side && e.type === 'adjust' && e.text === 'rotasyon').length },
        players: st.players.filter((p) => p.side === side && (p.idx < 11 || !p.off || p.subbed)).sort((a, b) => a.idx - b.idx).map((p) => ({ num: p.num, name: p.name, pos: p.pos, xg: +((st.playerXg[side][p.num] || 0).toFixed(2)), goals: st.events.filter((e) => e.type === 'goal' && e.side === side && e.player === p.num).length, k: Math.round(p.k), yellow: p.yellow, red: p.off && !p.subbed && !p.injured && p.idx < 11 ? 1 : 0, injured: !!p.injured, subbed: !!p.subbed })),
    };
}
// Mac Modu Elo: K 24, beklenti rakip kademesine gore (Pro = 1000)
export function mmElo(elo, diff, result) {
    const exp = 1 / (1 + Math.pow(10, (1000 + (diff - 3) * 120 - elo) / 400));
    const sc = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
    return Math.round(24 * (sc - exp));
}
