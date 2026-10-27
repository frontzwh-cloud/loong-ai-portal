# LOONG AI Portal

A local, chat-first AI portal built with React, TypeScript, `@assistant-ui/react` and FastAPI. This continues Draft PR #3, retaining the approved 龙小智 mascot, application finder, office shortcuts and simulated Presentation Canvas.

**Ubuntu + Docker users: [中文部署指南](UBUNTU_DEPLOYMENT.md).** Download the reviewed GitHub source commit and run `bash deploy.sh install`, or use its fixed-commit bootstrap command. Source installation builds the image using Docker Hub/npm/PyPI; it does not require host Node/Python. Configuration lives outside version folders and survives updates; rollback retains the previous image. A separately tested amd64 offline image package exists locally but is not published on GitHub.

The user corrected the target to an Ubuntu server with Docker. Earlier Windows packaging is retained as historical work, but Windows acceptance is no longer the target. The user authorized submission to the existing draft branch. Use the verified commit SHA supplied with the submission for GitHub bootstrap. See [Ubuntu execution evidence](docs/UBUNTU_ACCEPTANCE.md).

The default demo makes no AI requests and visibly labels its canned replies. For real chat, configure an approved HTTPS OpenAI-compatible provider, exact model ID and API key in `backend/.env`, set `PORTAL_DEMO_MODE=false`, and restart. No provider, account or downstream service has been live-verified. Application links can be configured in the same file without rebuilding.

- Streaming answers, provider-returned reasoning, cancellation and visible failure messages.
- Bounded conversations with browser-local history (up to 20 recent chats; 40 messages per chat); refresh restores history in the same browser origin. No login, server synchronization or backup.
- Searchable AI applications, office tools and download links; absent or invalid links are disabled.
- Presentation Canvas is explicitly simulated, with no PPTX generation or real integration.
- Backend serves the compiled UI on loopback. Secrets stay server-side. TLS verification is enabled by default; it can be explicitly disabled only for the approved internal host `vio.automotive-wan.com`.
- No SSO, enterprise data access, downstream API integration or production deployment.

## Ubuntu deployment

```bash
bash deploy.sh install
# Edit ~/loong-ai-portal/shared/portal.env, then:
bash ~/loong-ai-portal/current/deploy.sh restart
```

Default binding is loopback; the guide includes SSH forwarding. No authentication/SSO is claimed. `update`, `rollback`, `status`, `logs` and `stop` are also supported.

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

Browser-local conversation history is described in [the history guide](docs/CONVERSATION_HISTORY.md). Using a different hostname, address, port, browser profile or device creates a different local history. Do not use a shared browser for confidential chats.
