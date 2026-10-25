# LOONG AI Portal — Current State

UPDATED = 2026-10-25
STATUS = LOCAL_RELEASE_CANDIDATE_PENDING_WINDOWS_ACCEPTANCE

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

## Execution evidence and next gate

See [candidate verification](RELEASE_CANDIDATE.md) and [local deployment guide](../LOCAL_DEPLOYMENT.md). Linux tests and Chromium interaction checks are execution evidence, not final Windows or owner acceptance.

Native Windows x64 first-launch download, embedded runtime, ordinary-user execution, corporate endpoint policies and real approved AI service acceptance remain pending. The build environment cannot download the official Python runtime because its network proxy returns HTTP 403; the Setup ZIP downloads and verifies that runtime on the user's first launch. Full offline packaging remains possible on a builder with permitted python.org access.

Final product acceptance remains with the user. Original Issues #1/#2 describe earlier V0.1/demo work; PR #3 and this candidate's evidence describe the continuation. Do not revert to the old Vue demo or create competing UI implementations.
