# LOONG AI Portal — Current State

UPDATED = 2026-09-23
STATUS = DEMO_SPRINT_ACTIVE

## Objective

Build LOONG AI as the factory's unified AI entry point.

The first usable version is an AI Chat-centered portal that can answer general questions through an external model and quickly route users into existing applications.

## V0.1 Scope

```text
LOONG AI Chat
→ DeepSeek-compatible external API
→ streaming answer
→ provider-returned reasoning shown separately as 思考过程
→ session-only bounded multi-turn context
→ quick system/application shortcuts
```

Initial quick destinations:
- Meeting Assistant / 预约会议
- 会议记录
- 会议纪要
- 历史会议

The exact integration shape for additional systems/reports/knowledge bases remains future work.

## Architecture Direction

```text
Portal UI
   ↓
Portal backend / secure model client
   ↓
External AI provider

Portal UI
   ↓
Application Registry / Navigation
   ↓
Independent enterprise applications
```

Do not put external API secrets in the frontend.

## Durable Product Boundary

Portal = interaction/routing layer.

Independent systems remain authorities for their own domain data and workflows.

The existing Meeting Assistant is an integration target, not the codebase foundation for this Portal.

## Initial Acceptance Target

A user can:
1. open the LOONG AI Chat page;
2. ask a normal question;
3. see streaming reasoning when the provider returns reasoning content;
4. see the final answer separately;
5. ask a bounded follow-up question;
6. click a shortcut and enter an existing application;
7. use the Portal without exposing the external API key in frontend state/bundle.

## Next Work

Immediate execution authority is GitHub Issue `frontzwh-cloud/loong-ai-portal#2` (2-hour demo sprint).

Parent V0.1 implementation scope remains tracked by GitHub Issue `frontzwh-cloud/loong-ai-portal#1`.

The earlier planning Issue in `frontzwh-cloud/loong-ai-meeting-assistant#152` is superseded by this new project and must not be implemented in the Meeting Assistant repository.
