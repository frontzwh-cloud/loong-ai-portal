# Local release candidate — 2026-10-25

Continues Draft PR #3 on `prototype/react-assistant-ui`; input head `cbc74402cade02287afaf450b9aab0805734934f`, PR base `827350deda108fc301b320702f3d590bbd275eb4`. Implementation remains local, without push, release publication, PR state change or main merge.

## Delivered behavior

Existing React/assistant-ui interface and mascot retained. FastAPI now serves the built UI, supplies allowlisted navigation settings and supports explicit local demo chat. Real chat uses an approved HTTPS compatible endpoint with TLS verification, sanitized errors, bounded messages and body size. UI has cancellation, connection/interruption errors, usable retry by resending, and bounded recent context. Runtime link configuration needs no frontend rebuild.

The loopback launcher creates configuration only on first run, preserves it on restart, distinguishes duplicate Portal launches from unrelated occupied ports, opens the browser and reports startup errors. Windows Setup ZIP bundles frontend and pinned Windows Python wheels; the CMD launcher downloads the official Python 3.13.17 embeddable runtime once, verifies its published SHA256, and installs only within the extracted folder. No admin, Node, Docker, global Python or security-policy edits are intended.

## Passed on Linux

- 28 Python checks: backend input/body limits, missing configuration, repeated demo requests without a provider, allowlisted public links, mocked provider streaming/reasoning/usage/failures/truncation/TLS transport failure, static asset serving and no `.env` exposure; subprocess launcher first start, duplicate launch, immediate restart, config preservation, occupied/invalid ports, missing build, and paths with spaces/Chinese characters.
- 16 frontend unit/UI checks, including all 9 inherited PR tests and 7 URL-validation cases.
- TypeScript validation and Vite production build.
- 9 real Chromium browser scenarios against the built frontend/backend: desktop layout, demo streaming/repeated send/navigation preservation, stop/send-again/new chat, simulated Canvas/slide bounds/Escape, network failure/recovery, HTTP validation/interrupted streams, mocked configured link/new tab, mobile layout/chat, refresh reset and no uncaught browser exceptions.
- Desktop 1440×1000 and mobile 390×844 screenshots retained in `artifacts/`.
- Setup ZIP packaging, component hash manifest and secret-exclusion checks; Git whitespace checks.

Browser configured-link checks use a mocked destination; provider tests use a mock transport. Neither proves real downstream or live-model integration.

## Failed attempts, resolved or bounded

- Initial npm installation failed because the default cache directory was unwritable; using `/tmp/portal-npm-cache` completed successfully without changing dependencies to evade the check.
- Initial launcher restart test exposed Linux TCP TIME_WAIT binding; fixed by POSIX socket reuse while retaining Windows exclusive binding, then rerun successfully.
- Initial browser link assertion navigated to an unavailable external test destination; the test now intercepts that destination explicitly, correctly testing navigation without claiming live service availability.
- Full offline runtime download remains blocked: `https://www.python.org/ftp/python/3.13.17/python-3.13.17-embed-amd64.zip` receives proxy CONNECT HTTP 403, including an escalated attempt. This was a network-proxy failure, not an automatic approval-review rejection. No unverified runtime was substituted. Setup packaging is the delivered alternative.

## Not run / remaining acceptance

- Native Windows 10/11 x64, CMD/PowerShell first-launch download, embedded Python loading Windows wheels, Windows duplicate/restart behavior, ordinary-user and corporate endpoint policy acceptance. No Windows machine is available in this environment.
- Actual model credentials, provider model availability/quotas, real provider TLS/proxy, real office links, SSO and downstream business data. No credentials were used.
- Full offline Windows bundle (runtime download blocked), macOS/ARM64 distributions, hosted CI runs, production/LAN deployment or final owner acceptance.

Warnings: Vite reports the existing large main bundle (~779 kB before gzip); this does not prevent local use. The installed Starlette emits a TestClient/httpx deprecation warning; tests pass. There is no claim that those dependencies or Windows runtime are future-proof.

## Handoff

Use `artifacts/LoongAI-Portal-Windows-x64-Setup.zip`, its `.sha256` file, and [中文部署指南](../LOCAL_DEPLOYMENT.md). Extract completely and double-click `Start-Portal.cmd`; first launch needs access to python.org. Then local demo works offline. For real AI, configure `.env`, disable demo and restart. The ZIP is a candidate for Windows acceptance, not a Windows-certified release. Source and evidence archives accompany it for continuation and review.
