# EcomDemo

**Keyboards, monitors and the small things that make a desk work.**

EcomDemo should feel like a small, well-kept shop run by someone who uses what they sell: paper-coloured pages, printed labels, prices set like a receipt, a parcel tag for a logo, and notes signed by a real person. It should never feel like a page a builder generated in a minute.

> **Where this came from.** The `mr-sujay-patil/ecomdemo` repository (`main@387d755`) is backend only. Light `ink` (#444444) is the repo's own, from its architecture diagrams. The repo's pure-white background was deliberately traded for warm paper (see below). Everything else is an original direction built from the domain: the catalogue and its five categories, rupee prices, the PENDING → CONFIRMED / CANCELLED order saga, and the shop assistant.

## Not a generated site: the rules

Sites made by prompt-and-deploy builders share a recognisable look. This system is defined partly by refusing it. Each rule names the tell and what EcomDemo does instead.

| The generated-site tell | EcomDemo instead |
|---|---|
| Framework-default colours (Tailwind teal-700, amber-700, indigo); blue-to-purple gradients; neon accents in dark mode | A palette mixed for this brand: ledger green, turmeric, fern, brick, on warm paper. No gradients anywhere. Dark mode is warm charcoal with muted, not glowing, colours. |
| Pure white page, Inter / Geist / Space Grotesk everywhere, a body font stretched to 90px | Paper (`surface` #f7f4ee). Newsreader, a text serif, for headings; IBM Plex Sans to read; IBM Plex Mono for prices and labels. |
| Soft 12–24px radii, pills, glass cards, drop shadows on every card | Near-square corners (2 / 4 / 6px). Flat cards with a hairline. One shadow, only for things that float. |
| Rounded outline icon set (Lucide), sparkles for anything AI | Icons drawn for this system: 1.5px, square caps, sharp corners. The assistant gets a speech bubble, never a sparkle. |
| Hero, three feature cards, bento grid, testimonials, pricing, footer | Screens built from the store's real tasks (see Page patterns). Left-aligned, varied rhythm, one full-width band where it helps. |
| Every section fades up 24px on scroll | No entrance animations. Motion only when state changes: the spinner, a pressed button settling 1px. |
| "Unlock", "seamless", "elevate", three-word slogans, em-dash asides, emoji bullets | Plain sentences with specifics: numbers, places, what happens next. |
| AI-generated product images, avatars and testimonials | Real photos or an honest "Photo to come". Notes signed by the person who wrote them, with a date. No invented reviews. |
| No human surfaces: no names, dates, address or policies | A name and a date on every staff note; returns, shipping and contact written by the owner; order emails signed. |

## Principles

1. **Made by someone.** Every page has at least one trace of a person: a signed note, a real photo, a date, a specific detail only a user of the product would know.
2. **Printed, not glowing.** Paper, ink, labels and receipts. Depth comes from hairlines and type, not shadows or light.
3. **One colour means "do".** Ledger green is for actions, links, focus and the logo. If it's green, you can press it.
4. **Show the machinery, kindly.** Checkout is a saga across services; the customer sees it as a packing slip with tick boxes, in plain words.

## Voice

- **Specific over impressive.** "The battery lasts about 30 hours, so a flight to Delhi and back is fine on one charge." Not "Experience immersive, all-day sound."
- **Say what happened, then what's next.** "Your order is packed and leaves tomorrow morning."
- **Customer words, never system words.** No "saga", "event", "outbox" or "503" in the UI. Status words come from the API as badges; in sentences they're "being confirmed", "confirmed", "cancelled".
- **Buttons are verbs:** Add to cart, Place order, Remove, Add it, Not now.
- **Banned:** unlock, elevate, seamless, effortless, supercharge, game-changing, "It's not X, it's Y", three-word slogans, exclamation marks in UI copy, emoji.
- **Punctuation:** commas, full stops and colons. No em dashes in product copy.
- **The assistant** talks like the person behind the counter: short, names the product, says why it fits, proposes instead of acting, and never opens with "Great question!".

## Colour

| Role | Tokens | Rule |
|---|---|---|
| Paper | `surface`, `surface-card`, `surface-alt` | The page is paper; cards and inputs are a lighter sheet on it; photo wells and the customer's chat messages are recessed. |
| Ink | `ink-strong`, `ink`, `ink-muted` | Headings, prices and the logo `ink-strong`; running text `ink`; secondary `ink-muted`. |
| Lines | `border`, `border-strong` | `border` decorates; anything you type in or press has `border-strong` (3:1 or more). Totals get a dashed rule, like a receipt. |
| Action | `brand`, `brand-hover`, `brand-soft`, `on-brand`, `focus` | One filled green button per view. Secondary buttons are ink outlines, not green. |
| Now | `accent`, `accent-soft` | Turmeric: PENDING, the current checkout step, low stock, the cart count. |
| Outcome | `success`(`-soft`), `danger`(`-soft`) | Fern for CONFIRMED and in stock; brick for CANCELLED and errors. Always with a word. |

Every text pairing meets 4.5:1 in both themes (the lowest is muted text on `surface-alt`, 4.8:1).

## Type

- **Newsreader** (500, 600, 600 italic): page titles, product names, the logo, and signed notes. The italic appears only in the logo's *Demo* and in words a person signed.
- **IBM Plex Sans** (400, 600): descriptions, labels, forms, buttons.
- **IBM Plex Mono** (400, 500): every price and total, SKUs and category labels, order IDs, dates on notes. It makes the numbers look printed, and they line up.

Scale: `display` 44/48 · `heading` 28/34 · `title` 20/26 · `note` 17/26 italic · `body` 15/23 · `label` 14/20 · `caption` 13/18 · `price` 17/22 mono · `overline` 12/16 mono uppercase · `id` 13/18 mono. All seven font files include the ₹ sign.

## Space, shape and rhythm

- **Spacing:** `space-1` 4 · `space-2` 8 · `space-3` 12 · `space-4` 16 · `space-6` 24 · `space-10` 40 · `space-16` 64. Cards pad `space-4`; grids gutter `space-4`.
- **Rhythm:** alternate `space-10` and `space-16` between sections on purpose. The same gap everywhere is a tell.
- **Radii:** `radius-sm` 2 for tags, badges and inputs; `radius-md` 4 for buttons and cards; `radius-lg` 6 for panels. `radius-round` only for the cart count and initials.
- **Alignment:** left. Centre only a single short line inside an empty state.
- **Every width.** Components are checked at 360, 480, 640 and 960px: no clipped text, no sideways scroll. Grids use `repeat(auto-fit, minmax(…, 1fr))`, cards stretch to the tallest in their row, and actions sit at the bottom so buttons line up across a row. Cart lines and the header rearrange themselves on narrow containers.

## Photography

Real photos of real stock, shot by the store: on a desk or plain paper, daylight from one side, the product at its real size in the frame, cables and all. 4:3. No renders, no floating products, no AI-generated scenes. Until a product has a photo, its well says "Photo to come".

## Iconography

Twenty-one icons drawn for EcomDemo on a 24px grid: 1.5px stroke, square caps, sharp corners, no fills. The five category icons are fixed: `keyboard` Peripherals, `monitor` Displays, `headphones` Audio, `drive` Storage, `plug` Accessories. `chat` is the shop assistant. Use icons for scanning, not as decoration in front of every heading.

## Logo

A shipping tag on a loose string, in ledger green, beside **Ecom*Demo*** in Newsreader SemiBold with *Demo* in italic. Outlined, so it needs no font. Full logo in the header and on email; the tag alone under 120px. Never straighten the string or recolour the tag.

## Components

Sixteen live React components (`window.EcomDemo`): **Brand** (Logo, Icon) · **Actions** (Button, Chip) · **Forms** (TextField, QuantityStepper) · **Commerce** (Price, ProductCard, CartLine, OrderSummary) · **Orders** (StatusBadge, SagaTimeline) · **Assistant** (AssistantMessage) · **Content** (StaffNote) · **Feedback** (Alert) · **Layout** (Header). Props mirror the API: categories and statuses are passed exactly as the backend returns them. See **Page patterns** for how they compose.

## Not synced

- **From the repository:** only light `ink` (#444444), from `docs/modules/*.puml`. Its #ffffff background was replaced by paper on purpose.
- **Fonts:** Newsreader, IBM Plex Sans and IBM Plex Mono (SIL Open Font License), latin subsets with ₹ merged in; none are in the repository.
- **Logo and icons** are drawn for this system; the repository has none.
- **Components** are hand-written for this system (source in `components/src/index.tsx`); the repository has no UI on any branch.
- **Words to replace:** the staff notes in the previews are placeholders for the owner to rewrite in their own voice.
