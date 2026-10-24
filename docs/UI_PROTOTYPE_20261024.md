# LOONG AI Portal — React / assistant-ui UX PoC

Date: 2026-10-24
Status: **PROTOTYPE / PENDING VISUAL ACCEPTANCE**

## Why this PoC

Validate that the existing lightweight Portal can adopt the same React + `@assistant-ui/react` family already used by Gemba while retaining its FastAPI chat endpoint. The focus is ChatGPT-like visual quality and coherent entry points, not new backend features.

## In scope

1. AI Home: spacious chat-first layout, low-noise navigation, AUMOVIO orange (`#FF4208`) for primary actions and restrained purple AI accent (`#4E28AA`). The user-provided official 龙小智 image is reused at three sizes in hero, chat and sidebar; the PNG itself is unmodified.
2. Chat: assistant-ui runtime adapting the current `/api/chat` NDJSON stream. Provider reasoning is shown in a separate collapsible part only when actually received.
3. Services: searchable directory with AI applications, office services and download links. Real URLs are deployment-provided; unconfigured entries are disabled.
   A local keyword-only demonstration recommends selected apps directly in the conversation (e.g. an OEE request points to Gemba) and exposes the service action, clearly labeled as a non-AI rule. This is not a production router.
4. Presentation: **UI-only simulated** storyboard / slide preview Canvas. It opens from a PPT-intent demo prompt or app directory and supports local page switching. It does not create, edit or download a real PPT.
5. A standalone frontend build, UI smoke tests, and a small screen layout.
6. The empty chat homepage adds a restrained two-tier Quick Launch: three featured AI applications as action cards and three office tools as compact links. It reads the existing catalog without creating a second app registry, and respects unconfigured URL states. AI/office categorization is distinct from web/Windows delivery, so Meeting Assistant appears in both AI Apps and Download Center.

## Out of scope / must not be inferred

- No real integration to `frontzwh-cloud/loong-ai-presentation`; no cross-repo API/contract change.
- No Workflow/IIS SSO; no real user/account/UID data.
- No new agent, RAG, model proxy, or business workflow.
- No custom/redrawn mascot variants; the approved supplied PNG is rendered with CSS-only avatar framing.
- No real Gemba query or Meeting Assistant download until a verified internal URL is configured.
- No approval for corporate data to flow through the existing default external chat provider.
- No pilot/production authorization or formal product acceptance.

## Manual UX acceptance

1. Open AI Home: greeting and one prominent composer; three AI app cards and three compact office links appear below the greeting. Unconfigured items cannot launch.
2. Click the homepage `AI Presentation` card: the conversation remains visible and the Canvas opens on the right with `UI DEMO` clearly marked.
3. Switch storyboard pages; close the Canvas, returning to the ordinary chat layout.
4. Open Services and switch All / AI Apps / Office / Downloads; search returns matching items.
5. Click an unconfigured app: the action stays disabled and does not navigate to a guessed URL.
6. Ask `我想看一下产线 OEE`: a transparently labeled local rule recommends Gemba in the conversation; without an internal URL the user can only view the directory.
7. With backend configured, verify streamed chat and separate reasoning only if returned. Without backend, demo navigation still works.
8. On a narrow viewport, navigation is an overlay, Quick Launch cards reflow to two columns, and Canvas remains accessible as an overlay.

## Next gate

Owner reviews visual style and interaction first. Only after acceptance: decide whether to migrate the prototype to `main`, then separately design the Presentation API contract and user/session isolation.
