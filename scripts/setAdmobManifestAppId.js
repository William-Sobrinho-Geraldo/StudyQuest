#!/usr/bin/env node
// Troca o AdMob App ID no AndroidManifest.xml de acordo com o ambiente.
//
//   node scripts/setAdmobManifestAppId.js            # produção (default)
//   node scripts/setAdmobManifestAppId.js dev        # desenvolvimento/testes
//
// O App ID é lido de VITE_ADMOB_APP_ID no .env correspondente
// (.env para dev, .env.production para produção) e gravado no meta-data
// com.google.android.gms.ads.APPLICATION_ID. O SDK do Google exige que
// esse valor esteja no manifest — não é possível injetá-lo via JS.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const ROOT = new URL('../', import.meta.url)
const MANIFEST_URL = new URL(
  'android/app/src/main/AndroidManifest.xml',
  ROOT,
)

const target =
  process.argv[2] === 'dev' || process.argv[2] === 'development'
    ? 'dev'
    : 'production'

const envUrl = new URL(target === 'dev' ? '.env' : '.env.production', ROOT)

function loadEnv(url) {
  if (!existsSync(url)) return {}
  const env = {}
  for (const line of readFileSync(url, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (!match) continue
    let value = match[2].trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    env[match[1]] = value
  }
  return env
}

const appId = loadEnv(envUrl).VITE_ADMOB_APP_ID
if (!appId) {
  console.error(
    `VITE_ADMOB_APP_ID não encontrado em .env${
      target === 'dev' ? '' : '.production'
    }`,
  )
  process.exit(1)
}

if (!existsSync(MANIFEST_URL)) {
  console.error(
    `AndroidManifest.xml não encontrado: ${MANIFEST_URL.pathname}`,
  )
  process.exit(1)
}

const manifest = readFileSync(MANIFEST_URL, 'utf8')

if (!manifest.includes('com.google.android.gms.ads.APPLICATION_ID')) {
  console.error(
    'Não foi possível localizar o meta-data APPLICATION_ID no AndroidManifest.xml',
  )
  process.exit(1)
}

const updated = manifest.replace(
  /(<meta-data\s+android:name="com\.google\.android\.gms\.ads\.APPLICATION_ID"\s+android:value=")[^"]*("\s*\/>)/,
  `$1${appId}$2`,
)

writeFileSync(MANIFEST_URL, updated)
console.log(`AdMob App ID atualizado no manifest (${target}): ${appId}`)
