# باشگاه جنتلمن‌ها — Gentleman's Club landing

React 19 + Vite + TypeScript + Tailwind CSS v4. Persian (fa), RTL, fully responsive. Frontend only.

    npm install
    npm run dev      # development
    npm run build    # type-check + production build

Layers (back → front): background (z0) → title (z10) → man PNG (z20) → price list (z30) → header (z40).
Copy, prices and image paths: `src/data/content.ts`. Man cut-out: `public/images/man.png` (+ `.webp`).
To use a higher-res cut-out, replace both files (same aspect ratio) or update `manImage` in content.ts.
