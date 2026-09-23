# LOONG AI Portal — Project Overlay

STATUS = ACTIVE

This file specializes the pinned Global Governance only where this project needs local rules.

## Ownership

```text
PRODUCT / ARCHITECTURE OWNER = GPT
ENGINEERING EXECUTOR = Copilot / Luna
FINAL PRODUCT ACCEPTANCE = User
```

Capability does not imply authority. Executor implementation success is not final user acceptance.

## Execution

Ordinary small, bounded, reversible implementation may use the fast/lean path.

Escalate to formal-safe work when changes involve:
- authentication / authorization
- external-model data governance
- enterprise production writes
- shared service/API contracts used by other projects
- cross-application business authority
- irreversible deployment/publication decisions

## Integration Rule

Existing applications are integrated as applications, not absorbed into this repository by default.

Examples:
- LOONG AI Meeting Assistant remains an independent application/repository.
- MES/QMS/Power BI remain their own system authorities.
- The Portal may navigate to, invoke a defined API from, or present a bounded view of those systems when an explicit integration contract exists.

## External AI Baseline

V0.1 may use an external DeepSeek-compatible API for generic chat.

Required:
- provider URL/model configurable
- API key never committed and never exposed to frontend/browser state
- external call must not silently include enterprise/private context
- reasoning text is displayed only when actually returned by the provider
- provider/model details remain replaceable; UI must not hard-code business logic to one model

## UI / Brand Baseline

LOONG AI brand:
- primary CTA: `#FF4208`
- structural / AI accent: `#4E28AA`
- neutral surfaces dominate
- modern enterprise SaaS
- low visual noise

Use the approved LOONG AI icon/mascot assets without distortion.

## Non-Goals for V0.1

Do not build by default:
- autonomous enterprise agents
- automatic approval/execution
- generic workflow engine
- durable chat-history platform
- vector database solely for portal navigation
- complex plugin marketplace
- broad system-data ingestion
