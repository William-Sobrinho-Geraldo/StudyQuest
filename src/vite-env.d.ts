/// <reference types="vite/client" />

declare const __DEV__: boolean | undefined

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_ADMOB_APP_ID: string
  readonly VITE_ADMOB_REWARDED_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}