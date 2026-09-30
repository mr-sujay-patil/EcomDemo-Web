# Phase 9: Design System

| | |
|---|---|
| **Stage** | Stage 2: Application Shell |
| **Technology** | CSS custom properties + the EcomDemo component library |
| **Branch** | `feature/phase-09-design-system` |
| **PR title** | `Phase 09: Design System` |
| **Requires** | `phase-08-complete` on `main`; a decision from the user on product images (web KI-002) |
| **Needs from the backend** | a decision on product images (web KI-002) |
| **Completion tag** | `phase-09-complete` |

> Claude Code: implement **only** this file's scope. Follow `docs/process/execution-protocol.md` for the lifecycle, `docs/process/testing-protocol.md` before raising the PR, and `docs/process/git-workflow.md` for every Git action. API work follows `docs/backend/integration-guide.md`; UI work from Phase 9 follows `design-system/README.md` and `design-system/patterns.md`. A missing backend dependency means STOP (CLAUDE.md rule 10).

**Technology note:** the guide proposes Tailwind CSS + Radix primitives here. This repository uses **the EcomDemo design system in `design-system/`** instead, with plain CSS on its tokens (`docs/decisions.md`, [Pre-00]), because the user asked for a site that does not look AI-built.

**Goal:** Port the approved design system, so every screen is built from the same tokens and components and looks hand-made rather than generated.

**Starting point:** read `design-system/HOW-TO-USE.md` first. Its components are a reference implementation; this phase turns them into real modules.

**What you'll implement**
- `src/styles/tokens.css` and `src/styles/fonts/` from `design-system/tokens.css` and `design-system/fonts/` (self-hosted, `font-display: swap`, two faces preloaded). No Google Fonts, no CDN.
- Theme: `data-theme` on `<html>` (`light` | `dark` | unset = system), a `useTheme` hook, a toggle where `design-system/patterns.md` puts account controls; the choice persists in `localStorage` (a per-browser convenience, safe to lose).
- Port every component in `design-system/components/src/index.tsx` to `src/components/<Name>/` (`<Name>.tsx`, `<Name>.css` split from `components.css`, `index.ts`, `<Name>.test.tsx`): Icon, Logo, Button, StatusBadge, Chip, TextField, QuantityStepper, Price, ProductTile, ProductCard, CartLine, OrderSummary, SagaTimeline, AssistantMessage, StaffNote, Alert, Header. Props typed from `design-system/components/index.d.ts`, adjusted to the real API: `ProductCard` takes no SKU, and `image` stays optional and unset while the backend has no image field (KI-002).
- Keep the class names, markup and every layout rule already fixed (cards stretch and align their actions; prices wrap; cart lines and the header rearrange on narrow containers). Visual changes are out of scope; any deviation goes in `decisions.md`.
- Restyle every existing page with the components (catalogue, product, layout, footer, 404, placeholders), following `design-system/patterns.md`.
- `/styleguide` (dev and preview only) showing every component in its states, both themes.
- **Token check** `scripts/check-tokens.mjs`, in `verify`: fails on hex colours, `rgb(`/`hsl(`, named colours, `px` font sizes, gradients outside `src/styles/tokens.css`, on imports from `tailwindcss`, `@radix-ui`, `shadcn`, `lucide-react` or `@heroicons`, and on emoji in `src/`.
- Component tests: roles and labels (e.g. QuantityStepper's "Decrease"/"Increase" disable at the limits; StatusBadge shows the word, not just a colour; ProductCard disables at stock 0; StaffNote renders name, role and date).
- `docs/architecture/design-system.md`.

**Concepts to understand**
- Design tokens and CSS custom properties; one variable themes the app
- `prefers-color-scheme` versus an explicit `data-theme`
- Container queries versus media queries
- Why an automated check beats a style guide nobody rereads

**Done when**
- `/styleguide` and every existing page pass the layout matrix in both themes (screenshots in the report).
- A hex colour added to a component fails `npm run verify` (shown, then reverted).

**Not in this phase:** new pages or data.

## E2E additions (`e2e/`)

The layout matrix runs against `/styleguide` too; font files are served with `font/woff2`.

## Your manual steps (user)

Tell Claude Code your decision on product images (keep "Photo to come", or ask the backend team for an image field). Open `/styleguide` in both themes on your laptop and phone; `changes: …` for anything that doesn't feel like the approved design.
