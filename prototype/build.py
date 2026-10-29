# Sayfayi kurar: derlenmis motoru ve test ozetini sayfaya gomer
import json, re, sys, os
S = sys.argv[1]
eng = open('build/engine.js').read()
eng = re.sub(r'^export\s+', '', eng, flags=re.M)
eng = re.sub(r'^import .*$', '', eng, flags=re.M)
page = open('src/page.html').read()
page = page.replace('__ENGINE__', eng).replace('__SUMMARY__', open(S + '/summary.json').read()).replace('__BALANCE__', open(S + '/balance.json').read()).replace('__MATCHUP__', json.dumps(json.load(open(S + '/f0.json')) + (json.load(open(S + '/f1.json')) if os.path.exists(S + '/f1.json') else [])))
open(S + '/prototip.html', 'w').write(page)
# bagimsiz surum (dosya olarak gonderilen): tam iskelet ve telefon viewport ayarlari
head = ('<!doctype html>\n<html lang="tr">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no">\n'
        '<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="mobile-web-app-capable" content="yes">\n'
        '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n<meta name="theme-color" content="#0e1512">\n'
        '<meta name="apple-mobile-web-app-title" content="FM Test">\n'
        '<link rel="manifest" href="manifest.webmanifest">\n'
        '<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">\n'
        '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n</head>\n<body>\n')
open(S + '/football-madness-prototip.html', 'w').write(head + page + '\n</body>\n</html>\n')
print('ok', len(page))
