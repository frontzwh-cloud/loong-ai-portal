# Enterprise SSO — minimal integration candidate

STATUS = IMPLEMENTED_IN_BRANCH_NOT_INTEGRATION_TESTED

## Identity authority

- Enterprise CAS authenticates the browser and returns a single-use ticket.
- Portal backend validates the ticket at `CAS_BASE_URL/api/domain/valid_ticket` as UTF-8 **plain text**; the result is `accountname`.
- `accountname == UID` (confirmed by product owner).
- Workflow is the authoritative employee information source. The adapter must obtain the matching UID from Workflow before establishing a Portal session; missing/inactive/mismatched UID fails closed.
- Portal maintains its own HttpOnly session. AI applications do not accept a UID from browser query strings as proof of identity.

## Supported navigation

1. Browser requests `GET /sso/login` or `GET /sso/login?app_id=gemba`.
2. Portal redirects browser to the corporate CAS login URL with its **exact** callback URL encoded in the `service` parameter.
3. CAS redirects to `GET /sso/callback?ticket=...`.
4. Portal backend calls `valid_ticket`, reads UTF-8 text, queries Workflow SQL Server using a read-only SQL account and parameterized UID and issues its Portal session cookie.
5. For a registered downstream application, Portal issues a **60-second, one-time code** and redirects to the registered HTTPS callback.
6. Downstream **server** sends `POST /sso/verify` with JSON `{app_id,secret,code}`, then creates its own session from the returned user identity. Codes are consumed atomically and cannot be used for another app.

The app's `secret` belongs only on the downstream server, never in browser JavaScript. The callback URL is fixed in server configuration; the browser cannot supply an arbitrary redirect URL.

## Configuration (Portal server only)

```dotenv
SSO_ENABLED=true
PORTAL_PUBLIC_URL=https://portal.example.internal
CAS_BASE_URL=http://W3UY084VMA:9099
WORKFLOW_DB_HOST=workflow-sql.internal
WORKFLOW_DB_PORT=1433
WORKFLOW_DB_NAME=Workflow
WORKFLOW_DB_USER=portal_readonly
WORKFLOW_DB_PASSWORD=REPLACE_WITH_SERVER_LOCAL_SECRET
WORKFLOW_DB_CA_FILE=
WORKFLOW_USER_SQL=SELECT UID AS uid, FullName AS name, Department AS department, IsActive AS active FROM dbo.Employee WHERE UID = %s
SSO_APPS_JSON={"gemba":{"callback":"https://gemba.example.internal/auth/callback","secret":"REPLACE_WITH_RANDOM_SECRET_AT_LEAST_32_CHARACTERS"}}
SSO_ALLOW_INSECURE_LOCAL=false
```

**The Workflow URL above is illustrative, NOT a confirmed endpoint.** Obtain the actual internal Workflow query interface and adapt its response shape as necessary. The current adapter expects JSON `uid`, `name`, `department`, `active`; it rejects missing, duplicate, inactive or mismatched UIDs. CAS/Workflow SQL connectivity, TLS compatibility and actual schema have not yet been tested. Use a DB account granted only SELECT on the required Workflow view; revoke any write or privileged permissions. The listed CAS hostname is internal HTTP; server-to-CAS traffic must remain on an appropriately protected network until the enterprise supplies a TLS endpoint.

`PORTAL_PUBLIC_URL` must be the externally reachable HTTPS origin after reverse proxying, matching the registered CAS service callback exactly. Deploy with the existing `portal.env` (server-local, never committed). When disabled, the Portal remains in its pre-SSO compatibility mode; **do not claim employee authentication in that mode**.

## Lifecycle and scope

- One Portal Uvicorn worker/process only. The in-memory pending logins, sessions and codes expire at 5 minutes, 8 hours and 60 seconds respectively. Restart logs users out; multi-replica deployment requires shared state before scaling.
- Login uses secure, HttpOnly, SameSite=Lax cookies in HTTPS mode.
- `POST /sso/logout` clears only the Portal session, not the CAS account or downstream app sessions. Global logout is not part of this release.
- The admin service remains separate and loopback-only. SSO does not silently change existing admin access.
- `/api/chat` requires a Portal session when SSO is enabled. `/api/health` and public application-link discovery remain unauthenticated.
- No OIDC, Keycloak, new user master database, or shared business authorization is introduced.

## Acceptance checks (pending actual runtime verification)

1. Browser login: CAS ticket → correct Workflow UID → Portal session.
2. Invalid/expired/replayed CAS ticket, blank CAS account, inactive, duplicated or unmatched Workflow user: login denied.
3. Application code: valid once, invalid after expiry, unusable from any other app.
4. Session expiry/restart and logout cannot leave `/api/chat` authorized.
5. HTTPS reverse proxy returns correct cookie attributes and the CAS callback matches service registration.
6. Existing Portal chat, app shortcuts and independent admin service still operate.

Regression tests: `python -m unittest discover -s backend/tests`. These tests are committed but have **not** been executed in the target Ubuntu environment. Do not deploy to employees before real CAS/Workflow integration and app callback validation.
