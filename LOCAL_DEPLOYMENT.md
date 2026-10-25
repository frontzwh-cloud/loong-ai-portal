# LOONG AI 本地版：Windows 使用说明

这是本地使用候选版，保留 React + assistant-ui + FastAPI 架构。Windows 原生运行验收尚待完成；Linux 验证不等同于 Windows 验收。

## 三步启动（普通用户，无需管理员、Docker、Node 或已安装 Python）

1. 将 `LoongAI-Portal-Windows-x64-Setup.zip` **全部解压**到可写文件夹，例如 `文档\LoongAI`。不要在 ZIP 内直接运行。目标是 Windows 10/11 **x64**；此包不面向 32 位或原生 ARM64。
2. 双击 `Start-Portal.cmd`。**Setup 包首次启动需要联网下载约 11 MB 的官方 Python 3.13.17**，脚本会验证官方 SHA256；Python 和依赖不需要你手动安装。下载完成后演示模式可离线运行。保留打开的窗口；浏览器会打开 `http://127.0.0.1:8000`。浏览器未自动打开时可手动访问。
3. 首页显示 **本地演示 · 非真实 AI**。输入普通消息可看到演示流式回复；完成首次运行时下载后，演示完全本地运行，无需网络或密钥。AI/办公服务尚无地址时入口禁用。Presentation 是模拟故事板，不能生成 PPTX。

关闭：在启动窗口按 `Ctrl+C`。重新双击可再次启动。重复启动同一端口会打开现有 Portal，不再启动第二份。改变配置后必须关闭原启动窗口并重启；仅刷新浏览器不能重新读取配置。

首次启动自动从 `backend/.env.example` 创建 `backend/.env`，以后不会覆盖。解压新版本到新目录后，可自行复制旧版 `.env`；不要覆盖旧目录或把密钥发给他人。删除解压目录即可移除程序；不改注册表、PATH、执行策略、系统证书或防火墙。

## 连接真实 AI（需要你已有的、获批准的服务）

用记事本打开 `backend/.env`，编辑：

```dotenv
PORTAL_DEMO_MODE=false
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=你的服务商提供的准确模型ID
DEEPSEEK_API_KEY=你的密钥
```

Base URL 支持不带 `/v1` 或以 `/v1` 结尾；调用 OpenAI-compatible `/v1/chat/completions` SSE 接口。只支持 HTTPS，证书校验始终开启。模型 ID 和权限由服务商提供，本候选版未用真实凭据验证任何模型服务。`AI 已配置` 只表示填了密钥和模型，不代表网络或账户已经验证成功。推理区仅显示服务商实际返回的 reasoning 内容。

重启后发送不含敏感信息的测试消息，确认真实回复。只有你输入的对话文本会发送到你配置的服务；不会自动读取办公系统或企业数据。API key 仅存后端 `.env`，不要放进链接或前端 `VITE_` 设置。

## 配置办公/AI 快捷入口（不需重新构建）

在同一个 `.env` 中填写已知 HTTP(S) 地址：`GEMBA_URL`、`MEETING_DOWNLOAD_URL`、`KNOWLEDGE_URL`、`WORKFLOW_URL`、`PDF_TOOL_URL`、`OFFICE_TOOLS_URL`。重启并刷新页面即可。链接在浏览器可见，不能包含密钥或账号密码。这里只是导航；没有下游数据集成、SSO 或自动登录。

## 常见问题

- **后端未连接**：启动窗口是否还开着？手动访问上述地址；查看窗口错误。不要直接打开 `frontend/dist/index.html`。
- **端口被占用**：在 `.env` 改为 `PORTAL_PORT=8001`（1024–65535），重启后访问新地址。脚本不会结束其他进程。
- **密钥/模型缺失**：关闭演示模式后必须同时填写两项；页面会显示可操作的提示。
- **HTTP 401/403/429、连接失败或回答中断**：检查模型授权、额度、网络和地址；修正后重新发送消息。停止按钮可取消正在进行的回复。
- **证书错误**：确认服务地址并向 IT/服务商检查合法证书或代理配置。程序不提供关闭校验开关；不要绕过系统告警。
- **系统策略阻止脚本/程序**：交由 IT 按组织政策处理；本程序不需要更改安全设置。可在命令提示符中进入解压目录运行 `Start-Portal.cmd` 查看报错。
- **刷新后对话消失**：当前仅内存会话，这是预期行为。新对话、刷新、关闭页面都会清空；后端重启不保存对话。
- **长对话**：最多发送最近 40 条文本消息；单条最多 16,000 字符，总计最多 64,000 字符，HTTP 请求体最多 256 KiB。超过限制会提示缩短或新建对话。

仅监听本机 `127.0.0.1`。这是单机个人入口，不能作为公网/局域网多用户部署；没有登录鉴权。无真实企业系统访问、无 PPT 生成、无持久历史。

## 开发者从源码运行

需要 Python 3.11+ 与 Node 20.19+ / 22.12+（可用更新版本）：

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -r backend\requirements.lock
cd frontend
npm ci
npm run build
cd ..
.venv\Scripts\python launcher.py
```

无需激活 PowerShell 脚本。Linux 对应命令用 `.venv/bin/python`。开发前端可用 `npm run dev`（代理到 8000），后端用 `python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000`。

测试：`python -m pytest -q tests`（先安装 pytest）；前端 `npm test`。浏览器检查：`node scripts/browser-check.mjs`（需 Playwright 与 Chromium，见验收报告）。打包：构建前端后用虚拟环境 Python 执行 `scripts/build_windows.py --bootstrap`（首次启动下载运行时）或 `scripts/build_windows.py`（完整离线包）；下载官方 Python 与 PyPI wheel，在 `artifacts/` 生成离线 ZIP 和 SHA256。Python 下载固定版本并核对官方 SHA256，wheel 使用锁定版本并在包内记录哈希。

## Windows 待验收清单

在干净 Windows x64 普通用户账户、无 Python/Node/Docker 环境中检查：完整解压（含中文/空格路径）、双击启动、默认浏览器、离线演示、重复启动、Ctrl+C、重启、配置保留、端口冲突、办公链接、真实 AI 配置成功与失败。确认公司终端策略允许运行。本次执行环境的下载代理拒绝 python.org，因此交付 Setup 包；后端 Windows wheel 和已编译前端已包含，Python 由本机首次启动下载。若本机也无法访问 python.org，需 IT 提供经 SHA256 校验的官方运行时或在允许联网的构建机生成完整离线包（省略打包参数 `--bootstrap`）。本候选包未签名；Windows SmartScreen/终端策略效果尚未验证。
