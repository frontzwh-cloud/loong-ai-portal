# Third-party components

The Windows portable package includes CPython 3.13.17 from the Python Software Foundation. Its license is retained at `.runtime/LICENSE.txt`. Official download and published SHA256: https://www.python.org/downloads/release/python-31317/ .

Backend dependencies are listed in `backend/requirements.lock`; their installed `.dist-info` metadata and bundled licenses remain under `.runtime/Lib/site-packages`. Frontend uses React, assistant-ui and Lucide with Vite; the source lockfile records exact versions, and dependency license/notice texts are copied under `licenses/frontend`. `BUILD_INFO.json` identifies downloaded runtime and wheels. `SHA256SUMS.json` records packaged file hashes.

LOONG mascot is the existing user-approved repository asset, preserved without edits. This package does not grant rights to unrelated downstream application content or company marks.
