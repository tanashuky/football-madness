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
