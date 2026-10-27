# LOONG AI Portal — Address-only application link administration

STATUS = CANDIDATE; RUNTIME_ACCEPTANCE = PENDING

## Architecture
Management does not require an application password. Security is provided by a SEPARATE
administrator container with a host loopback-only port, not a secret URL path.

- Public Portal (service: portal): host 127.0.0.1:8000 behind the existing employee
  proxy. Public backend has NO GET/PUT /api/admin/links endpoints and frontend does
  not show management navigation.
- Private Admin (service: admin): separate process with host port
  127.0.0.1:8001 by default. Management page: /admin; writes are possible only here.
- Administrator workstation: SSH port forwarding command:
  ssh -L 8001:127.0.0.1:8001 aumoviox@10.223.86.31
  Open http://127.0.0.1:8001/admin in that workstation browser.
- Admin API uses Host and Origin validation for defense in depth against browser
  rebinding/CSRF, but these headers are not authentication. The Docker binding and
  SSH controls determine who can connect.

Anyone with access to this private port can change application URLs. Do NOT publish
the port on LAN, add a public reverse proxy path to admin, or bind to 0.0.0.0.
If remote multi-user management becomes necessary, add approved HTTPS+SSO first.

## Config and updates
- Existing six service IDs, including Meeting Assistant DOWNLOAD PAGE, remain fixed.
  Only public HTTP(S) navigation URLs can be changed (max length 2048, no embedded
  username/password). Blank = disabled.
- Older public URL environment variables remain fallback until a saved override exists.
- Durable shared file: /opt/loong-ai-portal/shared/app-links/app-links.json
  (container path /data/app-links.json). File mode 0600, owned by container user 10001.
- Public container mounts shared app-links directory READ ONLY; admin mounts it
  READ WRITE. Existing portal.env model settings are retained.
- Old PORTAL_ADMIN_TOKEN in portal.env is ignored in the new version. Can be removed
  separately by an authorized administrator, never pasted into chat.
- No restart after modifying URLs; ordinary Portal browsers refresh to reload links.
- The deployment script checks both containers using Compose wait/health, preserves
  the shared configuration on update and removes orphan admin containers on rollback
  to an older single-service version.

## Port conflicts
PORTAL_ADMIN_PORT defaults to 8001. If occupied, set PORTAL_ADMIN_PORT=8002 in
/opt/loong-ai-portal/shared/deployment.env before upgrade. Adjust SSH forwarding
and browser port accordingly. Do not change the fixed loopback host binding.

## Acceptance
1. Main Portal works at http://loongai, GET /api/config read-only.
2. Main Portal GET and PUT /api/admin/links both return 404.
3. Private 127.0.0.1:8001/api/health returns status ok.
4. Private /admin has NO password form, can save/restore meeting download URL.
5. Public GET /api/config reflects saved link after refresh.
6. Container port publish is host 127.0.0.1 only and cannot be reached from LAN IP.
7. Frontend/backend tests, Docker health, reverse proxy and rollback checks pass.

This code is NOT evidence of a completed server deployment or user acceptance.
