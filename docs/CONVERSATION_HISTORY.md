# Portal conversation history (browser-local candidate)

Status: implemented on Draft PR #3; owner/browser acceptance pending.

- History belongs to one browser origin and its localStorage, **not** a server user account.
- Adds up to 20 recent conversations (older entries are trimmed) and up to 40 recent messages / 64,000 characters per conversation. Names derive from the first user message unless renamed.
- Supports new conversation, return to a saved chat, rename, delete one (with confirmation) and clear all (with confirmation). Full refresh restores the latest selected conversation.
- Saves user/assistant text and provider reasoning as plain browser data. Does not persist model credentials, tools, files, external business data attachments, or backend state.
- No cross-device synchronization, multi-tab conflict merging, account isolation, server backups, or recovery after clearing site data. Old chats from before this implementation cannot be retroactively recovered.
- Since the Portal currently lacks SSO, **do not put conversation history in a shared server database**. Do not use shared browsers for sensitive discussion. Information in browser storage is readable by browser profiles/scripts with access to that origin.
- Persistence failure (private mode, browser quota or storage disabled) shows a visible warning. The current in-memory conversation remains usable.
- A conversation switched away from while streaming is cancelled; the latest rendered text may be stored, but generation does not continue in the background.
- Regression tests: history data operations, storage restoration/error handling, list controls, and existing Portal tests with isolated localStorage. Manual browser checks must verify incremental streaming, reload, navigation away/back, deletion/clear without resurrection, and mobile history list.
- Not a production multi-user history system. Future server-side sync requires authenticated identity, per-user authorization, retention rules, data governance and an explicit integration contract.
