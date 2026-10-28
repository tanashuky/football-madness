// Football Madness - mac motoru prototipi
// Bagimsiz, deterministik, ekrandan habersiz. Ayni kod sunucuda, tarayicida ve simulasyon aracinda calisir.

// ---------- Tipler ----------
export type Pos = 'GK' | 'CB' | 'FB' | 'DM' | 'CM' | 'W' | 'ST';
export type Lvl = 0 | 1 | 2;
export type Formation = '4-3-3' | '4-4-2' | '4-2-3-1' | '3-5-2' | '5-3-2';

export interface PlayerIn {
  num: number;
  name: string;
  pos: Pos;
  gg: number;
  traits?: string[];
  fatigue?: number; // mac oncesi yorgunluk Y (0-100)
}

export interface TacticIn {
  press: Lvl; // 0 dusuk, 1 orta, 2 yuksek
  line: Lvl; // 0 derin, 1 orta, 2 onde
  style: Lvl; // 0 kisa pas, 1 dengeli, 2 direkt
  tempo: Lvl; // 0 yavas, 1 normal, 2 hizli
  width?: Lvl; // 0 dar, 1 normal, 2 genis
  trap?: 0 | 1; // ofsayt tuzagi
  compact?: Lvl; // hat arasi mesafe: 0 kompakt, 1 normal, 2 acik
  fb?: Lvl; // bekler: 0 savunmada kal, 1 dengeli, 2 bindir
  cm?: Lvl; // merkez orta saha: 0 geride, 1 dengeli, 2 ceza sahasina kos
  wing?: 0 | 1; // kanatlar: 0 cizgide kal, 1 ice kat
  runs?: Lvl; // forvet kosulari: 0 guvenli, 1 dengeli, 2 riskli (ofsayt sinirinda)
  spBox?: Lvl; // duran topta (korner, serbest vurus) ceza sahasina giren oyuncu: 0 -> 3, 1 -> 5, 2 -> 7
}

export interface TeamIn {
  name: string;
  short: string;
  color: string;
  color2: string;
  formation: Formation;
  players: PlayerIn[]; // 11 kisi, formasyon sirasinda: GK, defans soldan saga, orta saha, hucum
  bench?: PlayerIn[]; // yedek kulubesi (ilk sirada yedek kaleci)
  U: number; // takim uyumu
  T: number; // taktik kapasite
  F: number; // fiziksel kapasite
  M: number; // moral
  TM?: number; // taraftar morali (yalniz ev sahibinde)
  stadium?: number; // stadyum seviyesi (yalniz ev sahibinde)
  home?: boolean;
  tactic: TacticIn;
  mainTactic?: TacticIn; // ana taktik (doktrin): maca ozel taktik bundan sapiyorsa taktik kapasite verimi duser
  mainFormation?: Formation;
  specialTraining?: boolean; // maca ozel taktik antrenmani yapildi: doktrin bedeli yariya iner
  ai?: { noiseMult: number; readAcc?: number }; // bot zekasi: karar hata payi carpani, rakibi okuma dogrulugu (Mac Motoru sekmesi)
  situational?: { when: 'leading' | 'trailing' | 'drawing' | 'any'; fromMinute: number; tactic?: Partial<TacticIn>; formation?: Formation }[]; // durum taktikleri
}

export type FxKind = 'clean' | 'foul' | 'card' | 'int' | 'kick' | 'save' | 'throw' | 'aim' | 'skill';
// anlatim kaydi: k = tur, s = taraf, a/b/c = forma numaralari (a: yapan, b: karsisindaki ya da alan, c: ustunden asilan)
export interface LogEntry {
  t: number;
  k: 'tackle' | 'evade' | 'dribble' | 'intercept' | 'through' | 'lob' | 'long' | 'cross' | 'save' | 'throw' | 'cornerkick' | 'fk' | 'block' | 'claim' | 'sub' | 'injury' | 'tactic' | 'adjust';
  s: 0 | 1;
  a?: number;
  b?: number;
  c?: number;
  bs?: 0 | 1; // b oyuncusunun tarafi
  gk?: boolean; // taraflardan biri kaleci
}

export interface MatchEvent {
  t: number; // oyun saniyesi
  type: 'goal' | 'shot' | 'save' | 'miss' | 'corner' | 'foul' | 'yellow' | 'red' | 'penalty' | 'freekick' | 'half' | 'end' | 'kickoff' | 'offside' | 'sub' | 'injury' | 'tactic' | 'adjust' | 'extra' | 'shootout';
  player2?: number; // degisiklikte cikan oyuncu
  side: 0 | 1;
  player?: number; // forma numarasi
  xg?: number;
  text?: string;
}

export interface TeamStats {
  goals: number;
  shots: number;
  onTarget: number;
  xg: number;
  passes: number;
  passesOk: number;
  possTicks: number;
  fouls: number;
  yellows: number;
  reds: number;
  corners: number;
  setPieceGoals: number;
  duels: number;
  turnovers: number;
  offsides: number;
  subs: number;
  injuries: number;
}

interface PState {
  side: 0 | 1;
  idx: number;
  num: number;
  name: string;
  pos: Pos;
  traits: string[];
  egBase: number; // kondisyon haric etkin guc
  k: number; // kondisyon
  kDrop: number; // dakika basina kondisyon dususu
  speedBase: number;
  x: number;
  y: number;
  ax: number; // anchor (hucum cercevesinde)
  ay: number;
  yellow: number;
  off: boolean; // oyundan atildi
  hx: number; // bakis yonu
  hy: number;
  thruT?: number; // ara pasi aldigi an (sonraki karar icin)
  emergencyGk?: boolean; // kaleci atilinca kaleye gecen saha oyuncusu
  injured?: boolean; // sakat: degisiklik bekler, yoksa topallar
  subbed?: boolean; // oyundan cikti (degisiklik)
  beatenUntil?: number; // kosu yarisini kaybeden savunmaci: bu ana kadar yavas, mudahale edemez
}

interface Flight {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  t0: number;
  dur: number;
  receiver: PState | null; // basarili ise
  interceptor: PState | null; // basarisiz ise
  kind: 'pass' | 'shot' | 'cross' | 'clear';
  passer: PState;
  air: boolean; // havadan
  apex: number; // en yuksek nokta (m)
  curve: number; // falso: yolun uzunluguna gore yanal sapma orani (+/-)
  shot?: ShotInfo;
  thru?: boolean; // ara pas (alici kosarak alir)
  loose?: boolean; // ara pas bosluga atilir: kosu yarisi pas aninda cozulmustur
  won?: boolean; // yarisi kosucu kazandi
  lead?: number; // kosucunun avantaji (m)
}

interface ShotInfo {
  outcome: 'goal' | 'save' | 'miss' | 'block' | 'header';
  xg: number;
  setPiece: boolean;
  blocker?: PState;
  penalty?: boolean;
  kind?: string; // 'open' | 'header' | 'penalty' | 'freekick' | 'sp-header'
}

interface Pending {
  kind: 'kickoff' | 'corner' | 'penalty' | 'goalkick' | 'fkshot' | 'fk' | 'throw';
  wall?: number; // serbest vurusta baraj sayisi
  side: 0 | 1; // duran topu kullanacak taraf
  at: number; // yari ici saniye
  taker?: PState;
  spotX?: number; // hucum cercevesinde vurus noktasi
  spotY?: number;
  xg?: number;
}

// rakibi okuma sonucu: kanat kaymasi (-1 sol / +1 sag), hizli forvete karsi hat geri, tehlikeli oyuncuya siki markaj
export interface ReadResult { bias: number; dropLine: boolean; mark?: number; until: number }
// ---------- Kullanici kontrolu (Team play) ----------
// Oyun katmani her adimdan once setInput ile joystick ve butonlari verir; tek seferlik aksiyonlar 0,3 s tamponda bekler.
export type UserAct = 'pass' | 'through' | 'shoot' | 'tackle' | 'slide' | 'switch';
export interface UserInput { mx: number; my: number; sprint: boolean; press: boolean; act?: UserAct; power?: number }
export interface ControlState {
  mode: 'team';
  player: PState | null; // kontrol edilen futbolcu
  input: UserInput;
  actAt: number; // tamponlanan aksiyonun zamani
  assistPass: 0 | 1 | 2; // yardim seviyesi: 0 kapali, 1 kismi, 2 tam
  assistShot: 0 | 1 | 2;
  cooldown: number; // mudahale bekleme (fiziksel s)
  switchCd: number; // oyuncu degistirme bekleme
  holdStart: number; // kontrol edilen tasiyicinin topu aldigi an (sure sinirlari icin)
  lastInputT: number; // son joystick/aksiyon girdisi
  duelUntil: Map<PState, number>; // ayni savunmaciyla art arda birebir rolu olmasin
}
export interface MatchState {
  teams: [TeamIn, TeamIn];
  players: PState[];
  t: number; // oyun saniyesi (yari ici)
  clock: number; // toplam oyun saniyesi
  half: 1 | 2 | 3 | 4; // 3-4: kupa uzatmasi
  halfEnd: number; // bu yarinin bitis saniyesi, yari saatiyle (uzatma dahil)
  hclock: number; // yari saati (oyun saniyesi); fiziksel zaman st.t'dir
  extra: number[]; // yari basina uzatma olay sayaci (oyun dakikasi); 4 yari (uzatma dahil)
  ball: { x: number; y: number };
  ballZ: number; // topun yuksekligi (m)
  pending: Pending | null; // siradaki duran top
  celebrate: { side: 0 | 1; scorer: PState; until: number } | null;
  deadStart: number; // olu surenin basladigi an
  keyUntil: number; // onemli an: izleme ekrani bu ana kadar yavaslar
  fx: { t: number; x: number; y: number; kind: FxKind }[]; // ekran efektleri: mudahaleler, vuruslar
  log: LogEntry[]; // anlatim kayitlari (ekran metne cevirir)
  owner: PState | null;
  flight: Flight | null;
  holdUntil: number;
  restartUntil: number; // duran top / devam beklemesi
  deadReason: string; // top neden oyun disinda (ekran icin)
  lastRestartT: number; // son yeniden baslatmanin ani (duran top golu sayimi icin)
  lastTurnoverT: number; // top el degistirdigi son an (gecis savunmasi icin)
  bench: [PState[], PState[]]; // yedekler (sahada degil)
  subsLeft: [number, number];
  subQueue: { side: 0 | 1; out: PState; inn: PState; reason: string }[]; // ilk olu topta uygulanacak degisiklikler
  minuteMark: number; // sakatlik zari icin islenen son oyun dakikasi
  subWindowsLeft: [number, number]; // degisiklik penceresi (devre arasi haric 3)
  adaptUntil: [number, number]; // taktik degisikligi sonrasi uyum suresi (oyun saniyesi): T -10
  tacticChanges: [number, number];
  reads: [ReadResult | null, ReadResult | null]; // rakibi okuma sonucu
  zoneShots: [number[], number[]]; // hucum eden tarafin sutlari bolgeye gore (sol/orta/sag, kendi cercevesinde)
  zoneEntries: [number[], number[]]; // hucum ucuncu bolgeye girisler bolgeye gore (sol/orta/sag) - baskin atak yonu bundan okunur
  dribbling: boolean; // tasiyici top surme karari verdi: sonraki adimlarda ayni hizla surer (adim suresinden bagimsiz)
  control: [ControlState | null, ControlState | null]; // kullanici kontrolu (Team play), taraf basina
  nextDec: number; // tasiyicinin bir sonraki karar ani (fiziksel s): kararlar en sik 0,5 s'de bir (adim suresinden bagimsiz)
  lastThird: [boolean, boolean]; // top sahibi takim su an hucum ucuncu bolgede mi
  playerXg: [Record<number, number>, Record<number, number>];
  knockout: boolean; // kupa: esitlikte uzatma ve penaltilar
  shootout: [number, number] | null;
  sitUsed: boolean[][];
  restartKind: string; // yeniden baslatma turu: 'throw' | 'goalkick' | 'fk' | 'corner' | 'gk' | '' (ofsayt kurali icin)
  lastPossSide: 0 | 1;
  stats: [TeamStats, TeamStats];
  events: MatchEvent[];
  done: boolean;
  rng: () => number;
  rngState: number; // mulberry32 durumu (maci kaydedip surdurmek icin)
  seed: number;
  dt: number;
}

// ---------- Ayar katsayilari (veri olarak; LiveOps'tan degistirilebilir) ----------
export const DBG: Record<string, number> = {};
const dbg = (k: string) => (DBG[k] = (DBG[k] ?? 0) + 1);

export const P = {
  dt: 0.5, // tick (fiziksel saniye)
  clockRate: 6, // fiziksel saniye basina oyun saati saniyesi
  sepD: 2.0, // oyuncular arasi asgari mesafe (m); top sahibi-rakip haric
  offBallUrg: 0.65,
  thruRace: 2.5, // ara pasta kosu yarisinin keskinligi (sn farkina gore)
  thruReact: 0.4, // savunmacinin ara pasa tepki suresi (sn)
  transReact: 0.3, // gecis aninda (top yeni el degistirdiyse) ek tepki suresi
  transWin: 4, // gecis penceresi (fiziksel sn)
  thruMinX: 58, // ara pas hedefi en az bu kadar ileride olmali (hucum ucuncu bolgesine yakin)
  thruSpeed: 14,
  lobCost: 0.06, // havadan (asirtma) ara pasin isabet bedeli // ara pasin top hizi (m/s); kosucuya gore agirlik verilir
  thruV: 0.2, // ara pas hedefinin deger carpani (kosuda ilk kontrol riski)
  fatK: 0.15, // kondisyon tukendiginde en fazla guc/hiz kaybi
  fatPow: 1.4, // kaybin egriligi
  oneOnOne: 2.0,
  shakeM: 2.2, // topsuz oyuncunun markajdan siyrilma mesafesi (m) // kaleciyle karsi karsiya kalan oyuncunun gol beklentisi carpani
  gkSmother: 0.3, // kalecinin ceza sahasinda topa cikma denemesi (tick basina)
  gkSmotherBonus: 0.05, // kalecinin topa atlamada ek sansi (calimci forvet bunu asar)
  runsGap: [2.8, 1.8, 0.6] as number[], // forvetin son savunma cizgisine uzakligi (m), kosu tipine gore
  runsOff: [0.015, 0.045, 0.22] as number[], // ara pasta ofsayt riski, kosu tipine gore
  runsHead: [-0.05, 0, 0.2] as number[], // kosuya erken cikma avantaji (sn)
  passOff: 0.25, // normal paslarda ofsayt riski = runsOff x bu oran (cizgiye yakin forvete ileri pas)
  trapOff: 0.07, // ofsayt tuzaginin ek ofsayt riski (taktik kapasite 60'ta)
  trapReact: 0.35, // tuzak tutmazsa savunmanin gec kalmasi (sn)
  respect: 1.0,
  openGain: 9, // bos alanda top surmenin degerlendirilen ilerleme mesafesi (m)
  openDribble: 0.93, // onu bos oyuncu topla neredeyse tam hizda kosar
  transUrg: 0.85,
  lineMid: 0.5, // savunma hatti ayarinin orta sahaya yansima orani
  behindTry: 0.4, // arkadan mudahale deneme orani
  behindWin: 0.6, // arkadan mudahale basari orani
  behindFoul: 1.8, // arkadan mudahale faul orani // gecislerde kosu hizi orani // onu bos tasiyicinin hiz orani
  compactLen: [0.88, 1, 1.12] as number[], // hat arasi mesafe carpani
  fbUp: [3, 10, 16] as number[], // beklerin hucumda one cikisi (m)
  cmUp: [-4, 0, 9] as number[], // merkez orta sahanin hucumda one cikisi (m)
  roleFat: [0.92, 1, 1.12] as number[], // rol kosu miktarina gore yorulma // riskli kosulara karsi savunmanin geri cekilmesi (m)
  subsMax: 5, // mac basi degisiklik hakki
  adaptMin: 5, // mac ici taktik degisikliginden sonra uyum suresi (oyun dakikasi); bu surede T -10
  readEvery: 15, // rakibi okuma araligi (oyun dakikasi)
  readShift: 3, // okuma dogruysa savunmanin kanada kaymasi / hattin geri cekilmesi (m)
  reachT: 0.4, // ince adimda mudahale menzili zaman ufku (s): kaba adimdaki (0,5 s) erisimi korur
  fineAtt: 0.3, // ince adimda mudahale deneme olasiligi duzeltmesi (menzil genisleyince arkadan/yandan denemeler artar)
  userRestartLimit: 5, // kullanici duran topta / kaleci elinde bu kadar bekleyince yapay zeka oynar (s)
  userIdleLimit: 8, // acik oyunda girdisiz bekleme siniri (s)
  subTiredK: 38, // bu kondisyonun altindaki oyuncu 60. dakikadan sonra degistirilir
  injuryRisk: [0.0001, 0.0004, 0.0012, 0.003] as number[], // dakikalik sakatlik riski: k>=60, 40-59, 20-39, <20 (Metrik sekmesi)
  pressFat: [0.9, 1.0, 1.5] as number[], // pres seviyesine gore yorulma carpani
  tempoHold: [1.15, 1.0, 0.85] as number[], // tempoya gore top tutma suresi carpani
  crossShot: 0.5, // ceza sahasinda alinan ortanin dogrudan kafa/vole ile bitirilme orani
  headerK: 0.7, // kafa/vole bitirisin gol olasiligi carpani
  holdMin: 0.7, // top alan oyuncunun ilk dokunus/bakis suresi (fiziksel sn)
  holdVar: 0.5,
  duelSlope: 1.35, // ikili mucadelelerde guc oraninin etkisi (ln oran carpani)
  passSlope: 1.25, // pas isabetinde guc oraninin etkisi
  shotSlope: 0.75, // sut kalitesinde sutcu/kaleci oraninin etkisi
  xgScale: 1.11, // akan oyun gol olasiligi carpani (baseXg gercek xG olcegindedir)
  shotBias: 0.0,
  shotW: 0.6, // sut kararinin agirligi (hacim ayari)
  minShotXg: 0.012, // bu ham xG'nin altindaki pozisyondan sut dusunulmez (~27 m merkez)
  maxShotP: 0.7, // akan oyunda tek sutun en yuksek gol olasiligi
  onTargetBase: 0.26, // blok olmayan sutun isabetli olma tabani (+1,2 x gol olasiligi)
  takeOnK: 1.6,
  takeOnFoul: 1.0, // birebirde kaybeden savunmacinin faul carpani (calim anında faul daha seyrek)
  pressXg: 0.25,
  blockP: 0.45, // sut yolundaki savunmacinin blok olasiligi (tam onundeyse)
  tackleBase: 0.07, // tick basina mudahale denemesi tabani
  tackleWin: -0.35, // esit gucte mudahale basarisinin logit tabani
  noise: 0.006, // karar hata payi tabani
  passSpeed: 19,
  passBase: 0.99, // pas isabeti tabani
  passD: 0.0045, // metre basina isabet kaybi
  interceptK: 0.62,
  outOfPlay: 0.45,
  foulBase: 0.06,
  cornerFromSave: 0.5, // kurtaristan korner (gerisi kalecide kalir)
  cornerFromMiss: 0.15, // isabetsiz sutun savunmaciya carpip kornere cikmasi
  cornerFromBlock: 0.25,
  cornerFromInt: 0.25, // hucum ucuncu bolgede kesilen pasin kornere cikmasi (oyun disina ciktiysa)
  inBoxFoul: 0.2, // ceza sahasinda faul olasiligi carpani (savunmacilar daha dikkatli)
  spBoxN: [3, 5, 7] as number[], // duran topta ceza sahasina giren oyuncu sayisi
  fkCrossHeader: 0.45, // ceza sahasina atilan serbest vurusta kafa sansi (korner gibi)
  cornerHeaderChance: 0.4,
  cornerHeaderP: 0.19, // kornerde kafa vurusunun gol olasiligi (esit hava gucunde, carpanlar oncesi)
  fkP: 0.08, // merkezden 22 m direkt serbest vurusun gol olasiligi
  penaltyP: 0.78,
};

// ---------- Yardimcilar ----------
export function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const L = 105;
const W = 68;
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
const hyp = Math.hypot;

