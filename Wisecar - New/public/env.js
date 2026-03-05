// Optional runtime env injection.
// If you host the build output somewhere that can edit static files, you can set:
// window.__CAR_SHOWROOM_ENV__ = { VITE_SUPABASE_URL: '...', VITE_SUPABASE_ANON_KEY: '...' }
// Vercel عادة يحقن المتغيرات وقت الـ build، فهذا مجرد fallback.
window.__CAR_SHOWROOM_ENV__ = window.__CAR_SHOWROOM_ENV__ || {};
