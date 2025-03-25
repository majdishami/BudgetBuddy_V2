/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_BACKEND_URL: string
    readonly VITE_PORT: string
    readonly VITE_API_TIMEOUT?: string
    readonly VITE_SENTRY_DSN?: string
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
  
  // Asset imports
  declare module '*.svg' {
    import React from 'react'
    const content: React.FunctionComponent<React.SVGProps<SVGSVGElement>>
    export default content
  }
  
  declare module '*.png'
  declare module '*.jpg'
  declare module '*.jpeg'
  declare module '*.gif'
  declare module '*.webp'
  
  // CSS Modules
  declare module '*.module.css' {
    const classes: { readonly [key: string]: string }
    export default classes
  }
  
  declare module '*.module.scss' {
    const classes: { readonly [key: string]: string }
    export default classes
  }