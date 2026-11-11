// Kayit semasi (v1). Iki oyun tek pakette: Kariyer (cihazda, aninda) ve Online (sunucuda, dogrulanmis) ayri kayitlardir;
// odul defteri ortaktir. Online bolumu Surum 2'de dolar; burada yalnizca yer tutucu.
import type { Doctrine, Duty, Formation, Pos, Shape, TacticIn } from '../engine.js';

export interface Club {
  name: string; short: string; city: string; stadium: string; color: string; color2: string;
  gg: number; // kadro tabani (kadro uretiminde)
  createdAt: number;
}
export interface RosterPlayer {
  id: string; num: number; name: string; natPos: Pos; gg: number; age: number; traits: string[]; fatigue: number;
  inj?: number; // sakatlik: kac mac oynayamaz
}
// Takimin taktik kurulumu (kadro ekrani + taktik tahtasi): kimlikler futbolcu id'sidir, motor numarayla calisir (userTeamIn cevirir)
export interface TeamSetup {
  formation: Formation; formationAtt?: Formation; doctrine: Doctrine; tactic: TacticIn;
  lineup?: string[]; // 11 futbolcu id'si, slot sirasinda
  duties: Record<string, Duty>; rules: string[]; shapeDef?: Shape; shapeAtt?: Shape; rotations?: string[][];
}
export interface LeagueTeam { name: string; short: string; color: string; color2: string; formation: Formation; doctrine: Doctrine; gg: number; me?: boolean }
export interface TableRow { p: number; w: number; d: number; l: number; gf: number; ga: number; pts: number }
export interface LeagueResult { week: number; a: number; b: number; ga_: number; gb_: number }
export interface League {
  size: number; teams: LeagueTeam[]; fixtures: [number, number][][]; week: number; season: number; results: LeagueResult[]; table: TableRow[];
}
export interface Facility { level: number; busyUntil?: number } // busyUntil: gercek zaman (ms); Kariyer sayaclari cihazda
export interface Career {
  startedAt: number; diff: number; minutes: number;
  roster: RosterPlayer[]; team: TeamSetup; league: League;
  fm: number; // Kariyer cuzdani (FM, tasinmaz)
  ledger: { t: number; text: string; fm: number }[]; // son hareketler (en cok 40)
  facilities: { stadium: Facility; academy: Facility };
  tm: number; // taraftar morali (doluluk)
  stats: { played: number; won: number; drawn: number; lost: number; seasons: number };
  trophies: { season: number; kind: 'league' | 'cup'; name: string }[];
  history: { season: number; rank: number; w: number; d: number; l: number }[];
  metrics: { U: number; T: number; F: number; M: number }; // takim uyumu, taktik ve fiziksel kapasite, moral
  train: { day: string; count: number; job: null | { kind: string; level: number; players: string[]; until: number }; last: null | { kind: string; text: string; t: number } };
  scout: { job: null | { tier: number; pos: string; until: number }; found: RosterPlayer | null };
  pool: { p: RosterPlayer; price: number; haggled: boolean }[]; // transfer havuzu (sezon basi yenilenir)
  nextId: number; lastTick: number;
  staff: Record<StaffKey, number>; // ekip seviyeleri 0-5
  scoutFree: number; // ucretsiz standart scout hakki (sezon sonu odulu)
  news: string[]; // transfer haberleri (son 6)
  cup: CupState | null;
}
export type StaffKey = 'tactic' | 'physical' | 'psych' | 'physio' | 'fans';
export interface CupState { kind: 'star' | 'cont'; season: number; round: number; alive: boolean; done: boolean; opps: LeagueTeam[]; home: boolean[]; log: { round: number; opp: string; gf: number; ga: number; pens: [number, number] | null; win: boolean }[] }
export interface MatchModeState { elo: number; played: number; last: string | null }
export interface RewardEntry { t: number; src: 'career' | 'online'; kind: string; pp: number; boost?: number }
export interface Rewards { pp: number; boosts: number; entries: RewardEntry[]; day: { d: string; pp: number; boosts: number }; season: { key: string; pp: number } }
export interface Settings {
  lang: 'tr' | 'en'; keys: 'arrows' | 'wasd'; assistP: 0 | 1 | 2; assistS: 0 | 1 | 2; autoSwitch: boolean; ball: number; names: 'auto' | 'mine' | 'off';
  cam: 'full' | 'length' | 'near'; mode: 'team' | 'sim'; minutes: number; layer: boolean; left: boolean;
  colorblind: boolean; textScale: 1 | 1.15 | 1.3; reduceMotion: boolean; contrast: boolean; vibration: boolean; spSlow: boolean;
  sound: { stadium: number; game: number; ui: number };
}
export interface SaveV1 {
  v: 1; updatedAt: number;
  account: { guest: boolean; club: Club } | null;
  settings: Settings;
  career: Career | null;
  mm: MatchModeState;
  rewards: Rewards;
  online: null; // Surum 2
}
export const DEF_SETTINGS: Settings = {
  lang: 'tr', keys: 'arrows', assistP: 0, assistS: 1, autoSwitch: true, ball: 1.4, names: 'auto', cam: 'full', mode: 'team', minutes: 10, layer: false, left: false,
  colorblind: false, textScale: 1, reduceMotion: false, contrast: false, vibration: true, spSlow: false, sound: { stadium: 70, game: 80, ui: 60 },
};
export const EMPTY_REWARDS = (): Rewards => ({ pp: 0, boosts: 0, entries: [], day: { d: '', pp: 0, boosts: 0 }, season: { key: '', pp: 0 } });
