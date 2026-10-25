# LOONG AI Portal

A local, chat-first AI portal built with React, TypeScript, `@assistant-ui/react` and FastAPI. This continues Draft PR #3, retaining the approved 龙小智 mascot, application finder, office shortcuts and simulated Presentation Canvas.

**Windows users: [本地部署与使用说明](LOCAL_DEPLOYMENT.md).** Extract the Windows x64 Setup ZIP and run `Start-Portal.cmd`. No administrator, Docker, Node or preinstalled Python is required. The setup ZIP includes built UI and backend dependencies; its first launch downloads and checks the official Python runtime. Thereafter local demo mode works offline. Windows native acceptance is still pending; see [verification and limitations](docs/RELEASE_CANDIDATE.md).

The default demo makes no AI requests and visibly labels its canned replies. For real chat, configure an approved HTTPS OpenAI-compatible provider, exact model ID and API key in `backend/.env`, set `PORTAL_DEMO_MODE=false`, and restart. No provider, account or downstream service has been live-verified. Application links can be configured in the same file without rebuilding.

- Streaming answers, provider-returned reasoning, cancellation and visible failure messages.
- Bounded in-memory conversations; navigation preserves the conversation, refresh clears it.
- Searchable AI applications, office tools and download links; absent or invalid links are disabled.
- Presentation Canvas is explicitly simulated, with no PPTX generation or real integration.
- Backend serves the compiled UI on loopback. Secrets stay server-side. TLS verification is enabled.
- No SSO, enterprise data access, downstream API integration or production deployment.

## Developer quick start

```bash
python -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.lock
cd frontend
npm ci
npm run build
cd ..
.venv/bin/python launcher.py
```

Windows Python path: `.venv\Scripts\python.exe`. The launcher creates local `.env` from the demo example only if absent, opens the browser and handles duplicate starts. Full configuration, restart, troubleshooting and build instructions are in the deployment guide.

## Verification and packaging

```bash
.venv/bin/python -m pip install pytest
.venv/bin/python -m pytest -q tests
cd frontend
npm test
npm run build
cd ..
# With the demo server running, Linux Chromium interaction checks:
node scripts/browser-check.mjs
# Setup ZIP (runtime downloaded on first launch):
.venv/bin/python scripts/build_windows.py --bootstrap
# Full offline ZIP (builder needs access to python.org):
.venv/bin/python scripts/build_windows.py
```

`CHROMIUM_PATH` overrides the browser check's `/usr/bin/chromium`; `PORTAL_TEST_URL` overrides the loopback URL. Playwright is a dev dependency. Package contents are explicitly allowlisted; local `.env` is never copied. Backend versions are pinned in `backend/requirements.lock`, frontend versions in `frontend/package-lock.json`. Package SHA256 and component hashes are produced under `artifacts/`.

Project authority: [manifest](PROJECT_MANIFEST.md), [overlay](docs/PROJECT_OVERLAY.md), [current state](docs/PROJECT_STATE.md). Earlier UI scope: [prototype notes](docs/UI_PROTOTYPE_20261024.md).
