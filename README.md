# LOONG AI Portal Demo

Vue 3 + TypeScript + Vite frontend with a FastAPI backend proxy for a DeepSeek-compatible streaming API. The API key is server-side only.

## Run

Backend (PowerShell):

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# edit .env and set DEEPSEEK_API_KEY
uvicorn main:app --reload --port 8000
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Knowledge, SSO and unconfigured application URLs are intentionally marked Demo.

