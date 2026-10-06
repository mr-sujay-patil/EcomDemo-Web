# Architecture: the design system

How the approved EcomDemo design (`design-system/`) became code. The visual rules are in `design-system/README.md` and `patterns.md`; this page is about how the code is organised and why. Decisions that deviate from the reference are in `docs/decisions.md` (`[Phase 09]`).

## What lives where

| Path | What |
|---|---|
| `src/styles/tokens.css` | The tokens: colours for light and dark, spacing, radii, font families, the type scale (`--fs-*`, `--lh-*`), the `@font-face` rules. The **only** file allowed to contain a hex colour, `rgb(`/`hsl(` or a `px` font size |
| `src/styles/fonts/` | Seven self-hosted `woff2` files and their licences. No Google Fonts, no CDN |
| `src/styles/base.css` | The page: body, headings, links, focus ring, `.page`, `.stack`, `.reserve`, `.skip-link`, `.todo`, and the few classes components share (`.ed-card`, `.ed-panel`, `.ed-caption`, `.ed-mono`) |
| `src/components/<Name>/` | One folder per component: `<Name>.tsx`, `<Name>.css`, `index.ts`, `<Name>.test.tsx`. Seventeen: Icon, Logo, Button, StatusBadge, Chip, TextField, QuantityStepper, Price, ProductTile, ProductCard, CartLine, OrderSummary, SagaTimeline, AssistantMessage, StaffNote, Alert, Header |
| `src/components/{ErrorPanel,PlaceholderPage,Todo}.tsx` | App-level pieces built from the components (not part of the design system's seventeen) |
| `src/app/useTheme.ts`, `ThemeToggle.tsx` | The theme |
| `src/features/styleguide/` | `/styleguide`, every component in its states |
| `scripts/check-tokens.mjs` | The token check, run by `npm run verify` |

Import a component from its folder: `import { Button } from '@/components/Button'`. Each component imports its own CSS, so using it brings its styles.

## Tokens and themes

Every colour, space, radius and type size is a CSS custom property on `:root`. A component's CSS only ever says `var(--brand)`, never a value, so one change in `tokens.css` re-themes the app.

- **Light** is the default. **Dark** is `[data-theme="dark"]` on `<html>`, or the system setting when `data-theme` is unset (`@media (prefers-color-scheme: dark)` on `:root:not([data-theme="light"])`). An explicit choice always beats the system one.
- `useTheme()` (`src/app/useTheme.ts`) holds `system | light | dark`, writes `data-theme`, and keeps the choice in `localStorage` (`ecomdemo-theme`). Storage can be blocked or empty; every read and write is in `try/catch`, and the app still works, on the system theme.
- `index.html` has a six-line inline script that applies a saved Light or Dark **before the first paint**, so a returning visitor does not see a flash of the other theme. It reads the same key as `useTheme`.
- The toggle (`ThemeToggle`) sits in the header's tools, before the account link: "Theme: Auto", then Light, then Dark. It is a labelled text button, because the design has no sun or moon icon and the rules ban an icon library.

## The type scale as variables

`tokens.css` ships the `t-*` text-style classes, which are fine for a heading but awkward inside a component's `font:` shorthand. Components use `--fs-<name>` and `--lh-<name>` instead (`font: 600 var(--fs-label)/var(--lh-label) var(--font-sans)`). The values are the design's own; two sizes that the reference used but the scale did not name (`micro`, 11px, and `price-lg`, 22px) became tokens rather than literals. The reason is the token check below: with every size a variable, "no px font size outside tokens.css" can be enforced mechanically.

## Container queries, not media queries, for components

A component cannot know how wide the page is, only how wide the box it was put in is. `Header` and `CartLine` rearrange with `@container` (the header's search drops to its own row under 640px; a cart line puts its controls on a second row under 460px), so the same component works in a sidebar, a sheet or a page. The wrapper (`.ed-header-wrap`, `.ed-cartline-wrap`) is the container. Page layout (the shelf grid, the product page's two columns) uses `auto-fill` grids and a container query on the page's own wrapper.

## Components know nothing about the app

A component takes data and callbacks. It never imports a route, a query or the API client. Where the app needs more, a component has a slot:

- `ProductCard` takes `renderName`, so the shelf can put a router `Link` around the name. A stretched `::after` makes the link cover the card, with the Add to cart button raised above it.
- `Header` takes `brand`, `account`, `cart` and `tools`, so the layout can pass router links. `buttonClass()` gives a link the classes of a button.
- `onAdd` on `ProductCard` is optional: the shelf passes none until Phase 12, so no card shows a button that cannot work.

Server numbers are shown, never made: `Price` formats an `amount`, `CartLine` takes the server's `lineTotal`, `OrderSummary` takes the server's `total`. No component multiplies or adds prices.

## Fields and focus

`TextField` shows focus on its **box** (`:focus-within`, a green ring; red when the field has an error), never on the input inside it, so a field has one ring, not two. It forwards `ref` to the `<input>` (React 19 passes `ref` as a prop) and has a `trailing` slot after the input for a control such as Show/Hide password. Forms are built from it by `src/components/forms/` (`docs/architecture/forms.md`).

## Images

`ProductTile` shows `image` (the product's `imageUrl`, a path on this origin, fetched by an `<img>` with no token). With no image, or if the image fails to load (`onError`), it shows the "Photo to come" well with the category's icon. `imageUrl` is `null` for products without one: that is normal, not an error.

## The token check

`scripts/check-tokens.mjs` scans `src/` (not `tokens.css`, not `src/api/generated/`) and fails with `file:line: reason` on: hex colours, `rgb(`/`hsl(` and the other colour functions, CSS named colours (only in colour-bearing properties), `px` in `font-size` or `font`, gradients, imports of `tailwindcss`, `@radix-ui`, `shadcn`, `lucide-react` or `@heroicons`, and emoji. It runs in `npm run verify` (after `format:check`, before the tests). `scripts/check-tokens.test.ts` proves each rule fires and that near-misses (`#main`, `currentColor`, `min-height: 40px`) do not, and that `src/` itself is clean.

Why a check and not only a style guide: a style guide is read once. A rule that fails the build is read every time.

## The style guide route

`/styleguide` shows every component in its states. It exists only when `import.meta.env.DEV` (`npm run dev`) or `VITE_STYLEGUIDE=true` (set by `playwright.config.ts`, so the E2E suite and the report screenshots cover it). The production build has neither the route nor its code. Switch the theme in the header to see both themes.

## Adding a component

1. A folder in `src/components/`, with the four files. Props typed; no `any`.
2. CSS on tokens only. Run `npm run check:tokens`.
3. A test: roles and labels, every state, keyboard use.
4. A specimen on `/styleguide`, and mirror the change in `design-system/` (`HOW-TO-USE.md`).
