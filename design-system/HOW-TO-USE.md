# How this folder is used

This is the **EcomDemo design system**, exported from the design-system artifact the user approved (light and dark themes, fonts, logo, icons, sixteen reference components). It is the **source of truth for how the app looks**.

- `README.md` is the brand book. Its "Not a generated site" table and "Voice" section are rules, not suggestions.
- `patterns.md` describes every screen. Page layouts follow it.
- `tokens.json` is the token source; `tokens.css` is compiled from it (CSS custom properties for both themes, `@font-face`, and `t-*` text-style classes). Dark mode: `data-theme="dark"` on `<html>`, or the system setting when no `data-theme` is set.
- `components/src/index.tsx` is a **reference implementation**: plain React, written for a preview page where React is a global (`window.React`) and every component is exported on `window.EcomDemo`. `components/components.css` is its stylesheet; `components/index.d.ts` documents every prop; `components/<Name>/README.md` holds each component's usage rules.
- Phase 9 ports these into `src/components/` (tokens and fonts into `src/styles/`) as proper TypeScript modules (imports instead of globals, typed props from `index.d.ts`, one folder per component, tests), keeping the class names, markup, and behaviour. Visual changes are not part of the port: if something must change, record it in `docs/decisions.md` and show it in the Phase Review Report.
- After Phase 9 this folder stays as the reference. Changes to the design go into `src/components/` or `src/styles/` **and** are mirrored here, in the same PR.
- Fonts are SIL Open Font License (licences in `fonts/`), latin subsets with the ₹ sign merged in.
- Logos and icons are original to EcomDemo.

The backend has no SKU, image or specs fields (see `docs/backend/integration-guide.md` and web KI-002 in `docs/KNOWN_ISSUES.md`): `ProductCard`'s `sku` and `image` props stay optional and unset, and the reference previews' SKUs are illustrations only.

The staff notes in the reference previews are placeholders. Real ones are written by the owner (CLAUDE.md rule 11).
