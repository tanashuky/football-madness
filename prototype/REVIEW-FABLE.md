# Fable için inceleme notu (Opus 5.5, 29 Ekim 2026)

Proje sahibi, Fable'ın Dilim 0.4 çatısı (motor 2.0: fiziksel top, vuruş planı/önizleme,
kontrol katmanı) üzerinde Opus 5.5'e küçük güncellemeler yaptırdı. Cumartesi Fable'ın
bunları kontrol edip fikrini söylemesi, sorun varsa düzeltmesi istendi.

Fable'ın son kendi sürümü: commit `c160c3b`. Opus'un değişiklikleri sırasıyla:

| Commit | İçerik |
|---|---|
| e063431 | Futbol kuralları (santra dizilişi, ikinci dokunuş yasağı, geri pas, penaltı dizilişi), Pas/Ara yerden – Orta havadan, tek basış eşiği (0,2 s / 14 px), skorbordun altına saha sığdırma |
| 890ef14 | Joystick sprint bandı (R / 1,5R / 1,9R), elle taç, santra vurulana kadar bekleme, oyun hızı seçimi (%30) |
| 4016e2b | Aut: rakip ceza sahası dışında; yumuşak kamera (yaylı, hız sınırlı) |
| f4297de | İçi boş butonlar + altında oyun varken silikleşme, joystick ipucu 8 s, duraklat, top boyutu, isim ayarı, Değiştir basılı = kaleci çıkışı, yapay zekâ aşırtma şutu |
| 50f0669 | Duran toptan doğrudan kendi kalesine gol yok (korner), taçtan doğrudan gol yok (aut), kaleci kendi kalesine nişan alamaz |
| (bu commit) | Duran topları kullanıcı kullanır: korner, serbest vuruş, penaltı (`giveSetPiece`, `spWait`), 8 s süre, süre dolunca `aiSetPiece`; diziliş vuruşa kadar korunur (taç ve autta da); kısa pas seçeneği (`shortOption`); savunmada penaltıda kaleci tarafı joystick ile (`keeperGuess`) |

Sonradan eklenenler:

| Commit | İçerik |
|---|---|
| 6e5fd25 | Uygulama gibi yükleme: manifest.webmanifest + icons/ (çevrimdışı önbellek yok) |
| 51168a5 | Düşüş işareti: `predictLanding` (motorun kendi adımıyla, vuruş başına bir kez; tepe ≥ 1,5 m), sayfada `LAND` önbelleği; eski `landingOf` yalnız nişan önizlemesinde |
| (sonraki) | Kaleci çıkışı yalnız top kendi kalemize 35 m'den yakınken ve en çok 25 m (`gkRushZone`, `gkRushMax`); serbest vuruşta baraj bir kez seçilir (`pd.wallSet`, önceden her adım yeniden seçilip oyuncular topun önünde dönüyordu), barajdakiler arasında ayrılma itmesi yok; direkt serbest vuruşta da iki takım ceza sahasına yığılır, ceza sahasına yakın serbest vuruşta diziliş 6–7 s (fktest.ts: ceza sahasında ortalama 5,7 savunmacı, 2,8 hücumcu) |
| (kritik tur) | Duran topta 9,15 m (`restartGuard`, `keepAway`: oyuncu dairenin içindeyse kendi tarafından radyal çıkar, hedefi içerideyse daire kenarında bekler, daire yakınında 4× fren; taçta 2,5 m) — crit.ts: 134 bin ölçümde 0 ihlal. Duran top kullanılana kadar saat durur (`restartWaiting`). Aut kullanıldıktan sonra 6 s rakip ceza sahasında pres yapar (`lastGoalKickT`). Kendi pasımızda hedeflenen alıcıdan 0,5 s önce yetişecek arkadaş varsa alıcı ve kontrol ona geçer; top 0,8 s'den uzun yavaş/sahipsizse iki takımdan 2'şer kovalayan. Kullanılmamış duran topa müdahale yok. Müdahale/kayma 0,3 s tamponda menzile girince yapılır; Baskı sprintsiz 0,8, sprintle 1,0 (kondisyon); dokunmatikte Baskı'dan Müdahale/Kaydır'a kaydırma. `b.fromRestart` giveBall/placeBall'da sıfırlanıyor (önceden bayat kalıyordu). |

Kontrol (29 Ekim akşamı, groundtest.ts): kullanıcının Pas tuşu 0,05–1 güç ve kısa basışta 740 vuruşun hepsinde yerden (en yüksek 0,3 m, sekme). Havadan giden tek kullanıcı "Pas"ı taç (elle atış, bilerek). Yapay zekânın kendi uzun pasları (28 m üstü) havadan gidiyor; kullanıcı bekleyip süre dolunca yapay zekâ oynarsa onun pası da havadan olabilir.

Yedekler (scratchpad, oturum dışında yok): engine.v14-fable.ts … engine.v19-opus5.ts. Git geçmişi asıl yedek.

## Kontrol edilmesini istediğim riskli noktalar

1. **`st.spWait` yaşam döngüsü** (engine.ts): `execPending` ve `giveSetPiece` kurar; `kickBall` (duran top vuruşu), `giveBall` (başkası top alınca) ve `deadTime` temizler. `setPieceTarget` `st.pending ?? st.spWait` okur. Takılma ya da dizilişin açık oyunda kalması riski var mı?
2. **Süre dolunca** (`userCarrier` başı): uzak serbest vuruş `aiDecide`, diğerleri `aiSetPiece` (`aiTake` bayrağıyla, `execPending` döngüsüne girmesin diye). Penaltı ve direkt serbest vuruşta `armed` gecikmesi yeniden `st.pending` kurar; `aiTake` sayesinde tekrar kullanıcıya dönmüyor — doğrula.
3. **Kullanıcının penaltı / frikik şutu** (`execKick`, `spk` parametresi): `shootAt` ile; penaltı yolu otomatik testte hiç tetiklenmedi (penaltı seyrek). Gerçek oyunda dene.
4. **Geri pas** (`isBackPass`, `st.gkFeet`): kaleci ayakla oynarken `gkHands`/`gkHolding` kontrolleri `gkFeet`'e bakıyor. Aut da `gkFeet = true` kuruyor (kaleci yerden vurur, müdahaleye açık ama rakip ceza sahası dışında).
5. **Kalibrasyon kayması:** aynı 100 tohumda gol 2,59 → 2,85 (taç/santra değişiklikleri sonrası), son ölçüm 2,25–2,57 arası (40–60 maç). Kalibrasyon 2. geçişi senin planındaydı; dokunmadım.
6. **Oyun hızı %30:** tepki pencereleri gerçek zamanda daralıyor (mücadele penceresi ~0,19 s). Oyuncu geri bildirimine bak.
7. **Kaleci çıkışı sınırsız:** basılı tutulduğu sürece orta sahaya kadar gidebiliyor; 25–30 m sınır önerildi, karar proje sahibinde.

