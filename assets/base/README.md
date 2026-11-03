# Football Madness — Taban paketi (tasarımcı için)

Oyundaki mevcut görünüm, brief'teki formatlarda. Bunların üstüne çeşit üretilir; saha ve futbolcu daireleri olduğu gibi kalır.

- `pitch/` — stadyum temaları 2048×1365 PNG. `stadium_day_v1` oyunun gerçek sahası (motor çizimi). `night`, `rain`, `snow` **yer tutucu**: gündüz sahasının üstüne basit tonlama/çizgi/nokta bindirildi; tasarımcı bunları yeniden yapar. Saha çizgileri ve oyuncular oyunda kodla çizilir; tema yalnız çevre ve zemin tonudur.
- `kit/` — varsayılan 6 forma deseni (düz, çubuk, dikey çubuk, çapraz şerit, yarım-yarım, göğüs şeridi) + `kit_template_v1.svg` (siluet rehberli şablon). Renkler yer tutucu: #FF0000 ana, #00FF00 ikinci, #0000FF üçüncü.
- `crest/` — iki örnek arma (kalkan, daire) + şablon (512×512, 448 px güvenli alan).
- `ball/` — varsayılan top: 128×128 PNG + SVG (beyaz, koyu kontur, pentagonlar).
- `frame/` — kadro kartı çerçevesi tabanı (240×300, 9-slice kenar 16 px).
- `flag/` — kulüp bayrağı tabanı (300×200, sol üstte arma alanı).
- `ui/` — renk paleti (CSS değişkenleri ve JSON) ve yazı tipleri. Oyun koyu zemin üzerinde; tek vurgu rengi Projektör sarısı.
- `screens/` — mevcut ekranlar 1280×720 (giriş, kulüp kurulumu, ana menü, kadro, Derin taktik tahtası, rakip şablonu, maç odası, maç, maç içi taktik paneli, rapor, ayarlar) ve telefon boyutunda maç (844×390 @2x).

Kontrol ve önizleme: https://tanashuky.github.io/football-madness/studio.html — her dosyayı sürükle, "geçti" rozeti ve saha/kart önizlemesi.
İsimlendirme: `tür_ad_vN.uzantı` (küçük harf, Türkçe karakter yok). Teslim: `assets/incoming/` ya da paylaşılan klasör.
