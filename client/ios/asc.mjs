// App Store Connect'ten uygulamanin paket kimligini (Bundle ID) ve takim kimligini okur; GITHUB_ENV icin KEY=VALUE satirlari yazar.
// Kullanim: node asc.mjs <AuthKey.p8 yolu>   (ASC_KEY_ID ve ASC_ISSUER_ID ortam degiskenlerinden)
import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
const b64 = (x) => Buffer.from(x).toString('base64url');
const key = readFileSync(process.argv[2], 'utf8');
const now = Math.floor(Date.now() / 1000);
const head = b64(JSON.stringify({ alg: 'ES256', kid: process.env.ASC_KEY_ID, typ: 'JWT' }));
const body = b64(JSON.stringify({ iss: process.env.ASC_ISSUER_ID, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' }));
const s = createSign('SHA256'); s.update(`${head}.${body}`);
const jwt = `${head}.${body}.${s.sign({ key, dsaEncoding: 'ieee-p1363' }).toString('base64url')}`;
const get = async (path) => { const r = await fetch('https://api.appstoreconnect.apple.com' + path, { headers: { Authorization: 'Bearer ' + jwt } }); if (!r.ok) { console.error(`App Store Connect ${path}: HTTP ${r.status} ${(await r.text()).slice(0, 300)}`); process.exit(1); } return r.json(); };
const apps = (await get('/v1/apps?limit=200&fields[apps]=name,bundleId')).data;
const app = apps.find((a) => /football madness/i.test(a.attributes.name)) || apps[0];
if (!app) { console.error('App Store Connect: uygulama kaydi bulunamadi'); process.exit(1); }
const ids = (await get(`/v1/bundleIds?filter[identifier]=${encodeURIComponent(app.attributes.bundleId)}&fields[bundleIds]=identifier,seedId`)).data;
const bid = ids.find((b) => b.attributes.identifier === app.attributes.bundleId);
if (!bid) { console.error('App Store Connect: paket kimligi bulunamadi'); process.exit(1); }
console.error(`uygulama: ${app.attributes.name}`);
console.log(`BUNDLE_ID=${app.attributes.bundleId}`); console.log(`TEAM_ID=${bid.attributes.seedId}`);
