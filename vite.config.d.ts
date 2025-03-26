/// <reference types="vite/client" />

// Only declare additional environment variables not already in vite/client
interface ImportMetaEnv {
    readonly VITE_BACKEND_URL: string;
    readonly VITE_PORT: string;
    readonly VITE_API_TIMEOUT?: string;
    readonly VITE_SENTRY_DSN?: string;
    readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

// All other type declarations (for assets, CSS modules, etc.) are removed
// because they're already provided by vite/client