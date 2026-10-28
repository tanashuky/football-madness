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
  vx?: number; // hareket hizi (m/s), son adimdan; pas onune atmak icin
  vy?: number;
  thruT?: number; // ara pasi aldigi an (sonraki karar icin)
  emergencyGk?: boolean; // kaleci atilinca kaleye gecen saha oyuncusu
  injured?: boolean; // sakat: degisiklik bekler, yoksa topallar
  subbed?: boolean; // oyundan cikti (degisiklik)
  beatenUntil?: number; // kosu yarisini kaybeden savunmaci: bu ana kadar yavas, mudahale edemez
}

// ---------- Fiziksel top (motor 2.0) ----------
// Top gercek bir cisimdir: hiz, yukseklik, surtunme, sekme ve falso. Pasin alicisi onceden belirlenmez; topa ilk
// yetisen alir. Vurus hatasi oyuncunun gucune ve ustundeki baskiya gore acisal sapmadir (gizli zar yoktur).
export type BallKind = 'none' | 'pass' | 'through' | 'cross' | 'shot' | 'clear' | 'header' | 'loose';
export interface Ball {
  x: number;
  y: number;
  z: number; // yukseklik (m)
  vx: number;
  vy: number;
  vz: number;
  sw: number; // falso: hiz yonune dik ivme (m/s2), isaret sola/saga
  kind: BallKind; // son vurusun turu; 'none': topa sahip olunuyor ya da top duruyor
  kicker: PState | null; // son vuran (ofsayt, aut/korner ve istatistik icin)
  kickT: number; // son vurus ani (fiziksel s)
  touch: PState | null; // topa son dokunan (korner / aut karari)
  intended: PState | null; // pasin hedeflenen alicisi (kontrol ve anlatim icin; topu almak zorunda degildir)
  tx: number; // hedef nokta (nisan)
  ty: number;
  shot: { xg: number; setPiece: boolean; kind: string; penalty?: boolean } | null; // sut ise kayit bilgisi
  offside: Set<PState> | null; // vurus aninda ofsayt konumundaki takim arkadaslari
  dip: number; // ust falso: havada ek asagi ivme (serbest vurus)
  gkTried?: boolean; // kaleci bu suta bir kez uzandi
  shotOT?: boolean; // sut isabetli yolda mi (vurus aninda tahmin)
  pkY?: number; // penaltida kalecinin tahmin ettigi kose (dunya y)
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
  ball: Ball;
  ballZ: number; // topun yuksekligi (m) - ball.z'nin kopyasi (ekran uyumlulugu)
  pending: Pending | null; // siradaki duran top
  celebrate: { side: 0 | 1; scorer: PState; until: number } | null;
  deadStart: number; // olu surenin basladigi an
  keyUntil: number; // onemli an: izleme ekrani bu ana kadar yavaslar
  fx: { t: number; x: number; y: number; kind: FxKind }[]; // ekran efektleri: mudahaleler, vuruslar
  log: LogEntry[]; // anlatim kayitlari (ekran metne cevirir)
  owner: PState | null;
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
  dt: 0.1, // tick (fiziksel saniye); motor 2.0 ile tek adim suresi (izleme ve oynama ayni)
  clockRate: 6, // fiziksel saniye basina oyun saati saniyesi
  // --- fiziksel top ---
  ballFric: 0.45, // yerde hiz kaybi (1/s): hiz ustel azalir, v0 ile yaklasik v0/0,45 m yol
  ballAir: 0.04, // havada hafif direnc (1/s)
  ballRest: 0.55, // sekmede dikey hiz orani
  ballBounceFric: 0.8, // sekmede yatay hiz orani
  passEnd: 6, // pasin aliciya varis hizi (m/s); baslangic hizi = bu + surtunme x mesafe
  kickMax: 30, // en sert vurus (m/s)
  ctrlSpeed: 19, // bu hizin ustundeki top ayakla kontrol edilemez: sekerek uzaklasir (blok)
  reach: 0.9, // oyuncunun topa ulasma yaricapi (m)
  headZ: [1.2, 2.35] as number[], // kafa/gogus yuksekligi araligi (m): bunun ustu kimseye ulasmaz
  gkReach: 1.4, // kalecinin topa ulasma yaricapi (m); dalista uzar
  gkDive: 2.4, // kalecinin sut aninda en fazla uzanma (m)
  gkCatch: 17, // bu hizin altindaki topu kaleci tutar, ustunu cıkartir (celer)
  kickCd: 0.6, // vuran oyuncu bu sure topa yeniden dokunamaz (s)
  kickErr: 0.045, // vurus aci hatasi tabani (radyan, 1 sigma); guc orani ve baski ile olceklenir
  kickErrPress: 0.5, // baski basina ek hata orani
  shotErr: 0.1, // sut aci hatasi tabani (radyan)
  shotSpeed: 24, // sut hizi tabani (m/s)
  reactOpp: 0.4, // rakibin yeni vurulan topa tepki suresi (s)
  reactMate: 0.25, // hedeflenmemis takim arkadasinin tepki suresi
  tackleRate: 0.22, // temas mesafesinde mudahale denemesi (1/s), baskiyla artar
  tackleReach: 1.5, // mudahale icin azami mesafe (m)
  sepD: 2.0, // oyuncular arasi asgari mesafe (m); top sahibi-rakip haric
  offBallUrg: 0.65,
  thruRace: 2.5, // ara pasta kosu yarisinin keskinligi (sn farkina gore)
  thruReact: 0.4, // savunmacinin ara pasa tepki suresi (sn)
  transReact: 0.3, // gecis aninda (top yeni el degistirdiyse) ek tepki suresi
  transWin: 4, // gecis penceresi (fiziksel sn)
  thruMinX: 58, // ara pas hedefi en az bu kadar ileride olmali (hucum ucuncu bolgesine yakin)
  thruSpeed: 14,
  lobCost: 0.06, // havadan (asirtma) ara pasin isabet bedeli // ara pasin top hizi (m/s); kosucuya gore agirlik verilir
  thruV: 0.08, // ara pas hedefinin deger carpani (kosuda ilk kontrol riski)
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
    ball: { x: L / 2, y: W / 2, z: 0, vx: 0, vy: 0, vz: 0, sw: 0, kind: 'none', kicker: null, kickT: -9, touch: null, intended: null, tx: 0, ty: 0, shot: null, offside: null, dip: 0 },
    ballZ: 0,
    pending: null,
    celebrate: null,
    deadStart: 0,
    keyUntil: 0,
    fx: [],
    log: [],
    owner: null,
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
  const b = st.ball;
  b.x = Math.min(L - 0.3, Math.max(0.3, c.x + c.hx * 0.9));
  b.y = Math.min(W - 0.3, Math.max(0.3, c.y + c.hy * 0.9));
  b.z = 0; b.vx = 0; b.vy = 0; b.vz = 0; b.sw = 0;
  st.ballZ = 0;
}
// topu durdurup bir noktaya koyar (duran toplar)
function placeBall(st: MatchState, x: number, y: number) {
  const b = st.ball;
  b.x = x; b.y = y; b.z = 0; b.vx = 0; b.vy = 0; b.vz = 0; b.sw = 0;
  b.kind = 'none'; b.kicker = null; b.intended = null; b.shot = null; b.offside = null; b.dip = 0; b.pkY = undefined;
  st.ballZ = 0;
}
const ballSpeed = (st: MatchState) => hyp(st.ball.vx, st.ball.vy);
// top hareket halinde mi (kimsede degil ve bir vurustan sonra yolda)
export function ballMoving(st: MatchState): boolean {
  const b = st.ball;
  return !st.owner && (b.z > 0.02 || hyp(b.vx, b.vy) > 0.5);
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
  placeBall(st, L / 2, W / 2);
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

// ---------- Top fizigi ----------
const G = 9.81;
interface BallSim { x: number; y: number; z: number; vx: number; vy: number; vz: number; sw: number; dip: number }
// bir adim ileri: havada yercekimi ve hafif direnc, yerde ustel surtunme, inişte sekme, falso yana ivme
function integrateBall(b: BallSim, dt: number) {
  if (b.z > 0 || b.vz > 0) {
    b.vz -= (G + b.dip) * dt;
    const k = Math.exp(-P.ballAir * dt);
    b.vx *= k; b.vy *= k;
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    if (b.z <= 0) {
      b.z = 0;
      b.vz = -b.vz * P.ballRest;
      b.vx *= P.ballBounceFric; b.vy *= P.ballBounceFric;
      if (b.vz < 1.2) b.vz = 0;
    }
  } else {
    const k = Math.exp(-P.ballFric * dt);
    const s = hyp(b.vx, b.vy);
    if (s < 0.25) { b.vx = 0; b.vy = 0; }
    else {
      // konum: hizin adim boyunca integrali (ustel azalma icin kapali form)
      const f = (1 - k) / P.ballFric;
      b.x += b.vx * f; b.y += b.vy * f;
      b.vx *= k; b.vy *= k;
    }
  }
  if (b.sw !== 0) {
    const s = hyp(b.vx, b.vy);
    if (s > 2) {
      const ax = (-b.vy / s) * b.sw, ay = (b.vx / s) * b.sw;
      b.vx += ax * dt; b.vy += ay * dt;
      b.sw *= Math.exp(-0.35 * dt);
    } else b.sw = 0;
  }
}
interface PathPt { t: number; x: number; y: number; z: number; v: number }
// topun tahmini yolu (0,1 s ornekleme): hareket eden topa kim ne zaman yetisir sorusu icin; tum oyuncular ayni tahmini kullanir
function ballPath(st: MatchState, maxT = 5): PathPt[] {
  const cache = (st as any)._path as { t: number; k: number; pts: PathPt[] } | undefined;
  const b = st.ball;
  if (cache && cache.t === st.t && cache.k === b.kickT) return cache.pts;
  const s: BallSim = { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz, sw: b.sw, dip: b.dip };
  const pts: PathPt[] = [{ t: 0, x: s.x, y: s.y, z: s.z, v: hyp(s.vx, s.vy) }];
  const h = 0.1;
  for (let t = h; t <= maxT + 1e-9; t += h) {
    integrateBall(s, h);
    pts.push({ t, x: s.x, y: s.y, z: s.z, v: hyp(s.vx, s.vy) });
    if (s.x < -0.5 || s.x > L + 0.5 || s.y < -0.5 || s.y > W + 0.5) break;
    if (s.z <= 0 && s.vz === 0 && hyp(s.vx, s.vy) < 0.5) break;
  }
  (st as any)._path = { t: st.t, k: b.kickT, pts };
  return pts;
}
// oyuncunun topa yetisebilecegi ilk nokta: tepki suresinden sonra tam hizla kosar; cok yuksek top ulasilmaz
function interceptPt(p: PState, pts: PathPt[], react: number, speed: number, maxZ = P.headZ[1], maxV = 99): { pt: PathPt; t: number } | null {
  for (const pt of pts) {
    if (pt.z > maxZ || pt.v > maxV) continue;
    const d = hyp(pt.x - p.x, pt.y - p.y);
    if (d <= speed * Math.max(0, pt.t - react) + P.reach) return { pt, t: pt.t };
  }
  return null;
}
// yetisemiyorsa: topun duracagi yere kosar
function chaseTarget(p: PState, pts: PathPt[], react: number, speed: number, maxV = 99): { x: number; y: number; t: number } {
  const ip = interceptPt(p, pts, react, speed, P.headZ[1], maxV);
  if (ip) return { x: ip.pt.x, y: ip.pt.y, t: ip.t };
  const last = pts[pts.length - 1];
  return { x: last.x, y: last.y, t: Math.max(last.t, hyp(last.x - p.x, last.y - p.y) / speed + react) };
}
const playerSpeed = (p: PState) => p.speedBase * kf(p.k) * (p.injured ? 0.5 : 1);
// takim icin tepki suresi: hedeflenen alici hemen, takim arkadaslari kisa, rakip daha gec (gecis aninda daha da gec)
function reactOf(st: MatchState, p: PState): number {
  const b = st.ball;
  if (!b.kicker) return 0;
  if (p === b.intended) return 0;
  if (p.side === b.kicker.side) return P.reactMate;
  return P.reactOpp + (b.kickT - st.lastTurnoverT < P.transWin ? P.transReact : 0) + (st.teams[p.side].tactic.trap ? 0 : 0);
}

// ---------- Takim sekli ----------
function updateAnchorsAndMove(st: MatchState) {
  const dt = st.dt;
  const possSide: 0 | 1 = st.owner ? st.owner.side : st.lastPossSide;
  const carrier = st.owner;
  // tum hareketler once hesaplanir, sonra birlikte uygulanir: islem sirasi bir tarafa avantaj vermez
  const moves = new Map<PState, [number, number]>();
  // sahipsiz / yolda top: her takimdan topa en erken yetisebilecek oyuncular topa kosar (hedeflenen alici her zaman)
  const chase = new Map<PState, { x: number; y: number; t: number }>();
  const loose = !carrier && !st.pending && !st.celebrate && st.t >= st.restartUntil;
  if (loose) {
    const pts = ballPath(st);
    const b = st.ball;
    const toGoal = b.kind === 'shot';
    for (let s = 0 as 0 | 1; s < 2; s = (s + 1) as 0 | 1) {
      const cands: { p: PState; c: { x: number; y: number; t: number } }[] = [];
      const ownKick = !!b.kicker && b.kicker.side === s;
      for (const q of liveTeam(st, s)) {
        if (q.injured) continue;
        const c = chaseTarget(q, pts, reactOf(st, q), playerSpeed(q), ownKick ? P.ctrlSpeed - 1 : 99);
        if (q.pos === 'GK') {
          // kaleci yalniz kendi ceza sahasina dusecek topa cikar; sut ona dogruysa ayri kural (asagida)
          const [cxf, cyf] = toFrame(s, c.x, c.y);
          if (!(cxf < 16.5 && Math.abs(cyf - 34) < 20.16) || toGoal) continue;
        }
        cands.push({ p: q, c });
      }
      cands.sort((a, b2) => a.c.t - b2.c.t);
      const n = b.kicker && b.kicker.side === s ? 1 : 2;
      for (let i = 0; i < Math.min(n, cands.length); i++) chase.set(cands[i].p, cands[i].c);
      if (b.intended && b.intended.side === s && !b.intended.off && !chase.has(b.intended)) chase.set(b.intended, chaseTarget(b.intended, pts, 0, playerSpeed(b.intended), P.ctrlSpeed - 1));
    }
  }
  (st as any)._chase = chase;
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
    if (!inPoss && !deadBall && carrier) {
      const tx = carrier.x;
      const ty = carrier.y;
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
        txf = clamp(2.5 + Math.max(0, bxf - 40) * 0.1 + (t.tactic.line === 2 ? 3 : 0), 1.5, 12);
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
      // kaleci: kendi kalesine gelen sut - topun yolunu keser (dalis hizi), tepkiden sonra
      if (p.pos === 'GK' && loose && st.ball.kind === 'shot' && st.ball.kicker && st.ball.kicker.side !== s) {
        const pts = ballPath(st);
        const ip = interceptPt(p, pts, 0.12, 8.5, 2.6);
        if (st.ball.pkY !== undefined) { [tx, ty] = fromFrame(s, 0.8, toFrame(s, 0, st.ball.pkY)[1]); } // penalti: tahmin ettigi koseye dalar
        else if (ip) { tx = ip.pt.x; ty = ip.pt.y; }
        else {
          // yetisemiyor: kale cizgisinde topun gececegi noktaya yine de uzanir
          const last = pts[pts.length - 1];
          const [, lyf] = toFrame(s, last.x, last.y);
          [tx, ty] = fromFrame(s, 1.0, clamp(lyf, 29.5, 38.5));
        }
        urg = 1.25; // dalis
      }
      const ch = chase.get(p);
      if (ch) {
        tx = ch.x;
        ty = ch.y;
        urg = 1;
        // tepki suresi dolmadiysa oyuncu henuz donmemistir: yerinde kalir
        if (st.ball.kicker && st.t - st.ball.kickT < reactOf(st, p)) { tx = p.x; ty = p.y; }
      }
      if (pressers.includes(p) && carrier) {
        // pres yapan, tasiyicinin kale tarafinda durur (yolu kapatir)
        const [gx, gy] = fromFrame(s, 0, 34);
        const gd = hyp(gx - carrier.x, gy - carrier.y) || 1;
        tx = carrier.x + ((gx - carrier.x) / gd) * 1.2;
        ty = carrier.y + ((gy - carrier.y) / gd) * 1.2;
        // tasiyici gecmisse (kendi kalesine daha yakinsa) tam hizla geri kosar
        if (toFrame(s, carrier.x, carrier.y)[0] < toFrame(s, p.x, p.y)[0] - 1) urg = 0.95;
        if (urg < 0.9) urg = 0.9;
      }
      // kullanici kontrolu: joystick varsa hedef o yondedir (pas yoldayken alici da yonlendirilir); baski tusu basiliysa tasiyiciya kosar
      const ctl = st.control[s];
      if (ctl && ctl.player === p) {
        const inp = ctl.input;
        const mag = hyp(inp.mx, inp.my);
        if (inp.press && carrier && carrier.side !== s) { tx = carrier.x; ty = carrier.y; urg = 1; }
        else if (mag > 0.15) {
          const k = Math.min(1, mag);
          if (ch && p === st.ball.intended) {
            // kendi pasinin alicisi: topa kendisi kosar (joystick ilk dokunustan sonra devreye girer)
            tx = ch.x; ty = ch.y;
            urg = 1;
          } else {
            tx = p.x + (inp.mx / mag) * 6 * k; ty = p.y + (inp.my / mag) * 6 * k;
            urg = (inp.sprint ? 1.0 : 0.78) * k;
          }
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
  for (const p of st.players) { p.vx = 0; p.vy = 0; }
  for (const [p, [x, y]] of moves) {
    p.vx = (x - p.x) / dt;
    p.vy = (y - p.y) / dt;
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
    placeBall(st, L / 2, W / 2);
  }
  if (st.pending) {
    if (st.t >= st.pending.at) {
      const pd = st.pending;
      st.pending = null;
      execPending(st, pd);
    }
  } else if (st.owner) {
    carrierAct(st);
  } else {
    // sahipsiz top: fizik ilerler, topa ilk yetisen alir
    moveBall(st);
    if (!st.pending && !st.owner) ballContacts(st);
  }
  st.ballZ = st.ball.z;

  // yari sonu: yoldaki top ve bekleyen duran top (penalti, korner, serbest vurus) tamamlanmadan yari bitmez
  if (st.hclock >= st.halfEnd && !(ballMoving(st) && st.ball.kind === 'shot') && !(st.pending && st.pending.kind !== 'kickoff')) {
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
  st.dribbling = false;
  st.nextDec = st.t + 0.5;
  const ctlG = st.control[p.side];
  if (ctlG) ctlG.holdStart = st.t;
  const b = st.ball;
  b.kind = 'none'; b.kicker = null; b.intended = null; b.shot = null; b.offside = null; b.touch = p; b.dip = 0; b.pkY = undefined;
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
    // mudahale yalniz temas mesafesinde denenir (zar yok, once yetismek gerekir); deneme sikligi saniye basina verilir
    if (def && def.d < P.tackleReach && !def.p.injured && !(def.p.beatenUntil !== undefined && st.t < def.p.beatenUntil)) {
      if (def.p.pos === 'GK') {
        // kaleci ceza sahasinda topa cikar: alirsa elinde tutar, alamazsa gecilmistir
        const [gxf, gyf] = toFrame(def.p.side, def.p.x, def.p.y);
        if (gxf < 16.5 && Math.abs(gyf - 34) < 20.16 && st.rng() < P.gkSmother * 2 * st.dt) {
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
        // saniye basina deneme sikligi (adim suresinden bagimsiz)
        const attempt = (P.tackleRate + 0.25 * oppT.tactic.press) * nearOwnGoal * (behind ? P.behindTry : 1) * st.dt;
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
  const quick = press > 0.8 && st.t >= st.holdUntil - 0.8;
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
  let bestAct: { kind: 'shot' | 'pass' | 'dribble' | 'through'; target?: PState; p?: number; tx?: number; ty?: number; air?: boolean } = { kind: 'dribble' };

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
    const pe = passEval(st, c, m);
    const ps = pe.p;
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
      bestAct = { kind: 'pass', target: m, p: ps, air: pe.air };
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
  const noOff = restartKind === 'throw' || restartKind === 'goalkick' || restartKind === 'corner';
  if (bestAct.kind === 'shot') shootAt(st, c, shotM!.xg, { power: clamp(distGoal / 30, 0.3, 1) });
  else if (bestAct.kind === 'pass') passTo(st, c, bestAct.target!, { air: bestAct.air, noOff });
  else if (bestAct.kind === 'through') throughTo(st, c, thru!, noOff);
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
  const b = st.ball;
  if (b.kicker && b.kicker.side === side && b.intended && b.intended.side === side && !b.intended.off && b.intended !== exclude) { ctl.player = b.intended; return; }
  // topa en erken yetisebilecek saha oyuncusu (top yoldaysa tahmini yolu uzerinden)
  const pts = ballPath(st);
  let best: PState | null = null, bt = 1e9;
  for (const q of liveTeam(st, side)) {
    if (q.pos === 'GK' || q === exclude || q.injured) continue;
    const c = chaseTarget(q, pts, 0, playerSpeed(q));
    if (c.t < bt) { bt = c.t; best = q; }
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
    const b = st.ball;
    if (!cur || cur.off || (inPoss && st.owner !== cur) || (!st.owner && b.kicker && b.kicker.side === side && b.intended && b.intended.side === side && b.intended !== cur)) pickControlled(st, side);
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
    const rk = st.restartKind; st.restartKind = '';
    const noOff = rk === 'throw' || rk === 'goalkick' || rk === 'corner';
    const power = clamp(inp.power ?? 0.3, 0, 1);
    if (act === 'shoot' && !gkHands) {
      const distGoal = hyp(105 - cxf, 34 - cyf);
      if (distGoal < 45) {
        const oneOnOne = cxf > 72 && !st.players.some((o) => { if (o.side === side || o.off || o.pos === 'GK') return false; const [oxf, oyf] = toFrame(side, o.x, o.y); return oxf > cxf - 0.5 && Math.abs(oyf - cyf) < 5 + (oxf - cxf) * 0.4 && hyp(o.x - c.x, o.y - c.y) < 14; });
        const m = shotModel(st, c, cxf, cyf, press, oneOnOne);
        // nisan: joystick yonu kale cizgisinde hangi noktaya bakiyor; yardim seviyesi kaleye dogru ceker
        const [gx, gy] = fromFrame(side, 105, 34);
        let aimY = 34;
        if (hasDir) {
          const tdx = gx - c.x, tdy = gy - c.y, tdn = hyp(tdx, tdy) || 1;
          // yonun kaleye gore yanal bileseni (m), mesafeyle olceklenir
          const lat = (ddx * -tdy / tdn + ddy * tdx / tdn) * distGoal * 0.5;
          const [, ayf] = toFrame(side, gx - tdy / tdn * lat, gy + tdx / tdn * lat);
          aimY = clamp(ayf, 34 - 5, 34 + 5);
        }
        // yardim: Tam -> kose icine ceker, Kismi -> yarisi; guc: sut hizi ve yukselme (asiri guc ustten gider)
        const pull = [0, 0.5, 1][ctl.assistShot];
        const inGoal = clamp(aimY, 34 - 3.0, 34 + 3.0);
        aimY = aimY + (inGoal - aimY) * pull;
        const sigma = kickSigma(c, 'shot', P.shotSpeed, press) * [1.0, 0.85, 0.7][ctl.assistShot];
        shootAt(st, c, m.xg, { power, aimY, sigma });
        dbg('usut');
        return;
      }
      // uzak mesafeden sut: ileri uzun top gibi davranir (asagida yonlu pas)
    }
    // ara pas: yonde en uygun kosucu (yardim) ya da dogrudan yonun onundeki bosluga
    if (act === 'through') {
      const opts = throughOptions(st, c, mates);
      let best: (typeof opts)[number] | null = null, bv = -1e9;
      for (const o of opts) { const vx = o.m.x - c.x, vy = o.m.y - c.y, d = hyp(vx, vy) || 1; const a = (vx * ddx + vy * ddy) / d; const v = (ctl.assistPass === 2 ? o.path * o.race * 2 : ctl.assistPass === 1 ? o.path * o.race : 0.3) + a; if (a > (ctl.assistPass === 0 ? 0.75 : 0.3) && v > bv) { bv = v; best = o; } }
      if (best) { throughTo(st, c, best, noOff); dbg('uara_kosucu'); return; }
      // kosucu yoksa: yon boyunca bosluga sert top; en yakin takim arkadasi kosar (hedeflenen alici)
      const dist = 16 + 20 * power;
      const ax = clamp(c.x + ddx * dist, 0.5, L - 0.5), ay = clamp(c.y + ddy * dist, 0.5, W - 0.5);
      let runner: PState | null = null, rd = 1e9;
      for (const m of mates) { if (m.pos === 'GK') continue; const d = hyp(m.x - ax, m.y - ay); if (d < rd) { rd = d; runner = m; } }
      st.stats[side].passes++;
      const bx = st.ball.x, by = st.ball.y, dxx = ax - bx, dyy = ay - by, dd = hyp(dxx, dyy) || 1;
      const tRun = runner ? rd / playerSpeed(runner) : 1.5;
      kickBall(st, c, dxx / dd, dyy / dd, throughV0(dd, tRun), 0, 0, 'through', { tx: ax, ty: ay, intended: runner, noOff });
      dbg('uara_bosluk');
      return;
    }
    // yonlu pas: hedef nokta joystick yonunde, mesafe basili tutma suresinden; yardim seviyesi yone yakin takim
    // arkadasina ceker (koni), yardimsizda top tam nisan noktasina gider
    const dist = 8 + 32 * power;
    const ax = clamp(c.x + ddx * dist, 0.5, L - 0.5), ay = clamp(c.y + ddy * dist, 0.5, W - 0.5);
    const tol = [1.2, 5.5, 8][ctl.assistPass];
    let bestM: PState | null = null, bestV = -1e9;
    for (const m of mates) {
      const vx = m.x - c.x, vy = m.y - c.y, d = hyp(vx, vy);
      if (d < 2.5 || d > dist + 14) continue;
      const along = (vx * ddx + vy * ddy);
      if (along < 2) continue;
      const perp = Math.abs(vx * ddy - vy * ddx);
      if (perp > tol + along * (ctl.assistPass === 0 ? 0.04 : 0.12)) continue;
      if (m.pos === 'GK' && toFrame(side, m.x, m.y)[0] > 20) continue;
      const dd = hyp(m.x - ax, m.y - ay);
      // yardimsiz: nisana en yakin; yardimli: nisana yakinlik + pasin guvenligi (kesilme riski)
      const v = ctl.assistPass === 0 ? -dd : -dd * 0.04 + passEval(st, c, m).p * [0, 0.8, 1.2][ctl.assistPass];
      if (v > bestV) { bestV = v; bestM = m; }
    }
    if (!bestM && ctl.assistPass === 2) {
      // tam yardim: koni bossa yone en yakin takim arkadasina gider (acemi bosluga atmaz)
      let bv = -1e9;
      for (const m of mates) {
        const vx = m.x - c.x, vy = m.y - c.y, d = hyp(vx, vy) || 1;
        if (d < 2.5 || d > 50 || (m.pos === 'GK' && toFrame(side, m.x, m.y)[0] > 20)) continue;
        const a = (vx * ddx + vy * ddy) / d;
        if (a < 0.1) continue;
        const v = a + passEval(st, c, m).p * 0.5;
        if (v > bv) { bv = v; bestM = m; }
      }
    }
    if (bestM) {
      const d = hyp(bestM.x - c.x, bestM.y - c.y);
      const air = act !== 'pass' || (dist > 26 && d > 22);
      dbg('upass_player');
      passTo(st, c, bestM, { air, noOff });
      return;
    }
    // bosluga pas: top tam nisan noktasina; en yakin takim arkadasi kosar
    let runner: PState | null = null, rd = 1e9;
    for (const m of mates) { if (m.pos === 'GK') continue; const d = hyp(m.x - ax, m.y - ay); if (d < rd) { rd = d; runner = m; } }
    st.stats[side].passes++;
    const bx = st.ball.x, by = st.ball.y, dxx = ax - bx, dyy = ay - by, dd = hyp(dxx, dyy) || 1;
    dbg('upass_space');
    if (dist > 26) { const [v, vz] = lobV(dd, 0.42); kickBall(st, c, dxx / dd, dyy / dd, v, vz, 0, 'pass', { tx: ax, ty: ay, intended: runner, noOff }); }
    else kickBall(st, c, dxx / dd, dyy / dd, passV0(dd), 0, 0, 'pass', { tx: ax, ty: ay, intended: runner, noOff });
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

// ara pasin fiziksel yarisi: top yolu orneklenir, kosucu (tepkisiz) ve rakipler (tepkili) icin yetisme zamanlari
function throughRace(st: MatchState, c: PState, m: PState, tx: number, ty: number, tRun: number): number {
  const b = st.ball;
  const dx = tx - b.x, dy = ty - b.y, d = hyp(dx, dy) || 1;
  const v0 = throughV0(d, tRun);
  const s: BallSim = { x: b.x, y: b.y, z: 0, vx: (dx / d) * v0, vy: (dy / d) * v0, vz: 0, sw: 0, dip: 0 };
  const pts: PathPt[] = [{ t: 0, x: s.x, y: s.y, z: 0, v: v0 }];
  for (let t = 0.1; t <= 5; t += 0.1) {
    integrateBall(s, 0.1);
    pts.push({ t, x: s.x, y: s.y, z: s.z, v: hyp(s.vx, s.vy) });
    if (s.x < 0 || s.x > L || s.y < 0 || s.y > W) break;
    if (hyp(s.vx, s.vy) < 0.5) break;
  }
  const rec = interceptPt(m, pts, 0, playerSpeed(m), P.headZ[1], P.ctrlSpeed - 1);
  const tRec = rec ? rec.t : 9;
  let tOpp = 9;
  const trans = st.t - st.lastTurnoverT < P.transWin ? P.transReact : 0;
  for (const o of st.players) {
    if (o.side === c.side || o.off) continue;
    const ip = interceptPt(o, pts, P.reactOpp + trans, playerSpeed(o));
    if (ip && ip.t < tOpp) tOpp = ip.t;
  }
  return sigmoid(P.thruRace * (tOpp - tRec - 0.1));
}
// pas yolunun acikligi (yapay zeka tahmini): yoldaki rakiplerin erisimi; havadan topta yolun ortasina ulasilmaz
function lanePath(st: MatchState, c: PState, tx: number, ty: number, air: boolean): number {
  const vx = tx - c.x, vy = ty - c.y;
  const len2 = vx * vx + vy * vy || 1;
  const d = Math.sqrt(len2);
  let survive = 1;
  for (const o of st.players) {
    if (o.side === c.side || o.off) continue;
    const u = ((o.x - c.x) * vx + (o.y - c.y) * vy) / len2;
    if (u < 0.05 || u > 1.05) continue;
    if (air && u > 0.2 && u < 0.85) continue;
    const perp = hyp(o.x - (c.x + vx * u), o.y - (c.y + vy * u));
    const reach = 1.2 + 0.08 * u * d;
    if (perp > reach) continue;
    survive *= 1 - 0.8 * (1 - perp / reach);
  }
  return clamp((P.passBase - P.passD * d) * survive, 0.02, 0.99);
}
// ofsayt: rakip, ihlal noktasindan serbest vurusla baslar
function callOffside(st: MatchState, c: PState, m: PState) {
  dbg('ofsayt');
  const s = st.stats[c.side];
  s.offsides++;
  st.events.push({ t: st.clock, type: 'offside', side: c.side, player: m.num });
  const defs = liveTeam(st, c.side === 0 ? 1 : 0).filter((p) => p.pos !== 'GK');
  const taker = defs.reduce((b, p) => (hyp(p.x - m.x, p.y - m.y) < hyp(b.x - m.x, b.y - m.y) ? p : b), defs[0]);
  if (!taker) return;
  taker.x = clamp(m.x, 1, L - 1);
  taker.y = clamp(m.y, 1, W - 1);
  placeBall(st, taker.x, taker.y);
  st.owner = null;
  giveBall(st, taker, 1.2);
  deadTime(st, 4 + st.rng() * 2, 'Ofsayt');
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
      const race0 = sigmoid(P.thruRace * (tDef - tRec) + skill);
      // fiziksel tahmin: top o noktaya kosucunun varis zamaninda gidecek hizla vurulursa kim once yetisir
      const race = Math.min(race0, throughRace(st, c, m, tx, ty, tRec));
      // yerden mi havadan mi: yolda savunmaci varsa top asirilir (daha yavas ama kesilmez)
      const dPass = hyp(tx - c.x, ty - c.y);
      const pathG = lanePath(st, c, tx, ty, false);
      const pathA = dPass > 14 ? lanePath(st, c, tx, ty, true) - P.lobCost : 0;
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

// ---------- Vuruslar (motor 2.0) ----------
// havadan mi: uzun paslar ve kanattan ceza sahasina ortalar
function isAirPass(c: PState, tx: number, ty: number, d: number): boolean {
  if (d > 28) return true;
  const [txf, tyf] = toFrame(c.side, tx, ty);
  const [, cyf] = toFrame(c.side, c.x, c.y);
  return txf > 86 && Math.abs(tyf - 34) < 14 && Math.abs(cyf - 34) > 18;
}
// pasin baslangic hizi: aliciya vEnd hizla varir (yerde ustel surtunme)
function passV0(d: number, vEnd = P.passEnd): number {
  return clamp(vEnd + P.ballFric * d, 5, P.kickMax);
}
// havadan vurus: d metre ileriye dusmesi icin yatay ve dikey hiz (firlatma acisi theta)
function lobV(d: number, theta: number): [number, number] {
  const v0 = Math.min(P.kickMax, Math.sqrt((Math.max(1, d) * G) / Math.sin(2 * theta)) * 1.03);
  return [v0 * Math.cos(theta), v0 * Math.sin(theta)];
}
// vurus hatasi (1 sigma, radyan): oyuncunun gucu, baski, vurus hizi ve tur
function kickSigma(p: PState, kind: BallKind, speed: number, press: number): number {
  const skill = Math.pow(60 / Math.max(20, eg(p)), 0.9);
  const base = kind === 'shot' ? P.shotErr : P.kickErr * (kind === 'through' ? 1.2 : kind === 'cross' ? 1.4 : kind === 'clear' || kind === 'header' ? 2.2 : 1);
  const trait = kind === 'shot' ? (p.traits.includes('Bitirici') ? 0.85 : 1) : p.traits.includes('Oyun Kurucu') ? 0.8 : 1;
  const gkK = p.pos === 'GK' && kind !== 'shot' ? 1.3 : 1;
  return base * skill * trait * gkK * (1 + P.kickErrPress * press) * (0.6 + (0.4 * speed) / 20);
}
interface KickOpts { tx?: number; ty?: number; intended?: PState | null; shot?: Ball['shot']; sigma?: number; noOff?: boolean; dip?: number }
// topa vurus: yon + aci hatasi, hiz, yukselme, falso; top sahipsiz kalir, ofsayt konumlari o anda kaydedilir
function kickBall(st: MatchState, p: PState, dx: number, dy: number, speed: number, vz: number, sw: number, kind: BallKind, o: KickOpts = {}) {
  const b = st.ball;
  const press = pressureOn(st, p, p.x, p.y);
  const sigma = o.sigma ?? kickSigma(p, kind, speed, press);
  const ang = Math.atan2(dy, dx) + gauss(st.rng) * sigma;
  const sp = speed * (1 + gauss(st.rng) * 0.04);
  b.vx = Math.cos(ang) * sp;
  b.vy = Math.sin(ang) * sp;
  b.vz = vz;
  b.z = Math.max(b.z, 0);
  b.sw = sw;
  b.dip = o.dip ?? 0;
  b.kind = kind;
  b.kicker = p;
  b.kickT = st.t;
  b.touch = p;
  b.intended = o.intended ?? null;
  b.tx = o.tx ?? b.x + dx * 20;
  b.ty = o.ty ?? b.y + dy * 20;
  b.shot = o.shot ?? null;
  b.gkTried = false;
  // ofsayt: vurus aninda cizginin otesindeki takim arkadaslari (tac, aut ve kornerden ofsayt olmaz)
  b.offside = null;
  if ((kind === 'pass' || kind === 'through' || kind === 'cross') && !o.noOff) {
    const line = offsideLine(st, p.side);
    const set = new Set<PState>();
    for (const m of liveTeam(st, p.side)) {
      if (m === p) continue;
      const [mxf] = toFrame(p.side, m.x, m.y);
      if (mxf > line + 0.3 && mxf > 52.5) set.add(m);
    }
    if (set.size) b.offside = set;
  }
  st.owner = null;
  st.dribbling = false;
  face(p, dx, dy, 0.9);
  addFx(st, b.x, b.y, 'kick');
  (st as any)._path = undefined;
}
// alicinin onune pas: yerden varis hizi ayarli, uzun top ya da orta havadan
function passTo(st: MatchState, c: PState, m: PState, opt: { air?: boolean; kind?: BallKind; vEnd?: number; noOff?: boolean } = {}) {
  const d0 = hyp(m.x - c.x, m.y - c.y);
  const tEst = d0 / 14;
  const tx = clamp(m.x + (m.vx ?? 0) * tEst * 0.7, 0.5, L - 0.5);
  const ty = clamp(m.y + (m.vy ?? 0) * tEst * 0.7, 0.5, W - 0.5);
  const b = st.ball;
  const dx = tx - b.x, dy = ty - b.y, d = hyp(dx, dy) || 1;
  const air = opt.air ?? isAirPass(c, tx, ty, d);
  const [txf, tyf] = toFrame(c.side, tx, ty);
  const cross = air && txf > 86 && Math.abs(tyf - 34) < 14;
  const kind: BallKind = opt.kind ?? (cross ? 'cross' : 'pass');
  st.stats[c.side].passes++;
  const [zx] = toFrame(c.side, tx, ty);
  dbg(zx < 35 ? 'pas_kendi' : zx < 70 ? 'pas_orta' : 'pas_hucum');
  if (air) {
    const [v, vz] = lobV(d, cross ? 0.55 : 0.42);
    // falso: ortalar kaleye dogru kivrilir, uzun toplar hafif
    const sw = cross ? (1.4 + st.rng() * 1.2) * (st.rng() < 0.5 ? 1 : -1) : (st.rng() - 0.5) * 0.8;
    kickBall(st, c, dx / d, dy / d, v, vz, sw, kind, { tx, ty, intended: m, noOff: opt.noOff });
  } else kickBall(st, c, dx / d, dy / d, passV0(d, opt.vEnd), 0, 0, kind, { tx, ty, intended: m, noOff: opt.noOff });
}
// ara pasin hizi: kosucunun varis zamanina gore, ama hedefe en fazla rahat kontrol hiziyla varacak kadar (top gerekirse bekler)
function throughV0(d: number, tRun: number): number {
  const mu = P.ballFric;
  const vByTime = (mu * d) / Math.max(0.05, 1 - Math.exp(-mu * Math.max(0.4, tRun)));
  return clamp(Math.min(vByTime, passV0(d, 8)), Math.min(passV0(d, 2.5), P.kickMax), P.kickMax);
}
// ara pas: bosluga, kosucunun varis zamanina gore hiz; yolda savunmaci varsa havadan asirilir
function throughTo(st: MatchState, c: PState, o: { m: PState; tx: number; ty: number; tRec: number; air: boolean }, noOff = false) {
  const b = st.ball;
  const dx = o.tx - b.x, dy = o.ty - b.y, d = hyp(dx, dy) || 1;
  st.stats[c.side].passes++;
  dbg('ara_pas');
  if (o.air) {
    const [v, vz] = lobV(d, 0.68);
    kickBall(st, c, dx / d, dy / d, v, vz, 0, 'through', { tx: o.tx, ty: o.ty, intended: o.m, noOff });
    return;
  }
  kickBall(st, c, dx / d, dy / d, throughV0(d, o.tRec), 0, 0, 'through', { tx: o.tx, ty: o.ty, intended: o.m, noOff });
}
// pasin tahmini basarisi: ayni fizikle top yolu ornekleniр, alici ve en yakin rakibin yetisme zamanlari karsilastirilir
function passEval(st: MatchState, c: PState, m: PState, forceAir?: boolean): { p: number; tRec: number; tOpp: number; air: boolean } {
  const b = st.ball;
  const d0 = hyp(m.x - c.x, m.y - c.y);
  const tEst = d0 / 14;
  const tx = clamp(m.x + (m.vx ?? 0) * tEst * 0.7, 0.5, L - 0.5);
  const ty = clamp(m.y + (m.vy ?? 0) * tEst * 0.7, 0.5, W - 0.5);
  const dx = tx - b.x, dy = ty - b.y, d = hyp(dx, dy) || 1;
  const air = forceAir ?? isAirPass(c, tx, ty, d);
  const s: BallSim = { x: b.x, y: b.y, z: 0, vx: 0, vy: 0, vz: 0, sw: 0, dip: 0 };
  if (air) {
    const [v, vz] = lobV(d, 0.42);
    s.vx = (dx / d) * v; s.vy = (dy / d) * v; s.vz = vz;
  } else {
    const v = passV0(d);
    s.vx = (dx / d) * v; s.vy = (dy / d) * v;
  }
  // yol ornekleme (0,1 s)
  const pts: PathPt[] = [{ t: 0, x: s.x, y: s.y, z: 0, v: hyp(s.vx, s.vy) }];
  for (let t = 0.1; t <= 5; t += 0.1) {
    integrateBall(s, 0.1);
    pts.push({ t, x: s.x, y: s.y, z: s.z, v: hyp(s.vx, s.vy) });
    if (s.x < 0 || s.x > L || s.y < 0 || s.y > W) break;
    if (s.z <= 0 && s.vz === 0 && hyp(s.vx, s.vy) < 0.5) break;
  }
  const rec = interceptPt(m, pts, 0, playerSpeed(m), P.headZ[1], P.ctrlSpeed - 1);
  const tRec = rec ? rec.t : 9;
  let tOpp = 9;
  const trans = st.t - st.lastTurnoverT < P.transWin ? P.transReact : 0;
  for (const o of st.players) {
    if (o.side === c.side || o.off) continue;
    const ip = interceptPt(o, pts, o.pos === 'GK' ? 0.2 : P.reactOpp + trans, playerSpeed(o));
    if (ip && ip.t < tOpp) tOpp = ip.t;
  }
  // vurus hatasi: aci sapmasi mesafeyle buyur; alici bir iki metreyi telafi eder
  const sig = kickSigma(c, air ? 'cross' : 'pass', hyp(s.vx, s.vy), pressureOn(st, c, c.x, c.y));
  const pErr = Math.exp(-Math.pow((sig * d) / 2.6, 2));
  const p = clamp(sigmoid(P.thruRace * (tOpp - tRec - 0.1)) * pErr, 0.02, 0.99);
  return { p, tRec, tOpp, air };
}
// sut: hedef kose, aci ve yukselme hatasi; sonuc fizikten (kaleci, direk, cizgi) cikar; xG yalniz kayit icindir
function shootAt(st: MatchState, c: PState, xg: number, opt: { header?: boolean; penalty?: boolean; freekick?: boolean; setPiece?: boolean; aimY?: number; power?: number; sigma?: number } = {}) {
  const side = c.side;
  const opp: 0 | 1 = side === 0 ? 1 : 0;
  const s = st.stats[side];
  const keeper = gk(st, opp);
  const [cxf, cyf] = toFrame(side, c.x, c.y);
  s.shots++;
  s.xg += xg;
  st.zoneShots[side][cyf < 23 ? 0 : cyf > 45 ? 2 : 1]++;
  st.playerXg[side][c.num] = (st.playerXg[side][c.num] ?? 0) + xg;
  if (c.thruT !== undefined && st.t - c.thruT < 8) { dbg('arapas_sut'); DBG.arapas_sut_xg = (DBG.arapas_sut_xg ?? 0) + xg; c.thruT = undefined; }
  st.keyUntil = st.t + 1.8;
  // hedef: kalecinin uzak kosesi; ara sira diger kose; kafa vurusu ortaya yakin
  const kyf = keeper ? toFrame(side, keeper.x, keeper.y)[1] : 34;
  let aimY = opt.aimY ?? (kyf > 34 ? 34 - 2.6 : 34 + 2.6);
  if (opt.aimY === undefined && st.rng() < 0.3) aimY = 68 - aimY;
  if (opt.header) aimY = 34 + (aimY - 34) * 0.6;
  const [tx, ty] = fromFrame(side, 105.3, aimY);
  const b = st.ball;
  const dx = tx - b.x, dy = ty - b.y, d = hyp(dx, dy) || 1;
  const power = opt.power ?? 0.5;
  const speed = opt.header ? 11 + st.rng() * 4 : opt.penalty ? 23 : opt.freekick ? 21 : clamp(P.shotSpeed + power * 6 + st.rng() * 2, 14, P.kickMax);
  // yukselme: kafa vurusu asagi, penalti alcak, serbest vurus barajin ustunden (ust falso ile duser), akan oyunda hata payi
  const vz = opt.header ? -0.3 + st.rng() * 1.2 : opt.penalty ? 0.8 + st.rng() * 1.2 : opt.freekick ? 7.2 + st.rng() * 0.8 : clamp(0.8 + power * 2.5 + gauss(st.rng) * 2.2, -0.2, 9);
  const sw = opt.freekick ? (st.rng() < 0.5 ? 1 : -1) * (2.2 + st.rng() * 1.2) : (st.rng() - 0.5) * 0.8;
  const kind = opt.penalty ? 'penalty' : opt.freekick ? 'freekick' : opt.header ? (opt.setPiece ? 'sp-header' : 'header') : 'open';
  kickBall(st, c, dx / d, dy / d, speed, vz, sw, 'shot', { tx, ty, shot: { xg, setPiece: !!opt.setPiece, kind, penalty: !!opt.penalty }, sigma: opt.sigma, dip: opt.freekick ? 3 : 0 });
  // isabet tahmini: top kale cizgisini kale agzinin icinden mi gececek (kaleci yalniz isabetli topa uzanir)
  const pts = ballPath(st, 4);
  b.shotOT = false;
  for (let i = 1; i < pts.length; i++) {
    const [x0f] = toFrame(side, pts[i - 1].x, pts[i - 1].y);
    const [x1f, y1f] = toFrame(side, pts[i].x, pts[i].y);
    if (x0f < 105 && x1f >= 105) {
      const u = (105 - x0f) / Math.max(1e-6, x1f - x0f);
      const [, y0f] = toFrame(side, pts[i - 1].x, pts[i - 1].y);
      const yc = y0f + (y1f - y0f) * u, zc = pts[i - 1].z + (pts[i].z - pts[i - 1].z) * u;
      b.shotOT = Math.abs(yc - 34) < 3.66 + 0.25 && zc < 2.44 + 0.2;
      break;
    }
  }
  dbg(b.shotOT ? 'sut_isabetli' : 'sut_isabetsiz');
}
// uzaklastirma: kendi kalesinden uzaga, kenara dogru havadan; kale onunde baski altinda aceleyle yana/geriye (korner, tac)
function clearBall(st: MatchState, p: PState, header = false) {
  const [pxf, pyf] = toFrame(p.side, p.x, p.y);
  const press = pressureOn(st, p, p.x, p.y, 3.5);
  const hurried = pxf < 12 && press > 0.4 && st.rng() < 0.35;
  const tyf = pyf < 34 ? Math.max(-3, pyf - (hurried ? 30 : 18)) : Math.min(71, pyf + (hurried ? 30 : 18));
  const [tx, ty] = fromFrame(p.side, hurried ? pxf - 2 + st.rng() * 8 : Math.min(104, pxf + 35), tyf);
  if (hurried) dbg('aceleli_uzaklastirma');
  const b = st.ball;
  const dx = tx - b.x, dy = ty - b.y, d = hyp(dx, dy) || 1;
  const [v, vz] = lobV(header ? 18 : 35, header ? 0.6 : 0.5);
  kickBall(st, p, dx / d, dy / d, v, vz, 0, header ? 'header' : 'clear', { tx, ty });
  dbg(header ? 'kafa_uzak' : 'uzaklastirma');
}

// ---------- Top hareketi, oyun disi ve gol ----------
function defSideAtX(st: MatchState, x: number): 0 | 1 {
  // x<0 cizgisini eff==0 olan taraf savunur (hucumu +x yonunde)
  const want = x < L / 2 ? 0 : 1;
  return (eff(0) === want ? 0 : 1) as 0 | 1;
}
function moveBall(st: MatchState) {
  const b = st.ball;
  const dt = st.dt;
  const x0 = b.x, y0 = b.y, z0 = b.z;
  (st as any)._prevBall = [x0, y0, z0];
  integrateBall(b, dt);
  st.ballZ = b.z;
  if ((b.y < 0 || b.y > W || b.x < 0 || b.x > L) && (b.kind === 'through' || b.kind === 'pass')) dbg(b.kind === 'through' ? 'ara_ilk_disari' : 'pas_ilk_disari');
  // tac cizgisi
  if (b.y < 0 || b.y > W) {
    const yl = b.y < 0 ? 0 : W;
    const u = clamp((yl - y0) / ((b.y - y0) || 1e-6), 0, 1);
    const xc = clamp(x0 + (b.x - x0) * u, 1, L - 1);
    const last = b.touch;
    const side: 0 | 1 = last ? ((1 - last.side) as 0 | 1) : ((1 - st.lastPossSide) as 0 | 1);
    const team = liveTeam(st, side).filter((p) => p.pos !== 'GK');
    const taker = (team.length ? team : liveTeam(st, side)).reduce((bb, p) => (hyp(p.x - xc, p.y - yl) < hyp(bb.x - xc, bb.y - yl) ? p : bb));
    placeBall(st, xc, yl < 1 ? 0.5 : W - 0.5);
    st.owner = null;
    const [txf0, tyf0] = toFrame(side, b.x, b.y);
    const durT = 4 + st.rng() * 2.5;
    st.lastPossSide = side;
    st.pending = { kind: 'throw', side, at: st.t + durT, taker, spotX: txf0, spotY: tyf0 };
    deadTime(st, durT, 'Taç');
    addFx(st, b.x, b.y, 'throw', st.restartUntil);
    say(st, 'throw', side, taker);
    dbg('tac');
    return;
  }
  // kale cizgisi: gol, korner ya da aut
  if (b.x < 0 || b.x > L) {
    const xl = b.x < 0 ? 0 : L;
    const u = clamp((xl - x0) / ((b.x - x0) || 1e-6), 0, 1);
    const yc = y0 + (b.y - y0) * u;
    const zc = z0 + (b.z - z0) * u;
    const D = defSideAtX(st, xl);
    const A: 0 | 1 = (1 - D) as 0 | 1;
    if (Math.abs(yc - 34) < 3.66 && zc < 2.44) {
      goalScored(st, A, xl, yc);
      return;
    }
    const last = b.touch;
    dbg('cizgi_' + (last ? (last.side === D ? 'savunma' : 'hucum') : 'yok') + '_' + b.kind);
    if (last && last.side === D) {
      corner(st, A, yc);
      return;
    }
    // hucum eden takimdan cikti: aut
    if (b.shot && b.kicker && b.kicker.side === A) {
      st.events.push({ t: st.clock, type: 'miss', side: A, player: b.kicker.num, xg: b.shot.xg });
      dbg('sut_disari');
    }
    const dur = 5 + st.rng() * 2;
    placeBall(st, xl < 1 ? 0.5 : L - 0.5, clamp(yc, 1, W - 1));
    st.owner = null;
    st.pending = { kind: 'goalkick', side: D, at: st.t + dur };
    deadTime(st, dur, 'Aut');
    return;
  }
}
function goalScored(st: MatchState, side: 0 | 1, xl: number, yc: number) {
  const b = st.ball;
  const opp: 0 | 1 = side === 0 ? 1 : 0;
  const s = st.stats[side];
  const scorer = b.touch && b.touch.side === side ? b.touch : null;
  const xg = b.shot && b.kicker && b.kicker.side === side ? b.shot.xg : 0;
  s.goals++;
  if (b.shot && b.kicker && b.kicker.side === side) s.onTarget++;
  const sp = (b.shot && b.shot.setPiece) || st.t - st.lastRestartT < 6;
  if (sp) s.setPieceGoals++;
  dbg('gol_' + (b.shot ? b.shot.kind : scorer ? 'sapma' : 'kendi_kale') + (sp ? '_sp' : ''));
  st.events.push({ t: st.clock, type: 'goal', side, player: scorer ? scorer.num : undefined, xg, text: scorer ? undefined : 'kk' });
  st.extra[st.half - 1] += 0.5;
  st.keyUntil = st.t + 1.5;
  // top filede durur
  b.x = xl < 1 ? -1.2 : L + 1.2; b.y = clamp(yc, 31, 37); b.z = 0.3; b.vx = 0; b.vy = 0; b.vz = 0; b.sw = 0; b.kind = 'none'; b.shot = null; b.offside = null; b.dip = 0;
  st.ballZ = b.z;
  const dur = 10 + st.rng() * 3;
  st.owner = null;
  st.pending = { kind: 'kickoff', side: opp, at: st.t + dur };
  const cel = scorer ?? liveTeam(st, side).filter((p) => p.pos !== 'GK').reduce((bb, p) => (hyp(p.x - b.x, p.y - b.y) < hyp(bb.x - b.x, bb.y - b.y) ? p : bb));
  st.celebrate = { side, scorer: cel, until: st.t + 6.5 };
  deadTime(st, dur, 'GOL');
}

// ---------- Topa temas: ilk yetisen alir ----------
// Oyuncunun bu adimda topa ulasip ulasmadigi: topun adim boyunca cizdigi dogru parcasina en yakin nokta
function contactOf(p: PState, bx0: number, by0: number, bx1: number, by1: number, z0: number, z1: number, reach: number): { u: number; d: number; z: number } | null {
  const vx = bx1 - bx0, vy = by1 - by0;
  const len2 = vx * vx + vy * vy;
  let u = len2 > 1e-9 ? ((p.x - bx0) * vx + (p.y - by0) * vy) / len2 : 0;
  u = clamp(u, 0, 1);
  const d = hyp(p.x - (bx0 + vx * u), p.y - (by0 + vy * u));
  if (d > reach) return null;
  return { u, d, z: z0 + (z1 - z0) * u };
}
function ballContacts(st: MatchState) {
  const b = st.ball;
  if (st.t < st.restartUntil) return;
  const chase = ((st as any)._chase as Map<PState, unknown> | undefined) ?? new Map();
  const pts = (st as any)._prevBall as [number, number, number] | undefined;
  const bx0 = pts ? pts[0] : b.x, by0 = pts ? pts[1] : b.y, z0 = pts ? pts[2] : b.z;
  const segLen = hyp(b.x - bx0, b.y - by0);
  const speed = ballSpeed(st);
  const cands: { p: PState; u: number; d: number; z: number; gk: boolean }[] = [];
  for (const p of st.players) {
    if (p.off) continue;
    if (p === b.kicker && st.t - b.kickT < P.kickCd) continue;
    const [pxf, pyf] = toFrame(p.side, p.x, p.y);
    const inOwnBox = pxf < 16.5 && Math.abs(pyf - 34) < 20.16;
    const gkHands = p.pos === 'GK' && inOwnBox;
    if (gkHands && b.gkTried && b.kind === 'shot') continue; // ayni suta bir kez uzanir
    const gkLetGo = gkHands && b.kind === 'shot' && !b.shotOT; // disari giden topa uzanmaz
    // erisim: topu bekleyen (hedeflenen alici / topa kosan) tam erisimle; tepki suresi dolan oyuncu biraz az;
    // henuz tepki vermemis oyuncuya top ancak carparsa dokunur
    const aware = p === b.intended || chase.has(p) || !b.kicker || speed < 3;
    const reacted = b.kicker ? st.t - b.kickT >= reactOf(st, p) : true;
    let reach = gkHands ? P.gkReach : aware ? P.reach : reacted ? P.reach * 0.8 : 0.4;
    // sert top: yalniz rakip kosan oyuncu onune atlar (blok); digerleri ancak carparsa dokunur
    if (!gkHands && speed > P.ctrlSpeed && (!aware || (b.kicker && p.side === b.kicker.side))) reach = b.kind === 'shot' && b.kicker && p.side !== b.kicker.side ? 0.7 : 0.45;
    // kaleci sutta dalar: tepki suresi gectikce erisimi uzar
    if (gkHands && b.kind === 'shot' && b.kicker && b.kicker.side !== p.side) reach = gkLetGo ? 0.5 : P.gkReach + clamp((st.t - b.kickT - 0.15) * 2.5, 0, P.gkDive - P.gkReach);
    const c = contactOf(p, bx0, by0, b.x, b.y, z0, b.z, reach);
    if (!c) continue;
    const maxZ = gkHands ? 2.7 : P.headZ[1];
    if (c.z > maxZ) continue;
    // hizli ve alcak top kafa yuksekliginde degil, ayakla da kontrol edilemez: yalniz sekme (asagida)
    cands.push({ p, u: c.u, d: c.d, z: c.z, gk: gkHands });
  }
  if (!cands.length) return;
  cands.sort((a, c) => a.u - c.u || a.d - c.d);
  // ayni anda yetisenler: hava topunda hava hakimiyeti, yerde guc agirlikli mucadele
  const first = cands[0];
  const group = cands.filter((c) => (c.u - first.u) * segLen < 1.0);
  let win = first;
  if (group.length > 1) {
    const aerialDuel = first.z > P.headZ[0];
    const ws = group.map((c) => (c.gk ? 2.0 : 1) * (aerialDuel ? aerial(c.p) : eg(c.p)) * (c.p.beatenUntil !== undefined && st.t < c.p.beatenUntil ? 0.5 : 1));
    const tot = ws.reduce((a, w) => a + w, 0);
    let r = st.rng() * tot;
    for (let i = 0; i < group.length; i++) { r -= ws[i]; if (r <= 0) { win = group[i]; break; } }
    const other = group.find((c) => c !== win && c.p.side !== win.p.side);
    if (other) { st.stats[win.p.side].duels++; other.p.beatenUntil = st.t + 0.45; dbg(aerialDuel ? 'hava_mucadele' : 'yer_mucadele'); }
  }
  resolveContact(st, win.p, win.z, speed, win.d);
}
const chaseNow = (st: MatchState, p: PState) => !!((st as any)._chase as Map<PState, unknown> | undefined)?.has(p);
function resolveContact(st: MatchState, p: PState, z: number, speed: number, dist: number) {
  const b = st.ball;
  const side = p.side;
  const kickerSide = b.kicker ? b.kicker.side : -1;
  const [pxf, pyf] = toFrame(side, p.x, p.y);
  const inOwnBox = pxf < 16.5 && Math.abs(pyf - 34) < 20.16;
  const wasPass = b.kind === 'pass' || b.kind === 'through' || b.kind === 'cross';
  const isShotAtUs = b.kind === 'shot' && b.kicker !== null && kickerSide !== side;
  const touchedBefore = b.touch;
  b.touch = p;
  if (b.kind === 'through' || b.kind === 'pass') dbg((b.kind === 'through' ? 'ara_ilk_' : 'pas_ilk_') + (p === b.intended ? 'hedef' : p.side === kickerSide ? 'arkadas' : p.pos === 'GK' ? 'kaleci' : 'rakip') + (speed > P.ctrlSpeed ? '_sert' : z > P.headZ[0] ? '_kafa' : ''));
  if (speed > P.ctrlSpeed && z <= P.headZ[0] && !(p.pos === 'GK' && inOwnBox)) dbg('sert_' + b.kind + '_' + (p === b.intended ? 'hedef' : chaseNow(st, p) ? 'kosan' : p.side === kickerSide ? 'arkadas' : 'rakip'));
  // ofsayt: pas aninda ofsayt konumundaki alici topa dokununca
  if (wasPass && kickerSide === side && b.offside && b.offside.has(p) && b.kicker) {
    const k = b.kicker;
    b.offside = null;
    return callOffside(st, k, p);
  }
  // --- kaleci kendi ceza sahasinda ---
  if (p.pos === 'GK' && inOwnBox) {
    if (isShotAtUs) {
      const shooter = b.kicker!;
      const reachMax = P.gkReach + clamp((st.t - b.kickT - 0.15) * 2.5, 0, P.gkDive - P.gkReach);
      const skill = 0.22 * Math.log(eg(p) / eg(shooter)) + (p.traits.includes('Refleks') ? 0.06 : 0) - (p.emergencyGk ? 0.3 : 0);
      const pSave = clamp(0.98 - 0.6 * (dist / reachMax) - (speed - 16) / 55 + skill, 0.12, 0.98);
      if (st.rng() < pSave) {
        st.stats[kickerSide as 0 | 1].onTarget++;
        st.events.push({ t: st.clock, type: 'save', side: kickerSide as 0 | 1, player: shooter.num, xg: b.shot?.xg });
        addFx(st, p.x, p.y, 'save');
        say(st, 'save', side, p, shooter);
        st.keyUntil = st.t + 1.2;
        if (speed < P.gkCatch && dist < 1.0 && !b.shot?.penalty) {
          giveBall(st, p, 2.5);
          deadTime(st, 2.5 + st.rng() * 1.5, 'Kurtarış');
          st.restartKind = 'gk';
          dbg('kurtaris_tuttu');
        } else {
          // celme: top kaleden uzaga, yana seker
          const [ox, oy] = fromFrame(side, 1, 0), [o0x, o0y] = fromFrame(side, 0, 0);
          const fwx = ox - o0x, fwy = oy - o0y;
          // yana, kale agzindan uzaga; kale onundeyse biraz one
          const [, byf] = toFrame(side, b.x, b.y);
          const latSign = byf < 34 ? -1 : 1;
          const lat = latSign * (0.8 + st.rng() * 1.2);
          // dalarak celme: top yana ve cogu kez geriye (kale cizgisine) seker; one celme kale onundeyse
          const fw = Math.abs(byf - 34) < 2 ? 0.2 + st.rng() * 0.5 : -0.7 + st.rng() * 0.8;
          const dx = fwx * fw + -fwy * lat, dy = fwy * fw + fwx * lat;
          const dn = hyp(dx, dy) || 1;
          const ang = Math.atan2(dy / dn, dx / dn);
          const psp = 5 + st.rng() * 5;
          b.vx = Math.cos(ang) * psp; b.vy = Math.sin(ang) * psp; b.vz = 1.5 + st.rng() * 2; b.sw = 0; b.dip = 0;
          b.kind = 'loose'; b.kicker = p; b.kickT = st.t; b.intended = null; b.shot = null; b.offside = null;
          dbg('kurtaris_celdi');
        }
        return;
      }
      // kurtaramadi: top yoluna devam eder (gol ya da disari); topa dokunmus sayilmaz
      b.gkTried = true;
      b.touch = touchedBefore;
      dbg('kaleci_gecti');
      return;
    }
    // orta, ara pas ya da sahipsiz top: alcak ve orta hizda tutar, sert topu celer
    if (speed < P.gkCatch && z < 2.6) {
      addFx(st, p.x, p.y, 'save');
      if (b.kicker && kickerSide !== side) say(st, 'claim', side, p, b.intended ?? b.kicker);
      giveBall(st, p, 2.5);
      deadTime(st, 2.5 + st.rng() * 1.5, 'Kaleci aldı');
      st.restartKind = 'gk';
      dbg('kaleci_aldi_top');
      return;
    }
    clearBall(st, p, true);
    return;
  }
  // --- saha oyuncusu ---
  const awareP = p === b.intended || chaseNow(st, p);
  const high = z > (awareP ? 1.9 : P.headZ[0]);
  if (high) {
    // kafa: hucumda ceza sahasinda kaleye, savunmada uzaklastirma, ortada takim arkadasina
    const inAttBox = pxf > 86 && Math.abs(pyf - 34) < 22;
    if (inAttBox) {
      const m0 = shotModel(st, p, pxf, pyf, pressureOn(st, p, p.x, p.y), false);
      const pGoal = Math.min(P.maxShotP, m0.pGoal * P.headerK);
      dbg(b.kind === 'cross' ? 'orta_kafa' : 'kafa_sut');
      if (b.kicker && kickerSide === side && wasPass) { st.stats[side].passesOk++; say(st, 'cross', side, b.kicker, p); }
      shootAt(st, p, pGoal * (1 - m0.pBlock), { header: true, setPiece: st.t - st.lastRestartT < 6 });
      return;
    }
    if (pxf < 45) { clearBall(st, p, true); return; }
    // kafayla takim arkadasina indirir
    let best: PState | null = null, bd = 1e9;
    for (const m of liveTeam(st, side)) { if (m === p || m.pos === 'GK') continue; const d = hyp(m.x - p.x, m.y - p.y); if (d > 3 && d < bd) { bd = d; best = m; } }
    if (best) {
      if (b.kicker && kickerSide === side && wasPass) st.stats[side].passesOk++;
      const dx = best.x - b.x, dy = best.y - b.y, d = hyp(dx, dy) || 1;
      kickBall(st, p, dx / d, dy / d, Math.min(12, 4 + d * 0.5), 1.5, 0, 'header', { tx: best.x, ty: best.y, intended: best });
      dbg('kafa_pas');
    } else clearBall(st, p, true);
    return;
  }
  // yerde ya da gogus yuksekliginde: sert top kontrol edilemez, seker (blok)
  if (speed > P.ctrlSpeed) {
    if (b.kind === 'shot' && b.kicker && kickerSide !== side) {
      st.events.push({ t: st.clock, type: 'miss', side: kickerSide as 0 | 1, player: b.kicker.num, xg: b.shot?.xg, text: 'blok' });
      say(st, 'block', side, p, b.kicker);
      dbg('blok');
    } else dbg('sert_top_sekti');
    const ang = Math.atan2(-b.vy, -b.vx) + gauss(st.rng) * 1.6;
    const sp = speed * (0.2 + st.rng() * 0.2);
    b.vx = Math.cos(ang) * sp; b.vy = Math.sin(ang) * sp; b.vz = 1 + st.rng() * 2; b.sw = 0; b.dip = 0;
    b.kind = 'loose'; b.kicker = p; b.kickT = st.t; b.intended = null; b.shot = null; b.offside = null;
    return;
  }
  // kontrol: ilk dokunus; hizli topta ve dusuk gucte kontrol hatasi (top birkaç metre acilir)
  const prepared = awareP;
  const bad = clamp(((speed - 11) / 30 + (z > P.headZ[0] ? 0.12 : 0)) * (60 / Math.max(25, eg(p))) * (p.traits.includes('Çalımcı') ? 0.7 : 1) * (prepared ? 0.5 : 1), 0, 0.45);
  if (st.rng() < bad) {
    dbg('kontrol_hatasi');
    const ang = Math.atan2(b.vy, b.vx) + gauss(st.rng) * 1.2;
    const sp = 2.5 + st.rng() * 2.5;
    b.vx = Math.cos(ang) * sp; b.vy = Math.sin(ang) * sp; b.vz = 0; b.sw = 0; b.dip = 0;
    b.kind = 'loose'; b.kicker = p; b.kickT = st.t - P.kickCd + 0.15; b.intended = null; b.shot = null; b.offside = null;
    return;
  }
  if (b.kicker && wasPass) {
    if (kickerSide === side) {
      if (p !== b.kicker) st.stats[side].passesOk++;
      if (b.kind === 'through') { p.thruT = st.t; say(st, 'through', side, b.kicker, p); dbg('ara_alindi'); }
      else if (b.kind === 'cross') say(st, 'cross', side, b.kicker, p);
      else if (hyp(b.kicker.x - p.x, b.kicker.y - p.y) > 24) say(st, 'long', side, b.kicker, p);
    } else {
      addFx(st, p.x, p.y, 'int');
      say(st, 'intercept', side, p, b.kicker);
      const [zx] = toFrame(kickerSide as 0 | 1, p.x, p.y);
      dbg(zx < 35 ? 'kayip_pas_kendi' : zx < 70 ? 'kayip_pas_orta' : 'kayip_pas_hucum');
    }
  }
  const hold = b.kind === 'through' ? 0.2 : P.holdMin + st.rng() * P.holdVar;
  giveBall(st, p, hold);
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
  placeBall(st, bx, by);
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
// korner ya da serbest vurus ortasi: ceza sahasina havadan top; kafa mucadelesi temasta cozulur (topa ilk yetisen)
function execSetPieceCross(st: MatchState, pd: Pending, headerP: number) {
  const side = pd.side;
  const taker = pd.taker!;
  const [bx, by] = fromFrame(side, pd.spotX!, pd.spotY!);
  taker.x = bx;
  taker.y = by;
  placeBall(st, bx, by);
  st.keyUntil = st.t + 2.5;
  // hedef: kafa vuracak en iyi oyuncunun bulundugu yere yakin; ceza sahasina giren oyuncu sayisi secenegi artirir
  let att = liveTeam(st, side).filter((p) => p.pos !== 'GK' && p !== taker && toFrame(side, p.x, p.y)[0] > 85);
  if (att.length === 0) att = liveTeam(st, side).filter((p) => p.pos !== 'GK' && p !== taker);
  if (att.length === 0) att = liveTeam(st, side);
  const header = att.reduce((b, p) => (aerial(p) > aerial(b) ? p : b), att[0]);
  const [hxf, hyf] = toFrame(side, header.x, header.y);
  const txf = clamp(hxf + 1 + (st.rng() - 0.5) * 3, 90, 103);
  const tyf = clamp(hyf + (st.rng() - 0.5) * 4, 24, 44);
  const [tx, ty] = fromFrame(side, txf, tyf);
  const dx = tx - bx, dy = ty - by, d = hyp(dx, dy) || 1;
  const [v, vz] = lobV(d, 0.62);
  // ic falso: kaleye dogru kivrilir
  const [, byf] = toFrame(side, bx, by);
  const inward = byf < 34 ? 1 : -1;
  const [ax, ay] = fromFrame(side, 0, 0), [ax2, ay2] = fromFrame(side, 0, 1);
  const ny = ay2 - ay, nx = ax2 - ax; // +y frame yonu (dunya)
  // falso isareti: hiz yonune dik ivme; dunya cercevesinde hedef sapma yonu (nx,ny)*inward ile ayni yone olmali
  const cross = (dx / d) * (ny * inward) - (dy / d) * (nx * inward);
  const sw = (1.6 + st.rng() * 1.0) * (cross > 0 ? 1 : -1);
  say(st, pd.kind === 'corner' ? 'cornerkick' : 'fk', side, taker);
  st.stats[side].passes++;
  st.owner = null;
  st.pending = null;
  st.restartKind = '';
  kickBall(st, taker, dx / d, dy / d, v, vz, sw, 'cross', { tx, ty, intended: header, noOff: true, sigma: kickSigma(taker, 'cross', v, 0) * (0.9 - 0.1 * headerP) });
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
    placeBall(st, bx, by);
    st.keyUntil = st.t + 2;
    // penalti: kose secimi ve kalecinin tahmini (yarisi dogru kose); hata payi kucuk
    const keeper = gk(st, pd.side === 0 ? 1 : 0);
    const cornerY = 34 + (st.rng() < 0.5 ? -1 : 1) * (2.6 + st.rng() * 0.5);
    const guessRight = st.rng() < 0.42;
    const guessY = guessRight ? cornerY : 68 - cornerY;
    const [, gy] = fromFrame(pd.side, 104.4, guessY);
    const pGoal = clamp(P.penaltyP * (keeper ? Math.exp(P.shotSlope * Math.log(eg(taker) / eg(keeper))) : 1), 0.4, 0.95);
    shootAt(st, taker, pGoal, { penalty: true, setPiece: true, aimY: cornerY, sigma: 0.035 });
    st.ball.pkY = gy;
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
    placeBall(st, bx, by);
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
    placeBall(st, bx, by);
    st.keyUntil = st.t + 2;
    say(st, 'fk', pd.side, taker);
    shootAt(st, taker, pd.xg ?? P.fkP, { freekick: true, setPiece: true });
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
    placeBall(st, bx, by);
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
    placeBall(st, c.x, c.y);
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
  placeBall(st, c.x, c.y);
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
