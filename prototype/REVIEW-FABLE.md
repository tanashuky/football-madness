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
