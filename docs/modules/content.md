# Module: content (`src/features/content/`)

The five human surfaces of the store: `/about`, `/returns`, `/shipping`, `/privacy`, `/terms`. Phase 6 builds the **structure** (the `h1` and the `h2` headings); the owner writes the words.

- **Routes:** see `docs/architecture/routing.md`. No API calls.
- **Every paragraph is `<Todo>`** (`src/components/Todo.tsx`): it renders `TODO(owner): write the "<section>" section.` and stays visible until replaced. Never invent text here (CLAUDE.md rule 11).
- **Footer values** (operator, contact email, ship-from city) are in `src/content/site.ts`.
- **Starting point for Returns and Shipping wording (owner to adapt, not copied in):** the backend's assistant policy documents, `assistant-service/src/main/resources/policies/` in the read-only clone.
- **Tests:** `src/app/router.test.tsx` (each page renders its `h1`; the Returns page keeps one `TODO(owner)` per section; footer links resolve) and `e2e/routes.spec.ts`.
