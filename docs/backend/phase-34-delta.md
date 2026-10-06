# Backend delta: `phase-33-complete` to `phase-34-complete`

Source: backend PR #59 (merge `9173309`, 2026-10-06), requested by this repo's KI-002 and checked against the backend code (`ProductResponse`, `ProductImageController`) and its `docs/test-reports/phase-34.md`, and against a live gateway (anonymous `curl`, 2026-10-06). Everything else in the tag (Kafka persistence, smoke scripts, `pom.xml`) does not touch the API.

## What changed and what it asks of this app

| Change | Action here |
|---|---|
| `ProductResponse` gains `imageUrl: string \| null`: a path relative to the gateway origin (example `/api/products/1/image`), `null` when the product has no image. It is on the list, on one product and on every search hit (`ProductSearchResponse.results[].product`) | Phase 9: `image` on `ProductCard` / `ProductTile` is fed from it; `null` shows the "Photo to come" well. The types are regenerated in this chore (`src/api/generated/catalog.ts`) |
| New `GET /api/products/{id}/image`: anonymous (an `<img>` sends no `Authorization`), `200` with the file, `404` for an unknown product or one without an image, `If-None-Match` answers `304` | Use the URL as given, same origin through the Vite proxy / nginx / ingress; never build it from the id in the app |
| Served with `Cache-Control: public, max-age=86400`, `ETag`, `X-Content-Type-Options: nosniff`, `Cross-Origin-Resource-Policy: cross-origin`; SVGs also carry a locked-down `Content-Security-Policy` | None: the browser caches it. No CORS is needed for an `<img>` |
| Allowed formats: SVG, PNG, WebP, JPEG. No size variants (one file per product) | Size the image box in CSS (`object-fit`); reserve its space so the page does not jump |
| Seed data: products 1 to 8 have an image (SVG illustrations), products 9 and 10 have none | Both states exist in the real data: tests and E2E must cover the image and the placeholder |

Seen on the wire (the live stack): `GET /api/products/1/image` with no token gives `200`, `image/svg+xml`, `Cache-Control: max-age=86400, public`, `Cross-Origin-Resource-Policy: cross-origin`, an `ETag`; `GET /api/products/9/image` gives `404` with the usual `ApiError` JSON.

## Rules for the UI

- `imageUrl === null` is normal, not an error. Show the placeholder; never a stock or generated picture (CLAUDE.md rule 11).
- An image that fails to load (`onError`) also falls back to the placeholder.
- Give every real image an `alt` that names the product; the placeholder carries no alt text of its own.

## Checklist

- [x] Pin and read-only clone moved to `phase-34-complete` (chore `chore/pin-backend-phase-34`); snapshots and generated types refreshed (only `imageUrl` and the image path were added)
- [x] Phase 9: `image` is fed from `imageUrl`; component tests for the image, the null and the load-error states; E2E (`e2e/design.spec.ts`) that a seeded product shows its image fetched without a token, one without shows the well, and a failed image falls back
- [ ] Fold the `ProductResponse` change into the integration guide's catalogue section (its one-line shape is updated here; the headers above are not yet in it)
