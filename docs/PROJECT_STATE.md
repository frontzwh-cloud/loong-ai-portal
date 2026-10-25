# LOONG AI Portal — Current State

UPDATED = 2026-10-25
STATUS = UBUNTU_DOCKER_CANDIDATE_PENDING_OWNER_ACCEPTANCE

## Objective and implementation

Continue the existing React + `@assistant-ui/react` + FastAPI implementation on Draft PR #3 (`prototype/react-assistant-ui`). Portal owns chat UX, branding and application navigation; downstream systems remain their own authorities. No main merge, publication or production deployment is authorized by this implementation checkpoint.

Current local candidate includes:
- Approved 龙小智 mascot and chat-first interface; AI/office/download service finder.
- Streaming compatible-model adapter with provider-returned reasoning, stop, visible failures and bounded in-memory context.
- Explicit local canned-response demo, no external model requests in demo mode.
- Server-side configuration for model and public navigation URLs; unconfigured links disabled.
- Built frontend served by FastAPI on loopback, local launcher, Windows setup packaging and Chinese deployment guide.
- TLS certificate verification restored; typed/bounded request validation; no raw upstream error bodies exposed.

Presentation Canvas and keyword recommendations remain labeled demonstrations. No PPTX generation, downstream API integration, SSO, enterprise data ingestion or durable chat history.

## Ubuntu deployment continuation

The user corrected the target on 2026-10-25: Ubuntu server with Docker already installed, GitHub download preferred, and server-local AI configuration to fill in later. Preserve earlier UI work and Windows files; optimize current delivery for Ubuntu Docker.

Added a multi-stage Docker image, Compose service, versioned deploy/update/rollback script, independent shared configuration, health checks and immutable-commit GitHub bootstrap. The offline amd64 package includes the tested Docker image. No Docker installation, firewall/system-security changes, real-server deployment or real credentials are part of this work.

## Execution evidence and next gate

See [Ubuntu acceptance evidence](UBUNTU_ACCEPTANCE.md) and [Chinese Ubuntu deployment guide](../UBUNTU_DEPLOYMENT.md). Earlier Windows work remains documented in [prior candidate report](RELEASE_CANDIDATE.md); it does not establish Windows runtime acceptance.

Local Docker build/start and recovery checks are execution evidence, not final acceptance of the user's actual server or a real AI service. Final product acceptance remains with the user. The user authorized GitHub branch submission on 2026-10-25. This does not authorize main merge, GitHub Release/offline-binary publication, Library upload or real-server deployment. Use PR #3 for current remote submission status. Continue on Draft PR #3's existing branch. Do not revert to the old Vue demo or create competing UI implementations.