function gauss(rng: () => number): number {
  const u = Math.max(rng(), 1e-9);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Hucum cercevesi: takim her zaman x=105'e hucum ediyormus gibi
// ikinci yarida takimlar taraf degistirir: cerceve donusumu yariya gore yapilir
let FLIP = false;
const eff = (side: 0 | 1): 0 | 1 => (FLIP ? (1 - side) as 0 | 1 : side);
function toFrame(side: 0 | 1, x: number, y: number): [number, number] {
  return eff(side) === 0 ? [x, y] : [L - x, W - y];
}
function fromFrame(side: 0 | 1, x: number, y: number): [number, number] {
  return eff(side) === 0 ? [x, y] : [L - x, W - y];
}

// ---------- Metrik formulleri (Metrik sekmesi) ----------
export function teamFactor(t: TeamIn): number {
  return 0.7 + (0.3 * (0.45 * t.U + 0.3 * t.T + 0.25 * t.F)) / 100;
}
export function moraleMult(t: TeamIn): number {
  return 0.88 + (0.17 * clamp(t.M, 20, 100)) / 100;
}
export function fatigueMult(y: number): number {
  return 1 - 0.25 * Math.pow(clamp(y, 0, 100) / 100, 1.5);
}
export function homeBonus(t: TeamIn): number {
  if (!t.home) return 0;
  const tm = t.TM ?? 55;
  const lvl = t.stadium ?? 1;
  const dol = Math.min(1, 0.35 + (0.65 * tm) / 100);
  return 0.01 + 0.04 * dol * (0.5 + 0.05 * lvl);
}
export function playerEG(t: TeamIn, p: PlayerIn): number {
  return p.gg * teamFactor(t) * moraleMult(t) * fatigueMult(p.fatigue ?? 20) * (1 + homeBonus(t));
}

// ---------- Formasyonlar (hucum cercevesi, top merkezdeyken) ----------
const FORMATIONS: Record<string, [number, number][]> = {
  '4-3-3': [
    [4, 34],
    [30, 9], [22, 26], [22, 42], [30, 59],
    [38, 34], [47, 21], [47, 47],
    [64, 10], [70, 34], [64, 58],
  ],
  '4-4-2': [
    [4, 34],
    [30, 9], [22, 26], [22, 42], [30, 59],
    [39, 27], [39, 41], [50, 10], [50, 58],
    [66, 28], [66, 40],
  ],
  '4-2-3-1': [
    [4, 34],
    [30, 9], [22, 26], [22, 42], [30, 59],
    [36, 27], [36, 41],
    [58, 10], [56, 34], [58, 58],
    [70, 34],
  ],
  '3-5-2': [
    [4, 34],
    [20, 18], [18, 34], [20, 50],
    [40, 7], [34, 34], [46, 22], [46, 46], [40, 61],
    [66, 28], [66, 40],
  ],
  '5-3-2': [
    [4, 34],
    [27, 6], [20, 21], [18, 34], [20, 47], [27, 62],
    [40, 23], [35, 34], [40, 45],
    [64, 28], [64, 40],
  ],
};
// formasyon -> mevkiler ve forma numaralari (sira FORMATIONS ile ayni)
const FORM_POS: Record<Formation, Pos[]> = {
  '4-3-3': ['GK', 'FB', 'CB', 'CB', 'FB', 'DM', 'CM', 'CM', 'W', 'ST', 'W'],
  '4-4-2': ['GK', 'FB', 'CB', 'CB', 'FB', 'CM', 'CM', 'W', 'W', 'ST', 'ST'],
  '4-2-3-1': ['GK', 'FB', 'CB', 'CB', 'FB', 'DM', 'DM', 'W', 'CM', 'W', 'ST'],
  '3-5-2': ['GK', 'CB', 'CB', 'CB', 'FB', 'DM', 'CM', 'CM', 'FB', 'ST', 'ST'],
  '5-3-2': ['GK', 'FB', 'CB', 'CB', 'CB', 'FB', 'CM', 'DM', 'CM', 'ST', 'ST'],
};
const FORM_NUM: Record<Formation, number[]> = {
  '4-3-3': [1, 3, 4, 5, 2, 6, 8, 10, 11, 9, 7],
  '4-4-2': [1, 3, 4, 5, 2, 6, 8, 11, 7, 9, 10],
  '4-2-3-1': [1, 3, 4, 5, 2, 6, 8, 11, 10, 7, 9],
  '3-5-2': [1, 4, 5, 6, 3, 8, 10, 7, 2, 9, 11],
  '5-3-2': [1, 3, 4, 5, 6, 2, 8, 14, 10, 9, 11],
};
export const FORMATION_LIST = Object.keys(FORM_POS) as Formation[];

// ---------- Taktik etkilesimleri (Mac Motoru sekmesi: hicbir talimat mutlak ustun degildir) ----------
// Her eslesme +1 (gucluluk) ya da -1 (zayiflik) puani verir; toplam, takim kapasitesiyle olceklenen
// %3-6 EG etkisine cevrilir.
// Kurallar veri olarak tutulur (LiveOps'tan ayarlanabilir). w > 0: "me" bu eslesmede guclu.
type TeamCond = (t: TeamIn) => boolean;
const tc = {
  press: (v: number): TeamCond => (t) => t.tactic.press === v,
  line: (v: number): TeamCond => (t) => t.tactic.line === v,
  style: (v: number): TeamCond => (t) => t.tactic.style === v,
  tempo: (v: number): TeamCond => (t) => t.tactic.tempo === v,
  runs: (v: number): TeamCond => (t) => (t.tactic.runs ?? 1) === v,
  wing: (v: number): TeamCond => (t) => (t.tactic.wing ?? 0) === v,
  fb: (v: number): TeamCond => (t) => (t.tactic.fb ?? 1) === v,
  cm: (v: number): TeamCond => (t) => (t.tactic.cm ?? 1) === v,
  trap: (v: number): TeamCond => (t) => (t.tactic.trap ?? 0) === v,
  form: (...f: Formation[]): TeamCond => (t) => f.includes(t.formation),
  any: ((_: TeamIn) => true) as TeamCond,
};
export const EDGE_RULES: { me: TeamCond; op: TeamCond; w: number; note: string }[] = [
  // Her eslesme tek yonlu ve bir kez yazilir (karsi tarafa ayrica yazilmaz; etki orani zaten iki takimi birden kapsar).
  // pres
  { me: tc.press(2), op: tc.style(0), w: 1, note: 'Yuksek pres kisa pasa karsi guclu' },
  { me: tc.press(2), op: (t) => t.U < 55, w: 1, note: 'Yuksek pres uyumu dusuk rakibe karsi guclu' },
  { me: tc.press(2), op: tc.style(2), w: -1, note: 'Yuksek pres uzun topa karsi zayif' },
  { me: tc.press(0), op: tc.runs(2), w: 1, note: 'Dusuk pres arkasi kapali: riskli kosulara karsi guclu' },
  { me: tc.press(0), op: tc.tempo(2), w: 1, note: 'Dusuk pres hizli tempoyu kontraya cevirir' },
  { me: tc.press(0), op: tc.style(0), w: -1, note: 'Dusuk pres kisa pasla oyun kurana alan birakir' },
  // savunma hatti
  { me: tc.line(2), op: tc.style(0), w: 1, note: 'Onde hat yatay pasa karsi guclu' },
  { me: tc.line(2), op: tc.tempo(0), w: 1, note: 'Onde hat yavas oyuna karsi guclu' },
  { me: tc.line(2), op: tc.style(2), w: -1, note: 'Onde hat uzun topa karsi zayif' },
  { me: tc.line(2), op: tc.runs(2), w: -1, note: 'Onde hat derin kosuya karsi zayif' },
  { me: tc.line(2), op: tc.tempo(2), w: -1, note: 'Onde hat hizli tempoya karsi zayif' },
  { me: tc.line(0), op: tc.style(2), w: 1, note: 'Derin hat uzun topa karsi guclu' },
  { me: tc.line(0), op: tc.runs(2), w: 1, note: 'Derin hat kosu alanini kapatir' },
  { me: tc.line(0), op: tc.tempo(2), w: 1, note: 'Derin hat hizli hucuma karsi guclu' },
  { me: tc.line(0), op: tc.style(0), w: -1, note: 'Derin hat sabirli pas oyununa karsi zayif' },
  { me: tc.line(0), op: tc.cm(2), w: -0.5, note: 'Derin hat ceza sahasina kosan orta sahaya karsi zayif' },
  // stil, kanat, bek
  { me: tc.style(2), op: tc.form('5-3-2'), w: -1, note: 'Direkt oyun 5 stopere karsi zayif (hava toplari)' },
  { me: tc.wing(1), op: tc.fb(2), w: 0.5, note: 'Ice kat eden kanat bindiren bekin arkasini kullanir' },
  { me: tc.fb(2), op: tc.form('4-4-2', '4-2-3-1'), w: 0.5, note: 'Bindiren bek tek kanatcili savunmayi zorlar' },
  { me: tc.form('5-3-2'), op: tc.wing(0), w: 0.5, note: '5-3-2 ortalara karsi guclu' },
];
// formasyon eslesmeleri: satir = benim dizilisim, sutun = rakip; deger benim lehime (tas-kagit-makas dongusu)
export const FORM_EDGE: Record<Formation, Partial<Record<Formation, number>>> = {
  '4-3-3': { '3-5-2': 1, '5-3-2': -0.5, '4-4-2': 0, '4-2-3-1': 1 },
  '4-4-2': { '4-3-3': 0, '3-5-2': 0.5, '4-2-3-1': -1, '5-3-2': -0.5 },
  '4-2-3-1': { '4-4-2': 1, '5-3-2': 0, '3-5-2': -1, '4-3-3': -1 },
  '3-5-2': { '4-2-3-1': 1, '5-3-2': 1, '4-3-3': -1, '4-4-2': -0.5 },
  '5-3-2': { '4-3-3': 0.5, '4-4-2': 1, '4-2-3-1': -0.5, '3-5-2': -1 },
};
// taban denge katsayilari: mekanik olarak fazla guclu/zayif kalan secenekler (havuz testinden; taktik kapasiteyle olceklenmez)
export const EDGE_BASE: { me: TeamCond; w: number; note: string }[] = [
  // 11. surum havuz testlerinden (her secenek rastgele rakiplere karsi 300 mac); isaret mekanik sapmanin tersidir
  { me: tc.line(1), w: 0.3, note: 'Orta hat' },
  { me: tc.line(0), w: -0.3, note: 'Derin hat: kontra avantaji mekanik olarak guclu' },
  { me: (t) => (t.tactic.compact ?? 1) === 0, w: 0.3, note: 'Kompakt' },
  { me: (t) => (t.tactic.compact ?? 1) === 2, w: -0.3, note: 'Acik' },
  { me: tc.fb(0), w: -0.3, note: 'Savunmada kalan bek' },
  { me: tc.runs(0), w: 0.4, note: 'Guvenli kosu: daha az pozisyon' },
  { me: tc.tempo(2), w: 0.4, note: 'Hizli tempo: top kaybi bedeli' },
  { me: tc.cm(1), w: -0.3, note: 'Dengeli orta saha' },
  { me: tc.wing(0), w: 0.6, note: 'Cizgide kalan kanat' },
  { me: (t) => (t.tactic.width ?? 1) === 2, w: 0.3, note: 'Genis oyun' },
  { me: (t) => (t.tactic.width ?? 1) === 0, w: 0.2, note: 'Dar oyun' },
  { me: tc.form('4-3-3'), w: 0.4, note: '4-3-3: kafa gucu dusuk (tek forvet, iki stoper)' },
  { me: tc.form('4-2-3-1'), w: -0.5, note: '4-2-3-1: hatlar arasi 10 numara mekanik olarak guclu' },
  { me: tc.form('3-5-2'), w: -0.3, note: '3-5-2' },
  { me: tc.form('5-3-2'), w: -0.3, note: '5-3-2: bes savunma ve iki forvet' },
];


export const EDGE_CAP = 2; // kural toplaminin siniri (birim)
export const EDGE_BASE_CAP = 1.5;
export function tacticEdge(me: TeamIn, op: TeamIn): number {
  let sc = 0;
  for (const r of EDGE_RULES) if (r.me(me) && r.op(op)) sc += r.w;
  sc += FORM_EDGE[me.formation]?.[op.formation] ?? 0;
  if (me.tactic.tempo === 2 && op.players.reduce((a, p) => a + (p.fatigue ?? 20), 0) / op.players.length > 40) sc += 1;
  sc = clamp(sc, -EDGE_CAP, EDGE_CAP);
  let base = 0;
  for (const r of EDGE_BASE) if (r.me(me)) base += r.w;
  base = clamp(base, -EDGE_BASE_CAP, EDGE_BASE_CAP);
  const size = clamp(0.045 * (me.T / 60), 0.03, 0.06);
  return 1 + size * sc + 0.045 * base;
}

// ---------- Mac kurulumu ----------
// doktrin bedeli: ana taktikten sapma taktik kapasite verimini dusurur (Mac Motoru sekmesi)
export function doctrinePenalty(t: TeamIn): number {
  if (!t.mainTactic) return 0;
  const m = t.mainTactic, c = t.tactic;
  let pen = 0;
  for (const k of ['style', 'press', 'line', 'tempo'] as const) if (Math.abs((c[k] ?? 1) - (m[k] ?? 1)) >= 2) pen += 0.04;
  const back = (f: Formation) => (f === '3-5-2' ? 3 : f === '5-3-2' ? 5 : 4);
  const mf = t.mainFormation ?? t.formation;
  if (mf !== t.formation) pen += back(mf) === back(t.formation) ? 0.02 : 0.08;
  pen = Math.min(0.15, pen);
  return t.specialTraining ? pen / 2 : pen;
}
export function createMatch(a0: TeamIn, b0: TeamIn, seed: number, opts?: { knockout?: boolean }): MatchState {
  FLIP = false;
  // taktik kopyalanir (mac icinde degisebilir), doktrin bedeli T'ye uygulanir
  const a: TeamIn = { ...a0, tactic: { ...a0.tactic }, T: a0.T * (1 - doctrinePenalty(a0)) };
  const b: TeamIn = { ...b0, tactic: { ...b0.tactic }, T: b0.T * (1 - doctrinePenalty(b0)) };
  // rastgele sayi ureteci durumu mac durumunda tutulur (seri hale getirilebilir)
  const box = { rngState: seed | 0 };
  const rng = () => {
    box.rngState = (box.rngState + 0x6d2b79f5) | 0;
    let t = Math.imul(box.rngState ^ (box.rngState >>> 15), 1 | box.rngState);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const players: PState[] = [];
  const teams: [TeamIn, TeamIn] = [a, b];
  for (let s = 0 as 0 | 1; s < 2; s = (s + 1) as 0 | 1) {
    const t = teams[s];
    const form = FORMATIONS[t.formation];
    const edge = tacticEdge(t, teams[s === 0 ? 1 : 0]);
    t.players.forEach((p, i) => {
      const eg = Math.max(5, playerEG(t, p)) * edge;
      const egN = clamp((eg - 35) / 50, 0, 1);
      const fast = p.traits?.includes('Hızlı') ? 0.8 : 0;
      const kDropPerMin = 0.45 * (1.3 - (0.6 * t.F) / 100) * (p.traits?.includes('Dayanıklı') ? 0.8 : 1) * P.pressFat[t.tactic.press] * (p.pos === 'FB' ? P.roleFat[t.tactic.fb ?? 1] : p.pos === 'CM' ? P.roleFat[t.tactic.cm ?? 1] : 1) * (t.tactic.tempo === 2 && t.F < 55 ? 1.15 : 1);
      const [ax, ay] = form[i];
      const [wx, wy] = fromFrame(s, ax, ay);
      players.push({
        side: s,
        idx: i,
        num: p.num,
        name: p.name,
        pos: p.pos,
        traits: p.traits ?? [],
        egBase: eg,
        k: 100 - 0.5 * (p.fatigue ?? 20),
        kDrop: kDropPerMin,
        speedBase: 6.2 + 1.6 * egN + fast,
        x: wx,
        y: wy,
        ax,
        ay,
        yellow: 0,
        off: false,
        hx: s === 0 ? 1 : -1,
        hy: 0,
      });
    });
    if (s === 1) break;
  }
  const benchOf = (s: 0 | 1): PState[] => {
    const t = teams[s];
    const edge = tacticEdge(t, teams[s === 0 ? 1 : 0]);
    return (t.bench ?? []).map((p, i) => {
      const eg = Math.max(5, playerEG(t, p)) * edge;
      const egN = clamp((eg - 35) / 50, 0, 1);
      const fast = p.traits?.includes('Hızlı') ? 0.8 : 0;
      return {
        side: s, idx: 11 + i, num: p.num, name: p.name, pos: p.pos, traits: p.traits ?? [], egBase: eg, k: 100 - 0.5 * (p.fatigue ?? 20),
        kDrop: 0.45 * (1.3 - (0.6 * t.F) / 100) * (p.traits?.includes('Dayanıklı') ? 0.8 : 1) * P.pressFat[t.tactic.press],
        speedBase: 6.2 + 1.6 * egN + fast, x: -10, y: -10, ax: 0, ay: 34, yellow: 0, off: true, hx: 1, hy: 0,
      };
    });
  };
  const emptyStats = (): TeamStats => ({ goals: 0, shots: 0, onTarget: 0, xg: 0, passes: 0, passesOk: 0, possTicks: 0, fouls: 0, yellows: 0, reds: 0, corners: 0, setPieceGoals: 0, duels: 0, turnovers: 0, offsides: 0, subs: 0, injuries: 0 });
  const st: MatchState = {
    teams,
    players,
    t: 0,
    clock: 0,
    half: 1,
    halfEnd: 45 * 60,
    hclock: 0,
    extra: [1, 3, 1, 1],
    ball: { x: L / 2, y: W / 2 },
    ballZ: 0,
    pending: null,
    celebrate: null,
    deadStart: 0,
    keyUntil: 0,
    fx: [],
    log: [],
    owner: null,
    flight: null,
    holdUntil: 0,
    restartUntil: 0,
    deadReason: '',
    restartKind: '',
    lastRestartT: -99,
    lastTurnoverT: -99,
    bench: [benchOf(0), benchOf(1)],
    subsLeft: [P.subsMax, P.subsMax],
    subQueue: [],
    minuteMark: 0,
    subWindowsLeft: [3, 3],
    adaptUntil: [-1, -1],
    tacticChanges: [0, 0],
    reads: [null, null],
    zoneShots: [[0, 0, 0], [0, 0, 0]],
    zoneEntries: [[0, 0, 0], [0, 0, 0]],
    dribbling: false,
    control: [null, null],
    nextDec: 0,
    lastThird: [false, false],
    playerXg: [{}, {}],
    knockout: !!opts?.knockout,
    shootout: null,
    sitUsed: [[], []],
    lastPossSide: 0,
    stats: [emptyStats(), emptyStats()],
    events: [],
    done: false,
    rng,
    get rngState() {
      return box.rngState;
    },
    set rngState(v: number) {
      box.rngState = v;
    },
    seed,
    dt: P.dt,
  };
  kickoff(st, 0);
  return st;
}

// bakis yonu: hareket yonune dogru yumusakca doner
function face(p: PState, dx: number, dy: number, w = 0.45) {
  const d = Math.hypot(dx, dy);
  if (d < 0.02) return;
  let hx = p.hx * (1 - w) + (dx / d) * w;
  let hy = p.hy * (1 - w) + (dy / d) * w;
  const n = Math.hypot(hx, hy) || 1;
  p.hx = hx / n;
  p.hy = hy / n;
}
// top, tasiyanin onunde, baktigi yonde durur
function ballAt(st: MatchState, c: PState) {
  st.ball.x = Math.min(L - 0.3, Math.max(0.3, c.x + c.hx * 0.9));
  st.ball.y = Math.min(W - 0.3, Math.max(0.3, c.y + c.hy * 0.9));
}

const s_stats = (st: MatchState, side: 0 | 1) => st.stats[side];
// etkin taktik kapasite: uyum suresinde -10
function tEff(st: MatchState, side: 0 | 1): number {
  return st.teams[side].T - (st.clock < st.adaptUntil[side] ? 10 : 0);
}
function liveTeam(st: MatchState, side: 0 | 1): PState[] {
  return st.players.filter((p) => p.side === side && !p.off);
}
// kondisyon etkisi: 100'den dustukce guc ve hiz kademeli azalir (k=56'da ~%5, k=35'te ~%8)
function kf(k: number): number {
  return 1 - P.fatK * Math.pow(clamp((100 - k) / 100, 0, 1), P.fatPow);
}
function eg(p: PState): number {
  return p.egBase * kf(p.k);
}
function gk(st: MatchState, side: 0 | 1): PState {
  return (st.players.find((p) => p.side === side && p.pos === 'GK' && !p.off) ?? st.players.find((p) => p.side === side && !p.off))!;
}

function resetShape(st: MatchState) {
  for (const p of st.players) {
    if (p.off) continue;
    const [wx, wy] = fromFrame(p.side, p.ax * 0.92, p.ay);
    p.x = eff(p.side) === 0 ? Math.min(wx, L / 2 - 1) : Math.max(wx, L / 2 + 1);
    p.y = wy;
    p.hx = eff(p.side) === 0 ? 1 : -1;
    p.hy = 0;
    p.beatenUntil = undefined;
    p.thruT = undefined;
  }
}

function kickoff(st: MatchState, side: 0 | 1) {
  resetShape(st);
  st.ball.x = L / 2;
  st.ball.y = W / 2;
  let team = liveTeam(st, side).filter((p) => p.pos !== 'GK');
  if (team.length === 0) team = liveTeam(st, side);
  // en ileri oyuncu baslar
  let best = team[0];
  for (const p of team) if (toFrame(side, p.x, p.y)[0] > toFrame(side, best.x, best.y)[0]) best = p;
  best.x = st.ball.x - (eff(side) === 0 ? 0.7 : -0.7);
  best.y = st.ball.y;
  best.hx = eff(side) === 0 ? 1 : -1;
  best.hy = 0;
  st.owner = best;
  st.ballZ = 0;
  st.flight = null;
  st.lastPossSide = side;
  st.holdUntil = st.t + 1.0;
  st.restartUntil = st.t + 1.0;
  st.events.push({ t: st.clock, type: 'kickoff', side });
}

// ---------- Tehdit ve sut modeli ----------
function goalAngle(xf: number, yf: number): number {
  const a1 = Math.atan2(34 - 3.66 - yf, 105 - xf);
  const a2 = Math.atan2(34 + 3.66 - yf, 105 - xf);
  return Math.abs(a2 - a1);
}
export function baseXg(xf: number, yf: number): number {
  if (xf >= 105) return 0;
  const d = hyp(105 - xf, 34 - yf);
  const ang = goalAngle(xf, yf) / 0.642; // 11 m'de merkezden aci = 1
  return clamp(0.9 * Math.exp(-0.13 * d) * clamp(Math.pow(ang, 0.8), 0, 1.35), 0, 0.75);
}
// sut yolundaki savunmacilar ve blok olasiligi
function shotBlockers(st: MatchState, c: PState): { p: PState; bp: number }[] {
  const side = c.side;
  const [gx, gy] = fromFrame(side, 105, 34);
  const vx = gx - c.x;
  const vy = gy - c.y;
  const len2 = vx * vx + vy * vy || 1;
  const out: { p: PState; bp: number }[] = [];
  for (const o of st.players) {
    if (o.side === side || o.off || o.pos === 'GK') continue;
    const u = ((o.x - c.x) * vx + (o.y - c.y) * vy) / len2;
    if (u < 0.02 || u > 0.9) continue;
    const perp = hyp(o.x - (c.x + vx * u), o.y - (c.y + vy * u));
    if (perp < 1.4) out.push({ p: o, bp: P.blockP * (1 - perp / 1.4) });
  }
  out.sort((a, b) => hyp(a.p.x - c.x, a.p.y - c.y) - hyp(b.p.x - c.x, b.p.y - c.y));
  return out;
}
// akan oyun sutu: gol olasiligi (blok haric), blok olasiligi ve etkin xG (= gol olasiligi x blok olmama)
function shotModel(st: MatchState, c: PState, xf: number, yf: number, press: number, oneOnOne: boolean) {
  const keeper = gk(st, c.side === 0 ? 1 : 0);
  const raw = baseXg(xf, yf);
  const finisher = c.traits.includes('Bitirici') ? 1.08 : 1;
  const refl = keeper && keeper.traits.includes('Refleks') ? 0.92 : 1;
  const q = keeper ? Math.exp(P.shotSlope * Math.log(eg(c) / eg(keeper))) * (keeper.emergencyGk ? 1.6 : 1) : 1.5;
  const pGoal = clamp(raw * (1 - P.pressXg * press) * (oneOnOne ? P.oneOnOne : 1) * q * finisher * refl * P.xgScale, 0.003, P.maxShotP);
  const blockers = shotBlockers(st, c);
  let noBlock = 1;
  for (const b of blockers) noBlock *= 1 - b.bp;
  return { raw, pGoal, pBlock: 1 - noBlock, xg: pGoal * noBlock, blockers };
}

function threat(xf: number, yf: number): number {
  const centr = Math.exp(-Math.pow((yf - 34) / 24, 2));
  return 0.004 + 0.45 * baseXg(xf, yf) + 0.05 * Math.exp((xf - 105) / 22) * (0.5 + 0.5 * centr);
}

function pressureOn(st: MatchState, p: PState, x: number, y: number, radius = 6): number {
  let s = 0;
  for (const o of st.players) {
    if (o.side === p.side || o.off) continue;
    const d = hyp(o.x - x, o.y - y);
    if (d < radius) s += 1 - d / radius;
  }
  return Math.min(s, 2);
}

// ---------- Takim sekli ----------
function updateAnchorsAndMove(st: MatchState) {
  const dt = st.dt;
  const possSide: 0 | 1 = st.owner ? st.owner.side : st.lastPossSide;
  const carrier = st.owner;
  // tum hareketler once hesaplanir, sonra birlikte uygulanir: islem sirasi bir tarafa avantaj vermez
  const moves = new Map<PState, [number, number]>();
  for (let s = 0 as 0 | 1; s < 2; s = (s + 1) as 0 | 1) {
    const t = st.teams[s];
    const live = liveTeam(st, s);
    const inPoss = possSide === s;
    const [bxf, byf] = toFrame(s, st.ball.x, st.ball.y);
    // savunma hatti derinligi esas olarak topsuz oyunda gecerlidir; topa sahipken takim yine ileri cikar
    const lineOff = inPoss ? [-2, 0, 2][t.tactic.line] : [-7, 0, 6][t.tactic.line];
    const targetLen = inPoss ? [34, 35, 37][t.tactic.line] : [30, 35, 40][t.tactic.line];
    const avgK = live.reduce((a, p) => a + p.k, 0) / live.length;
    const stretch = (1.1 + (0.125 * (60 - t.U)) / 100) * (avgK < 40 ? 1.1 : 1);
    const lenF = (targetLen / 44) * stretch * (inPoss ? 1.15 : 1) * P.compactLen[t.tactic.compact ?? 1];
    const widthF = [0.85, 1, 1.12][t.tactic.width ?? 1] * (inPoss ? 1.1 : 0.85);
    const shiftX = (bxf - 52.5) * 0.5 + (inPoss ? 7 : -5) + lineOff;
    const centerX = 45;
    const noDM = !live.some((q) => q.pos === 'DM');
    const threeBack = live.filter((q) => q.pos === 'CB').length >= 3 && live.filter((q) => q.pos === 'FB').length === 2 && t.formation === '3-5-2';
    const offL = inPoss ? offsideLine(st, s) : 0;
    // baskida en yakin 1-2 oyuncu topa gider
    const pressers: PState[] = [];
    const deadBall = st.t < st.restartUntil; // yeniden baslatma bekleniyor: rakip 9,15 m uzakta durur, pres yok
    if (!inPoss && !deadBall && (carrier || st.flight)) {
      const tx = carrier ? carrier.x : st.flight!.toX;
      const ty = carrier ? carrier.y : st.flight!.toY;
      const sorted = live.filter((p) => p.pos !== 'GK').sort((a, b) => hyp(a.x - tx, a.y - ty) - hyp(b.x - tx, b.y - ty));
      const nPress = t.tactic.press === 2 ? 2 : 1;
      const [cxf] = toFrame(s, tx, ty);
      // dusuk pres: yalniz kendi yarisinda ilk adam bastirir
      const engage = t.tactic.press === 0 ? cxf < 60 : t.tactic.press === 1 ? cxf < 78 : true;
      if (engage) pressers.push(...sorted.slice(0, nPress));
      else pressers.push(...sorted.slice(0, 1).filter((p) => hyp(p.x - tx, p.y - ty) < 12));
    }
    // kaleciyle karsi karsiya: kaleci cikar (onunde kendi savunmacisi yoksa)
    let gkOut: [number, number] | null = null;
    if (!inPoss && carrier && bxf < 30) {
      const [, cyfA] = [0, byf];
      const blocked = live.some((q) => {
        if (q.pos === 'GK') return false;
        const [qxf, qyf] = toFrame(s, q.x, q.y);
        return qxf < bxf + 0.5 && Math.abs(qyf - cyfA) < 5 + (bxf - qxf) * 0.4;
      });
      if (!blocked) gkOut = fromFrame(s, Math.min(bxf - 1.5, 13), byf + (34 - byf) * 0.35);
    }
    // sahipsiz top: iki takimdan da en yakin oyuncu topa kosar
    let chaser: PState | null = null;
    if (!carrier && !st.flight && !st.pending && !st.celebrate && st.t >= st.restartUntil) {
      const [bxf2, byf2] = toFrame(s, st.ball.x, st.ball.y);
      const gkOk = bxf2 < 16.5 && Math.abs(byf2 - 34) < 20.16;
      let bd = 1e9;
      for (const q of live) {
        if (q.pos === 'GK' && !gkOk) continue;
        const d = hyp(q.x - st.ball.x, q.y - st.ball.y);
        if (d < bd) { bd = d; chaser = q; }
      }
    }
    // kendi ucuncu bolgesinde 1-2 savunmaci top ile kale arasina girer (derin blokta 2)
    const coverMap = new Map<PState, [number, number]>();
    if (!inPoss && carrier && bxf < 40) {
      const nCover = t.tactic.line === 0 ? 2 : 1;
      const cands = live.filter((p) => !pressers.includes(p) && (p.pos === 'CB' || p.pos === 'DM' || p.pos === 'FB' || (p.pos === 'CM' && noDM)));
      const gdist = hyp(bxf, byf - 34);
      const used = new Set<PState>();
      for (let r = 0; r < nCover && r < cands.length; r++) {
        const k = Math.min(0.8, (3.5 + r * 3) / Math.max(1, gdist));
        const pxf = bxf + (0 - bxf) * k;
        const pyf = byf + (34 - byf) * k;
        const [px, py] = fromFrame(s, pxf, pyf);
        let best: PState | null = null, bd = 1e9;
        for (const q of cands) { if (used.has(q)) continue; const dq = hyp(q.x - px, q.y - py); if (dq < bd) { bd = dq; best = q; } }
        if (best) { used.add(best); coverMap.set(best, [px, py]); }
      }
    }
    for (const p of live) {
      if (p === carrier) continue;
      // ucustaki topun alicisi/kesecek oyuncusu topa kosar (resolveFlight hareket ettirir)
      if (st.flight && !st.flight.shot && (st.flight.receiver === p || st.flight.interceptor === p)) continue;
      const sp0 = setPieceTarget(st, p);
      if (sp0) {
        const [tx0, ty0, urg0] = sp0;
        const sp = p.speedBase * kf(p.k) * urg0;
        const dx = tx0 - p.x;
        const dy = ty0 - p.y;
        const d = hyp(dx, dy);
        if (d > 0.05) {
          const stp = Math.min(d, sp * dt);
          moves.set(p, [p.x + (dx / d) * stp, p.y + (dy / d) * stp]);
          face(p, dx, dy, 0.4);
        } else face(p, st.ball.x - p.x, st.ball.y - p.y, 0.3);
        continue;
      }
      let txf: number;
      let tyf: number;
      if (p.pos === 'GK') {
        txf = clamp(4 + Math.max(0, bxf - 52) * 0.12 + (t.tactic.line === 2 ? 3 : 0), 2, 16);
        tyf = 34 + (byf - 34) * 0.15;
      } else {
        let ax = p.ax;
        // 3'lu savunmada kanat bekleri topsuz oyunda savunmaya donup 5'li hat olusturur
        if (!inPoss && threeBack && p.pos === 'FB') ax -= 13;
        // bekler hucumda bindirir
        if (inPoss && p.pos === 'FB' && bxf > 50) ax += P.fbUp[t.tactic.fb ?? 1];
        // merkez orta saha: geride kal ya da ceza sahasina kos
        if (inPoss && p.pos === 'CM' && bxf > 55) ax += P.cmUp[t.tactic.cm ?? 1];
        // kanat ice kat: hucum ucuncu bolgede merkeze yaklasir
        let ay = p.ay;
        if (inPoss && p.pos === 'W' && t.tactic.wing === 1 && bxf > 60) ay = 34 + (ay - 34) * 0.55;
        if (inPoss && p.pos === 'ST') ax += 4;
        // savunma hatti ayari esas olarak defans hattini oynatir; orta saha yarisi kadar, forvetler hic etkilenmez
        const lineW = p.pos === 'CB' || p.pos === 'FB' ? 1 : p.pos === 'DM' || p.pos === 'CM' ? P.lineMid : 0;
        txf = centerX + (ax - centerX) * lenF + shiftX - lineOff * (1 - lineW);
        tyf = 34 + (ay - 34) * widthF + (byf - 34) * 0.32;
        // taktik sadakati: dusuk T'de oyuncu topa bakar (top yonune kayar)
        const loyal = 0.6 + (0.5 * (tEff(st, s) - 60)) / 100;
        txf = txf * loyal + bxf * (1 - loyal) * 0.5 + txf * (1 - loyal) * 0.5;
        if (!inPoss) {
          // rakibi okuma: savunma baskin kanada kayar, hizli forvete karsi hat geri ceker
          const rd = st.reads[s];
          if (rd && st.clock < rd.until && p.pos !== 'ST' && p.pos !== 'W') {
            tyf += rd.bias * P.readShift;
            if (rd.dropLine && (p.pos === 'CB' || p.pos === 'FB')) txf -= P.readShift;
            // tehlikeli oyuncuya siki markaj: kendi yarisahamizdayken ona en yakin stoper kale tarafinda 1,5 m'de durur
            if (rd.mark !== undefined && p.pos === 'CB') {
              const dg = st.players.find((q) => q.side !== s && q.num === rd.mark && !q.off);
              if (dg) {
                const [dxf, dyf] = toFrame(s, dg.x, dg.y);
                if (dxf < 45) {
                  let marker: PState | null = null, md = 1e9;
                  for (const q of live) if (q.pos === 'CB') { const dq = hyp(q.x - dg.x, q.y - dg.y); if (dq < md) { md = dq; marker = q; } }
                  if (marker === p) { txf = Math.max(2, dxf - 1.5); tyf = dyf; }
                }
              }
            }
          }
          if (p.pos === 'CB' || p.pos === 'FB') {
            // riskli kosulara karsi geri cekil; ofsayt tuzaginda hatti yuksek tut
            if ((st.teams[s === 0 ? 1 : 0].tactic.runs ?? 1) === 2) txf -= P.respect;
            if (t.tactic.trap) txf += 1.5;
          }
          txf = Math.min(txf, bxf + 2); // savunmada topun onune gecme
          // top kendi kalesine yakinsa savunma kale onunde daralir
          // defansif orta sahasi olmayan dizilislerde (4-4-2) merkez orta sahalar bu gorevi ustlenir
          const screen = p.pos === 'DM' || (p.pos === 'CM' && noDM);
          if (bxf < 35 && (p.pos === 'CB' || p.pos === 'FB' || screen)) {
            const k = (35 - bxf) / 35;
            txf = txf * (1 - k) + Math.max(6, Math.min(txf, bxf - 3)) * k;
            tyf = 34 + (tyf - 34) * (1 - 0.35 * k) + (byf - 34) * 0.15 * k;
          }
        }
        // derin blokta bile bir santrfor kontra icin onde bekler (iki forvetli dizilislerde digeri savunmaya yardim eder)
        if (!inPoss && p.pos === 'ST' && p === live.find((q) => q.pos === 'ST')) txf = Math.max(txf, t.tactic.line === 0 ? 50 : 45);
        // hucumda ofsayta dusmemek icin son savunma cizgisinde bekle
        // hucumcular topa sahipken son savunma cizgisine yaslanir (ara pas kosusu icin)
        if (inPoss && (p.pos === 'ST' || (p.pos === 'W' && p.ax >= 58 && bxf > 35))) txf = Math.max(txf, offL - P.runsGap[t.tactic.runs ?? 1]);
        if (inPoss && txf > offL - 0.4) txf = offL - 0.4;
        txf = clamp(txf, 6, 101);
        tyf = clamp(tyf, 2, 66);
      }
      let [tx, ty] = fromFrame(s, txf, tyf);
      let urg = P.offBallUrg;
      // topsuz hucum oyuncusu markajdan siyrilir: yakin rakipten 2 m uzaga kayar
      if (inPoss && p.pos !== 'GK') {
        const mk = nearestOpp(st, p);
        if (mk && mk.d < 2.5 && P.shakeM > 0) {
          const ux = (p.x - mk.p.x) / (mk.d || 1), uy = (p.y - mk.p.y) / (mk.d || 1);
          tx += ux * P.shakeM;
          ty += uy * P.shakeM;
          urg = Math.max(urg, 0.8);
        }
      }
      // hucumcular cizgiye kosarken, savunmacilar geriye donerken (gecis) daha hizli hareket eder
      if (inPoss && (p.pos === 'ST' || p.pos === 'W')) urg = P.transUrg;
      if (!inPoss && toFrame(s, p.x, p.y)[0] - txf > 8) urg = P.transUrg;
      if (p.pos === 'GK' && gkOut) {
        [tx, ty] = gkOut;
        urg = 1;
      }
      const cov = coverMap.get(p);
      if (cov) {
        [tx, ty] = cov;
        urg = 0.85;
      }
      // ara pas ceza sahasina dusecekse kaleci cikar
      if (p.pos === 'GK' && st.flight?.thru && st.flight.passer.side !== s && st.t - st.flight.t0 >= 0.3) {
        const [fxf, fyf] = toFrame(s, st.flight.toX, st.flight.toY);
        if (fxf < 18 && Math.abs(fyf - 34) < 22) {
          tx = st.flight.toX;
          ty = st.flight.toY;
          urg = 1;
        }
      }
      if (p === chaser) {
        tx = st.ball.x;
        ty = st.ball.y;
        urg = 1;
      }
      if (pressers.includes(p)) {
        if (carrier) {
          // pres yapan, tasiyicinin kale tarafinda durur (yolu kapatir)
          const [gx, gy] = fromFrame(s, 0, 34);
          const gd = hyp(gx - carrier.x, gy - carrier.y) || 1;
          tx = carrier.x + ((gx - carrier.x) / gd) * 1.2;
          ty = carrier.y + ((gy - carrier.y) / gd) * 1.2;
          // tasiyici gecmisse (kendi kalesine daha yakinsa) tam hizla geri kosar
          if (toFrame(s, carrier.x, carrier.y)[0] < toFrame(s, p.x, p.y)[0] - 1) urg = 0.95;
        } else if (st.flight) {
          if (st.flight.thru) {
            // ara pas: savunmaci inis noktasini bilmez, once doner sonra topun kendisini kovalar
            if (st.t - st.flight.t0 < P.thruReact + (st.flight.t0 - st.lastTurnoverT < P.transWin ? P.transReact : 0)) { tx = p.x; ty = p.y; }
            else { tx = st.ball.x; ty = st.ball.y; }
          } else {
            tx = st.flight.toX;
            ty = st.flight.toY;
          }
        }
        if (urg < 0.9) urg = 0.9;
      }
      // kullanici kontrolu: joystick varsa hedef o yondedir; baski tusu basiliysa tasiyiciya kosar
      const ctl = st.control[s];
      if (ctl && ctl.player === p && !inPoss) {
        const inp = ctl.input;
        const mag = hyp(inp.mx, inp.my);
        if (inp.press && carrier) { tx = carrier.x; ty = carrier.y; urg = 1; }
        else if (mag > 0.15) {
          const k = Math.min(1, mag);
          tx = p.x + (inp.mx / mag) * 6 * k; ty = p.y + (inp.my / mag) * 6 * k;
          urg = (inp.sprint ? 1.0 : 0.78) * k;
          if (inp.sprint) p.k = Math.max(0, p.k - 0.03 * st.dt * 6);
        }
      }
      // yarisi kaybeden savunmaci kisa sure yavas
      if (p.beatenUntil !== undefined && st.t < p.beatenUntil) urg = Math.min(urg, 0.35);
      // yeniden baslatmada rakip topa 9,15 m'den fazla yaklasamaz
      if (deadBall && carrier && carrier.side !== s) {
        const dbx = p.x - st.ball.x, dby = p.y - st.ball.y;
        const db = hyp(dbx, dby);
        const dt2 = hyp(tx - st.ball.x, ty - st.ball.y);
        if (db < 9.15 || dt2 < 9.15) {
          const nx = db > 0.1 ? dbx / db : (eff(s) === 0 ? -1 : 1), ny = db > 0.1 ? dby / db : 0;
          tx = st.ball.x + nx * 9.6;
          ty = st.ball.y + ny * 9.6;
          urg = 0.8;
        }
      }
      const sp = p.speedBase * kf(p.k) * urg;
      const dx = tx - p.x;
      const dy = ty - p.y;
      const d = hyp(dx, dy);
      if (d > 0.01) {
        const step = Math.min(d, sp * dt);
        moves.set(p, [p.x + (dx / d) * step, p.y + (dy / d) * step]);
      }
      face(p, st.ball.x - p.x, st.ball.y - p.y, 0.3);
    }
  }
  for (const [p, [x, y]] of moves) {
    p.x = x;
    p.y = y;
  }
}

// futbolcular birbirinin icine girmez
function separate(st: MatchState) {
  // Jacobi: once tum itmeler hesaplanir, sonra birlikte uygulanir (sira/yan bagimsiz)
  const ps = st.players;
  const minD = P.sepD;
  const sameD = P.sepD;
  const mx = new Array(ps.length).fill(0), my = new Array(ps.length).fill(0);
  for (let i = 0; i < ps.length; i++) {
    const a = ps[i];
    if (a.off) continue;
    for (let j = i + 1; j < ps.length; j++) {
      const b = ps[j];
      if (b.off) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d >= (a.side === b.side ? sameD : minD)) continue;
      // top sahibi ile rakibi arasinda itme yok: mudahale/omuz omuza mucadele temasi gerekir
      if (a.side !== b.side && (st.owner === a || st.owner === b)) continue;
      let nx: number, ny: number;
      if (d > 0.01) { nx = dx / d; ny = dy / d; }
      else if (a.side !== b.side) { nx = eff(a.side) === 0 ? 1 : -1; ny = 0; } // herkes kendi kalesine dogru
      else { nx = 0; ny = 1; }
      const push = ((a.side === b.side ? sameD : minD) - d) / 2;
      const wa = st.owner === a ? 0.3 : 1;
      const wb = st.owner === b ? 0.3 : 1;
      mx[i] -= nx * push * wa; my[i] -= ny * push * wa;
      mx[j] += nx * push * wb; my[j] += ny * push * wb;
    }
  }
  for (let i = 0; i < ps.length; i++) { ps[i].x += mx[i]; ps[i].y += my[i]; }
  if (st.owner) ballAt(st, st.owner);
}

// ---------- Mac ici taktik degisikligi, durum taktikleri, rakibi okuma ----------
// Taktik degisikligi hemen uygulanir; 5 oyun dakikasi uyum suresi boyunca T -10. Mac basina en fazla 3 degisiklik.
export function setTactic(st: MatchState, side: 0 | 1, patch: Partial<TacticIn>, formation?: Formation): boolean {
  if (st.tacticChanges[side] >= 3) return false;
  const t = st.teams[side];
  t.tactic = { ...t.tactic, ...patch };
  if (formation && formation !== t.formation) {
    t.formation = formation;
    const form = FORMATIONS[formation];
    const pos = FORM_POS[formation];
    for (const p of st.players) {
      if (p.side !== side || p.off || p.idx >= 11) continue;
      if (p.pos === 'GK' || pos[p.idx] === 'GK') continue;
      p.ax = form[p.idx][0];
      p.ay = form[p.idx][1];
      p.pos = pos[p.idx];
    }
  }
  st.tacticChanges[side]++;
  st.adaptUntil[side] = st.clock + P.adaptMin * 60;
  st.events.push({ t: st.clock, type: 'tactic', side, text: formation ?? '' });
  return true;
}
// durum taktikleri: kosul tutunca yedek taktige gecis (bot ve otomatik kullanim)
function situational(st: MatchState) {
  const minute = st.clock / 60;
  for (const side of [0, 1] as const) {
    const rules = st.teams[side].situational;
    if (!rules) continue;
    const gf = st.stats[side].goals, ga = st.stats[1 - side].goals;
    rules.forEach((r, i) => {
      if (st.sitUsed[side][i] || minute < r.fromMinute) return;
      const ok = r.when === 'any' || (r.when === 'leading' && gf > ga) || (r.when === 'trailing' && gf < ga) || (r.when === 'drawing' && gf === ga);
      if (!ok) return;
      st.sitUsed[side][i] = true;
      setTactic(st, side, r.tactic ?? {}, r.formation);
    });
  }
}
// rakibi okuma: her 15 oyun dakikasinda baskin atak yonu ve en tehlikeli oyuncu; dogruluk T/100 (bot: sabit)
function readOpponent(st: MatchState) {
  for (const side of [0, 1] as const) {
    const opp = (1 - side) as 0 | 1;
    // baskin atak yonu: rakibin hucum ucuncu bolgeye girisleri (sol/orta/sag), rakibin cercevesinde
    const z = st.zoneEntries[opp];
    const tot = z[0] + z[1] + z[2];
    let bias = 0;
    if (tot >= 6) {
      const L = z[0] / tot, R = z[2] / tot;
      const i = L >= 0.45 && L >= R + 0.15 ? 0 : R >= 0.45 && R >= L + 0.15 ? 2 : 1;
      if (i !== 1) {
        // rakibin cercevesindeki kanat, bizim cercevemizde hangi tarafa dusuyor
        const [wx, wy] = fromFrame(opp, 80, i === 0 ? 12 : 56);
        const [, oy] = toFrame(side, wx, wy);
        bias = oy < 34 ? -1 : 1;
      }
    }
    // en tehlikeli oyuncu: birikmis xG; hizli ise hat geri ceker, degilse en yakin stoper siki markaja alir
    const px = st.playerXg[opp];
    let danger: PState | null = null, best = 0;
    for (const num in px) if (px[num] > best) { best = px[num]; danger = st.players.find((p) => p.side === opp && p.num === +num && !p.off) ?? null; }
    const dropLine = !!danger && danger.traits.includes('Hızlı') && best >= 0.25;
    const mark = !!danger && !dropLine && best >= 0.3 && danger.pos !== 'GK' ? danger.num : undefined;
    if (bias === 0 && !dropLine && mark === undefined) { st.reads[side] = null; continue; }
    const acc = st.teams[side].ai?.readAcc ?? tEff(st, side) / 100;
    if (st.rng() < acc) {
      st.reads[side] = { bias, dropLine, mark, until: st.clock + P.readEvery * 60 };
      st.events.push({ t: st.clock, type: 'adjust', side, player: danger?.num, text: bias < 0 ? 'left' : bias > 0 ? 'right' : dropLine ? 'line' : 'mark' });
    } else st.reads[side] = null;
  }
}

// ---------- Oyuncu degisikligi ve sakatlik ----------
// Degisiklik istegi: ilk olu topta uygulanir. (Gercek oyunda kirmizi kart ve sakatlikta kisa duraklama ile kullaniciya sorulur; burada otomatik kural.)
function requestSub(st: MatchState, side: 0 | 1, out: PState, reason: string): boolean {
  if (st.subsLeft[side] <= 0 || st.subQueue.some((q) => q.out === out)) return false;
  const bench = st.bench[side].filter((b) => b.off && !b.subbed);
  if (bench.length === 0) return false;
  let inn: PState | undefined;
  if (out.pos === 'GK' || reason === 'gk') inn = bench.find((b) => b.pos === 'GK');
  if (!inn) inn = bench.find((b) => b.pos === out.pos && b.pos !== 'GK') ?? bench.find((b) => b.pos !== 'GK');
  if (!inn) return false;
  st.subQueue.push({ side, out, inn, reason });
  return true;
}
function applySubs(st: MatchState, halfTime = false) {
  const opened: boolean[] = [false, false];
  const keep: typeof st.subQueue = [];
  while (st.subQueue.length) {
    const q = st.subQueue.shift()!;
    if (q.out.off || st.subsLeft[q.side] <= 0) continue;
    // devre arasi haric her kesintideki degisiklikler bir pencere kullanir; pencere kalmadiysa bekler
    if (!halfTime && !opened[q.side]) {
      if (st.subWindowsLeft[q.side] <= 0) { keep.push(q); continue; }
      st.subWindowsLeft[q.side]--;
      opened[q.side] = true;
    }
    st.subsLeft[q.side]--;
    st.stats[q.side].subs++;
    const o = q.out, n = q.inn;
    // giren oyuncu cikanin yerini (mevki ve saha konumu) alir; kaleci degisikliginde kale konumu
    n.off = false;
    n.ax = q.reason === 'gk' ? 4 : o.ax;
    n.ay = q.reason === 'gk' ? 34 : o.ay;
    n.idx = o.idx;
    if (q.reason !== 'gk') n.pos = o.pos === 'GK' ? 'GK' : o.pos;
    const [ex, ey] = fromFrame(n.side, 52.5, o.y < W / 2 ? 0.5 : W - 0.5);
    n.x = ex;
    n.y = ey;
    o.off = true;
    o.subbed = true;
    o.x = -10;
    o.y = -10;
    if (st.owner === o) st.owner = n;
    st.players.push(n);
    st.events.push({ t: st.clock, type: 'sub', side: q.side, player: n.num, player2: o.num, text: q.reason });
    say(st, 'sub', q.side, n, o);
    st.extra[st.half - 1] += 0.5;
  }
  st.subQueue.push(...keep);
}
// otomatik degisiklik kurali: kaleci yoksa yedek kaleci; sakat oyuncu; 60. dakikadan sonra tukenen oyuncu
function autoSubs(st: MatchState) {
  for (const side of [0, 1] as const) {
    if (st.subsLeft[side] <= 0) continue;
    const live = liveTeam(st, side);
    const hasGk = live.some((p) => p.pos === 'GK' && !p.emergencyGk);
    if (!hasGk && st.bench[side].some((b) => b.off && !b.subbed && b.pos === 'GK')) {
      // kaleci atildi: en dusuk guclu saha oyuncusu cikar, yedek kaleci girer
      const cands = live.filter((p) => !p.emergencyGk).sort((a, b) => a.egBase - b.egBase);
      const emerg = live.find((p) => p.emergencyGk);
      const out = emerg ?? cands[0];
      if (out && requestSub(st, side, out, 'gk')) continue;
    }
    const inj = live.find((p) => p.injured && !st.subQueue.some((q) => q.out === p));
    if (inj && requestSub(st, side, inj, 'injury')) continue;
    // yorgunluk degisikligi: son pencere acil durumlar icin saklanir
    if (st.clock >= 60 * 60 && st.subsLeft[side] > 1 && st.subWindowsLeft[side] > 1) {
      const tired = live.filter((p) => p.pos !== 'GK' && p.k < P.subTiredK && !st.subQueue.some((q) => q.out === p)).sort((a, b) => a.k - b.k)[0];
      if (tired) requestSub(st, side, tired, 'tired');
    }
  }
}
// sakatlik: her oyun dakikasi kondisyona bagli risk (Metrik sekmesi)
function injuryRoll(st: MatchState) {
  const minute = Math.floor(st.clock / 60);
  if (minute <= st.minuteMark) return;
  st.minuteMark = minute;
  situational(st);
  if (minute > 0 && minute % P.readEvery === 0 && minute < 90) readOpponent(st);
  for (const p of st.players) {
    if (p.off || p.injured) continue;
    const r = p.k >= 60 ? P.injuryRisk[0] : p.k >= 40 ? P.injuryRisk[1] : p.k >= 20 ? P.injuryRisk[2] : P.injuryRisk[3];
    if (st.rng() < r) {
      p.injured = true;
      p.speedBase *= 0.55;
      p.egBase *= 0.7;
      st.stats[p.side].injuries++;
      st.events.push({ t: st.clock, type: 'injury', side: p.side, player: p.num });
      st.extra[st.half - 1] += 1;
      addFx(st, p.x, p.y, 'foul');
      say(st, 'injury', p.side, p);
      // oyun durur; top ayni takimda kalir
      if (!st.pending && !st.celebrate) deadTime(st, 6 + st.rng() * 4, 'Sakatlık');
      st.keyUntil = st.t + 2;
      return;
    }
  }
}

function addFx(st: MatchState, x: number, y: number, kind: FxKind, at?: number) {
  st.fx.push({ t: at ?? st.t, x, y, kind });
  if (st.fx.length > 16) st.fx.shift();
}
// anlatim kaydi; ayni ikili icin kisa surede tekrar yazilmaz
function say(st: MatchState, k: LogEntry['k'], s: 0 | 1, a?: PState | null, b?: PState | null, c?: PState | null) {
  const last = st.log[st.log.length - 1];
  if (last && last.k === k && last.a === a?.num && last.s === s && st.clock - last.t < 20) return;
  st.log.push({ t: st.clock, k, s, a: a?.num, b: b?.num, c: c?.num, bs: b?.side, gk: a?.pos === 'GK' || b?.pos === 'GK' || undefined });
  if (st.log.length > 400) st.log.shift();
}

// ---------- Ana adim ----------
export function step(st: MatchState) {
  if (st.done) return;
  FLIP = st.half % 2 === 0;
  const dt = st.dt;
  st.t += dt;
  st.clock += dt;
  // kondisyon
  // saat fiziksel zamandan hizli akar; yorgunluk saate gore islenir
  const dc = dt * P.clockRate;
  st.clock += dc - dt;
  st.hclock += dc;
  for (const p of st.players) if (!p.off) p.k = Math.max(0, p.k - (p.kDrop * dc) / 60);
  injuryRoll(st);

  if (st.owner) st.stats[st.owner.side].possTicks++;
  // hucum ucuncu bolgeye giris sayaci (rakibi okuma icin): top sahibi 70 m cizgisini gecince bolge kaydedilir
  if (st.owner) {
    const os = st.owner.side;
    const [oxf, oyf] = toFrame(os, st.owner.x, st.owner.y);
    const inThird = oxf >= 70;
    if (inThird && !st.lastThird[os]) st.zoneEntries[os][oyf < 23 ? 0 : oyf > 45 ? 2 : 1]++;
    st.lastThird[os] = inThird;
    st.lastThird[1 - os] = false;
  }
  else st.stats[st.lastPossSide].possTicks++;

  userStep(st);
  updateAnchorsAndMove(st);
  separate(st);

  if (st.celebrate && st.t >= st.celebrate.until) {
    // sevinc bitti: top santraya
    st.celebrate = null;
    st.ball.x = L / 2;
    st.ball.y = W / 2;
  }
  if (st.pending && !st.flight) {
    if (st.t >= st.pending.at) {
      const pd = st.pending;
      st.pending = null;
      execPending(st, pd);
    }
  } else if (st.flight) {
    resolveFlight(st);
  } else if (st.owner) {
    carrierAct(st);
  } else {
    // sahipsiz top: en yakin oyuncu alir
    let best: PState | null = null;
    let bd = 1e9;
    // esit mesafede taraf sirasi avantaj olmasin: kucuk rastgele pay
    for (const p of st.players) {
      if (p.off) continue;
      const d = hyp(p.x - st.ball.x, p.y - st.ball.y) + st.rng() * 0.4;
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    if (best && bd < 2.2) {
      giveBall(st, best, 0.5);
    }
  }

  // yari sonu: ucustaki top ve bekleyen duran top (penalti, korner, serbest vurus) tamamlanmadan yari bitmez
  if (st.hclock >= st.halfEnd && !st.flight && !(st.pending && st.pending.kind !== 'kickoff')) {
    st.pending = null;
    st.celebrate = null;
    st.deadReason = '';
    if (st.half === 1 || (st.knockout && st.half < 4 && (st.half === 3 || st.stats[0].goals === st.stats[1].goals))) {
      // ikinci yari ya da (kupa, esitlik) uzatma yarilari
      const nextHalf = (st.half + 1) as 1 | 2 | 3 | 4;
      if (st.half === 2) {
        st.events.push({ t: st.clock, type: 'extra', side: 0 });
        st.subsLeft[0]++; st.subsLeft[1]++; st.subWindowsLeft[0]++; st.subWindowsLeft[1]++;
      } else st.events.push({ t: st.clock, type: 'half', side: 0 });
      st.half = nextHalf;
      FLIP = nextHalf % 2 === 0;
      st.t = 0;
      st.nextDec = 0;
      st.hclock = 0;
      st.keyUntil = 0;
      st.deadStart = 0;
      st.restartUntil = 0;
      st.holdUntil = 0;
      st.lastTurnoverT = -99;
      st.lastRestartT = -99;
      st.halfEnd = st.half >= 3 ? 15 * 60 : 45 * 60; // uzatma 89. dakikada o ana kadarki olaylardan belirlenir
      // devre arasi: kondisyon biraz toparlanir; bekleyen degisiklikler yapilir
      for (const p of st.players) p.k = Math.min(100, p.k + (st.half >= 3 ? 2 : 4));
      autoSubs(st);
      applySubs(st, true);
      kickoff(st, (st.half % 2 === 0 ? 1 : 0) as 0 | 1);
    } else {
      if (st.knockout && st.half === 4 && st.stats[0].goals === st.stats[1].goals) shootout(st);
      st.events.push({ t: st.clock, type: 'end', side: 0 });
      st.done = true;
    }
  }
  if (st.half <= 2 && st.hclock >= 44 * 60 && st.halfEnd === 45 * 60) {
    st.halfEnd = 45 * 60 + (st.half === 1 ? extraSeconds(st.extra[0], 1, 3) : extraSeconds(st.extra[1], 3, 7));
  }
  if (st.half >= 3 && st.hclock >= 14 * 60 && st.halfEnd === 15 * 60) st.halfEnd = 15 * 60 + extraSeconds(st.extra[st.half - 1], 1, 2);
}

// penalti atislari: 5'er atis, esitlikte tek tek; animasyonsuz, olay olarak kaydedilir
function shootout(st: MatchState) {
  // atis sirasi: Bitirici, sonra mevki (forvet > kanat > orta saha > bek > stoper), esitlikte guncel etkin guc
  const rank: Record<Pos, number> = { ST: 5, W: 4, CM: 3, DM: 2, FB: 1, CB: 0, GK: -1 };
  const order = (side: 0 | 1) => liveTeam(st, side).filter((p) => p.pos !== 'GK').sort((a, b) => (b.traits.includes('Bitirici') ? 1 : 0) - (a.traits.includes('Bitirici') ? 1 : 0) || rank[b.pos] - rank[a.pos] || eg(b) - eg(a));
  const takers: [PState[], PState[]] = [order(0), order(1)];
  const score: [number, number] = [0, 0];
  const taken: [number, number] = [0, 0];
  const first: 0 | 1 = st.rng() < 0.5 ? 0 : 1;
  for (let round = 0; round < 30; round++) {
    for (const k of [0, 1]) {
      const side = ((first + k) % 2) as 0 | 1;
      const opp = (1 - side) as 0 | 1;
      const kicker = takers[side][taken[side] % Math.max(1, takers[side].length)];
      const keeper = gk(st, opp);
      const q = keeper ? Math.exp(P.shotSlope * Math.log(eg(kicker) / eg(keeper))) : 1;
      const p = clamp(P.penaltyP * q * (kicker.traits.includes('Bitirici') ? 1.05 : 1) * (keeper && keeper.traits.includes('Refleks') ? 0.95 : 1), 0.4, 0.95);
      const goal = st.rng() < p;
      taken[side]++;
      if (goal) score[side]++;
      st.events.push({ t: st.clock, type: 'shootout', side, player: kicker.num, text: goal ? 'goal' : 'miss' });
      // 5 atis icinde erken bitis / sonrasinda tek tek
      const rem0 = Math.max(0, 5 - taken[0]), rem1 = Math.max(0, 5 - taken[1]);
      if (taken[0] >= 5 && taken[1] >= 5) {
        if (taken[0] === taken[1] && score[0] !== score[1]) { st.shootout = score; return; }
      } else if (score[0] > score[1] + rem1 || score[1] > score[0] + rem0) { st.shootout = score; return; }
    }
  }
  st.shootout = score;
}

function extraSeconds(minutes: number, lo: number, hi: number): number {
  return Math.round(clamp(minutes, lo, hi)) * 60;
}

function deadTime(st: MatchState, sec: number, reason = '') {
  st.deadReason = reason;
  st.restartKind = reason === 'Taç' ? 'throw' : reason === 'Aut' ? 'goalkick' : reason === 'Korner' ? 'corner' : reason === 'Kaleci aldı' ? 'gk' : reason ? 'fk' : '';
  st.deadStart = st.t;
  // top oyun disinda: bu surede aksiyon olmaz, oyuncular sekle doner
  st.restartUntil = Math.max(st.restartUntil, st.t + sec);
  st.holdUntil = Math.max(st.holdUntil, st.t + sec);
  if (reason && reason !== 'GOL' && reason !== 'Kaleci aldı') st.lastRestartT = st.restartUntil;
  // olu top: bekleyen degisiklikler uygulanir
  autoSubs(st);
  if (st.subQueue.length) {
    applySubs(st);
    st.restartUntil = Math.max(st.restartUntil, st.t + 3);
    st.holdUntil = Math.max(st.holdUntil, st.restartUntil);
  }
}

function giveBall(st: MatchState, p: PState, hold: number) {
  if (st.owner && st.owner !== p && st.owner.thruT !== undefined && st.t - st.owner.thruT < 8) { dbg(p.side === st.owner.side ? 'arapas_sonrasi_pasla' : 'arapas_sonrasi_kayip'); st.owner.thruT = undefined; }
  if (p.side !== st.lastPossSide) {
    st.stats[p.side].turnovers++;
    st.lastTurnoverT = st.t;
  }
  st.owner = p;
  st.flight = null;
  st.dribbling = false;
  st.nextDec = st.t + 0.5;
  const ctlG = st.control[p.side];
  if (ctlG) ctlG.holdStart = st.t;
  ballAt(st, p);
  st.lastPossSide = p.side;
  // tempo: hizli tempoda top daha az tutulur (daha cok aksiyon), yavas tempoda daha uzun
  st.holdUntil = st.t + hold * P.tempoHold[st.teams[p.side].tactic.tempo];
}

// ---------- Top tasiyici kararlari ----------
function carrierAct(st: MatchState) {
  const c = st.owner!;
  const side = c.side;
  const team = st.teams[side];
  const opp: 0 | 1 = side === 0 ? 1 : 0;
  ballAt(st, c);
  const [cxf, cyf] = toFrame(side, c.x, c.y);
  const press = pressureOn(st, c, c.x, c.y);

  // savunma mudahalesi (kaleci kendi ceza sahasinda topu elinde tutarken mudahale edilemez)
  const gkHolding = c.pos === 'GK' && cxf < 16.5 && Math.abs(cyf - 34) < 20.16;
  if (st.t >= st.restartUntil && !gkHolding) {
    const def = nearestOpp(st, c);
    // mudahale menzili: kaba adimda (0,5 s) savunmaci adim icinde tasiyiciya yetisiyordu; ince adimda ayni erisim
    // zamana gore verilir (0,5 s icinde ulasabilecegi mesafe), deneme olasiligi adim suresiyle olceklenir
    const reach = 1.6 + (def ? def.p.speedBase * kf(def.p.k) * 0.9 * P.reachT * Math.max(0, 0.5 - st.dt) / 0.4 : 0);
    if (def && def.d < reach && !def.p.injured && !(def.p.beatenUntil !== undefined && st.t < def.p.beatenUntil)) {
      if (def.p.pos === 'GK') {
        // kaleci ceza sahasinda topa cikar: alirsa elinde tutar, alamazsa gecilmistir
        const [gxf, gyf] = toFrame(def.p.side, def.p.x, def.p.y);
        if (gxf < 16.5 && Math.abs(gyf - 34) < 20.16 && st.rng() < P.gkSmother * (st.dt / 0.5)) {
          st.stats[opp].duels++;
          if (st.rng() < duelWin(eg(def.p), eg(c) * dribbleSkill(c)) + P.gkSmotherBonus) {
            dbg('kaleci_aldi');
            addFx(st, c.x, c.y, 'save');
            say(st, 'claim', opp, def.p, c);
            giveBall(st, def.p, 2.5);
            deadTime(st, 2.5 + st.rng() * 1.5, 'Kaleci aldı');
            st.restartKind = 'gk';
          } else {
            dbg('kaleci_gecildi');
            def.p.beatenUntil = st.t + 1.2;
            addFx(st, c.x, c.y, 'clean');
            say(st, 'dribble', side, c, def.p);
            st.holdUntil = st.t;
            dribbleMove(st, c, 1);
          }
          return;
        }
      } else {
        const oppT = st.teams[opp];
        const [dxf] = toFrame(def.p.side, def.p.x, def.p.y);
        const nearOwnGoal = dxf < 35 ? 1 + (35 - dxf) / 35 : 1;
        // arkadan gelen mudahale: daha az denenir, daha cok faul olur
        const behind = toFrame(side, def.p.x, def.p.y)[0] < cxf + 0.3; // arkadan ya da yandan
        // adim basina olasilik: adim suresine gore olceklenir (oynanan macta motor daha sik adimlar)
        const attempt = (P.tackleBase + 0.04 * oppT.tactic.press) * nearOwnGoal * (behind ? P.behindTry : 1) * (st.dt / 0.5) * (1 + P.fineAtt * Math.max(0, 0.5 - st.dt) / 0.4);
        if (st.rng() < attempt) {
          tackle(st, def.p, c, behind);
          return;
        }
      }
    }
  }

  if (st.t < st.restartUntil) return;
  // kullanici kontrolundeki tasiyici: karar motoru devreden cikar, joystick ve butonlar yonetir
  const ctlC = st.control[side];
  if (ctlC && ctlC.player === c) { userCarrier(st, c, ctlC); return; }
  // ilk dokunus / tutma: baski varsa topu korur, yogun baskida hizli birakir
  // hizli birakma penceresi: kaba adimda pencereye ortalama 0,25 s gec girilirdi; ince adimda ayni gecikme verilir
  const quick = press > 0.8 && st.t >= st.holdUntil - 1.0 + 0.5 * Math.max(0, 0.5 - st.dt);
  if ((st.t < st.holdUntil && !quick) || st.t < st.nextDec - 1e-6) {
    if (st.dribbling) dribbleMove(st, c, 1);
    else shieldMove(st, c);
    return;
  }
  st.nextDec = st.t + 0.5;
  aiDecide(st, c);
}

// yapay zeka tasiyici karari: sut / pas / ara pas / top surme (beklenen deger + hata payi)
function aiDecide(st: MatchState, c: PState) {
  const side = c.side;
  const team = st.teams[side];
  const opp: 0 | 1 = side === 0 ? 1 : 0;
  const [cxf, cyf] = toFrame(side, c.x, c.y);
  const press = pressureOn(st, c, c.x, c.y);
  // secenekler
  const noiseSigma = P.noise * (0.7 - (0.3 * (team.U - 60)) / 100) * (1 + press) * (team.ai?.noiseMult ?? 1);
  let bestEV = -1e9;
  let bestAct: { kind: 'shot' | 'pass' | 'dribble' | 'through'; target?: PState; p?: number; tx?: number; ty?: number } = { kind: 'dribble' };

  // kaleciyle karsi karsiya mi: onunde (kaleci haric) rakip yok, kaleye 30 m'den yakin
  const keeperO = gk(st, opp);
  const gkxfC = keeperO ? toFrame(side, keeperO.x, keeperO.y)[0] : 105;
  const gkDist = keeperO ? hyp(keeperO.x - c.x, keeperO.y - c.y) : 99;
  const oneOnOne = cxf > 72 && !st.players.some((o) => {
    if (o.side === side || o.off || o.pos === 'GK') return false;
    const [oxf, oyf] = toFrame(side, o.x, o.y);
    return oxf > cxf - 0.5 && Math.abs(oyf - cyf) < 5 + (oxf - cxf) * 0.4 && hyp(o.x - c.x, o.y - c.y) < 14;
  });

  // sut
  const distGoal = hyp(105 - cxf, 34 - cyf);
  let shotM: ReturnType<typeof shotModel> | null = null;
  if (distGoal < 32) {
    shotM = shotModel(st, c, cxf, cyf, press, oneOnOne);
    const ev = shotM.xg * P.shotW + P.shotBias + gauss(st.rng) * noiseSigma;
    if ((shotM.raw >= P.minShotXg || oneOnOne) && ev > bestEV) {
      bestEV = ev;
      bestAct = { kind: 'shot' };
    }
  }

  // paslar
  const mates = liveTeam(st, side).filter((p) => p !== c);
  const curOppThreat = threat(105 - cxf, 68 - cyf);
  const offLine0 = offsideLine(st, side);
  for (const m of mates) {
    const d = hyp(m.x - c.x, m.y - c.y);
    if (d < 4 || d > 55) continue;
    const [mxf, myf] = toFrame(side, m.x, m.y);
    if (m.pos === 'GK' && mxf > 20) continue;
    if (mxf > offLine0 + 0.3) continue; // ofsaytta olana pas verilmez
    const ps = passSuccess(st, c, m.x, m.y, d);
    const recvPress = pressureOn(st, m, m.x, m.y, 4);
    const v = threat(mxf, myf) * (1 - 0.25 * recvPress);
    const lossV = threat(105 - mxf, 68 - myf);
    let ev = ps * v - (1 - ps) * lossV;
    // stil: kisa pas uzun pasi sevmez, direkt ileri pasi sever
    if (team.tactic.style === 0 && d > 25) ev -= 0.004 * (d - 25) / 10;
    if (team.tactic.style === 2) ev += 0.0004 * Math.max(0, mxf - cxf);
    // tempo: hizli tempo gecis aninda (kontra) ileriyi sever, yavas tempo guvenligi
    if (team.tactic.tempo === 2 && st.t - st.lastTurnoverT < P.transWin) ev += 0.0006 * Math.max(0, mxf - cxf);
    if (team.tactic.tempo === 0) ev += 0.004 * (ps - 0.85);
    ev += gauss(st.rng) * noiseSigma;
    if (ev > bestEV) {
      bestEV = ev;
      bestAct = { kind: 'pass', target: m, p: ps };
    }
  }

  // ara paslar
  let thru: ReturnType<typeof throughOptions>[number] | null = null;
  for (const o of throughOptions(st, c, mates)) {
    const ps = o.path * o.race * (1 - o.off);
    let ev = ps * threat(o.vxf, o.tyf) * P.thruV - (1 - ps) * threat(105 - o.txf, 68 - o.tyf);
    if (team.tactic.style === 0) ev -= 0.003;
    if (team.tactic.style === 2) ev += 0.002;
    ev += gauss(st.rng) * noiseSigma;
    if (ev > bestEV) {
      bestEV = ev;
      bestAct = { kind: 'through' };
      thru = o;
    }
  }

  // top surme
  {
    let keep = 0.97;
    for (const o of frontDefenders(st, c)) keep *= 1 - P.takeOnK * duelWin(eg(o.p), eg(c) * dribbleSkill(c)) * (1 - o.d / 3);
    // onu bossa top surmek daha fazla alan kazandirir (kontra / ara pas sonrasi)
    const openAhead = !st.players.some((o) => o.side !== side && !o.off && o.pos !== 'GK' && toFrame(side, o.x, o.y)[0] > cxf - 1 && hyp(o.x - c.x, o.y - c.y) < 10);
    let nx = Math.min(104, cxf + (openAhead ? P.openGain : 4));
    const ny = cyf + (34 - cyf) * 0.08;
    let v = threat(nx, ny);
    if (oneOnOne) {
      // kaleciyle karsi karsiya: kaleci uzaktaysa topu surup yaklasmak, yakinsa vurmak dogru
      nx = Math.min(nx, gkxfC - 4);
      v = gkDist > 6.5 && nx > cxf + 2 ? 0.8 * Math.min(P.maxShotP, baseXg(nx, ny) * P.oneOnOne * P.xgScale) * P.shotW : threat(nx, ny) * 0.5;
    }
    let ev = keep * v - (1 - keep) * curOppThreat;
    if (team.tactic.tempo === 0) ev += 0.002;
    if (c.pos === 'GK') ev -= 0.05; // kaleci top surmez, hemen oynar
    ev += gauss(st.rng) * noiseSigma;
    if (ev > bestEV) {
      bestEV = ev;
      bestAct = { kind: 'dribble' };
    }
  }

  dbg('karar_' + bestAct.kind + (cxf > 70 ? '_hucum' : ''));
  const restartKind = st.restartKind;
  st.restartKind = '';
  if (c.thruT !== undefined && st.t - c.thruT < 6) { if (bestAct.kind !== 'dribble') { dbg('arapas_sonrasi_' + bestAct.kind); if (bestAct.kind === 'shot' && shotM) { DBG.arapas_sut_xg = (DBG.arapas_sut_xg ?? 0) + shotM.xg; DBG.arapas_sut_x = (DBG.arapas_sut_x ?? 0) + cxf; DBG.arapas_sut_gkd = (DBG.arapas_sut_gkd ?? 0) + gkDist; DBG.arapas_sut_1v1 = (DBG.arapas_sut_1v1 ?? 0) + (oneOnOne ? 1 : 0); DBG.arapas_sut_blk = (DBG.arapas_sut_blk ?? 0) + shotM.pBlock; } c.thruT = undefined; } if ((globalThis as any).TR2) (globalThis as any).TR2.push({ cxf: +cxf.toFixed(1), cyf: +cyf.toFixed(1), one: oneOnOne, gkD: +gkDist.toFixed(1), act: bestAct.kind, near: +(nearestOpp(st, c)?.d ?? 0).toFixed(1), front: frontDefenders(st, c).length, press: +press.toFixed(2), xg: shotM ? +shotM.xg.toFixed(3) : -1 }); }
  if (bestAct.kind === 'shot') shoot(st, c, cxf, cyf, press, false, undefined, {}, shotM!);
  else if (bestAct.kind === 'pass') {
    // cizgiye yakin forvete ileri pas: zamanlama tutmazsa ofsayt
    const m = bestAct.target!;
    const [mxf] = toFrame(side, m.x, m.y);
    // tac ve auttan ofsayt olmaz
    if (restartKind !== 'throw' && restartKind !== 'goalkick' && (m.pos === 'ST' || m.pos === 'W') && mxf > cxf + 3 && mxf > offLine0 - 1.5) {
      const tr = st.teams[opp].tactic.trap ? P.trapOff * (st.teams[opp].T / 60) : 0;
      if (st.rng() < (P.runsOff[team.tactic.runs ?? 1] + tr) * P.passOff) return callOffside(st, c, m);
    }
    makePass(st, c, m, bestAct.p!);
  }
  else if (bestAct.kind === 'through') throughBall(st, c, thru!, restartKind === 'throw' || restartKind === 'goalkick');
  else {
    // onunde savunmaci varsa birebir: gecerse ilerler, gecemezse top kaybi
    const front = frontDefenders(st, c);
    if (front.length > 0 && st.t >= st.restartUntil) {
      dbg('birebir');
      let pWin = 1;
      for (const o of front) pWin *= 1 - P.takeOnK * duelWin(eg(o.p), eg(c) * dribbleSkill(c)) * (1 - o.d / 3);
      if (st.rng() >= pWin) {
        dbg('birebir_kayip');
        const o = front[0].p;
        const Pp = [0.8, 1.0, 1.3][st.teams[o.side].tactic.press];
        const inBoxC = cxf > 88.5 && Math.abs(toFrame(c.side, c.x, c.y)[1] - 34) < 20.16;
        if (st.rng() < P.foulBase * P.takeOnFoul * Pp * (1 + 0.6 * (1 - o.k / 100)) * (inBoxC ? P.inBoxFoul : 1)) {
          st.stats[o.side].duels++;
          foul(st, o, c, cxf);
          return;
        }
        st.stats[o.side].duels++;
        addFx(st, c.x, c.y, 'clean');
        say(st, 'tackle', o.side, o, c);
        giveBall(st, o, 0.8);
        return;
      }
      if (front[0].d < 2) {
        // calim: gecilen savunmaci kisa sure geride kalir, tasiyici yandan sıyrılır
        const o = front[0].p;
        o.beatenUntil = st.t + 0.8;
        addFx(st, c.x, c.y, 'skill');
        say(st, 'dribble', c.side, c, o);
        const [cx0, cy0] = toFrame(c.side, c.x, c.y);
        const [ox0, oy0] = toFrame(c.side, o.x, o.y);
        const [nx0, ny0] = fromFrame(c.side, cx0 + 1.2, cy0 + (cy0 >= oy0 ? 1.5 : -1.5));
        c.x = nx0;
        c.y = ny0;
        ballAt(st, c);
      }
    }
    dribbleMove(st, c, 1);
    st.dribbling = true;
    st.holdUntil = st.t + 0.5;
  }
}

// ---------- Kullanici kontrolu: API ----------
export function setControl(st: MatchState, side: 0 | 1, mode: 'none' | 'team', assistPass: 0 | 1 | 2 = 2, assistShot: 0 | 1 | 2 = 2) {
  if (mode === 'none') { st.control[side] = null; return; }
  st.control[side] = { mode: 'team', player: null, input: { mx: 0, my: 0, sprint: false, press: false }, actAt: -9, assistPass, assistShot, cooldown: 0, switchCd: 0, holdStart: 0, lastInputT: 0, duelUntil: new Map() };
  pickControlled(st, side);
}
export function setInput(st: MatchState, side: 0 | 1, input: UserInput) {
  const ctl = st.control[side];
  if (!ctl) return;
  const act = input.act;
  ctl.input = { mx: input.mx, my: input.my, sprint: input.sprint, press: input.press, act: act ?? ctl.input.act, power: input.power ?? ctl.input.power };
  if (act) ctl.actAt = st.t;
  if (act || hyp(input.mx, input.my) > 0.15) ctl.lastInputT = st.t;
}
export function controlledPlayer(st: MatchState, side: 0 | 1): PState | null { return st.control[side]?.player ?? null; }
// kontrol edilen futbolcu: topa sahipken tasiyici, pas ucustayken alici, savunmada topa en yakin saha oyuncusu
function pickControlled(st: MatchState, side: 0 | 1, exclude?: PState | null) {
  const ctl = st.control[side]!;
  if (st.owner && st.owner.side === side) { ctl.player = st.owner; return; }
  if (st.flight && st.flight.receiver && st.flight.receiver.side === side) { ctl.player = st.flight.receiver; return; }
  const bx = st.flight ? st.flight.toX : st.ball.x, by = st.flight ? st.flight.toY : st.ball.y;
  let best: PState | null = null, bd = 1e9;
  for (const q of liveTeam(st, side)) {
    if (q.pos === 'GK' || q === exclude || q.injured) continue;
    const d = hyp(q.x - bx, q.y - by);
    if (d < bd) { bd = d; best = q; }
  }
  ctl.player = best;
}
// her adimda: kontrol edilen futbolcu guncellenir, savunma aksiyonlari islenir
function userStep(st: MatchState) {
  for (const side of [0, 1] as const) {
    const ctl = st.control[side];
    if (!ctl) continue;
    ctl.cooldown = Math.max(0, ctl.cooldown - st.dt);
    ctl.switchCd = Math.max(0, ctl.switchCd - st.dt);
    const inp = ctl.input;
    const cur = ctl.player;
    const inPoss = !!st.owner && st.owner.side === side;
    // tasiyici degisince ya da kontrol edilen oyundan cikinca yeniden secim
    if (!cur || cur.off || (inPoss && st.owner !== cur) || (st.flight && st.flight.receiver && st.flight.receiver.side === side && st.flight.receiver !== cur)) pickControlled(st, side);
    // aksiyon tamponu: 0,3 s icinde uygulanamayan aksiyon duser
    if (inp.act && st.t - ctl.actAt > 0.3) inp.act = undefined;
    const p = ctl.player;
    if (!p || !inp.act) continue;
    if (inp.act === 'switch') {
      // savunmada ve top sahipsizken / rakip pasindayken: topa en yakin diger oyuncuya gecer
      if (!inPoss && ctl.switchCd <= 0) { pickControlled(st, side, p); ctl.switchCd = 0.2; if (ctl.player) addFx(st, ctl.player.x, ctl.player.y, 'int'); }
      inp.act = undefined;
      continue;
    }
    if (inPoss) continue; // hucum aksiyonlari userCarrier'da
    const c = st.owner;
    if ((inp.act === 'tackle' || inp.act === 'slide') && ctl.cooldown <= 0) {
      inp.act = undefined;
      if (!c || c.side === side || st.t < st.restartUntil || p.injured) continue;
      const d = hyp(c.x - p.x, c.y - p.y);
      const [cxf] = toFrame(c.side, c.x, c.y);
      const behind = toFrame(c.side, p.x, p.y)[0] < cxf + 0.3;
      const gkHolding = c.pos === 'GK' && cxf < 16.5;
      if (gkHolding) continue;
      if (inp.act === 'tackle' && d < 2.2) { ctl.cooldown = 0.8; tackle(st, p, c, behind); }
      else if (inp.act === 'slide' && d < 4.0) {
        // kayarak mudahale: uzaktan yetisir, daha cok faul; iskalarsa kisa sure yerde
        ctl.cooldown = 1.2;
        const ux = (c.x - p.x) / Math.max(0.1, d), uy = (c.y - p.y) / Math.max(0.1, d);
        p.x = clamp(p.x + ux * Math.min(2.2, d - 0.6), 1, L - 1); p.y = clamp(p.y + uy * Math.min(2.2, d - 0.6), 1, W - 1);
        tackle(st, p, c, true);
        if (st.owner === c) p.beatenUntil = st.t + 0.8;
      } else { ctl.cooldown = 0.4; p.beatenUntil = st.t + 0.3; }
    }
  }
}
// kullanici kontrolundeki tasiyici: joystick ile surer, butonlarla pas / ara pas / sut
// Kurallar: tac, aut ve serbest vurusta top surulmez, pas verilir; kaleci topu elindeyken yurumez; duran topta
// ve kalecide 5 s, acik oyunda 8 s girdisiz beklemede yapay zeka topu oynar (Mac Motoru: sure sinirlari).
function userCarrier(st: MatchState, c: PState, ctl: ControlState) {
  const side = c.side;
  const opp: 0 | 1 = side === 0 ? 1 : 0;
  const inp = ctl.input;
  const [cxf, cyf] = toFrame(side, c.x, c.y);
  const press = pressureOn(st, c, c.x, c.y);
  const mates = liveTeam(st, side).filter((p) => p !== c);
  const mag = hyp(inp.mx, inp.my);
  const hasDir = mag > 0.15;
  const dx = hasDir ? inp.mx / mag : c.hx, dy = hasDir ? inp.my / mag : c.hy;
  const [fx1, fy1] = fromFrame(side, 1, 0), [fx0, fy0] = fromFrame(side, 0, 0);
  const fwx = fx1 - fx0, fwy = fy1 - fy0;
  const restart = st.restartKind === 'throw' || st.restartKind === 'goalkick' || st.restartKind === 'fk';
  const gkHands = c.pos === 'GK' && cxf < 16.5 && Math.abs(cyf - 34) < 20.16;
  const mustPlay = restart || gkHands;
  // sure sinirlari: duran top ve kaleci 5 s, acik oyunda girdisiz 8 s
  const held = st.t - Math.max(ctl.holdStart, st.restartUntil); // duran topta dizilme suresi sayilmaz
  if ((mustPlay && held > P.userRestartLimit) || (!mustPlay && held > P.userIdleLimit && st.t - ctl.lastInputT > P.userIdleLimit)) {
    inp.act = undefined;
    st.nextDec = st.t + 0.5;
    aiDecide(st, c);
    return;
  }
  const act = inp.act;
  if (act === 'pass' || act === 'through' || act === 'shoot') {
    inp.act = undefined;
    const ddx = hasDir ? dx : fwx, ddy = hasDir ? dy : fwy;
    const offLine0 = offsideLine(st, side);
    const offside = (m: PState) => { const [mxf] = toFrame(side, m.x, m.y); return mxf > offLine0 + 0.3; }; // geometrik ofsayt: pas aninda cizginin otesinde
    const rk = st.restartKind; st.restartKind = '';
    const noOff = rk === 'throw' || rk === 'goalkick';
    if (act === 'shoot' && !gkHands) {
      const distGoal = hyp(105 - cxf, 34 - cyf);
      if (distGoal < 45) {
        const oneOnOne = cxf > 72 && !st.players.some((o) => { if (o.side === side || o.off || o.pos === 'GK') return false; const [oxf, oyf] = toFrame(side, o.x, o.y); return oxf > cxf - 0.5 && Math.abs(oyf - cyf) < 5 + (oxf - cxf) * 0.4 && hyp(o.x - c.x, o.y - c.y) < 14; });
        const m = shotModel(st, c, cxf, cyf, press, oneOnOne);
        // guc: basili tutma suresi; ideal guc mesafeyle artar, sapma isabeti dusurur (yardim seviyesi sapmayi azaltir)
        const power = clamp(inp.power ?? 0.6, 0.05, 1);
        const ideal = clamp(distGoal / 30, 0.35, 1);
        const miss = Math.abs(power - ideal) * [1, 0.55, 0.25][ctl.assistShot];
        const acc = clamp(1 - 1.4 * miss, 0.15, 1) * (hasDir ? 1 : 0.9);
        const pGoal = clamp(m.pGoal * acc * (ctl.assistShot === 0 ? 1.08 : 1), 0.003, P.maxShotP);
        let noBlock = 1; for (const b of m.blockers) noBlock *= 1 - b.bp;
        shoot(st, c, cxf, cyf, press, false, undefined, {}, { raw: m.raw, pGoal, pBlock: m.pBlock, xg: pGoal * noBlock, blockers: m.blockers });
        return;
      }
      // uzak mesafeden sut: ileri uzun top gibi davranir (asagida yonlu pas)
    }
    if (act === 'through') {
      const opts = throughOptions(st, c, mates).filter((o) => noOff || !offside(o.m));
      let best: (typeof opts)[number] | null = null, bv = -1e9;
      for (const o of opts) { const vx = o.m.x - c.x, vy = o.m.y - c.y, d = hyp(vx, vy) || 1; const a = (vx * ddx + vy * ddy) / d; const v = (ctl.assistPass === 2 ? o.path * o.race * 2 : 0.5) + a; if (a > -0.2 && v > bv) { bv = v; best = o; } }
      if (best) { throughBall(st, c, best, true); return; }
      // kosucu yoksa: asagidaki yonlu pas bosluga gider
    }
    // yonlu pas: hedef nokta joystick yonunde, mesafe basili tutma suresinden; o cizgiye yakin takim arkadasi alir,
    // yoksa top bosluga gider ve en yakin takim arkadasi kosar. Yardim seviyesi cizgiye tolerans genisligidir.
    const power = clamp(inp.power ?? 0.25, 0, 1);
    const dist = act === 'shoot' ? 40 : act === 'through' ? 18 + 20 * power : 8 + 32 * power;
    const ax = clamp(c.x + ddx * dist, 0.5, L - 0.5), ay = clamp(c.y + ddy * dist, 0.5, W - 0.5);
    const tol = [3, 5.5, 8][ctl.assistPass];
    let bestM: PState | null = null, bestD = 1e9;
    for (const m of mates) {
      const vx = m.x - c.x, vy = m.y - c.y, d = hyp(vx, vy);
      if (d < 2.5 || d > dist + 14) continue;
      const along = (vx * ddx + vy * ddy);
      if (along < 2) continue;
      const perp = Math.abs(vx * ddy - vy * ddx);
      if (perp > tol + along * 0.12) continue; // uzaklastikca koni biraz acilir
      if (m.pos === 'GK' && toFrame(side, m.x, m.y)[0] > 20) continue;
      if (ctl.assistPass === 2 && !noOff && offside(m)) continue; // tam yardim ofsayttaki oyuncuyu secmez; diger seviyelerde ofsayt cagrilir
      const dd = hyp(m.x - ax, m.y - ay);
      if (dd < bestD) { bestD = dd; bestM = m; }
    }
    if (!bestM && ctl.assistPass === 2) {
      // tam yardim: koni bossa yone en yakin takim arkadasina gider (acemi bosluga atmaz)
      let bv = -1e9;
      for (const m of mates) {
        const vx = m.x - c.x, vy = m.y - c.y, d = hyp(vx, vy) || 1;
        if (d < 2.5 || d > 50 || (m.pos === 'GK' && toFrame(side, m.x, m.y)[0] > 20) || (!noOff && offside(m))) continue;
        const a = (vx * ddx + vy * ddy) / d;
        if (a < 0.1) continue;
        const v = a + passSuccess(st, c, m.x, m.y, d) * 0.5;
        if (v > bv) { bv = v; bestM = m; }
      }
    }
    if (bestM) {
      if (!noOff && offside(bestM)) return callOffside(st, c, bestM);
      const d = hyp(bestM.x - c.x, bestM.y - c.y);
      const ps = passSuccess(st, c, bestM.x, bestM.y, d) * (ctl.assistPass === 0 ? 1.04 : 1);
      dbg('upass_player');
      makePass(st, c, bestM, clamp(ps, 0.02, 0.99));
      return;
    }
    // bosluga pas: en yakin takim arkadasi kosar; yaris pas aninda cozulur
    let runner: PState | null = null, rd = 1e9;
    for (const m of mates) { if (m.pos === 'GK') continue; const d = hyp(m.x - ax, m.y - ay); if (d < rd) { rd = d; runner = m; } }
    if (!runner) { addFx(st, c.x, c.y, 'kick'); return; }
    if (!noOff && offside(runner)) return callOffside(st, c, runner);
    const air = dist > 26;
    const path = passSuccess(st, c, ax, ay, dist, air);
    dbg('upass_space');
    if (st.rng() >= path) { dbg('upass_space_cut'); makePass(st, c, runner, 0, { tx: ax, ty: ay, air }); return; }
    const tRec = rd / (runner.speedBase * kf(runner.k));
    let tDef = 1e9, winner: PState | null = null;
    for (const o of st.players) { if (o.side === side || o.off) continue; const tt = hyp(ax - o.x, ay - o.y) / (o.speedBase * kf(o.k)) + 0.3; if (tt < tDef) { tDef = tt; winner = o; } }
    const won = tRec <= tDef;
    makePass(st, c, runner, 1, { tx: ax, ty: ay, loose: true, won, winner, lead: Math.max(1.5, (tDef - tRec) * runner.speedBase), tArrive: won ? tRec : tDef, air });
    return;
  }
  if (act) inp.act = undefined; // hucumda anlamsiz aksiyon (mudahale vb.)
  // duran top ve kaleci: top surulmez, oyuncu yerinde durur ve pas bekler
  if (mustPlay) { ballAt(st, c); st.holdUntil = st.t + 0.5; return; }
  if (!hasDir) { ballAt(st, c); st.holdUntil = st.t + 0.5; return; }
  // top surme: joystick yonunde; sprint belirgin hizli ama top kontrolu gevser ve kondisyon yakar
  const open = !st.players.some((o) => o.side !== side && !o.off && o.pos !== 'GK' && hyp(o.x - c.x, o.y - c.y) < 8);
  const sp = c.speedBase * kf(c.k) * (inp.sprint ? (open ? 1.0 : 0.92) : (open ? 0.8 : 0.72)) * Math.min(1, mag);
  if (inp.sprint) c.k = Math.max(0, c.k - 0.05 * st.dt * 6);
  c.x = clamp(c.x + dx * sp * st.dt, 0.5, L - 0.5);
  c.y = clamp(c.y + dy * sp * st.dt, 0.5, W - 0.5);
  face(c, dx, dy, 0.6);
  ballAt(st, c);
  st.dribbling = true;
  st.holdUntil = st.t + 0.5;
  // onundeki savunmaciya girer: birebir (motorun kurali), ayni savunmaciyla en sik 0,6 s'de bir; sprintte top kontrolu dusuk
  for (const o of frontDefenders(st, c)) {
    if (o.d > 1.5) break;
    const until = ctl.duelUntil.get(o.p) ?? -9;
    if (st.t < until || (o.p.beatenUntil !== undefined && st.t < o.p.beatenUntil)) continue;
    ctl.duelUntil.set(o.p, st.t + 0.6);
    dbg('birebir');
    const pWin = 1 - P.takeOnK * duelWin(eg(o.p), eg(c) * dribbleSkill(c) * (inp.sprint ? 0.85 : 1)) * (1 - o.d / 3);
    if (st.rng() >= pWin) {
      dbg('birebir_kayip');
      const Pp = [0.8, 1.0, 1.3][st.teams[o.p.side].tactic.press];
      const inBoxC = cxf > 88.5 && Math.abs(cyf - 34) < 20.16;
      st.stats[o.p.side].duels++;
      if (st.rng() < P.foulBase * P.takeOnFoul * Pp * (1 + 0.6 * (1 - o.p.k / 100)) * (inBoxC ? P.inBoxFoul : 1)) { foul(st, o.p, c, cxf); return; }
      addFx(st, c.x, c.y, 'clean');
      say(st, 'tackle', o.p.side, o.p, c);
      giveBall(st, o.p, 0.8);
      return;
    }
    o.p.beatenUntil = st.t + 0.8;
    addFx(st, c.x, c.y, 'skill');
    say(st, 'dribble', side, c, o.p);
    break;
  }
}
// kontrol edilen tasiyici icin ekranin bilmesi gerekenler: pas zorunlu mu, kalan sure
export function userCarrierInfo(st: MatchState, side: 0 | 1): { mustPlay: boolean; left: number } | null {
  const ctl = st.control[side];
  if (!ctl || !st.owner || st.owner !== ctl.player) return null;
  const c = st.owner;
  const [cxf, cyf] = toFrame(side, c.x, c.y);
  const restart = st.restartKind === 'throw' || st.restartKind === 'goalkick' || st.restartKind === 'fk';
  const gkHands = c.pos === 'GK' && cxf < 16.5 && Math.abs(cyf - 34) < 20.16;
  const mustPlay = restart || gkHands;
  const left = (mustPlay ? P.userRestartLimit : P.userIdleLimit) - (st.t - Math.max(ctl.holdStart, st.restartUntil));
  return { mustPlay, left: Math.max(0, left) };
}

// ofsayt cizgisi (hucum eden tarafin cercevesinde): sondan ikinci rakip, top ve orta saha
function offsideLine(st: MatchState, side: 0 | 1): number {
  const xs = st.players.filter((o) => o.side !== side && !o.off).map((o) => toFrame(side, o.x, o.y)[0]).sort((a, b) => b - a);
  const second = xs.length > 1 ? xs[1] : 105;
  const [bxf] = toFrame(side, st.ball.x, st.ball.y);
  return Math.max(second, bxf, 52.5);
}

// ara pas: savunma arkasindaki bosluga, kosu yarisi + ofsayt riski
function throughOptions(st: MatchState, c: PState, mates: PState[]) {
  const side = c.side;
  const opp: 0 | 1 = side === 0 ? 1 : 0;
  const [cxf] = toFrame(side, c.x, c.y);
  const offL = offsideLine(st, side);
  const keeper = gk(st, opp);
  const gkxf = keeper ? toFrame(side, keeper.x, keeper.y)[0] : 104;
  const depth = gkxf - offL - 2;
  const out: { m: PState; tx: number; ty: number; path: number; race: number; off: number; winner: PState | null; txf: number; tyf: number; tRec: number; tDef: number; vxf: number; air: boolean }[] = [];
  if (depth < 4) return out;
  const myT = st.teams[side].tactic, opT = st.teams[opp].tactic;
  const runs = myT.runs ?? 1;
  for (const m of mates) {
    if (m.pos === 'GK' || m.pos === 'CB') continue;
    const [mxf, myf] = toFrame(side, m.x, m.y);
    if (mxf < offL - 12 || mxf < cxf + 2) continue;
    const fastR = m.traits.includes('Hızlı');
    const off = clamp(P.runsOff[runs] * (fastR ? 0.8 : 1) + (opT.trap ? P.trapOff * (st.teams[opp].T / 60) : 0), 0, 0.6);
    // birkac hedef noktasi denenir: cizginin hemen arkasi, bosluğun ortasi; en iyi beklenen deger secilir
    let best: (typeof out)[number] | null = null;
    let bestV = -1;
    for (const frac of [0.2, 0.38, 0.55]) {
      const txf = Math.min(100, Math.max(mxf + 4, offL + Math.max(4, frac * depth)));
      if (txf < P.thruMinX) continue; // orta sahaya atilan top ara pas degil, normal pastir
      const tyf = 34 + clamp((myf - 34) * 0.4, -14, 14); // kosu ice dogru kirilir
      const [tx, ty] = fromFrame(side, txf, tyf);
      const tRec = hyp(tx - m.x, ty - m.y) / (m.speedBase * kf(m.k)) - P.runsHead[runs] - (fastR ? 0.15 : 0);
      let tDef = 1e9;
      let winner: PState | null = null;
      const inBox = txf > 88.5 && Math.abs(tyf - 34) < 20.16;
      for (const o of st.players) {
        if (o.side === side || o.off) continue;
        // gecis ani: topu yeni kaybeden savunma ileri dogru hareket halindedir, geri donmesi daha uzun surer
        const trans = st.t - st.lastTurnoverT < P.transWin ? P.transReact : 0;
        const react = o.pos === 'GK' ? (inBox ? 0.3 : 1.0) : P.thruReact + trans + (opT.trap ? P.trapReact : 0);
        // savunmaci kendi kalesine dogru donup kosar: biraz daha yavas
        const tt = hyp(tx - o.x, ty - o.y) / (o.speedBase * kf(o.k)) + react;
        if (tt < tDef) {
          tDef = tt;
          winner = o;
        }
      }
      const skill = winner ? 0.5 * P.passSlope * Math.log(eg(m) / eg(winner)) : 0;
      const race = sigmoid(P.thruRace * (tDef - tRec) + skill);
      // yerden mi havadan mi: yolda savunmaci varsa top asirilir (daha yavas ama kesilmez)
      const dPass = hyp(tx - c.x, ty - c.y);
      const pathG = passSuccess(st, c, tx, ty, dPass);
      const pathA = dPass > 14 ? passSuccess(st, c, tx, ty, dPass, true) : 0;
      const air = pathA > pathG;
      const path = air ? pathA : pathG;
      // degeri inis noktasi degil, kosucunun kaleciye kadar kosabilecegi alan belirler (savunma arkasi bostur)
      const vxf = Math.min(96, txf + 0.6 * Math.max(0, gkxf - 6 - txf));
      const v = path * race * threat(vxf, tyf);
      if (v > bestV) {
        bestV = v;
        best = { m, tx, ty, path, race, off, winner, txf, tyf, tRec, tDef, vxf, air };
      }
    }
    if (best) out.push(best);
  }
  return out;
}

function frontDefenders(st: MatchState, c: PState): { p: PState; d: number }[] {
  const [cxf, cyf] = toFrame(c.side, c.x, c.y);
  const out: { p: PState; d: number }[] = [];
  for (const o of st.players) {
    if (o.side === c.side || o.off) continue;
    const d = hyp(o.x - c.x, o.y - c.y);
    if (d > 3) continue;
    const [oxf] = toFrame(c.side, o.x, o.y);
    if (oxf > cxf + 0.3) out.push({ p: o, d }); // yan yana kosan savunmaci onu kesmez
  }
  out.sort((a, b) => a.d - b.d);
  return out;
}

function nearestOpp(st: MatchState, c: PState): { p: PState; d: number } | null {
  let best: PState | null = null;
  let bd = 1e9;
  for (const o of st.players) {
    if (o.side === c.side || o.off) continue;
    const d = hyp(o.x - c.x, o.y - c.y);
    if (d < bd) {
      bd = d;
      best = o;
    }
  }
  return best ? { p: best, d: bd } : null;
}

function duelWin(defEG: number, carEG: number): number {
  return sigmoid(P.duelSlope * Math.log(defEG / carEG) + P.tackleWin);
}
// calim yetenegi: mevkiye ve 'Calimci' ozelligine gore etkin guc carpani (birebirlerde)
function dribbleSkill(p: PState): number {
  const pos = p.pos === 'W' ? 1.15 : p.pos === 'ST' ? 1.05 : p.pos === 'CM' ? 1.0 : p.pos === 'FB' ? 0.95 : p.pos === 'DM' ? 0.9 : p.pos === 'CB' ? 0.85 : 0.7;
  return pos * (p.traits.includes('Çalımcı') ? 1.25 : 1);
}

// en bos yon: 8 yon denenir, rakiplerden uzaklik + ileri egilim puanlanir
function openDirection(st: MatchState, c: PState, stepM: number, fwdW: number): [number, number] {
  let best: [number, number] = [0, 0];
  let bestV = -1e9;
  const [fx, fy] = fromFrame(c.side, 1, 0); // hucum yonu birimi (dunya)
  const [ox0, oy0] = fromFrame(c.side, 0, 0);
  const fwx = fx - ox0, fwy = fy - oy0;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const dx = Math.cos(a), dy = Math.sin(a);
    const px = clamp(c.x + dx * stepM, 1, L - 1), py = clamp(c.y + dy * stepM, 1, W - 1);
    let md = 99;
    for (const o of st.players) if (o.side !== c.side && !o.off) md = Math.min(md, hyp(o.x - px, o.y - py));
    const v = Math.min(md, 8) + fwdW * (dx * fwx + dy * fwy) - (px < 2 || px > L - 2 || py < 2 || py > W - 2 ? 3 : 0);
    if (v > bestV) { bestV = v; best = [dx, dy]; }
  }
  return best;
}
function shieldMove(st: MatchState, c: PState) {
  const def = nearestOpp(st, c);
  if (def && def.d < 4) {
    // baski altinda: en bos yone kacar (demarke olmaya calisir)
    const [dx, dy] = openDirection(st, c, 3, 1.5);
    const s = Math.min(1.5, c.speedBase * 0.45 * st.dt);
    c.x = clamp(c.x + dx * s, 1, L - 1);
    c.y = clamp(c.y + dy * s, 1, W - 1);
    face(c, dx, dy, 0.5); // topu savunmacidan uzak tarafta saklar
    ballAt(st, c);
  } else dribbleMove(st, c, 0.5);
}

function dribbleMove(st: MatchState, c: PState, urg: number) {
  const [cxf, cyf] = toFrame(c.side, c.x, c.y);
  const def = nearestOpp(st, c);
  let txf = cxf + 5;
  let tyf = cyf + (34 - cyf) * 0.1;
  let [tx, ty] = fromFrame(c.side, clamp(txf, 1, 104), clamp(tyf, 1, 67));
  if (def && def.d < 5) {
    // onunde adam varsa en bos yone, ileri egilimli
    const [ddx, ddy] = openDirection(st, c, 4, 2.5);
    tx = clamp(c.x + ddx * 5, 1, L - 1);
    ty = clamp(c.y + ddy * 5, 1, W - 1);
  }
  // onu bossa (kontra, ara pas sonrasi) top surme neredeyse tam hizdadir
  const open = !st.players.some((o) => o.side !== c.side && !o.off && o.pos !== 'GK' && toFrame(c.side, o.x, o.y)[0] > cxf - 1 && hyp(o.x - c.x, o.y - c.y) < 8);
  const sp = c.speedBase * (open ? P.openDribble : 0.8) * urg * kf(c.k);
  const dx = tx - c.x;
  const dy = ty - c.y;
  const d = hyp(dx, dy);
  if (d > 0.01) {
    const s = Math.min(d, sp * st.dt);
    c.x += (dx / d) * s;
    c.y += (dy / d) * s;
    face(c, dx, dy, 0.6);
  }
  ballAt(st, c);
}

// havadan mi: uzun paslar ve kanattan ceza sahasina ortalar
function isAirPass(c: PState, tx: number, ty: number, d: number): boolean {
  if (d > 28) return true;
  const [txf, tyf] = toFrame(c.side, tx, ty);
  const [, cyf] = toFrame(c.side, c.x, c.y);
  return txf > 86 && Math.abs(tyf - 34) < 14 && Math.abs(cyf - 34) > 18;
}

function passSuccess(st: MatchState, c: PState, tx: number, ty: number, d: number, forceAir?: boolean): number {
  const base = P.passBase - P.passD * d - (forceAir ? P.lobCost : 0);
  const air = forceAir ?? isAirPass(c, tx, ty, d);
  let survive = 1;
  const vx = tx - c.x;
  const vy = ty - c.y;
  const len2 = vx * vx + vy * vy;
  const cEG = eg(c);
  for (const o of st.players) {
    if (o.side === c.side || o.off) continue;
    const u = ((o.x - c.x) * vx + (o.y - c.y) * vy) / len2;
    if (u < 0.05 || u > 1.1) continue;
    if (air && u > 0.2 && u < 0.85) continue; // havadaki topa yolun ortasinda ulasilamaz
    const px = c.x + vx * u;
    const py = c.y + vy * u;
    const perp = hyp(o.x - px, o.y - py);
    const reach = 1.6 + 0.07 * u * d;
    if (perp > reach) continue;
    const r = (1 - perp / reach) * 0.85;
    const skill = sigmoid(P.passSlope * Math.log(eg(o) / cEG));
    survive *= 1 - r * skill * P.interceptK;
  }
  return clamp(base * Math.max(0, survive), 0.02, 0.99);
}

function makePass(st: MatchState, c: PState, m: PState, ps: number, at?: { tx: number; ty: number; winner?: PState | null; loose?: boolean; won?: boolean; lead?: number; tArrive?: number; air?: boolean }) {
  const s = st.stats[c.side];
  s.passes++;
  const mx0 = at ? at.tx : m.x;
  const my0 = at ? at.ty : m.y;
  const d = hyp(mx0 - c.x, my0 - c.y);
  const air = at?.air ?? isAirPass(c, mx0, my0, d);
  const ok = st.rng() < ps;
  let interceptor: PState | null = null;
  let toX = mx0;
  let toY = my0;
  if (at?.loose) {
    // bosluga ara pas: alici kosar; yarisi kaybettiyse kazanan savunmaci/kaleci de topa kosar
    interceptor = at.won ? null : at.winner ?? null;
  } else if (!ok) {
    // pas yoluna en yakin rakip araya girer
    let best: PState | null = null;
    let bd = 1e9;
    for (const o of st.players) {
      if (o.side === c.side || o.off) continue;
      const vx = mx0 - c.x;
      const vy = my0 - c.y;
      let u = clamp(((o.x - c.x) * vx + (o.y - c.y) * vy) / (vx * vx + vy * vy), 0, 1);
      if (air && u > 0.2 && u < 0.85) u = 0.85;
      const dd = hyp(o.x - (c.x + vx * u), o.y - (c.y + vy * u));
      if (dd < bd) {
        bd = dd;
        best = o;
      }
    }
    interceptor = best;
    if (best) {
      toX = best.x;
      toY = best.y;
    }
    const [zx] = toFrame(c.side, mx0, my0);
    dbg(zx < 35 ? 'kayip_pas_kendi' : zx < 70 ? 'kayip_pas_orta' : 'kayip_pas_hucum');
  } else if (!at?.loose) s.passesOk++;
  const dist = hyp(toX - c.x, toY - c.y);
  face(c, toX - c.x, toY - c.y, 0.8);
  const [txf, tyf] = toFrame(c.side, mx0, my0);
  const cross = air && txf > 86 && Math.abs(tyf - 34) < 14;
  // falso: ortalar kaleye dogru kivrilir, uzun toplar hafif kivrilir
  let curve = 0;
  if (cross) curve = (0.07 + st.rng() * 0.06) * (st.rng() < 0.5 ? 1 : -1);
  else if (air) curve = (st.rng() - 0.5) * 0.06;
  st.flight = {
    fromX: st.ball.x,
    fromY: st.ball.y,
    toX,
    toY,
    t0: st.t,
    // ara pas kosucuya gore agirlik verilir: top, yarisi kazanan oraya vardiginda yetisir
    dur: at?.loose ? Math.max(dist / (air ? P.passSpeed - 5 : P.thruSpeed), Math.min(3.5, (at.tArrive ?? 0) - 0.1)) : Math.max(0.5, dist / (air ? P.passSpeed - 3 : P.passSpeed)),
    receiver: ok || at?.loose ? m : null,
    interceptor,
    kind: cross ? 'cross' : 'pass',
    passer: c,
    air,
    apex: air ? clamp(dist * 0.11, 2, 7.5) : 0,
    curve,
    thru: !!at,
    loose: !!at?.loose,
    won: at?.won,
    lead: at?.lead,
  };
  st.owner = null;
}

function throughBall(st: MatchState, c: PState, o: ReturnType<typeof throughOptions>[number], noOffside = false) {
  dbg('ara_pas');
  if (!noOffside && st.rng() < o.off) return callOffside(st, c, o.m);
  // yol kesilirse normal pas kaybi
  if (st.rng() >= o.path) return makePass(st, c, o.m, 0, { tx: o.tx, ty: o.ty, air: o.air });
  // kosu yarisi pas aninda cozulur: kosucunun cikis avantaji ve ivmesi yarim saniyelik adimlarda gorunmez
  const won = st.rng() < o.race;
  dbg(won ? 'ara_yaris_kazanildi' : 'ara_yaris_kaybedildi');
  DBG.ara_dt = (DBG.ara_dt ?? 0) + (o.tDef - o.tRec); DBG.ara_race = (DBG.ara_race ?? 0) + o.race; DBG.ara_txf = (DBG.ara_txf ?? 0) + o.txf; DBG.ara_gk = (DBG.ara_gk ?? 0) + (o.winner?.pos === 'GK' ? 1 : 0);
  const lead = Math.max(1.5, (o.tDef - o.tRec) * o.m.speedBase);
  makePass(st, c, o.m, 1, { tx: o.tx, ty: o.ty, loose: true, won, winner: o.winner, lead, tArrive: won ? o.tRec : o.tDef, air: o.air });
}

// ofsayt: rakip, ihlal noktasindan serbest vurusla baslar
function callOffside(st: MatchState, c: PState, m: PState) {
  dbg('ofsayt');
  const s = st.stats[c.side];
  s.passes++;
  s.offsides++;
  st.events.push({ t: st.clock, type: 'offside', side: c.side, player: m.num });
  const defs = liveTeam(st, c.side === 0 ? 1 : 0).filter((p) => p.pos !== 'GK');
  const taker = defs.reduce((b, p) => (hyp(p.x - m.x, p.y - m.y) < hyp(b.x - m.x, b.y - m.y) ? p : b), defs[0]);
  if (!taker) return;
  taker.x = m.x;
  taker.y = m.y;
  st.ball.x = taker.x;
  st.ball.y = taker.y;
  st.owner = null;
  giveBall(st, taker, 1.2);
  deadTime(st, 4 + st.rng() * 2, 'Ofsayt');
}

// topun ucustaki yeri: falso yanal sapma, havadan vurusta yukseklik
function flightPos(f: Flight, u: number): [number, number, number] {
  const vx = f.toX - f.fromX;
  const vy = f.toY - f.fromY;
  const len = Math.hypot(vx, vy) || 1;
  const bulge = 4 * u * (1 - u);
  const nx = -vy / len;
  const ny = vx / len;
  const x = f.fromX + vx * u + nx * f.curve * len * bulge;
  const y = f.fromY + vy * u + ny * f.curve * len * bulge;
  return [x, y, f.apex * bulge];
}

function resolveFlight(st: MatchState) {
  const f = st.flight!;
  const u = clamp((st.t - f.t0) / f.dur, 0, 1);
  const [bx, by, bz] = flightPos(f, u);
  st.ball.x = bx;
  st.ball.y = by;
  st.ballZ = bz;
  if (u < 1) {
    if (f.shot) {
      // kaleci topun gidecegi yere uzanir
      const keeper = gk(st, f.passer.side === 0 ? 1 : 0);
      if (f.shot.outcome !== 'block') {
        const [kxf] = toFrame(keeper.side, keeper.x, keeper.y);
        const [, tyf] = toFrame(keeper.side, f.toX, f.toY);
        const reachY = f.shot.outcome === 'save' ? tyf : 34 + clamp(tyf - 34, -3.2, 3.2) * 0.7;
        const [kx, ky] = fromFrame(keeper.side, Math.min(kxf, 1.5), reachY);
        const dx = kx - keeper.x;
        const dy = ky - keeper.y;
        const d = hyp(dx, dy);
        const sp = Math.min(d, 9 * st.dt);
        if (d > 0.01) {
          keeper.x += (dx / d) * sp;
          keeper.y += (dy / d) * sp;
        }
        face(keeper, st.ball.x - keeper.x, st.ball.y - keeper.y, 0.6);
      }
      return;
    }
    // alici ve (varsa) topu kesecek rakip topa dogru kosar
    for (const r of [f.receiver, f.interceptor]) {
      if (!r) continue;
      const dx = f.toX - r.x;
      const dy = f.toY - r.y;
      const d = hyp(dx, dy);
      const s = Math.min(d, r.speedBase * kf(r.k) * st.dt);
      if (d > 0.01) {
        r.x += (dx / d) * s;
        r.y += (dy / d) * s;
      }
      face(r, st.ball.x - r.x, st.ball.y - r.y, 0.5);
    }
    return;
  }
  st.ballZ = 0;
  if (f.shot) {
    st.flight = null;
    resolveShot(st, f);
    return;
  }
  const cornerInfo = (f as Flight & { corner?: { header: PState; ratio: number } }).corner;
  if (f.kind === 'cross' && cornerInfo) {
    // kornerde kafa vurusu
    st.flight = null;
    const h = cornerInfo.header;
    h.x = f.toX;
    h.y = f.toY;
    st.ball.x = f.toX;
    st.ball.y = f.toY;
    const [hxf, hyf] = toFrame(h.side, f.toX, f.toY);
    shoot(st, h, hxf, hyf, 0.6, true, P.cornerHeaderP * Math.pow(cornerInfo.ratio, 1.5) * (0.7 + st.rng() * 0.6), { header: true });
    return;
  }
  if (f.loose) {
    // bosluga atilan ara pas: yaris pas aninda cozulmustu
    st.flight = null;
    st.owner = null;
    st.ball.x = f.toX;
    st.ball.y = f.toY;
    const rc = f.receiver!;
    if (f.won) {
      const dr = hyp(rc.x - f.toX, rc.y - f.toY);
      if (dr < 3.5) {
        rc.x = f.toX;
        rc.y = f.toY;
        rc.thruT = st.t;
        // yarisi kaybeden yakin savunmacilar yanlis tarafa donmustur: kisa sure yavas, mudahale edemez
        const beat = clamp((f.lead ?? 1.5) / 4, 0.6, 1.8);
        for (const o of st.players) {
          if (o.side === rc.side || o.off || o.pos === 'GK') continue;
          if (hyp(o.x - rc.x, o.y - rc.y) < 3) o.beatenUntil = st.t + beat;
        }
        say(st, 'through', rc.side, f.passer, rc);
        dbg('ara_alindi');
        s_stats(st, f.passer.side).passesOk++;
        giveBall(st, rc, 0.2);
      }
      return;
    }
    const w = f.interceptor;
    if (w && hyp(w.x - f.toX, w.y - f.toY) < 4) {
      w.x = f.toX;
      w.y = f.toY;
      const [wxf, wyf] = toFrame(w.side, w.x, w.y);
      const inOwnBox = wxf < 16.5 && Math.abs(wyf - 34) < 20.16;
      if (w.pos === 'GK' && inOwnBox) {
        addFx(st, w.x, w.y, 'save');
        say(st, 'claim', w.side, w, rc);
        giveBall(st, w, 2.5);
        deadTime(st, 2.5 + st.rng() * 1.5, 'Kaleci aldı');
        st.restartKind = 'gk';
      } else {
        // saha oyuncusu ya da ceza sahasi disina cikmis kaleci: topu ayakla alir, eline alamaz
        addFx(st, w.x, w.y, 'int');
        say(st, 'claim', w.side, w, rc);
        giveBall(st, w, w.pos === 'GK' ? 0.4 : 0.8);
      }
    }
    return;
  }
  const r = f.receiver ?? f.interceptor;
  st.flight = null;
  if (!f.receiver && r && st.rng() < P.outOfPlay) {
    // hucum ucuncu bolgede savunmadan cikan top: korner
    const [pxf] = toFrame(f.passer.side, f.toX, f.toY);
    if (pxf > 88 && st.rng() < P.cornerFromInt) {
      corner(st, f.passer.side, f.toY);
      return;
    }
    // top yalniz kenar cizgisine yakin kaybedildiyse taca cikar (saha ortasindan taca isinlanma yok)
    const dLine = Math.min(f.toY, W - f.toY);
    if (dLine > 8) {
      r.x = f.toX;
      r.y = f.toY;
      giveBall(st, r, P.holdMin + st.rng() * P.holdVar);
      return;
    }
    r.x = clamp(f.toX, 2, L - 2);
    r.y = f.toY < W / 2 ? 0.5 : W - 0.5;
    st.ball.x = r.x;
    st.ball.y = r.y;
    st.owner = null;
    const [txf0, tyf0] = toFrame(r.side, r.x, r.y);
    const durT = 4 + st.rng() * 2.5;
    st.lastPossSide = r.side;
    st.pending = { kind: 'throw', side: r.side, at: st.t + durT, taker: r, spotX: txf0, spotY: tyf0 };
    deadTime(st, durT, 'Taç');
    addFx(st, r.x, r.y, 'throw', st.restartUntil);
    say(st, 'throw', r.side, r);
    return;
  }
  if (r) {
    if (!f.receiver) {
      addFx(st, f.toX, f.toY, 'int');
      say(st, 'intercept', r.side, r, f.passer);
    } else if (f.kind === 'cross') {
      say(st, 'cross', r.side, f.passer, r);
      const [rxf, ryf] = toFrame(r.side, f.toX, f.toY);
      if (rxf > 88 && Math.abs(ryf - 34) < 20 && st.rng() < P.crossShot) {
        // ortaya ilk dokunusta kafa / vole
        r.x = f.toX;
        r.y = f.toY;
        st.ball.x = f.toX;
        st.ball.y = f.toY;
        const m0 = shotModel(st, r, rxf, ryf, pressureOn(st, r, r.x, r.y), false);
        m0.pGoal = Math.min(P.maxShotP, m0.pGoal * P.headerK);
        m0.xg = m0.pGoal * (1 - m0.pBlock);
        dbg('orta_kafa');
        shoot(st, r, rxf, ryf, 0, false, undefined, { header: true }, m0);
        return;
      }
    } else if (f.air && hyp(f.toX - f.fromX, f.toY - f.fromY) > 22) {
      // havadan pas: yolun ortasina yakin bir rakibin ustunden astiysa aşırtma
      let over: PState | null = null;
      for (const o of st.players) {
        if (o.side === r.side || o.off) continue;
        const vx = f.toX - f.fromX, vy = f.toY - f.fromY;
        const u = ((o.x - f.fromX) * vx + (o.y - f.fromY) * vy) / (vx * vx + vy * vy);
        if (u < 0.25 || u > 0.85) continue;
        if (hyp(o.x - (f.fromX + vx * u), o.y - (f.fromY + vy * u)) < 3) { over = o; break; }
      }
      if (over) say(st, 'lob', r.side, f.passer, r, over);
      else say(st, 'long', r.side, f.passer, r);
    }
    r.x = f.toX;
    r.y = f.toY;
    giveBall(st, r, P.holdMin + st.rng() * P.holdVar);
  } else {
    st.owner = null;
  }
}

// ---------- Sut, kaleci, duran toplar ----------
function shoot(st: MatchState, c: PState, xf: number, yf: number, press: number, setPiece: boolean, fixedP?: number, opt: { header?: boolean; penalty?: boolean; freekick?: boolean } = {}, model?: ReturnType<typeof shotModel>) {
  const side = c.side;
  const opp: 0 | 1 = side === 0 ? 1 : 0;
  const s = st.stats[side];
  const keeper = gk(st, opp);
  // duran toplarda fixedP dogrudan gol olasiligidir (penalti sabit; digerlerinde sutcu/kaleci farki uygulanir)
  let pGoal: number;
  let pBlock = 0;
  let blockers: { p: PState; bp: number }[] = [];
  if (fixedP !== undefined) {
    const finisher = c.traits.includes('Bitirici') ? 1.08 : 1;
    const refl = keeper && keeper.traits.includes('Refleks') ? 0.92 : 1;
    const q = (opt.penalty || !keeper ? 1 : Math.exp(P.shotSlope * Math.log(eg(c) / eg(keeper)))) * (keeper && keeper.emergencyGk ? 1.6 : 1);
    pGoal = clamp(fixedP * q * finisher * refl, 0.003, 0.95);
  } else {
    const m = model ?? shotModel(st, c, xf, yf, press, false);
    pGoal = m.pGoal;
    pBlock = m.pBlock;
    blockers = m.blockers;
  }
  const xg = pGoal * (1 - pBlock); // kaydedilen xG = modelin gercek gol olasiligi
  s.shots++;
  s.xg += xg;
  st.zoneShots[side][yf < 23 ? 0 : yf > 45 ? 2 : 1]++;
  st.playerXg[side][c.num] = (st.playerXg[side][c.num] ?? 0) + xg;
  if (c.thruT !== undefined && st.t - c.thruT < 8) { dbg('arapas_sut'); DBG.arapas_sut_xg = (DBG.arapas_sut_xg ?? 0) + xg; c.thruT = undefined; }
  addFx(st, c.x, c.y, 'kick');
  st.keyUntil = st.t + 1.8;
  const from: [number, number] = [st.ball.x, st.ball.y];
  const mk = (outcome: ShotInfo['outcome'], txf: number, tyf: number, apex: number, curve: number, speed: number, blocker?: PState) => {
    const [tx, ty] = fromFrame(side, txf, tyf);
    const dist = hyp(tx - from[0], ty - from[1]);
    face(c, tx - c.x, ty - c.y, 0.9);
    st.owner = null;
    st.flight = {
      fromX: from[0],
      fromY: from[1],
      toX: tx,
      toY: ty,
      t0: st.t,
      dur: Math.max(1.0, dist / speed),
      receiver: null,
      interceptor: null,
      kind: 'shot',
      passer: c,
      air: apex > 0.8,
      apex,
      curve,
      shot: { outcome, xg, setPiece, blocker, penalty: !!opt.penalty, kind: opt.penalty ? 'penalty' : opt.freekick ? 'freekick' : opt.header ? (setPiece ? 'sp-header' : 'header') : 'open' },
    };
  };
  const dist = hyp(105 - xf, 34 - yf);
  const speed = opt.header ? 13 : opt.penalty ? 24 : 27;
  const baseApex = opt.header ? 0.4 : opt.penalty ? 0.3 : dist > 18 ? 0.9 + st.rng() * 1.2 : 0.4 + st.rng() * 0.5;
  const fkCurve = opt.freekick ? (0.1 + st.rng() * 0.06) * (st.rng() < 0.5 ? 1 : -1) : (st.rng() - 0.5) * 0.05;
  // sut yolundaki savunmacilar blok yapabilir (yakindan uzaga)
  for (const b of blockers) {
    if (st.rng() < b.bp) {
      dbg('blok');
      const [oxf, oyf] = toFrame(side, b.p.x, b.p.y);
      mk('block', oxf, oyf, 0.3, 0, speed, b.p);
      return;
    }
  }
  const pOT = clamp(P.onTargetBase + 1.2 * pGoal, pGoal + 0.08, 0.9);
  const r = st.rng();
  if (r < pGoal) {
    const ty = 34 + (st.rng() - 0.5) * 6.4;
    mk('goal', 105.6, ty, opt.penalty ? 0.4 : Math.min(baseApex, 1.6), fkCurve, speed);
    return;
  }
  if (r < pOT) {
    const ty = 34 + (st.rng() - 0.5) * 6;
    mk('save', 104.2, ty, Math.min(baseApex, 1.8), fkCurve, speed);
    return;
  }
  // isabetsiz: yandan disari ya da ustten
  if (st.rng() < 0.65) {
    const sgn = st.rng() < 0.5 ? -1 : 1;
    mk('miss', 106, 34 + sgn * (4.2 + st.rng() * 3.5), baseApex, fkCurve, speed);
  } else {
    mk('miss', 106, 34 + (st.rng() - 0.5) * 6, 3.2 + st.rng() * 2, fkCurve, speed);
  }
}

function resolveShot(st: MatchState, f: Flight) {
  const c = f.passer;
  const side = c.side;
  const opp: 0 | 1 = side === 0 ? 1 : 0;
  const s = st.stats[side];
  const sh = f.shot!;
  const keeper = gk(st, opp);
  st.keyUntil = st.t + 1.5;
  st.ball.x = f.toX;
  st.ball.y = f.toY;
  if (sh.outcome === 'goal') {
    s.goals++;
    s.onTarget++;
    // duran top golu: duran topun kendisi ya da yeniden baslatmadan sonraki 6 saniye icinde (korner, serbest vurus, tac)
    if (sh.setPiece || st.t - st.lastRestartT < 6) s.setPieceGoals++;
    dbg('gol_' + (sh.kind ?? 'open') + (sh.setPiece || st.t - st.lastRestartT < 6 ? '_sp' : ''));
    st.events.push({ t: st.clock, type: 'goal', side, player: c.num, xg: sh.xg });
    st.extra[st.half - 1] += 0.5;
    const dur = 10 + st.rng() * 3;
    st.owner = null;
    st.pending = { kind: 'kickoff', side: opp, at: st.t + dur };
    st.celebrate = { side, scorer: c, until: st.t + 6.5 };
    deadTime(st, dur, 'GOL');
    return;
  }
  if (sh.outcome === 'block') {
    st.events.push({ t: st.clock, type: 'miss', side, player: c.num, xg: sh.xg, text: 'blok' });
    if (sh.blocker) say(st, 'block', opp, sh.blocker, c);
    if (st.rng() < P.cornerFromBlock) corner(st, side, f.toY);
    else if (sh.blocker) giveBall(st, sh.blocker, 0.8);
    return;
  }
  if (sh.outcome === 'save') {
    s.onTarget++;
    st.events.push({ t: st.clock, type: 'save', side, player: c.num, xg: sh.xg });
    addFx(st, keeper.x, keeper.y, 'save');
    say(st, 'save', opp, keeper, c);
    if (!sh.penalty && st.rng() < P.cornerFromSave) corner(st, side, f.toY);
    else {
      keeper.x = f.toX;
      keeper.y = f.toY;
      giveBall(st, keeper, 2.5);
      deadTime(st, 2.5 + st.rng() * 1.5, 'Kurtarış');
    }
    return;
  }
  st.events.push({ t: st.clock, type: 'miss', side, player: c.num, xg: sh.xg });
  if (!sh.penalty && st.rng() < P.cornerFromMiss) corner(st, side, f.toY);
  else {
    // aut: kaleci topu alip 6 pas cizgisine yurur
    const dur = 5 + st.rng() * 2;
    st.owner = null;
    st.pending = { kind: 'goalkick', side: opp, at: st.t + dur };
    deadTime(st, dur, 'Aut');
  }
}

function corner(st: MatchState, side: 0 | 1, nearY?: number) {
  const s = st.stats[side];
  s.corners++;
  st.events.push({ t: st.clock, type: 'corner', side });
  // topa yakin korner bayragi
  const [, yf] = toFrame(side, 0, nearY ?? (st.rng() < 0.5 ? 10 : 58));
  const flagY = yf < 34 ? 0.6 : 67.4;
  const [bx, by] = fromFrame(side, 104.4, flagY);
  st.owner = null;
  st.flight = null;
  st.ball.x = bx;
  st.ball.y = by;
  st.ballZ = 0;
  const att = liveTeam(st, side).filter((p) => p.pos !== 'GK');
  // kornerci: Oyun Kurucu, yoksa bayraga en yakin kanat/orta saha
  const pool = att.filter((p) => p.pos === 'W' || p.pos === 'CM' || p.pos === 'DM');
  const taker = (pool.find((p) => p.traits.includes('Oyun Kurucu')) ?? (pool.length ? pool : att).reduce((b, p) => (hyp(p.x - bx, p.y - by) < hyp(b.x - bx, b.y - by) ? p : b))) as PState;
  const dur = 7 + st.rng() * 2;
  st.pending = { kind: 'corner', side, at: st.t + dur, taker, spotX: 104.4, spotY: flagY };
  deadTime(st, dur, 'Korner');
}

function execCorner(st: MatchState, pd: Pending) {
  execSetPieceCross(st, pd, P.cornerHeaderChance);
}
// korner ya da serbest vurus ortasi: ceza sahasina havadan top, kafa mucadelesi
function execSetPieceCross(st: MatchState, pd: Pending, headerP: number) {
  const side = pd.side;
  const opp: 0 | 1 = side === 0 ? 1 : 0;
  const taker = pd.taker!;
  const [bx, by] = fromFrame(side, pd.spotX!, pd.spotY!);
  taker.x = bx;
  taker.y = by;
  st.ball.x = bx;
  st.ball.y = by;
  const txf = 96 + st.rng() * 4;
  const tyf = 34 + (st.rng() - 0.5) * 10;
  const [tx, ty] = fromFrame(side, txf, tyf);
  st.keyUntil = st.t + 2.5;
  // ceza sahasina giren oyuncu sayisi kafa sansini etkiler (3 kisi: x0,8, 7 kisi: x1,2)
  const nBox = P.spBoxN[st.teams[side].tactic.spBox ?? 1];
  const headerChance = st.rng() < headerP * (0.8 + 0.1 * (nBox - 3) / 1);
  // kafa vuracak oyuncu ya da uzaklastiracak savunmaci topa gider
  let att = liveTeam(st, side).filter((p) => p.pos !== 'GK' && p !== taker && toFrame(side, p.x, p.y)[0] > 85);
  if (att.length === 0) att = liveTeam(st, side).filter((p) => p.pos !== 'GK' && p !== taker);
  if (att.length === 0) att = liveTeam(st, side);
  const header = att.reduce((b, p) => (aerial(p) > aerial(b) ? p : b), att[0]);
  let defs = liveTeam(st, opp).filter((p) => p.pos !== 'GK');
  if (defs.length === 0) defs = liveTeam(st, opp);
  const bestDef = defs.reduce((b, p) => (aerial(p) > aerial(b) ? p : b), defs[0]);
  const inswing = (st.rng() < 0.5 ? 1 : -1) * (0.08 + st.rng() * 0.05);
  addFx(st, bx, by, 'kick');
  say(st, pd.kind === 'corner' ? 'cornerkick' : 'fk', side, taker);
  st.owner = null;
  st.flight = {
    fromX: bx,
    fromY: by,
    toX: tx,
    toY: ty,
    t0: st.t,
    dur: hyp(tx - bx, ty - by) / 15,
    receiver: headerChance ? header : null,
    interceptor: headerChance ? null : bestDef,
    kind: 'cross',
    passer: taker,
    air: true,
    apex: 6.5,
    curve: inswing,
  };
  // kafa vurusunu cozmek icin isaret
  st.pending = null;
  (st.flight as Flight & { corner?: { header: PState; ratio: number } }).corner = headerChance ? { header, ratio: aerial(header) / aerial(bestDef) } : undefined;
}

function aerial(p: PState): number {
  return eg(p) * (p.traits.includes('Hava Hakimi') ? 1.15 : 1) * (p.traits.includes('Duvar') ? 1.06 : 1) * (p.pos === 'CB' || p.pos === 'ST' ? 1.05 : 1);
}

// ---------- Duran toplarda dizilme ----------
// Duran top beklerken her oyuncunun gidecegi yer (dunya koordinati) ve yurume hizi. null: normal sekil.
function setPieceTarget(st: MatchState, p: PState): [number, number, number] | null {
  const pd = st.pending;
  const cel = st.celebrate;
  if (cel && st.t < cel.until && p.side === cel.side && p.pos !== 'GK') {
    const sc = cel.scorer;
    const [sxf, syf] = toFrame(sc.side, sc.x, sc.y);
    if (p === sc) {
      const [fx, fy] = fromFrame(sc.side, 101, syf < 34 ? 4 : 64);
      return [fx, fy, 0.75];
    }
    const k = p.idx;
    const [fx, fy] = fromFrame(sc.side, sxf - 1.5 - (k % 3), syf + ((k % 5) - 2) * 1.1);
    return [fx, fy, 0.85];
  }
  if (!pd) return null;
  const A = pd.side;
  const atk = p.side === A;
  const byAerial = (side: 0 | 1, excl?: PState) =>
    liveTeam(st, side)
      .filter((q) => q.pos !== 'GK' && q !== excl)
      .sort((a, b) => aerial(b) - aerial(a));
  if (pd.kind === 'kickoff') {
    if (p.pos === 'GK') {
      const [x, y] = fromFrame(p.side, 4, 34);
      return [x, y, 0.35];
    }
    const team = liveTeam(st, p.side).filter((q) => q.pos !== 'GK');
    const taker = team.reduce((b, q) => (q.ax > b.ax ? q : b), team[0]);
    if (atk && p === taker) {
      const [x, y] = fromFrame(p.side, 51.8, 34.6);
      return [x, y, 0.4];
    }
    const [x, y] = fromFrame(p.side, Math.min(p.ax * 0.92, 50.5), p.ay);
    return [x, y, 0.4];
  }
  if (pd.kind === 'corner') {
    if (atk) {
      if (p === pd.taker) {
        const [x, y] = fromFrame(A, pd.spotX!, pd.spotY!);
        return [x, y, 0.6];
      }
      if (p.pos === 'GK') return null;
      // taktik: ceza sahasina giren oyuncu sayisi (3 / 5 / 7); kalanlar ikinci top ve kontra icin geride
      const order = byAerial(A, pd.taker);
      const i = order.indexOf(p);
      const nBox = P.spBoxN[st.teams[A].tactic.spBox ?? 1];
      const boxSpots: [number, number][] = [[98, 30.5], [97.5, 38], [99.5, 34.5], [94, 41], [95, 27], [91, 34], [100, 41]];
      const outSpots: [number, number][] = [[86, 24], [86, 44], [78, 34], [70, 22], [70, 46], [56, 34], [50, 20]];
      const [sx, sy] = i < nBox ? boxSpots[Math.min(i, boxSpots.length - 1)] : outSpots[Math.min(i - nBox, outSpots.length - 1)];
      const [x, y] = fromFrame(A, sx, sy);
      return [x, y, 0.45];
    }
    if (p.pos === 'GK') {
      const [x, y] = fromFrame(A, 104.3, 34);
      return [x, y, 0.45];
    }
    const order = byAerial(p.side);
    const i = order.indexOf(p);
    const spots: [number, number][] = [[100, 30.5], [100, 38], [101.5, 34.5], [104, 30.8], [104, 37.2], [96, 34], [89, 25], [89, 43], [66, 34], [64, 20]];
    const [sx, sy] = spots[Math.min(i, spots.length - 1)];
    const [x, y] = fromFrame(A, sx, sy);
    return [x, y, 0.45];
  }
  if (pd.kind === 'penalty') {
    if (atk && p === pd.taker) {
      const [x, y] = fromFrame(A, 92.8, 34);
      return [x, y, 0.4];
    }
    if (!atk && p.pos === 'GK') {
      const [x, y] = fromFrame(A, 104.6, 34);
      return [x, y, 0.4];
    }
    if (atk && p.pos === 'GK') return null;
    const k = p.idx;
    const [x, y] = fromFrame(A, atk ? 84.5 : 86, 18 + ((k * 3 + (atk ? 0 : 1)) % 11) * 3.2);
    return [x, y, 0.45];
  }
  if (pd.kind === 'goalkick') {
    if (p.side === A && p.pos === 'GK') {
      const [x, y] = fromFrame(A, 6, 34);
      return [x, y, 0.45];
    }
    if (p.pos === 'GK') {
      const [x, y] = fromFrame(p.side, 6, 34);
      return [x, y, 0.4];
    }
    if (p.side === A) {
      // aut kullanan takim kendi yarisinda acilir
      const [x, y] = fromFrame(A, 14 + (p.ax - 22) * 0.75, 34 + (p.ay - 34) * 1.12);
      return [x, y, 0.45];
    }
    // rakip orta sahaya ve kendi pres hattina cekilir
    const [x, y] = fromFrame(p.side, 34 + (p.ax - 22) * 0.55, p.ay);
    return [x, y, 0.45];
  }
  if (pd.kind === 'fkshot' || pd.kind === 'fk') {
    const spotX = pd.spotX!, spotY = pd.spotY!;
    const distG = hyp(105 - spotX, 34 - spotY);
    const crowd = pd.kind === 'fk' && distG < 40; // ceza sahasina atilacak: yigilma
    if (atk && p === pd.taker) {
      const [x, y] = fromFrame(A, spotX - 1.2, spotY - 0.6);
      return [x, y, 0.5];
    }
    if (atk) {
      if (!crowd || p.pos === 'GK') return null;
      const order = byAerial(A, pd.taker);
      const i = order.indexOf(p);
      const nBox = P.spBoxN[st.teams[A].tactic.spBox ?? 1];
      const boxSpots: [number, number][] = [[97, 31], [97, 37], [99, 34], [94, 40], [94, 28], [91, 34], [100, 40]];
      const outSpots: [number, number][] = [[84, 24], [84, 44], [76, 34], [68, 22], [68, 46], [55, 34], [50, 20]];
      const [sx, sy] = i < nBox ? boxSpots[Math.min(i, boxSpots.length - 1)] : outSpots[Math.min(i - nBox, outSpots.length - 1)];
      const [x, y] = fromFrame(A, sx, sy);
      return [x, y, 0.45];
    }
    if (p.pos === 'GK') {
      if (!crowd) return null;
      const [x, y] = fromFrame(A, 103.5, 34);
      return [x, y, 0.45];
    }
    // baraj: topa en yakin n savunmaci, kaleye dogru 9,15 m'de
    const nWall = pd.wall ?? 0;
    const [bx, by] = fromFrame(A, spotX, spotY);
    const near = liveTeam(st, p.side)
      .filter((q) => q.pos !== 'GK')
      .sort((a, b) => hyp(a.x - bx, a.y - by) - hyp(b.x - bx, b.y - by))
      .slice(0, nWall);
    const i = near.indexOf(p);
    if (i >= 0) {
      const vx = 105 - spotX;
      const vy = 34 - spotY;
      const len = Math.hypot(vx, vy) || 1;
      const wx = spotX + (vx / len) * 9.15 + (-vy / len) * (i - (nWall - 1) / 2) * 0.9;
      const wy = spotY + (vy / len) * 9.15 + (vx / len) * (i - (nWall - 1) / 2) * 0.9;
      const [x, y] = fromFrame(A, wx, wy);
      return [x, y, 0.5];
    }
    if (crowd) {
      // savunma: kalanlar ceza sahasinda markaj
      const order = byAerial(p.side).filter((q) => !near.includes(q));
      const j = order.indexOf(p);
      const spots: [number, number][] = [[100, 30.5], [100, 37.5], [101.5, 34], [97, 29], [97, 39], [93, 34], [89, 25], [89, 43], [80, 34], [66, 34]];
      const [sx, sy] = spots[Math.min(Math.max(j, 0), spots.length - 1)];
      const [x, y] = fromFrame(A, sx, sy);
      return [x, y, 0.45];
    }
    return null;
  }
  if (pd.kind === 'throw') {
    const spotX = pd.spotX!, spotY = pd.spotY!;
    const deep = spotX > 78; // rakip kaleye yakin tac: bolgeye yigilma
    const inward = spotY < 34 ? 1 : -1;
    if (atk && p === pd.taker) return null;
    if (p.pos === 'GK') return null;
    const [bx, by] = fromFrame(A, spotX, spotY);
    if (atk) {
      const order = liveTeam(st, A).filter((q) => q.pos !== 'GK' && q !== pd.taker).sort((a, b) => hyp(a.x - bx, a.y - by) - hyp(b.x - bx, b.y - by));
      const i = order.indexOf(p);
      const n = deep ? 4 : 2;
      if (i < 0 || i >= n) return null;
      const spots: [number, number][] = deep ? [[spotX + 6, spotY + inward * 5], [spotX - 5, spotY + inward * 6], [97, 31], [97, 37]] : [[spotX + 7, spotY + inward * 4], [spotX - 6, spotY + inward * 5]];
      const [x, y] = fromFrame(A, clamp(spots[i][0], 2, 103), clamp(spots[i][1], 1, 67));
      return [x, y, 0.5];
    }
    // savunma: en yakin n+1 oyuncu, atanlara 1,5 m kale tarafinda
    const order = liveTeam(st, p.side).filter((q) => q.pos !== 'GK').sort((a, b) => hyp(a.x - bx, a.y - by) - hyp(b.x - bx, b.y - by));
    const i = order.indexOf(p);
    const n = deep ? 5 : 3;
    if (i < 0 || i >= n) return null;
    const marks: [number, number][] = deep ? [[spotX + 5, spotY + inward * 6], [spotX - 6, spotY + inward * 7], [96, 31], [96, 37], [spotX - 1, spotY + inward * 9.5]] : [[spotX + 6, spotY + inward * 5.5], [spotX - 7, spotY + inward * 6], [spotX - 1, spotY + inward * 9.5]];
    const [x, y] = fromFrame(A, clamp(marks[i][0], 2, 103), clamp(marks[i][1], 1, 67));
    return [x, y, 0.5];
  }
  return null;
}

function execPending(st: MatchState, pd: Pending) {
  st.deadReason = '';
  if (pd.kind === 'kickoff') {
    st.celebrate = null;
    kickoff(st, pd.side);
    return;
  }
  if (pd.kind === 'corner') {
    execCorner(st, pd);
    return;
  }
  // penalti ve direkt serbest vurus: vurustan once kisa bir nisan anı
  if ((pd.kind === 'penalty' || pd.kind === 'fkshot') && !(pd as any).armed) {
    (pd as any).armed = true;
    pd.at = st.t + 0.6;
    st.pending = pd;
    const [ax, ay] = pd.kind === 'penalty' ? fromFrame(pd.side, 94, 34) : fromFrame(pd.side, pd.spotX!, pd.spotY!);
    addFx(st, ax, ay, 'aim');
    return;
  }
  if (pd.kind === 'penalty') {
    const taker = pd.taker!;
    const [x, y] = fromFrame(pd.side, 93.8, 34);
    taker.x = x;
    taker.y = y;
    const [bx, by] = fromFrame(pd.side, 94, 34);
    st.ball.x = bx;
    st.ball.y = by;
    st.keyUntil = st.t + 2;
    shoot(st, taker, 94, 34, 0, true, P.penaltyP, { penalty: true });
    return;
  }
  if (pd.kind === 'goalkick') {
    const keeper = gk(st, pd.side);
    const [x, y] = fromFrame(pd.side, 6, 34);
    keeper.x = x;
    keeper.y = y;
    giveBall(st, keeper, 1.5);
    return;
  }
  if (pd.kind === 'throw') {
    const taker = pd.taker!;
    const [bx, by] = fromFrame(pd.side, pd.spotX!, pd.spotY!);
    taker.x = bx;
    taker.y = by;
    giveBall(st, taker, 0.3);
    return;
  }
  if (pd.kind === 'fk') {
    const taker = pd.taker!;
    const [bx, by] = fromFrame(pd.side, pd.spotX!, pd.spotY!);
    taker.x = bx;
    taker.y = by;
    st.ball.x = bx;
    st.ball.y = by;
    const distG = hyp(105 - pd.spotX!, 34 - pd.spotY!);
    if (distG < 40) {
      // ceza sahasina ortala: kafa mucadelesi (korner gibi)
      execSetPieceCross(st, pd, P.fkCrossHeader);
      return;
    }
    giveBall(st, taker, 0.8);
    return;
  }
  if (pd.kind === 'fkshot') {
    const taker = pd.taker!;
    const [bx, by] = fromFrame(pd.side, pd.spotX!, pd.spotY!);
    taker.x = bx;
    taker.y = by;
    st.ball.x = bx;
    st.ball.y = by;
    st.keyUntil = st.t + 2;
    say(st, 'fk', pd.side, taker);
    shoot(st, taker, pd.spotX!, pd.spotY!, 0.3, true, pd.xg, { freekick: true });
  }
}

// ---------- Mudahale ve faul ----------
function tackle(st: MatchState, d: PState, c: PState, behind = false) {
  const side = d.side;
  const oppT = st.teams[side];
  const [cxf] = toFrame(c.side, c.x, c.y);
  // faul ihtimali (Metrik sekmesi)
  const Pp = [0.8, 1.0, 1.3][oppT.tactic.press];
  const G = clamp((eg(c) - eg(d)) / eg(d), 0, 0.5);
  st.stats[side].duels++;
  const [cxfF, cyfF] = toFrame(c.side, c.x, c.y);
  const inBoxT = cxfF > 88.5 && Math.abs(cyfF - 34) < 20.16;
  const pFoul = P.foulBase * Pp * (1 + 0.6 * (1 - d.k / 100)) * (1 + G) * (d.yellow ? 0.6 : 1) * (inBoxT ? P.inBoxFoul : 1) * (behind ? P.behindFoul : 1);
  dbg('mudahale_deneme');
  if (st.rng() < pFoul) {
    foul(st, d, c, cxf);
    return;
  }
  if (st.rng() < duelWin(eg(d) * (d.traits.includes('Duvar') ? 1.1 : 1), eg(c) * Math.sqrt(dribbleSkill(c))) * (d.yellow ? 0.95 : 1) * (behind ? P.behindWin : 1)) {
    dbg('kayip_mudahale');
    addFx(st, c.x, c.y, 'clean');
    say(st, 'tackle', d.side, d, c);
    const [zx] = toFrame(c.side, c.x, c.y);
    dbg(zx < 35 ? 'kayip_mud_kendi' : zx < 70 ? 'kayip_mud_orta' : 'kayip_mud_hucum');
    giveBall(st, d, 0.7);
  } else {
    // basarisiz mudahale: tasiyici bir adim kazanir
    addFx(st, c.x, c.y, 'clean');
    say(st, 'evade', c.side, c, d);
    st.holdUntil = st.t;
    dribbleMove(st, c, 1);
  }
}

function foul(st: MatchState, d: PState, c: PState, cxf: number) {
  const ds = st.stats[d.side];
  ds.fouls++;
  addFx(st, c.x, c.y, 'foul');
  const fxe = st.fx[st.fx.length - 1];
  st.events.push({ t: st.clock, type: 'foul', side: d.side, player: d.num });
  // son adam: faul yapan ile kale arasinda baska savunmaci (kaleci haric) yoksa
  let between = 0;
  for (const o of st.players) {
    if (o.side !== d.side || o.off || o === d || o.pos === 'GK') continue;
    if (toFrame(c.side, o.x, o.y)[0] > cxf) between++;
  }
  const lastMan = cxf > 70 && between === 0;
  if (lastMan) dbg('son_adam');
  const pY = lastMan ? 0.5 : 0.13;
  const pR = lastMan ? 0.15 : 0.004;
  const r = st.rng();
  if (r < pR + pY) fxe.kind = 'card'; // kartlik sert mudahale
  if (r < pR) sendOff(st, d, 'red');
  else if (r < pR + pY) {
    d.yellow++;
    ds.yellows++;
    st.events.push({ t: st.clock, type: 'yellow', side: d.side, player: d.num });
    st.extra[st.half - 1] += 0.25;
    if (d.yellow >= 2) sendOff(st, d, 'red');
  }
  const [xf, yf] = toFrame(c.side, c.x, c.y);
  const inBox = xf > 88.5 && Math.abs(yf - 34) < 20.16;
  if (inBox) {
    st.events.push({ t: st.clock, type: 'penalty', side: c.side, player: c.num });
    dbg('penalti');
    const cands = liveTeam(st, c.side).filter((p) => p.pos !== 'GK');
    const taker = cands.reduce((b, p) => (p.traits.includes('Bitirici') && !b.traits.includes('Bitirici') ? p : eg(p) > eg(b) ? p : b), cands[0] ?? c);
    const [bx, by] = fromFrame(c.side, 94, 34);
    st.owner = null;
    st.ball.x = bx;
    st.ball.y = by;
    const dur = 8 + st.rng() * 2;
    st.pending = { kind: 'penalty', side: c.side, at: st.t + dur, taker };
    deadTime(st, dur, 'Penaltı');
    return;
  }
  const dist = hyp(105 - xf, 34 - yf);
  // direkt serbest vurus: kaleye 17-30 m, aci uygunsa; gol olasiligi mesafe ve aciyla duser
  const angF = clamp(goalAngle(xf, yf) / 0.33, 0, 1.2); // 22 m merkez = 1
  if (dist > 17 && dist < 32 && angF > 0.4 && st.rng() < 0.5) {
    st.events.push({ t: st.clock, type: 'freekick', side: c.side, player: c.num });
    st.owner = null;
    st.ball.x = c.x;
    st.ball.y = c.y;
    const dur = 7 + st.rng() * 2;
    // uzak frikigi Bitirici, yoksa en guclu hucum oyuncusu kullanir (duran top gorevlileri)
    const fkCands = liveTeam(st, c.side).filter((p) => p.pos !== 'GK');
    const fkTaker = fkCands.reduce((b, p) => (p.traits.includes('Bitirici') && !b.traits.includes('Bitirici') ? p : !p.traits.includes('Bitirici') && b.traits.includes('Bitirici') ? b : eg(p) > eg(b) ? p : b), fkCands[0] ?? c);
    st.pending = { kind: 'fkshot', side: c.side, at: st.t + dur, taker: fkTaker, spotX: xf, spotY: yf, xg: P.fkP * angF * clamp(1 - (dist - 22) / 16, 0.4, 1.3), wall: dist < 22 ? 5 : 4 };
    deadTime(st, dur, 'Serbest vuruş');
    return;
  }
  // dolayli serbest vurus: rakip yarisahada baraj kurulur; ceza sahasina yakinsa top ceza sahasina atilir
  const wall = dist > 45 ? 0 : dist > 30 ? 2 : dist > 24 ? 3 : 4;
  const dur = wall > 0 ? 6 + st.rng() * 2 : 4 + st.rng() * 2.5;
  st.owner = null;
  st.ball.x = c.x;
  st.ball.y = c.y;
  st.pending = { kind: 'fk', side: c.side, at: st.t + dur, taker: c, spotX: xf, spotY: yf, wall };
  deadTime(st, dur, 'Serbest vuruş');
}

function sendOff(st: MatchState, p: PState, _k: string) {
  if (p.off) return;
  p.off = true;
  st.stats[p.side].reds++;
  st.events.push({ t: st.clock, type: 'red', side: p.side, player: p.num });
  st.extra[st.half - 1] += 0.25;
  // 10 kisi: guc x0.90, yorulma x1.15 (Metrik sekmesi)
  for (const q of st.players) {
    if (q.side === p.side && !q.off) {
      q.egBase *= 0.9;
      q.kDrop *= 1.15;
    }
  }
  p.x = -10;
  p.y = -10;
  if (st.owner === p) st.owner = null;
  // kaleci atildiysa: ilk olu topta yedek kaleci girer (autoSubs); o ana kadar bir saha oyuncusu eldivenleri giyer
  if (p.pos === 'GK') {
    const cands = liveTeam(st, p.side);
    if (cands.length) {
      const sub = cands.reduce((b, q) => (q.egBase < b.egBase ? q : b), cands[0]);
      sub.pos = 'GK';
      sub.emergencyGk = true;
      const [x, y] = fromFrame(sub.side, 4, 34);
      sub.x = x;
      sub.y = y;
    }
  }
}

// ---------- Tam mac ----------
export function simulate(a: TeamIn, b: TeamIn, seed: number, opts?: { knockout?: boolean }): MatchState {
  const st = createMatch(a, b, seed, opts);
  let guard = 0;
  while (!st.done && guard++ < 40000) step(st);
  return st;
}

// ---------- Ornek takim uretimi (test icin) ----------
const NAMES_A = ['Kaya', 'Demir', 'Aydın', 'Yıldız', 'Şahin', 'Çelik', 'Arslan', 'Doğan', 'Kurt', 'Öztürk', 'Koç', 'Polat', 'Erdem', 'Aksoy', 'Kılıç', 'Tekin', 'Uysal', 'Güneş'];
const NAMES_B = ['Silva', 'Costa', 'Moreau', 'Rossi', 'Novak', 'Berg', 'Duarte', 'Keller', 'Laurent', 'Ivanov', 'Rocha', 'Meyer', 'Bianchi', 'Lund', 'Varga', 'Petrov', 'Garcia', 'Nilsen'];

export function makeTeam(name: string, short: string, gg: number, opts: Partial<TeamIn> = {}, names = NAMES_A, color = '#c8302c', color2 = '#ffffff'): TeamIn {
  const formation = (opts.formation ?? '4-3-3') as Formation;
  const pos = FORM_POS[formation];
  const nums = FORM_NUM[formation];
  // prototip kadrosu: birkac ozellik, kadrolarda ayni sirayla (denge testleri simetrik kalir)
  const traitAt: Record<number, string[]> = { 2: ['Hava Hakimi'], 3: ['Duvar'], 6: ['Oyun Kurucu'], 8: ['Çalımcı'], 9: ['Bitirici'], 10: ['Hızlı'] };
  const players: PlayerIn[] = pos.map((p, i) => ({ num: nums[i], name: names[i], pos: p, gg, fatigue: 20, traits: traitAt[i] }));
  const benchPos: Pos[] = ['GK', 'CB', 'FB', 'DM', 'CM', 'W', 'ST'];
  const bench: PlayerIn[] = benchPos.map((p, i) => ({ num: 12 + i, name: names[11 + i] ?? `Yedek ${i + 1}`, pos: p, gg, fatigue: 20 }));
  return {
    name,
    short,
    color,
    color2,
    formation,
    players,
    bench,
    U: 60,
    T: 60,
    F: 60,
    M: 70,
    tactic: { press: 1, line: 1, style: 1, tempo: 1, width: 1 },
    ...opts,
  } as TeamIn;
}

export { NAMES_A, NAMES_B };
