# Ubuntu Docker candidate — execution evidence, 2026-10-25

Target corrected by the user to Ubuntu with Docker already installed. This continues the existing `prototype/react-assistant-ui` branch and retains local UI/backend checkpoint `4de9eda666bf5b8638a345088c2572ed7c1e1128`; remote input remains `cbc74402cade02287afaf450b9aab0805734934f`. These checks were completed before submission. The user subsequently authorized pushing the existing draft branch; no release publication, main merge or real-server deployment is authorized.

## Passed

- Docker Engine 28.4.0 and Compose v2.40.3 executed in this Linux amd64 environment. Both official base images were actually pulled and pinned by digest.
- Actual multi-stage Docker image build, including `npm ci`, TypeScript/Vite build and pinned Python installation. Runtime is nonroot, read-only, drops capabilities, has no-new-privileges, loopback host binding, healthcheck, bounded logs and restart policy. These are application container settings, not host security changes.
- Compose configuration validation and 13 real-container acceptance scenarios: absent rollback target; healthy nonroot/read-only service; UI/mascot; demo stream; repeated install; literal `$` config value; missing live AI config; versioned update/config preservation; rollback; failed build keeping the current container; unhealthy update automatically restoring prior release; container restart; private config permissions/no `.env` in image.
- 28 Python regression checks and 16 frontend unit/UI checks passed again after the Ubuntu continuation.
- Nine Chromium scenarios against the container-served UI: desktop/mobile layouts, demo streams/repeated messages, cancellation/resend/new chat, service finder retention, simulated Canvas, request failures/recovery, interrupted streams, mocked configured links, refresh reset and no uncaught browser errors.
- Shell syntax checks and Git whitespace checks. Runtime image retains dependency notices, and neither the build CA nor proxy configuration is embedded in it.

Final offline archive integrity and fresh-load checks are recorded separately in the delivered evidence package. Package metadata identifies the final source commit and Docker image ID; source and image checksums accompany the artifacts.

## Recoverable failures resolved

The default Docker client cache was unwritable, so a task-local writable client directory was used. Build containers could not resolve the environment proxy and lacked its existing CA: dependency downloads were routed through the environment-provided proxy and temporarily received the host's already trusted CA as a BuildKit secret. No TLS verification was disabled, no host trust/security settings were changed, and that CA is not in the runtime image.

The first container start exposed restrictive staged source-file permissions. Dockerfile now makes only packaged application code/assets readable before switching to nonroot; health and runtime tests then passed. First-install previous-version detection was also corrected. Intentionally broken build and unhealthy-update scenarios failed as expected, preserving or restoring the healthy version.

## Not run / remaining gates

- Actual user Ubuntu server, its architecture/resources/permissions/network, SSH connection or firewall/reverse-proxy setup. This environment proves Linux Docker execution, not acceptance of the user's server.
- Real provider credentials, model availability, quotas, private endpoint TLS/proxies or downstream integrations. Provider tests are mocked; configuration contains no real credentials.
- GitHub bootstrap downloading the submitted SHA is verified separately during branch submission. The checks in this report tested the local deployment code; they do not establish a deployment on the user’s actual server.
- Host daemon/server reboot, ARM64 images, Windows runtime, CI workflows or owner final acceptance. Container restart and the configured restart policy were verified; host reboot was not performed.

Source builds require public registry access (or the operator's existing approved proxy). The amd64 offline package avoids dependency downloads by loading the tested image. Authentication/SSO remains deferred: keep loopback binding and use SSH forwarding unless the operator deliberately arranges another approved access boundary. No production or enterprise data was accessed.

Warnings remaining: Vite reports the existing ~779 kB main bundle; Starlette emits a TestClient/httpx deprecation warning. Neither prevented these checks.
