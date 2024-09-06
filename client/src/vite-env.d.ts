/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_HOST: string;
  readonly VITE_PROTOCOL: 'http' | 'https';
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
