/**
 * Build-time product name (PWA manifest, browser tab, first-run screen —
 * anywhere shown before a company has configured its own name). Set
 * VITE_APP_NAME per deployment to white-label the app; defaults to a
 * neutral "CRM" so an unconfigured deployment never shows another
 * company's name.
 */
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'CRM'
