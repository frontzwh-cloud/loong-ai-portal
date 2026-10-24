# LOONG AI Portal

Enterprise AI entry point: chat, AI application interaction, AI app navigation, and deployed office service navigation.

## Current prototype

The `prototype/react-assistant-ui` branch is a **frontend UX proof of concept**:

- React + TypeScript + Vite + `@assistant-ui/react`, preserving the existing FastAPI backend.
- ChatGPT-inspired minimal homepage with the user-provided 龙小智 mascot displayed in the greeting, assistant avatar and sidebar. The original transparent PNG is kept unchanged in `frontend/public/loong-ai-mascot.png`.
- Assistant-style chat with streamed answer and separately collapsible provider reasoning (only if returned).
- Chat-first Quick Launch with three featured AI applications and three compact office-service links; names and availability come from the same catalog as the searchable service directory.
- Searchable AI applications, office services, and download directory. Windows AI applications appear in both the AI and Download filters.
- A **simulated** AI Presentation conversation / right-hand Canvas for visual review. It does not call or modify the real AI Presentation application and cannot generate PPTX.

See [prototype scope and acceptance](docs/UI_PROTOTYPE_20261024.md).

## Run locally

Backend (Python 3.11+):

```bash
cd backend
python -m pip install -r requirements.txt
cp .env.example .env
# Optional: edit .env to configure an approved model endpoint and key.
uvicorn main:app --host 127.0.0.1 --port 8000
```

Frontend (Node 20.19+ or 22.12+):

```bash
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` to `http://127.0.0.1:8000`, so the browser does not need a separate backend URL.

`npm run build` type-checks and creates the static production bundle.
`npm test` runs the frontend navigation and Canvas smoke tests in jsdom.

The demo homepage, app directory, and PPT Canvas work without any model key. Ordinary AI chat requires the existing FastAPI model configuration. Do not send private company information to an unapproved external endpoint.

## Configure app links

Copy `frontend/.env.example` to `frontend/.env.local` and set only the authorized internal HTTP(S) or approved download URLs. `VITE_` values are included in the browser bundle: **never place secrets here**. Empty URLs are displayed as **待配置** and cannot be opened.

## Deployment boundary

This is not a production-ready multi-user Portal: SSO, cross-application API contracts, user/task isolation and deployment security remain unimplemented. Do not publish this demo on an enterprise-accessible host without approval.

