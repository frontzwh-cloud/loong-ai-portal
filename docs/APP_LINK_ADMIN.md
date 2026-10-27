# LOONG AI Portal — application link administration
STATUS = IMPLEMENTED_CANDIDATE; RUNTIME_ACCEPTANCE = PENDING

Purpose: Configure launch URLs for the six existing AI/office services. AI Meeting Assistant opens its independent DOWNLOAD PAGE in a new tab; no binary is served by Portal. Presentation remains a UI demonstration, not a live PPT service. Application naming and model-provider credentials are not editable in V0.

## Persistence
- Existing portal.env link variables remain fallback values until the administrator saves changes.
- Overrides are saved in shared/app-links/app-links.json under PORTAL_HOME; Compose mounts only this data directory at /data (read-write, container user 10001).
- The deployment script gives this directory owner 10001 and mode 0700 when run through sudo; saved JSON is atomically written with mode 0600.
- Updates and rollback retain shared config. Rolling back to a release without this feature may ignore the file, but should not delete it.
- GET /api/config returns only public link URLs and immediately reflects an admin save. No server restart for URL edits.

## Administrative access
- Public http://loongai has no account/SSO. Admin editing is therefore deliberately unavailable on that ordinary entry point.
- Administrator opens http://127.0.0.1:8000 through SSH port forwarding to the Ubuntu host, then selects 应用链接管理.
- The backend requires a high-entropy PORTAL_ADMIN_TOKEN (at least 32 characters) in server-local shared/portal.env. This is a bearer credential; it remains in browser in-memory state, never localStorage, URL or frontend assets.
- The backend also checks loopback Host/Origin (defense in depth, not authentication). Non-browser clients can spoof these, so the secret is mandatory.
- Manager allows only six fixed IDs; HTTP(S) links up to 2048 characters, no username/password, no control characters or invalid port. Empty value disables launch. Public users cannot write links.
- This is not a general administrative security framework. An accessible multi-user management console must first have HTTPS and user-level identity/authorization.

## Installation on existing Ubuntu server
1. Keep all existing AI settings as is. In /opt/loong-ai-portal/shared/portal.env add PORTAL_ADMIN_TOKEN=<locally_generated_64_hex_chars>. Generate locally using openssl rand -hex 32; never commit or share the token.
2. Obtain a reviewed fixed-commit source snapshot. Update via sudo env PORTAL_HOME=/opt/loong-ai-portal bash <source-dir>/deploy.sh update. The upgraded container reads the new token on startup.
3. Use authorized SSH: ssh -L 8000:127.0.0.1:8000 aumoviox@10.223.86.31. In the desktop browser open http://127.0.0.1:8000 and then 应用链接管理.
4. Enter the admin token, edit the meeting-assistant DOWNLOAD PAGE URL and save. The employee-facing http://loongai navigation updates through /api/config and opens the configured page in a new browser tab.
5. This installation sequence is not executed by this PR. Server connectivity, image build, Compose compatibility and real browser operations must be checked on the host.

## Acceptance
- No key = feature disabled. Wrong key, remote Host/Origin = denied.
- Valid save persists in shared JSON and reflects through GET /api/config.
- Invalid/unknown/oversized links rejected; no old configuration overwritten.
- Shared app links survive release swap and rollback.
- Do not alter AI provider credentials, permissions or downstream systems. No public admin writes.
- Tests added in Python and Vitest; execution and real-server acceptance are pending.
