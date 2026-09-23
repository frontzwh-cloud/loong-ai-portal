# LOONG AI Portal — Project Entry

## Repository Role

This repository is the durable project authority for **LOONG AI｜AI Portal**.

The product is a unified enterprise AI entry point centered on AI Chat. It may route users to existing systems and independent AI applications, but those downstream systems remain their own business authorities.

## Recovery

1. Read `PROJECT_MANIFEST.md`.
2. Read `docs/PROJECT_OVERLAY.md`.
3. Read `docs/PROJECT_STATE.md`.
4. Read only the task-relevant implementation files / Issue / contract.
5. Use the pinned Global Governance referenced by the manifest for formal boundaries.

Repository authority overrides chat history and model memory for current project facts.

## Working Model

Use the smallest useful implementation path:

```text
VALUE FIRST
DELTA FIRST
REUSE FIRST
MINIMUM SUFFICIENT CONTEXT
```

Prefer one suitable executor hop, targeted validation, and normal Git persistence for ordinary bounded work.

Do not pre-build registries, agent schedulers, knowledge graphs, RAG navigation layers, telemetry systems, or other infrastructure until observed value justifies them.

## Product Boundary

Portal owns:
- AI Chat user experience
- LOONG AI portal branding and navigation
- model-provider integration used by the portal
- app registry / app launching / routing
- later portal-level knowledge and data-query entry capabilities

Portal does not become the business authority for:
- Meeting Assistant lifecycle and meeting identity
- MES / QMS / Power BI business logic
- downstream application data
- approval/workflow decisions
- writes to enterprise production systems unless separately designed and authorized

## Security Baseline

- Secrets stay server/Python/local-config side; never ship API keys in browser bundles.
- Do not automatically send meeting transcripts, employee data, report data, or enterprise application state to an external model.
- External model calls send only explicitly authorized/user-supplied context in the initial version.
- Do not claim access to a system unless a real integration/tool action exists.

## Initial Product Direction

V0.1:
- LOONG AI Chat
- external DeepSeek-compatible API
- streaming response
- separate visible reasoning/thinking section where the provider returns it
- quick jump to existing system applications
- session-only multi-turn chat is sufficient
