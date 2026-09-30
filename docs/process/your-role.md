# 👤 Your Role (the User)

**Claude Code is the engineer. You are the tech lead, the learner, and the shop owner.** Claude Code writes, tests, and documents. You set up the environment, review, decide, merge, and make sure you understand each phase before the next one starts. You are also the only bridge to the backend team: backend changes go through you, into the backend's own `docs/KNOWN_ISSUES.md` or roadmap. And because the shop must feel hand-made, you write the words only a person can write.

---

## 1. Before development (one-time setup)

**Tools (inside WSL2)**
- [ ] `nvm` and the latest Active LTS Node.js
- [ ] Git and the GitHub CLI (`gh auth login` done by you)
- [ ] Docker Desktop running, with WSL2 integration
- [ ] Claude Code

**Workspace**
- [ ] Unzip this package so that `~/projects/EcomDemo-Web` contains `CLAUDE.md`, `docs/` and `design-system/`
- [ ] Nothing else in that folder, and it is not yet a Git repository (Phase 0 creates it)
- [ ] Open Claude Code in that folder

**Permissions**
- [ ] Approve routine commands as you get comfortable (`npm run …`, `npx playwright …`, `git add/commit`)
- [ ] Don't skip permissions entirely: pushes and merges stay visible

## 2. Kickoff (once)

1. Paste the kickoff prompt from `docs/process/kickoff-and-commands.md`.
2. Answer "public or private" (public matches the backend).
3. When Claude Code stops for GitHub settings, apply them in the UI, then reply `done`.
4. When it asks, create the backend clone's `.env` (Phase 0 manual step), then reply `done`.

## 3. Every phase: your loop

| # | Your action | Details |
|---|---|---|
| 1 | **Let it work** | Approve prompts, answer questions. Don't edit files on its branch; if you must, tell it |
| 2 | **Read the Phase Review Report** | Posted at the PR stop, with screenshots at 360 and 1280 px from Phase 3 on |
| 3 | **Review the PR on GitHub** | Start with the 3–5 areas it flags, the test report and every ⚠️ item |
| 4 | **Try it yourself** | `git fetch && git checkout <branch> && npm ci && npm run dev`, backend up. Check it on your phone too (`npm run dev -- --host`) |
| 5 | **Take backend asks to the backend** | If the report lists a backend change, add it to the backend's `docs/KNOWN_ISSUES.md` or roadmap yourself |
| 6 | **Fill in the human parts** | Every `TODO(owner)` it lists: About, Returns, Shipping, footer contact, staff notes, the order-confirmed note |
| 7 | **Learn** | "Concepts to understand". Gate: *could I explain this phase in an interview without notes?* |
| 8 | **Decide** | Something to fix → `changes: <feedback>`. Good → merge on GitHub with **"Create a merge commit"** |
| 9 | **Continue** | `/clear` → `merged, continue` |

Plan for 30–90 minutes of review and learning per phase.

## 4. Phases that need your hands

| Phase | You do |
|---|---|
| 0 | GitHub repository settings in the UI; the backend clone's `.env` |
| 3 | Allow `npx playwright install --with-deps chromium` (asks for `sudo`) |
| 5 | Add "Require status checks to pass" to branch protection. From then on, merge only when CI is green |
| 6, 9, 13 | Write the words left as `TODO(owner)`: About, Returns, Shipping, footer contact, staff notes, the order-confirmed note |
| 9 | Decide, with the backend team, whether product images will come from the API (web KI-002) |
| 16 | Start the backend with an LLM configured (Ollama or an API key) for the full assistant test |
| 17 | Set `E2E_ADMIN_USERNAME` and `E2E_ADMIN_PASSWORD` in your environment (never in the repo) |
| 20 | Have the backend's kind cluster up (`scripts/k8s-up.sh` in the backend) |

**Secrets rule:** you set every secret yourself. Never paste one into the chat.

## 5. Interruptions

| Situation | What to do |
|---|---|
| The session closed, crashed, or hit a usage limit | Open Claude Code → `continue` |
| Not sure where things are | `status` |
| You need to leave mid-phase | `stop`, then later `continue` |
| A defect in this app | It goes into `docs/KNOWN_ISSUES.md`; later, `fix KI-XXX` |
| It breaks a Git rule, or touches the backend | `stop` immediately and describe what happened |
| It's stuck | It stops and reports. You choose the direction |

## 6. Never do

- Commit to `main`, squash- or rebase-merge, delete branches
- Unzip a new planning package over this repository (unzip it elsewhere and ask Claude Code to copy the changed files on a branch)
- Merge a PR you haven't reviewed, or whose screenshots you haven't looked at
- Paste secrets into chat
- Let generated text stand in for your own (reviews, notes, About)
- Skip ahead to a later phase

## 7. After the whole journey

- [ ] Tag `v1.0` on `main`
- [ ] Replace every "Photo to come" with your own photos (or the backend's image field, if it gets one)
- [ ] Ask Claude Code for a final architecture walkthrough (through a normal branch and PR)
- [ ] Write your own retrospective, and polish the README as a showcase
