# Football Madness – prototip

11'e 11 strateji-arcade futbol oyununun maç motoru prototipi.

- `index.html`: oynanabilir prototip (GitHub Pages ile yayınlanır). Telefonu yatay tut; "Oyna" kutusundan başlat.
- `prototype/src/engine.ts`: deterministik maç motoru (TypeScript, bağımlılık yok).
- `prototype/src/page.html`: izleme ve oynama sayfası şablonu; `prototype/build.py` motoru ve test özetlerini sayfaya gömer.
- Diğer `prototype/src/*.ts` dosyaları toplu test ve kalibrasyon araçlarıdır (`node src/<dosya>.ts`, Node 22).

Tasarım dokümanı claude.ai üzerinde tutulur; kararlar orada, kod burada.
