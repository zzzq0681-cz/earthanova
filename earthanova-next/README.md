# Earthanova (Next.js)

Earthanova lets you click anywhere on Earth and look at open climate data (ERA5, CMIP6), hazards (USGS) and air quality (CAMS).

This is the Next.js (App Router) version of the original Vite / Figma Make project.

## Getting started

```bash
npm install      # or pnpm install / yarn
npm run dev      # http://localhost:3000
npm run build && npm start
```

Add `?skip` to the URL to skip the splash screen.

## Project layout

| Path | What it is |
| --- | --- |
| `app/layout.tsx` | Root layout: metadata, Google Fonts, and the `<body data-page/state/view>` attributes the app switches between |
| `app/page.tsx` | The single page: renders the markup, then boots the client logic |
| `app/globals.css` | The original `src/styles.css`, unchanged |
| `app/robots.ts` | `Disallow: /`. The original site was set to not be indexed. Delete this file and the `robots` metadata to allow indexing. |
| `components/EarthanovaMarkup.tsx` | The original `index.html` body, converted to JSX and rendered on the server |
| `components/EarthanovaClient.tsx` | Client component that loads `lib/earthanova.js` once, after hydration |
| `lib/earthanova.js` | The original `src/main.js`, unchanged except that `globe.gl` is now an npm import instead of a CDN `<script>` |

## Notes

- The app logic is still imperative DOM code. It finds elements by `id` and `data-*` and changes them directly. If you edit the markup, keep those hooks. React renders the markup once and never re-renders it, so the two don't conflict.
- If you edit `lib/earthanova.js` while `next dev` is running, reload the page fully. Hot reload would run the module a second time and attach duplicate event listeners.
- Fonts come from the Google Fonts stylesheet, not `next/font`. The JS-generated SVG uses the literal family names "Sora" and "Inter", and `next/font` would rename them.
- The Figma Make tooling (`.figma/`, `vite.config.ts`, `.mise.toml`) is gone because Next.js replaces it.