Testler: `prototype/src/` altında rules.ts, throwtest.ts, gktest.ts, ogtest.ts, rushtest.ts, sptest.ts, sptest2.ts, sptest3.ts (+ Fable'ın speed.ts, usertest2.ts). Hepsi son durumda temiz.

## Fable denetimi (1 Kasım 2026)

- Kaynak–yayın: `prototype/src/engine.ts` + `page.html` derlenince `index.html` bayt bayt aynı çıkıyor (gömülü kalibrasyon JSON'ları index.html'den geri alındı). Çalışma kopyası ile repo aynı.
- Derleme (tsc es2020) temiz. Regresyon: crit (0 ihlal / saat 0), stall 0, rules 0 yanlış yer, throwtest 0 yürüme/kendine dokunma, sptest3, usertest2, groundtest (Pas yerden), fktest, gktest (76 autta 5 kısa ihlal, kabul), ogtest 0 kendi kale, rushtest 18,1 m, pretest — hepsi geçti.
- Riskli noktalar: (1) `spWait` yaşam döngüsü kapalı: kuran giveSetPiece/aiSetPiece, temizleyen kickBall (noTouch), giveBall (başkası alınca), deadTime; stall.ts ve crit.ts takılma göstermiyor. (2) Süre dolunca `aiTake` yolu doğru: armed → pending → execPending → aiSetPiece (kullanıcıya dönmüyor). (3) Kullanıcı penaltısı: yeni `pentest.ts` (zorla penaltı, 4×40): şut 25/40 gol, pas seçeneği çalışıyor, bekleyince 8,6 s'de yapay zekâ alıyor, takılma 0. Not: `execKick` penaltıda kaleci tahmini yapay zekâ ile; iki kullanıcılı maçta `keeperGuess` kullanılmalı (Dilim 1 online). (4) Geri pas: rules.ts geri_pas 60, sorun yok.
- Kalibrasyon (speed.ts 60 maç): gol 2,35; şut 8,5; isabet 4,2; pas %78,4; faul 2,78; korner 0,97; ofsayt 0,07; mücadele 51,7. Bant 2,4–2,6'nın hemen altı; korner ve ofsayt hedefin altında → kalibrasyon 2. geçişi.
- Doküman tutarsızlıkları düzeltildi (Maç Motoru): "oyun saati kesintilerde akar" → efektif süre; süre sınırları tablosu (penaltı 5 s rastgele köşe → 8 s yapay zekâ); klasik şema tablosunda "Pas kanatta Orta'ya döner" → ayrı Orta butonu; sprint "%85" → 1,5R–1,9R bandı; klavye W ara / I orta. Kritik tur paragrafı eklendi.
- Açık: santra yönü kararı (proje sahibi).

## 1 Kasım gecesi (Fable)

- Yapay zekâ uzaktan şut: `P.longShotMax` 36 (eski sabit 32), `P.longShotBias` 0,05 (20 m ötesi, önü boş, merkeze yakın; 28 m'ye kadar tam, 36'da sıfır). Şut mesafe sayaçları `sut_m_*`, gol `gol_m_*` (DBG). 27 m+ şut maç başı 0,9 → 1,4; gol/şut aynı seed'lerde değişmedi.
- Çıkan topu bırakma: `P.letBallOut` (updateAnchorsAndMove; son dokunan rakip, rakip çıkmadan yetişemiyor, bizim yetişmemiz çıkıştan 0,6 s'den geç → kovalamaz). 200 seed A/B: gol 2,71 / 2,74.
- Kalibrasyon notu: 22 m+ şut dönüşümü %6–7 (gerçek %2–4) → kalibrasyon 2'de kaleci uzak şut kurtarışı. Kalibrasyon tabanı bu seed'lerde ~2,65–2,75 gol (speed.ts 500+ seed'lerinde 2,35–2,8 arası oynuyor; 60 maç yetmiyor, 200 kullan).
- Kararlar: santra her yöne (değişiklik yok); oyun hızı %30 sabit (seçenek test sürümünde duruyor, oyunda kaldırılacak); taktik modeli 2.0 dokümanda (Maç Motoru).

## Gece turu 1–2 Kasım (Fable, proje sahibi uyurken)

Commit sırası: 8ee1406 hız/pencereler → dd51833 şekiller → 7402036 görev kartları → 122944b kurallar → deb6639 sayfa. Her biri tek başına geri alınabilir; yedekler `fm-proto/engine.v23-pre-tactic.ts`, `page.v23-pre-tactic.html` (oturum dışı yok; git asıl yedek).

- `P.playSpeed` (sayfa 1,3): `RT()` ile mücadele penceresi, press50, müdahale tamponu, bot tepki, otomatik değiştirme gecikmeleri oyun saniyesine çevrilir (gerçek saniye sabit). Hız seçeneği kaldırıldı.
- Taktik 2.0: `Doctrine`, `Shape`, `DOCTRINES`, `applyDoctrine`, `attackShapeOf`, `shapesOf`, `shapeDist`, `GRID_X/GRID_Y`; `PState.ox/oy`; `st.phase` (faz geçişi `P.shapeTrans` 2 s, savunmaya dönüş ×0,4); `Duty`, `TeamIn.duties`, `setDuty`, `dutyOf`; `Rule`, `RULE_TEMPLATES`, `RULES_MAX`, `botRules`, `rulesStep` (her adım), `applyRuleAction`, `st.ruleSt`, `st.ruleLog`, olay türü `'rule'`; `setMentality` (`st.mentality`, `st.baseTactic`). Eski `situational` duruyor (sayfada "eski" diye işaretli), kaldırılabilir.
- Denge: hücum şekli + geçiş aynı 100 seed'de gol 2,79 → 3,02, şut 8,75 → 9,4 (kalibrasyon 2'ye). Testler: doctest.ts (doktrin havuzu), dutytest.ts, ruletest.ts, calib.ts; crit/stall/rules/throw/fk/sptest3/usertest2/gktest temiz.
- Bilinen açıklar: rol uyumu çarpanı (görev kartı rolüne aykırıysa EG düşüşü) yok; kural tetiği "rakip şekil değiştirince" yok; şekil editörü (ızgara) sayfada yok, yalnız presetler; `keeperGuess` kullanıcı penaltısında kullanılmıyor (online).
- Kalibrasyon ölçümü (calib.ts, 200 maç, dengeli doktrin): gol 2,87 · beraberlik %24 · golsüz %6 · 5+ gol %14 · 7+ gol %1,5 · şut 9,8 · isabet 4,8 · xG 1,02 · pas %78 · faul 2,9 · korner 0,98 · ofsayt 0,12 · duran top payı %21 · 22 m+ şut 4,0/maç, dönüşüm %6,1. Tarama (tek parametre): xgScale 1,0 → gol 2,67; gkFarSave 0,12 → 2,77 (uzak dönüşüm %4,8, 7+ gol %0,5); gkSaveBase 0,88 → 2,62; longShotBias 0,08 → 2,83. Yeni parametreler `P.gkSaveBase` (0,85) ve `P.gkFarSave` (0) varsayılanda davranışı değiştirmez.

## Dilim 0.5 (1) — fizik katmanı (1 Kasım sabahı)

- `deflectOff`: vektörel çelme/blok. Normal = gelişin tersi (el/gövde topa döner) + gövde-merkez normali (topun hangi tarafa çarptığı sapmayı verir); kalecide ayrıca kale merkezinden yana ve yukarı itiş (yetenekle artar), sapma penceresi sertlik ve falsoyla açılır, yetenekle daralır. Parry izleme (6 maç): 14 korner / 17 oyun / 6 kaleci aldı / 2 aut / 1 gol. İlk deneme (normal yalnız gövdeden) golü 4,1'e fırlattı: yan normal topun kaleye giden bileşenini kesmiyordu; ders: kurtarış = elin topa dönmesi.
- `clearBall` öncelik sırası: boşta güvenli arkadaş (sıkışıklık < 0,5, alıcı boş, p ≥ 0,8) → ileri ve kanada vuruş → rakip yarıya taç → kendi yarıda taç → korner; sıkışıkken taç ileri vuruştan önce. Blok kontrolü yalnız ilk 4 m (lob).
- Şut hatası mesafeyle: `P.shotDistErr` 0,35 (12 m ötesinde her 10 m için açı hatası +%35, dikey hata √ ile). Dönüşüm: 0–11 m %23, 11–16 %18, 16–22 %8, 22+ %2,6–3,8 (gerçeğe yakın; 11–16 bandı hâlâ yüksek, kalecinin yakın şutta modeli "yarı fiziksel" kaldı).
- Durum taktiği (`situational`, `SIT_RULES`) kaldırıldı.
- 200 maç: gol 2,65 · beraberlik %28 · golsüz %9 · 5+ %13 · 7+ %1,5 · şut 9,0 · pas %78 · faul 3,0 · korner 0,6 · ofsayt 0,13 · duran top payı %17. Taç 4,9 → 1,8/maç: eski sayı rastgele sekme ve uzaklaştırmadan geliyordu; gerçek kaynak (çizgi mücadelesi, kontrol hatası) sonraki katmanlarda.

## Dilim 0.5 (2) — algı katmanı

- `percOf(p, defending)` → {G görme, R tepki, B beklenti} (Metrik sekmesindeki formüller). `reactOf` artık oyuncunun R'si + bot tablosu farkı (ai.react − 0,5). Ofsayt düellosu: savunmacı rakip taşıyıcı ileri oynayabilecekken (`threatRunner`) G·B·1,8 m erken adım (`P.stepUp`, tuzakta ×1,3); forvet `timingErr` (1−B)·1,5 m, 0,5 s'de bir yenilenir, çizgiyi kaçırabilir. Kademe bozma: B < 0,55 savunmacı 7 m içindeki yem koşusunu takip eder (`decoyNear`). Pres boşluğu: yüksek preste hat U/100·4 m yukarı çıkar (düşük uyumda boşluk), taşıyıcının ara pas değerlendirmesi G ile (0,5+0,5G). Alışkınlık: ana taktik doktrini ≠ maç doktrini → 50. dk sonrası yorulma ×1,35 (`P.unfamiliarFat`); test: 85. dk kondisyon 38 → 30.
- perctest.ts: GG 70 vs 50: ofsayt 0,33 / 0,42; simetri 0,22 / 0,24. 200 maç: gol 2,74, ofsayt 0,13 → 0,23, korner 0,77.

## Dilim 0.5 (3) — topsuz koşular (ilk sürüm)

- `runChoice`: her 0,5 s'de bir hücumcu arkaya / ayağa / kanada koşu seçeneklerini rol, görev kartı (runs, overlap), takım talimatı, boşluk (`spaceAt`), pas yolu (`laneFree`) ve beklenti (B) ile puanlar; evde kalma değeriyle karşılaştırır; seçilen koşu 1,2–2,3 s sürer; takım başına aynı anda en çok 2 koşu/tür. Koşular taşıyıcının durumuna cevaptır: arkaya koşu taşıyıcı rahat ve öne bakarken (orta üçte bir), ayağa koşu taşıyıcı sıkışıkken, kanada koşu top diğer kanattayken. Arkaya koşan ara pasta 0,25 s ön alır. Koşu hedefi ofsayt çizgisiyle sınırlanır (zamanlama hatası dahil).
- Ölçüm (60 maç, aynı seed): koşusuz 2,67 gol / 9,2 şut / 0,13 ofsayt; yalnız arkaya 2,58 / 9,0 / 0,36; hepsi 2,33 / 8,7 / 0,34. Ayağa ve kanada koşuları orta ve kafa hedeflerini bozup şutu düşürüyor (pas kararı koşuyu henüz hedeflemiyor) → `P.runsMask = 'b'` ile şimdilik yalnız arkaya koşu açık; diğer ikisi kodda, pas kararıyla bütünleşince açılacak.
- 200 maç: gol 2,40 · beraberlik %27 · golsüz %9 · 5+ %9 · şut 8,5 · ofsayt 0,37 · korner 0,61.

## Dilim 0.5 (4) — düşünen bot

- `thinkStep` (her adım, pencere derinliğe göre 20/15/10/8 oyun dk, 10. dk'dan sonra): `thinkObserve` (xG, xGA, yenen şut, top kaybı, pas isabeti, rakibin şut kanadı), `thinkCandidates` (9 hipotez: hattı çek, presi düşür, kanatları kapat, yüklen, orta sahayı sür, tempoyu düşür, sonucu koru, direkt oyun, forveti adam adama; durumdan puanlanır, denenip işe yaramayan puan kaybeder), derinliğe göre 2/3/5/8 aday. `P.thinkSim = 1` ise her aday ve "değişiklik yok" aynı tohumla 12 dk'lık iç simülasyonla (createMatch + step) denenir, en iyi xG farkı uygulanır. Sezgisel modda (tarayıcı) eşik 0,75 ve maç başına 1+⌈derinlik/2⌉ değişiklik. Uygulanan değişiklik 'rule' olayı olarak geçer (sayfada "rakip taktik değiştirdi"), 1 dk uyum. `TeamIn.think` 0–4; sayfada zorluk = derinlik.
- thinktest.ts (eşit takımlar, 40–60 maç): düşünmeyen bot %35 galibiyet / %43 mağlubiyet; sezgisel derinlik 4: %38 / %40; derinlik 4 + iç simülasyon: %55 / %28, maç başı ~3,5 değişiklik, maliyet ~4 s/maç (sunucu/test için; tarayıcıda worker gerekir). Sonuç: zekâ farkını veren şey simülasyonla doğrulama; sezgisel mod tek başına nötr.
- Açık: kullanıcının kendi takım arkadaşı yapay zekâsı için "öneri" modu (T ve U'ya bağlı derinlik) yazılmadı; iç simülasyon tarayıcıda worker'a alınmalı; rakip taktiğini analist doğruluğuyla görme eklenmedi (şimdilik bot rakibin gerçek taktiğini simüle ediyor — gizli bilgi; sunucuda analist seviyesine göre bulanıklaştırılacak).
- 200 maç son durum: gol 2,40 · beraberlik %27 · golsüz %9 · 5+ %9 · 7+ %1 · şut 8,5 · isabet 3,8 · pas %78 · faul 3,1 · korner 0,61 · ofsayt 0,37 · duran top payı %19 · 22 m+ dönüşüm %2,8.

## Dilim 1 (1) — demo uygulama katmanı (1 Kasım öğleden sonra)

- `src/app.html` sayfanın sonuna eklenir (build.py). `window.FM.startMatch({teams, side, minutes, mode:'team'|'sim', ..., onEnd, onExit})` page.html'de; `teamOverride` ile hazır TeamIn'ler; maç bitince 2 s sonra `onEnd(st)`; çıkışta `onExit(st)` (bitmemişse kontrol kaldırılıp kalan süre simüle edilir).
- Ekranlar: login (misafir), setup (kulüp adı/kısaltma/renk), home, mmOpp (zorluk, süre), mmTpl (6 şablon: formasyon·doktrin·GG), room (rakip analizi, ilk 11, taktik özeti, oyun modu Team play / Total simulation, kamera), report (skor, istatistik, olaylar, maçın oyuncusu, Elo / lig sırası), soloNew (4/6/8 takım, zorluk, süre), solo (fikstür · puan durumu · kulüp; çift devreli fikstür, diğer maçlar otomatik simüle, sezon sonu özeti, yeni sezon), squad (liste + futbolcu kartı), tactics (Kolay: formasyon/doktrin/mesafe; Orta: 9 talimat + tuzak; Derin: görev kartları ve 4 kural; savunma/hücum şekli mini saha), settings (kontroller, görünüm, demo sıfırlama, geliştirici sayfası `#dev`).
- Kayıt localStorage `fm.demo.v1`. Maç Modu Elo (K 24, rakip Elo 1000 + (zorluk−3)·120). Eski test sayfası `#dev` ile.
- Demoda yok (Faz 3 etiketiyle): online lig, pazar, sosyal, görevler, sezon pası, mağaza, hamleler, güçlendirme, maç sonu değişimleri, tekrar oynatıcı, arma/forma editörü, kadro düzenleme.

## Dilim 1 (2) — geri bildirim turu (1 Kasım akşamüstü)

- Motor: oyun durunca vuruş kuyruğu/gelişine niyeti/müdahale baskısı sıfırlanır (`deadTime`); sayfada süren jest iptal. Yol verme: takım arkadaşının vurduğu top ona niyetlenmemiş ve hedef ≥5 m ötesindeyse dokunmaz (`ballContacts`). Uzun ara pas havadan: `P.thruAirPower` 0,7 / `P.thruAirDist` 28 m (karar). Baraj 9,45 m'de ve 9,15 m kuralından muaf (salınım giderildi; 5 s sonra ortalama hız 0,2 m/s); crit.ts 9,15 m ihlali 62/137k (baraj üyesi koşarak girerken; kabul). Süreler: korner/serbest vuruş 10 s, taç/aut 6 s, penaltı 8 s. Kaleci topu elinde tutarken her yerde müdahale yok (`gkHolding`). Kaleci çıkışı dar açıdan (|y−34| ≥ 18 ya da x ≤ 3) yok. Birebirde/çizgi ötesinde geriye pas cezası (−0,04/−0,05 EV; byline'dan geri çıkarma hariç) — ölçümde etkisi küçük (2,45 → 2,35/maç), çoğu "birebir" sayılan durum kanatta.
- Uygulama: üst barda ⌂ ana menü; Takım kartı ana menüden kalktı (Solo sekmesi ve maç odasından); kadro/taktik alt sekmeleri yalnız ligden girilince. Taktik tahtası: Kolay = savunma şekli + hücum şekli (formasyon) + doktrin + mesafe; Orta = aynı + 9 talimat + tuzak (doktrin değişince talimatlar doktrine döner); Derin = serbest sürükleme (iki şekil ayrı, anında kaydedilir, "Formasyondan yükle"), görev kartları, kurallar. `userShapes()` → `tactic.shapeDef/shapeAtt`.
- Formasyonlar 5 → 12 (4-1-4-1, 4-3-1-2, 3-4-3, 4-2-2-2, 5-4-1, 3-4-2-1, 4-4-1-1); `FORM_EDGE` Partial; doktrin bedelinde savunma yapısı adın ilk rakamından; üçlü savunma kontrolü `startsWith('3-')`. 20'şer maçlık havuz 4-3-3'e karşı dengeli (gürültülü). Derin ekran: "Hazır şekil → Yükle, sonra sürükle" (savunma yüklemek formasyonu değiştirir; hücum yüklemek doktrinle türetir).

## Dilim 1 (3) — maç içi panel, devre arası, ilk 11

- page.html: `#tacBtn` / T tuşu → `openTac()`: oyun durur (tek oyunculu), panel: yaklaşım kaydırıcısı (serbest), oyun modu (Team play ↔ Total simulation, `FM.setMode`), talimatlar + formasyon (`setTactic`, 3 hak, 1 dk uyum), değişiklik (çıkan → yedek; `userSub`, ilk ölü topta; `pendingSubs`), özet istatistik. Devre arası: 'half' olayında aynı panel "Devre arası" başlığıyla otomatik açılır, "İkinci yarıya başla". Esc panel açıkken paneli kapatır.
- Motor: `userSub`, `pendingSubs`; kullanıcı takımında yorgunluk otomatik değişikliği kapalı (sakatlık ve kaleci otomatik kalır).
- Uygulama: `db.team.lineup` (11 forma numarası, slot sırası); `userTeamIn` ilk 11'i buna göre kurar, slot mevkisi formasyondan, doğal mevki `natPos` (uyumsuzluk turuncu etiket; mevki uyumu Faz 3). Kadro ekranında "Yer değiştir" → hedef seç; "Dizilişi sıfırla".
- Karar paneli: kullanıcı takımında sakatlık (10 s), kırmızı kart (15 s) ve kaleci atılması (15 s) otomatik değil; oyun durur, panel açılır, geri sayım, önerilen yedek işaretli (`suggestedSub`); süre dolunca ya da "Devam" basılınca değişiklik seçilmediyse sistem uygular (`autoSubsFor`; kırmızıda 10 kişi devam). Motor: `autoSubs(st, force)` kullanıcı takımını atlar.

## Motor turu (1 Kasım akşam, kullanıcı test ederken)

- 9,15 m: ihlaller baraja geç kalan oyuncuların çemberden geçmesiydi; barajdakiler ayrılma itmesinden muaf (rakip yaslanınca baraj kaymasın) ve hedefe 3 m'den uzaksa koşuyor → crit 100 → 1 ihlal; baraj 2,5 s sonra 0,21 m/s.
- Müdahale topu her zaman temiz almaz: `P.tackleLoose` 0,5 ile top açılır (müdahale yönünde, çizgi yakınında dışarı, kendi kale çizgisi yakınında kornere); maç başı ~7 açılan top. Taç 1,8 → 2,1.
- Bulgu: oyun merkez ağırlıklı — top kenar koridorda (çizgiye <10 m) zamanın %9'unda (gerçekte ~%25), çizgiye <4 m %2,5. Taç/korner düşüklüğünün kökü bu; kanatları genişletmek (hücum şekli W/FB ×1,15–1,25) kenar kullanımını %11'e çıkardı ama golü 2,8 → 2,0 düşürdü (pas kararı kenarı değerlendirmiyor) → geri alındı. Kenar oyunu (pas değerleme + kanat koşuları + orta) ayrı mekanik turu.
- Ayağa/kanada koşular: pas değerlemesi koşu hedefini kullanıyor artık (`_run` hedefi), yine de 'all' 2,37 vs 'b' 2,88 → kapalı kalıyor.
- 11–16 m dönüşüm %18 (gerçek ~%12–15): kabul edilebilir aralıkta, dokunulmadı.
- 200 maç: gol 2,48 · beraberlik %27 · golsüz %7 · 5+ %10 · şut 8,7 · korner 0,72 · ofsayt 0,39 · duran top payı %22.

## Geri bildirim turu 2 (1 Kasım akşam)

- Duran topu kullanacak oyuncuya pres yok (`st.restartTaker !== carrier`): kaleci aut/degaj kullanırken dibine rakip gelmiyor. Penaltıda ceza sahası içindeki oyuncular koşarak çıkar (urg 0,9).
- `keepAway`: oyuncu dışarıda, hedef dışarıda ama yol çemberden geçiyorsa çemberin etrafından dolaşır (teğet noktası); önceden çember kenarında takılıyordu (bek topun arkasında kalıyordu).
- Kaleci: güvenli pas (p ≥ 0,8) yoksa uzaklaştırma öncelik sırası (kendi pasını kovalamasın). Not: kalecinin kendi (restart olmayan) pasını geri alması kural olarak serbest; aut sonrası ikinci dokunuş yasağı testte 0.
- Klavye falso: vuruş tuşuna bastıktan sonra ilk 0,25 s yön tuşları nişan, sonra nişan kilitlenir, nişana dik yön tuşu kavis (±0,8); önizlemede görünür. Güç dolma süresi pas/ara 600 → 900 ms, orta 800.
- Taktik düğmesi duraklat/kaydırıcı yanına; dar ekranda kaydırıcı etiketi gizli.

## KRİTİK HATA ve düzeltme (1 Kasım 20:40)

- Belirti: taktik düzenledikten sonra maç açılmıyor / sahada futbolcular ve top kayboluyor (mobil ekran görüntüsü).
- Kök neden: kullanıcı kadrosu formasyona göre üretiliyordu (`makeTeam` → `FORM_NUM`); 5-3-2 ve 3-4-2-1 formasyonlarında forma numaraları 14 içerip 7 içermiyordu. Diziliş (`lineup`) 4-3-3'ten 7 numarayla kaydedilince 5-3-2'de 7 numara kadroda bulunamadı → tanımsız oyuncu (gg/name yok) → hız/konum NaN → `separate()` NaN mesafeyi "yakın" sayıp itmeyi herkese bulaştırdı → bütün oyuncular ve top NaN (görünmez). Ayrıca 14 numara yedek 14 ile çakışıyordu.
- Düzeltme: (1) kullanıcı kadrosu formasyondan bağımsız sabit (`userRoster`, 1–18); formasyon yalnız slot mevkisi; `defaultLineup` slot mevkisine göre en güçlü uygun oyuncu; diziliş doğrulaması (11 benzersiz, kadroda var, 0. slot kaleci) yoksa varsayılana dön. (2) `FORM_NUM`'da 14 → 7 (her formasyonda 1–11). (3) Motor `validateTeam` (createMatch başında; bozuk takım açık hata mesajıyla reddedilir), `separate()` NaN-güvenli (`!(d < minD)`). (4) Uygulama: maç başlatma try/catch, hata mesajı toast, geliştirici sayfasına düşmez. (5) Sayfada NaN bekçisi (konsola uyarı), alt köşede sürüm damgası (önbellek şüphesinde kontrol için).
- Doğrulama: 12 formasyonun hepsi savunma/hücum şekli olarak maç başlattı (NaN 0), eski 4-3-3 dizilişiyle 5-3-2, bozuk diziliş (99 numara), solo + takas + sürükleme — hepsi temiz.
- Forma numarası kuralı (karar 1 Kasım 20:55): numara 1–99 arası serbest etiket, takım içinde (ilk 11 + yedek) benzersiz, futbolcu kartından değiştirilir, dizilimde rolü yok. Uygulama: `db.roster` kalıcı (18 futbolcu, sabit `id`), `lineup` ve `duties` id ile; `ensureRoster` eski kaydı (numaralı lineup/duties) göçürür; `setShirtNumber` doğrular; `reslot` formasyon değişince seçili 11'i doğal mevkiye göre slotlara dağıtır. Motor içinde kimlik hâlâ numara (benzersizlik `validateTeam` ile garanti: 1–99 tam sayı, ilk 11 + yedek). Test: eski kayıt göçü, 9→99 (görev kartı oyuncuyla taşındı), çakışma ve 0 reddi, 12 formasyon, solo akışı.

## Tanı turu (1 Kasım gece) — "taktikten dönünce maç açılmıyor"
- Playwright'ta 40 rastgele taktik/kadro/numara akışı + maç başlatma: hepsi açıldı, NaN yok, hata yok. Kullanıcının cihazında ise tuval boş, saat 00:00, geliştirici sayfası altta görünüyor → kare döngüsü (`frame`) bir istisnayla ölüyor ve `onResize` tuvali temizledikten sonra bir daha çizilmiyor (ana şüphe: eski kayıttan gelen veri).
- Çözüm/araç: `frame` artık `try/catch` içinde; istisna döngüyü öldürmez. Hata ekranda kırmızı kutuda (Kopyala · Maçtan çık · Kapat), `localStorage['fm.lastError']`'a yazılır ve Ayarlar → **Tanı** kartında görünür. `window.error` ve `unhandledrejection` de aynı kayda düşer.
- ship.sh artık app.html'i de repoya kopyalar (önceden eksikti).
- Maç içi taktik paneli "Talimatları uygula": motor tarafı çalışıyordu (setTactic → talimat/formasyon/pozisyonlar değişiyor, hak düşüyor) ama görünür geri bildirim yoktu: afiş panelin altında kalıyor, hak sayacı sol sütunda kaydırmayla gizleniyor, panel yeniden çizilince kaydırma sıfırlanıyordu. Şimdi: buton "kalan N hak" yazar, altında 6 sn "Uygulandı: 5-3-2 · pres yüksek …" satırı, kaydırma konumu korunur.
- Duran top beklerken şekil: faz hedefi "son sahiplik"e bakıyordu; taç/serbest vuruş kullanacak takım savunma şeklinde bekliyordu. Şimdi `pending.side` (ya da topu tutan duran top kullanıcısı) hücum şekline, diğeri savunma şekline geçer. 200 maç: gol 2.49, beraberlik %29, ofsayt 0.36 (değişmedi).
- Ölçüm (gkclear2.ts): kullanıcı kalecisi topu elinde 4 s tutunca rakipler 0.8–1.4 m'ye kadar geliyor (22/22). Bot kaleci hemen oynadığı için bot-bot ölçümünde görünmüyordu (medyan rakip mesafesi 10.5 m). Mekanik önerisi kullanıcıya sunuldu.

## Taktik 2.1 turu (1 Kasım gece) — kaleci, rotasyon, geçiş
- Kaleci elinde top: rakip 6 m çember (`P.gkHoldR`, keepAway ile), pres yok; elden vuruş z=1 m'den, uzun vuruşta en az vz 7 (`P.gkHandVz`). Ölçüm: kullanıcı kalecisi 4 s tutunca en yakın rakip 0.8–1.4 m → 10.8–14 m; bot-bot rakip dokunuşu 20 m içinde 2 → 0. 100 maç: gol 2.45, ofsayt 0.36.
- Rotasyon (`TacticIn.rotations`, 2–6 oyunculu döngüler, forma no): `st.rot` + `st.rotHome` (oyuncu → evini kullandığı oyuncu). Tepkisel kural (toplam mesafeyi ≥6 m azaltan dairesel kaydırma) + etkin kural (top rakip yarıda, döngüye 30 m, taşıyıcı döngüde değil: 7 s'de bir %50 ile bir adım çevir). Top kaybında hedef taban; gecikme uyuma bağlı (U100 1×, U60 1.67×, U40 2×). Ölü topta anında taban. Değişiklikte giren oyuncu döngüde çıkanın yerini alır. 60 maç ölçümü: ~12 rotasyon/maç, ~5 s sürüyor; gol/xG etkisi gürültü içinde (±0.15); U40'ta aleyhte xG artışı (0.8→0.99) = "terste kalma". Markaj şaşırtma (adam markajcının gecikmesi) henüz modellenmedi → sonraki motor turu.
- Geçiş hızı: şekil geçiş süresi çarpanı `clamp(1 + (60−U)/100, 0.7, 1.4)` (U100 0.7×, U60 1×, U40 1.2×); eskiden yalnız U<60 cezası vardı. 200 maç: gol 2.40, beraberlik %25, ofsayt 0.37 (taban).
- Derin tahta: "Rotasyon çiz" — oyunculara sırayla dokun, ilkine tekrar dokun ya da "Döngüyü kapat"; oklar SVG; döngüler kimlikle saklanır (`tt.rotations`), motor numaraya çevrilir; kaleci ve ikinci döngü engellenir; `validateTeam` döngüleri doğrular.
- Maç içi taktik paneli yeniden: sekmeler Yaklaşım (kaydırıcı, oyun modu, canlı istatistik — serbest) · Talimatlar (doktrin + 5 talimat + hatlar arası/bekler/orta saha/koşular/kanat/tuzak) · Şekil (savunma/hücum mini saha, sürükle-bırak, hazır şekil yükle, rotasyon çiz; taslak → "Şekli uygula") · Görevler (görev kartları + koşullu kurallar) · Değişiklik. Her uygulama 1 hak (3), 1 dk uyum; kaydırıcı ve mod serbest. Total simulation'da aynı panel. Kırmızı/sakatlık kararında Değişiklik sekmesi açılır ama diğer sekmeler de erişilebilir. Playwright: doktrin+pres, 5-3-2 + sürükleme + 3-4-3 hücum + rotasyon, görev+kural uygulamaları doğrulandı; hak 3→0, hata yok.

## Gece turu 2 (1→2 Kasım) — onaysız ilerleme (kullanıcı izni: "direk git'te güncelle")
### 1. Rotasyon → markaj şaşırtma
- Adam markajcısı artık adamını tutar (`_mk`): adam evinin 16 m dışına çıkınca (rotasyon, çizgi değişimi) `P.markReacq`=1 s × (1,6 − B) kadar peşinden gider, sonra yeni adam arar. Okuması iyi savunmacı (B yüksek) daha çabuk bırakır.
- Ölçüm (80 maç, A 4-3-3 vs B 4-3-3, B'nin dört savunmacısı adam markajı): A rotasyonsuz xG 0,98 → W-ST-W döngüsüyle 1,12, FB-W×2 ile 1,05. Alan savunmasına karşı rotasyon kazanç vermiyor (0,94 vs taban 0,91) ve top kaybı bedeli sürüyor. Tasarım sonucu: rotasyon adam markajına karşı silah, alan savunmasına karşı nötr/hafif bedelli — açıklanabilir ve taktik seçime bağlı.
### 2. Kenar oyunu turu
- Teşhis (20 maç): top taç çizgisine 10 m içinde zamanın %13,6'sı; kanatlar hücumda merkezden 20,9 m (çizgiden 13 m), bekler 25,7 m; pasların %17'si kenara; taç 2,1/maç. Neden: pas değeri `threat()` tamamen merkezcil; hücumda herkes topa doğru 0,32 oranında yanal kayıyor; kanat evleri zaten 10 m içeride.
- Değişiklik (mekanik, çarpan değil): (a) hücumda kanat/bek topa doğru yanal kayma 0,32 → 0,08 (`P.wideHoldK`; ters kanat açık kalır); (b) hücumda kanat/bek genişlik çarpanı `P.wideStretch` [1, 1.12, 1.2] (dar/normal/geniş; "içe kat" talimatında yok); (c) `threat()`'e kanat kanalı terimi (son üçte kenar bölge değeri `P.wideThreat` 0,02); (d) çizgiye 9 m yakın müdahalede top %70 dışarı doğru ve daha hızlı açılır (`P.lineOutR/P.lineOutP`).
- Sonuç (20 maç): çizgiye 10 m içinde %15,5–18; kanat 22,9 m, bek 28,1 m; orta 10,7 → 13,5; taç 2,1 → 3,0. 200 maç taban: gol 2,56, beraberlik %28, 0-0 %6, korner 0,83, ofsayt 0,38 (bant içinde). `wideThreat` 0,03'te gol 2,28 / 0-0 %14'e düşüyordu (çok fazla orta) → 0,02.
- Taç sayısı hâlâ gerçeğin (~20/takım) çok altında; kaynağı sahipsiz top/sekme fiziğinin azlığı — ayrı tur.
### 3. Koşular
- 100 maç karşılaştırma (aynı seed'ler): yalnız arkaya 2,43 gol / pas %78,2; arkaya+ayağa **2,54 / %78,7** (şut 8,2→8,7); arkaya+kanada 2,33 (hücumda kayıp pas +7%); üçü 2,38. Karar: ayağa koşular açıldı (`runsMask 'bf'`). Kanada koşu hedefi 4/64 → 7/61 ve pas yolu açık şartıyla yeniden sınanıyor; sonucu aşağıda.
### 4. Total simulation ekstraları + telefon
- Oynarken "Katman" düğmesi (sağ üst, Kam'ın yanı): kendi takımın hat çizgileri (rakip soluk), şekil fazına göre ev konumları (kesikli daire + oyuncuya çizgi; rotasyonda başkasının evi), rotasyon okları (kayma varsa dolu). Total simulation'da varsayılan açık. Skor şeridinin altında canlı istatistik satırı (sahip olma, şut, xG, korner) — sim modunda ya da katman açıkken.
- Telefon: skor şeridi 900 px altında 250 px / 16 px yazı (Taktik düğmesi skorun üstüne biniyordu).
### 5. Rapor
- Maç raporuna "Oyuncular" (kendi takım: xG, gol, kart, sakatlık, değişiklik, kondisyon) ve "Taktik zaman çizelgesi" (talimat/şekil/görev uygulamaları, kaydırıcı, kural tetikleri; karşı pres/ikinci top sayıya indirildi; rotasyon çevirme sayıları) kartları eklendi.
- Kanada koşu, hedef 7/61 + pas yolu açık şartıyla (100 maç, aynı seed'ler): arkaya+ayağa 2,54 gol / xG 0,90 → +kanada 2,35 / 0,83, beraberlik %24 → %32. Koşu başına değer düşük: kanada koşan oyuncu kanat kanalındaki boşluğu dolduruyor ama pas geldiğinde orta/şut seçeneği zayıf kalıyor (orta dönüşümü düşük). Karar: `runsMask 'bf'` kalıyor; kanada koşu, orta mekaniği (kesme pası, ikinci direk) ele alındığında yeniden sınanacak.
- Gece turu kapanışı: 5 madde tamam; artifact sürüm 40, GitHub b071994. Sabah kararları: arka uç (Supabase / Durable Objects / kendi sunucu), botların rotasyon kullanması, 11–16 m dönüşüm bandı.

## Dilim 2a — girdi kaydı ve tekrar (3 Kasım)
- Motor: `st.stepN` adım sayacı; `st.rec` kaydedici (seed, knockout, takımların JSON kopyası, P anlık görüntüsü, komut dizisi). Durum değiştiren her dışa açık çağrı adım numarasıyla kaydedilir: `setInput` (yalnız değişince ya da aksiyon varsa), `setTactic`, `setMentality`, `setDuty`, `setRules`, `setRotations`, `userSub`, `autoSubsFor`, `setControl`, `setAutoSwitch`. `replayOf(st)` → Replay (steps, hash, score); `stateHash` FNV-1a (top, oyuncular, kondisyon, skor, saat; yuvarlanmış); `replayMatch(rep, onStep?, maxSteps?)`; `verifyReplay(rep)`.
- Test (replaytest.ts): 6 dk maç, rastgele kullanıcı girdisi + taktik/kaydırıcı/görev/değişiklik → JSON'a yazıp geri okuyunca hash ve skor birebir (13.762 adım, 2.230 komut, 270 KB — gerçek oyunda girdi çok daha seyrek: Playwright denemesinde 10 komut, 8,9 KB).
- Uygulama: maç bitince/terk edilince kayıt `localStorage['fm.lastReplay']`; raporda "Tekrarı izle" (aynı motor, kontrol ve taktik kapalı, katman açık, "TEKRAR" afişi) ve "Tekrar ve doğrulama" kartı (kayıt baştan koşturulur: 6 dk maç ~2 s, ✓/✗). Anında simülasyonda kayıt yok.
- Sunucu tarafı taslağı (`server/`): Supabase şeması (profil, kulüp, kadro, taktik, maç, solo sezon, kozmetik, envanter, arkadaş, satın alma; RLS) ve `verify-match` Edge Function (aynı motor, hash+skor karşılaştırma, gzip kayıt depoya). Deploy, kullanıcının Supabase projesi açılınca.

## Kozmetik stüdyosu (3 Kasım) — `studio.html`
- GitHub Pages: https://tanashuky.github.io/football-madness/studio.html — tasarımcı için önizleme/doğrulama. Sürükle-bırak (SVG/PNG/JSON), dosya adından tür tespiti, kontroller (ad kuralı, boyut sınırı, viewBox, yasak etiketler text/image/filter/foreignObject/script, yer tutucu renkler, sabit renk uyarısı, PNG ölçüleri, Lottie yapısı), üç renk seçici + 8 hazır kombinasyon (yer tutucu #FF0000/#00FF00/#0000FF değiştirilir), önizlemeler: sahada 26 px daire (11 oyuncu + rakip), kadro kartı (forma silueti kırpma + arma), büyük görünüm, maç önü (rakip armayla yan yana). Şablon indirme (forma 400×500, arma 512×512), 8 örnek dosya, katalog.csv satırı üretme ve indirme.
- Playwright: 8 örnek geçti; `<text>` ve sabit renkli dosya ile kurala uymayan ad doğru şekilde reddedildi.
- Stüdyoya Lottie oynatıcı: `goalfx_*.json` seçilince saha üstünde orta noktada oynar (Oynat, döngü, boyut kaydırıcı; kare/süre bilgisi); kontroller: katman/boyut/fps, süre hedefi 1–1,5 s, 100 KB uyarısı, gömülü bitmap yasak, metin katmanı uyarısı. Örneklere özgün bir "burst" (halka + 8 kıvılcım, 36 kare) eklendi. lottie-web 5.12.2 `vendor/` altında (CDN'e bağımlılık yok).

## Dilim 2b (3 Kasım) — hesap + bulut kayıt (anahtar bekliyor)
- `app.html` içinde `CLOUD` katmanı: Supabase JS (CDN, ESM) yalnız yapılandırma varsa yüklenir (`FM_CLOUD` sabiti derlemede `fm-proto/cloud.json`'dan dolar; repoya girmez; test için `localStorage['fm.cloud']`). Giriş: Google / Apple (OAuth yönlendirme) ve e-posta bağlantısı (OTP). Misafir akışı aynen kalır; hesap sonradan bağlanabilir.
- Bulut kaydı: `saves` tablosu (profil → jsonb, RLS "own save"). dbSave → 1,5 s gecikmeli push; girişte pull: bulut kaydı yereldekinden yeniyse ya da yerel hesap yoksa bulut kazanır (ana menüye geçer), yoksa yerel buluta yazılır. Ayarlar: hesap durumu, "Şimdi eşitle", "Çıkış".
- Playwright (sahte Supabase): giriş → kayıt buluta; taktik değişikliği 1,5 s sonra bulutta; yerel kayıt silinip yeni cihazda giriş → kulüp ve doktrin buluttan geldi.
- Canlıya almak için: Supabase projesi + `schema.sql` (saves tablosu eklendi) + Authentication'da Google/Apple sağlayıcıları + `cloud.json`.
- Hata kutusundan gelen ilk gerçek rapor (kullanıcı, telefon): `createRadialGradient: non-finite` — kurtarış efekti çizilirken ölçek NaN/sonsuz (gizli ya da sıfır boyutlu tuval: uygulama ekranındayken arkada süren geliştirici simülasyonu / döndürme anı). Düzeltme: tuval sıfır boyutluysa ya da uygulama ekranındayken (oyun yokken) `draw` çizmez; efekt döngüsü sonlu olmayan koordinatı atlar.
- Kullanıcının ilk gerçek maçında yerel doğrulama ✗ (hash farkı). Playwright ile 25 s gerçek oyun + panel kullanımıyla yeniden üretildi; adım adım hash karşılaştırmasıyla (replay3.cjs) ayrışma noktası bulundu: panelden görev kartı/kural uygulaması `tacticChanges`, `adaptUntil` ve olay listesini doğrudan değiştiriyordu, kayda girmiyordu. Ayrıca basılı joystick her çağrıda `lastInputT` güncelliyordu; kayıt aynı girdiyi sıkıştırdığı için tekrarda farklı kalıyordu. Düzeltme: `applyDutiesRules` tek kayıtlı motor işlemi; joystick hareketi `userStep` içinde adım başına sayılır. 3.432 adım + panel + hızlı ileri sarma: ayrışma yok; 65 komutlu maç ✓.

## 5 Kasım — kullanıcı test notları (3)
- **Kaleci kurtarışında oyuncu değişikliği:** `deadTime('Kaleci aldı')` da ölü top sayılıp bekleyen değişiklikleri uyguluyordu. Kural 3: değişiklik yalnız top oyun dışındayken; kaleci topu alınca oyun durmaz → o nedenle değişiklik atlanır.
- **Taç sonrası "çift pas":** vuruştan önce verilmiş bir aksiyon (örn. bot taçı kullanırken ya da gecikmeyle gelen ikinci basış) top havadayken "gelişine vuruş niyeti"ne dönüşüp alıcıya ilk dokunuşta garip bir pas yaptırıyordu. Artık yalnız son vuruştan sonra verilen aksiyon gelişine niyeti olur (`ctl.actAt > ball.kickT`); eskisi atılır (`eski_aksiyon_atildi`).
- **Direkler:** yoktu — kale çizgisini 3,66 m içinde geçen top goldü, dışı korner/aut. Şimdi direk (0,12 m) ve üst direk (2,44 m) çarpışması: top yarıçapı 0,11 m hesaba katılır, geri seker (hız ×0,6, saçılma), iç yüzeye çarpanların %35'i içeri girer; `miss` olayı "direk/üst direk", `stats.woodwork`, "DİREK!" afişi. 60 maç: direk 0,23/maç, gol 2,40 (bant içinde). Gerçek ortalama ~0,5–0,8/maç; şut hedef dağılımı daha kenarlara açılınca artacak (ayrı kalibrasyon).
- Sunucu doğrulaması: `WORKER_RESOURCE_LIMIT` (HTTP 546) — Supabase Edge Function 2 s CPU sınırı tam maç tekrarına yetmiyor. Karar bekliyor: Cloudflare Workers ücretli (30 s CPU) ya da küçük Node servisi; veri tabanı Supabase'de kalır.
- Terk edilen maç: `exitPlay` P'yi (clockRate, playSpeed) sıfırladıktan sonra kalan süreyi simüle ediyordu → kayıt/tekrar uyuşmazlığı. Sıra değiştirildi: önce onExit (aynı P ile simülasyon), sonra sıfırlama. abandon.cjs: ✓.

## 11 Kasım — zorluk kaydırması
- Geri bildirim: oyun zor. Her kademe bir alt kademenin bot parametrelerini aldı (Yarı pro = eski Amatör …, Efsane = eski Dünya klası); Amatör için yeni taban (hata ×4, okuma %20, tepki 0,85 s, zamanlama 0,3). Bot düşünme derinliği ve kural sayısı `max(0, kademe−2)`; U/T/F bir kademe aşağı; rakip GG kademeye göre −4…+4. Kaba eğri (kullanıcı kadrosu bot olarak, 6 dk, 20 maç): Amatör 12G-3M, Yarı pro 8-1, Pro 9-5, Dünya klası 6-2, Efsane 5-5. İnsan oyuncu için daha dik; betada ölçülecek.
- Çevrimdışı: `sw.js` (sayfa için önce ağ sonra önbellek; vendor/ikon için önce önbellek), manifest adı "Football Madness"; kayıt yalnız https'te. Metroda/uçakta açılır; Kariyer oynanır, bulut ve sunucu istekleri doğal olarak kapalı.
- Doküman: Sistem Akışları'na "Kariyer / Online fark tablosu", Metrik'e "Kariyer ekonomisi ve iki ödül tablosu" (çarpanlar ×1,25 gelir / ×0,8 maliyet / ×0,6 süre; PP tavanları günlük 10, sezonluk 250; öneri) ve zorluk hedef bandı.

## 11 Kasım — üretim istemcisi iskeleti (`client/` → `app/`)
- Yapı: derleyicisiz TypeScript. `client/src/**` tsc ile ES modüllerine derlenir (`app/js/`), tarayıcı doğrudan yükler; paketleyici yok (sandbox'ta npm kayıt defteri erişilemediği için ve bağımlılık sıfır kalsın diye). Motor tek kaynak `prototype/src/engine.ts`; `client/build.sh` derlemeden önce `client/src/engine/engine.ts`'e kopyalar (git dışı). Motora `FORMATIONS, FORM_POS, FORM_NUM` dışa aktarımı eklendi (demo derlemesi `export` satırını zaten siliyor, etkisiz).
- Katmanlar: `core/` (html şablonu + kaçışlama, i18n `t()/opts()`, yönlendirici: ekran yığını + popstate ile telefon geri tuşu, kayıt deposu `fm.save.v1` + demo kaydı taşıma, bulut (Supabase, publishable anahtar `config.ts`'te), hata kutusu + `fm.lastError`), `model/` (kadro/dizilis, şablonlar, kariyer ligi + ekonomi, ödül defteri, rapor), `screens/` (giriş, kulüp kurulumu, ana menü, kariyer 4 sekme, kadro, taktik tahtası, Maç Modu şablon akışı, maç odası, rapor, ayarlar, profil, ödüller), `match/sim.ts` (Total simulation: tuval çizimi demodan taşındı, akıllı kamera, afişler, zihniyet kaydırıcı, talimat + değişiklik paneli, 1×/2×/4×, tekrar izleme). Team play (joystick, vuruş jesti) bu sürümde demoda kalır; sonraki adım.
- Kayıt şeması v1: `account.club`, `settings` (dil, kontrol, erişilebilirlik), `career` (kadro, taktik, lig, FM cüzdanı, defter, tesis seviyeleri, taraftar morali, istatistik, kupalar, tarihçe), `mm` (Elo), `rewards` (PP, güçlendirme, günlük/sezonluk tavan sayaçları, defter), `online: null`. Demo kaydı (`fm.demo.v1`) ilk açılışta taşınır: kulüp + ayarlar + Elo; solo lig varsa Kariyer olur, yoksa kadro/taktik ilk Kariyer'de kullanılır.
- Ekonomi (dokümandaki Online formülü × Kariyer çarpanı): maç primi 500/200/100 FM ×1,25; iç sahada bilet = kapasite (Sv1 10.000) × taraftar morali × 0,1 FM ×1,25; başlangıç 2.500 FM. PP: galibiyet 2, beraberlik 1, lig şampiyonluğu 50; günlük 10 / sezonluk 250 tavanı istemcide de uygulanır (sunucu mutabakatı Online'da).
- Forma çatışması: iki takımın ana rengi yakınsa (RGB uzaklığı ≤110) deplasman ikinci rengine, o da yakınsa kireç/sarı/siyaha geçer; açık formada numara koyu yazılır.
- Playwright (client1/client2.cjs): giriş → kulüp → kariyer → sekmeler → kadro (numara 77) → taktik (derin, rotasyon 6→8→9, orta seviye pres) → oda → anında simülasyon → rapor (+250 FM, +1 PP) → puan durumu → ödüller → Maç Modu (şablon seç, rakip seç) → canlı maç 4× (zihniyet, talimat paneli, kamera) → rapor, tekrar doğrulandı ✓ → tekrar izleme → dil EN. Telefon (iPhone 13): dikeyde "telefonu yatay çevir", yatayda akıllı kamera; demo kaydı taşıma (4-4-2/kontra/6 dk) ✓.
- Yayın: `.github/workflows/client.yml` client/ ya da motor değişince derleyip `app/` dizinini depoya yazar → https://tanashuky.github.io/football-madness/app/ . Kendi service worker'ı (`app/sw.js`, yayın numaralı önbellek); kök `sw.js` artık `/app/` isteklerine karışmaz.
- Sonraki adımlar: Team play'in `match/play.ts` olarak taşınması (kontroller, vuruş jesti, taktik paneli sekmeleri, taktik katmanı), tesis/antrenman gerçek zamanlı sayaçlar, scout havuzu, Capacitor sarmalayıcı, Google/Apple giriş.
