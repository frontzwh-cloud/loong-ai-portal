# LOONG AI Portal — Current State

UPDATED = 2026-10-27
STATUS = DEPLOYED_HEALTHY_PENDING_BROWSER_AND_OWNER_ACCEPTANCE

## Objective and implementation

Continue the existing React + `@assistant-ui/react` + FastAPI implementation on Draft PR #3 (`prototype/react-assistant-ui`). Portal owns chat UX, branding and application navigation; downstream systems remain their own authorities. No main merge, publication or production deployment is authorized by this implementation checkpoint.

Current local candidate includes:
- Approved 龙小智 mascot and chat-first interface; AI/office/download service finder.
- Streaming compatible-model adapter with provider-returned reasoning, stop, visible failures and bounded in-memory context.
- Explicit local canned-response demo, no external model requests in demo mode.
- Server-side configuration for model and public navigation URLs; unconfigured links disabled.
- Built frontend served by FastAPI on loopback, local launcher, Windows setup packaging and Chinese deployment guide.
- TLS certificate verification restored; typed/bounded request validation; no raw upstream error bodies exposed.

Presentation Canvas and keyword recommendations remain labeled demonstrations. No PPTX generation, downstream API integration, SSO, enterprise data ingestion or **server-side** conversation history.

## Browser-local history extension (2026-10-27)

The user explicitly requested conversation history after the first deployment candidate. Draft PR #3 now includes browser-local conversation list, reload restoration, rename, deletion, and clear-all, without backend persistence or new dependencies. Data is bounded (20 conversations, 40 messages / 64,000 characters per conversation), stored only in the same browser origin, and never synchronized between devices or users. Local browser storage is not suitable for shared-device confidential transcripts. No approval for authenticated/server-side history is implied.

Implementation and regression-test sources are in `frontend/src/history.ts`, `ConversationHistory.tsx` and adjacent tests. Testing and actual deployed-browser acceptance for this new feature are still pending. The user reported that the Portal is reachable in their internal environment; the new branch code has not been deployed there by this change.

## Ubuntu deployment continuation

The user corrected the target on 2026-10-25: Ubuntu server with Docker already installed, GitHub download preferred, and server-local AI configuration to fill in later. Preserve earlier UI work and Windows files; optimize current delivery for Ubuntu Docker.

Added a multi-stage Docker image, Compose service, versioned deploy/update/rollback script, independent shared configuration, health checks and immutable-commit GitHub bootstrap. The offline amd64 package includes the tested Docker image. No Docker installation, firewall/system-security changes, real-server deployment or real credentials are part of this work.

## Execution evidence and next gate

See [Ubuntu acceptance evidence](UBUNTU_ACCEPTANCE.md) and [Chinese Ubuntu deployment guide](../UBUNTU_DEPLOYMENT.md). Earlier Windows work remains documented in [prior candidate report](RELEASE_CANDIDATE.md); it does not establish Windows runtime acceptance.

Local Docker build/start and recovery checks are execution evidence, not final acceptance of the user's actual server or a real AI service. Final product acceptance remains with the user. The user authorized GitHub branch submission on 2026-10-25. This does not authorize main merge, GitHub Release/offline-binary publication, Library upload or real-server deployment. Use PR #3 for current remote submission status. Continue on Draft PR #3's existing branch. Do not revert to the old Vue demo or create competing UI implementations.

## Application link management — 2026-10-27

User requested a small admin interface for existing AI/workplace application URLs, especially Meeting Assistant download PAGE. Candidate implements a fixed allowlist editor and server-local persistent app-links JSON. Public URL navigation remains read-only. The latest version isolates the write API in a separate loopback-only admin service. No SSO, model credentials, app business integration, production merge or real-server deployment was authorized. See APP_LINK_ADMIN.md for security boundary and pending acceptance.

## Address-only admin separation — 2026-10-27

User explicitly requested URL-only management, without another application password. Candidate replaces the token-protected same-process editor with separate admin FastAPI/Compose service on host 127.0.0.1:8001 (default). Public app no longer has mutation routes or admin navigation. Administrators open the separate /admin URL over SSH forwarding; anybody with access to that local-only port is an admin. The shared app-links data file remains authoritative for configured public navigation URLs. Real-server testing and acceptance are pending. See docs/APP_LINK_ADMIN.md.

## Ubuntu deployment evidence — 2026-10-27

EVIDENCE_SOURCE = USER_SUPPLIED_UBUNTU_TERMINAL_OUTPUT
DEPLOYMENT_SOURCE_COMMIT = ce073dee94d9d2915f440f07f5ff334001c4beb8
DEPLOYMENT_IMAGE_TAG = 0.1.0-rc.2-7e5a9db92252
DEPLOYMENT_RESULT = BASIC_HEALTH_PASS
OWNER_PRODUCT_ACCEPTANCE = PENDING
MAIN_MERGE = NOT_DONE

The user supplied target-host console output confirming the Docker build and Compose update:
- Portal container reported healthy, host binding `127.0.0.1:8000->8000/tcp`.
- Separate admin container reported healthy, host binding `127.0.0.1:8001->8000/tcp`.
- Portal `GET /api/health` returned `{"status":"ok","app":"loong-ai-portal","mode":"live","deepseek":"configured"}`.
- Admin `GET /api/health` returned `{"status":"ok","app":"loong-ai-portal-admin"}`.
- Deploy command printed `Healthy release: 0.1.0-rc.2-7e5a9db92252` and `DEPLOY_BASIC_STATUS=PASS`.
- Configuration remains in the existing external server-local shared directory.

These are operator-supplied runtime facts, not independently probed from ChatGPT. They establish successful **basic deployment and container health**, not live model response, end-to-end application link editing, history restoration, employee-facing reverse proxy operation, access-control penetration testing or formal user acceptance.

Next acceptance gate: manually verify employee page, non-sensitive real chat, browser-local history reload, SSH-forwarded admin page and saved link reflected in public `/api/config`. Public Portal should not permit app-link writes. Keep Draft PR #3 until acceptance; deployment did not merge main or publish a GitHub Release.
