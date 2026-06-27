/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Laravel API, e.g. https://qayema.test */
  readonly VITE_API_URL: string
  /** Absolute URL of the Laravel login page to bounce unauthenticated visitors to. */
  readonly VITE_LOGIN_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
