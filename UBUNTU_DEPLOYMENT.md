# Ubuntu + Docker：LOONG AI 部署指南

目标：已有 Docker Engine 和 Docker Compose v2.30+ 的 Ubuntu 服务器。服务器需要可访问 Docker Hub、npm、PyPI（从源码构建时）。无需服务器安装 Node/Python。本工具不会安装 Docker、修改防火墙/证书/系统安全设置，也不会访问你的实际服务器。

## 本地离线候选包（尚未公开发布）

约 53 MB 的离线镜像包只在开发环境生成，**未上传 GitHub，也未发布 Release**。GitHub 源码下载不包含它。只有另外取得此包后，才使用以下步骤；直接从 GitHub 部署请看下一节。

将 `LoongAI-Portal-Ubuntu-amd64-Offline.tar.gz` 和配套 `.sha256` 文件放在同一目录：

```bash
sha256sum -c LoongAI-Portal-Ubuntu-amd64-Offline.tar.gz.sha256
mkdir -p loong-portal-source
tar -xzf LoongAI-Portal-Ubuntu-amd64-Offline.tar.gz -C loong-portal-source --strip-components=1
bash loong-portal-source/deploy.sh install
```

最后一条命令就是部署命令：校验内置镜像、加载、启动并等待健康；成功后才切换当前版本。首次默认演示模式，无须密钥、Node/Python 或联网拉取构建依赖。此包仅验证了 amd64；ARM64 不应使用它。镜像约 150 MB 未压缩，准备至少 2 GB 可用磁盘空间。

也提供较小的 `LoongAI-Portal-Ubuntu-RC.tar.gz` **源码包**。用同名 `.sha256` 校验后，以同样步骤解压执行 `deploy.sh install`，会自动从源码构建；这条路径需要 Docker Hub/npm/PyPI 网络。

使用已经有 Docker 访问权限的账号，不要为了此脚本修改权限或安全设置。没有 Docker 或 Compose 时明确报错，不自动安装。

## GitHub 源码一键下载部署

用户已批准提交到现有 `prototype/react-assistant-ui` 分支，保留 Draft PR #3。使用交付说明中已验证的完整提交 SHA 替换下列值；GitHub 源码归档不含预构建镜像，首次执行将联网构建镜像（Docker Hub、npm、PyPI）。

```bash
REV=完整的40位已发布提交SHA; curl -fsSL "https://raw.githubusercontent.com/frontzwh-cloud/loong-ai-portal/$REV/bootstrap.sh" -o /tmp/loong-portal-install.sh && bash /tmp/loong-portal-install.sh "$REV"
```

下载固定提交而不是移动分支。下载/构建失败会明确退出；已有健康版本不会因构建失败被替换。提交时仓库为公开仓库，因此该命令无需令牌。若以后改为私有仓库，匿名 curl/此 bootstrap 不再适用：先使用你已有的 GitHub 登录（例如已认证的 `gh` 或 Git）下载对应提交，再在解压/检出目录执行 `bash deploy.sh install`。不要把 token 放进 URL；脚本不保存、索取或内嵌凭据。

## 从电脑访问

默认只监听服务器 `127.0.0.1:8000`，因为当前没有登录/SSO。建议在你的电脑上开 SSH 转发：

```bash
ssh -L 8000:127.0.0.1:8000 你的账号@服务器地址
```

然后在电脑打开 `http://127.0.0.1:8000`。不需要开放新防火墙端口。若服务器仅用于受控可信内网，并由你决定开放访问，可自行修改下述 `deployment.env` 中的绑定地址；不要把无登录入口直接暴露到公网。脚本不更改反向代理、TLS 或防火墙。

## AI 配置文件：稍后自己填写

文件在 `~/loong-ai-portal/shared/portal.env`，首次生成后**更新、回滚都不会覆盖**。权限默认仅当前用户可读写。用 `nano ~/loong-ai-portal/shared/portal.env` 编辑：

```dotenv
PORTAL_DEMO_MODE=false
DEEPSEEK_BASE_URL=https://你的获批准服务地址
DEEPSEEK_MODEL=服务商给你的准确模型ID
DEEPSEEK_API_KEY=你自己的密钥
```

不要给值加 shell 引号；值按原样传入，`$` 不会展开。保留 `PORTAL_DEMO_MODE=true` 时始终是本地模拟回复，即使填写了密钥也不会调用服务。需要在完全填好后改为 `false` 并重启：

```bash
bash ~/loong-ai-portal/current/deploy.sh restart
```

Base URL 支持有或没有结尾 `/v1` 的 HTTPS OpenAI-compatible Chat Completions SSE 服务。证书校验开启，模型可用性由你的服务商决定。“AI 已配置”仅代表设置了密钥和模型，不代表服务验证成功。真实 AI 连接尚未用真实凭据验收。公司数据只能发给获批准的模型。

办公/AI 链接也在此文件中：`GEMBA_URL`、`MEETING_DOWNLOAD_URL`、`KNOWLEDGE_URL`、`WORKFLOW_URL`、`PDF_TOOL_URL`、`OFFICE_TOOLS_URL`。只填真实 HTTP(S) 地址，不放凭据。配置后重启、刷新即可，无须重新构建。

## 端口、版本、更新和回滚

`~/loong-ai-portal/shared/deployment.env` 保存公开的监听设置：

```dotenv
PORTAL_BIND=127.0.0.1
PORTAL_PORT=8000
```

端口被占用时改为例如 `8001`，然后执行 restart；SSH 转发对应改为 `8001:127.0.0.1:8001`。可通过 `PORTAL_HOME=/绝对路径` 指定安装根目录，每次操作使用相同值。本脚本管理一套名为 `loong-ai-portal` 的 Compose 服务，不面向同机多实例。

目录结构：

```text
~/loong-ai-portal/
  shared/portal.env          # 你的 AI 和应用配置，始终保留
  shared/deployment.env      # 端口/绑定
  releases/版本-内容指纹/     # 每个版本独立，不覆盖旧版本
  current -> 当前健康版本
  previous -> 上一健康版本
```

更新：下载新候选包，在新包目录执行 `bash deploy.sh update`，或以新发布 SHA 重新运行 GitHub 命令。先构建，再短暂替换容器并等待健康；失败时尝试恢复上一镜像。不是零停机更新，正在进行的回答会中断。健康检查只确认 Portal 进程就绪，不验证真实模型服务。

```bash
bash ~/loong-ai-portal/current/deploy.sh status
bash ~/loong-ai-portal/current/deploy.sh logs
bash ~/loong-ai-portal/current/deploy.sh rollback
bash ~/loong-ai-portal/current/deploy.sh stop
```

回滚需要已成功更新过且旧镜像仍在；不要提前清理旧镜像/版本目录。回滚只换应用代码，**不会回滚你手动编辑的共享配置**；若配置错误，先修正配置。停止不会删除配置。Docker `unless-stopped` 会在 Docker/服务器重启后恢复未手动停止的容器。

## 限制和排错

- 构建失败：检查 Docker Hub/npm/PyPI 网络；旧容器继续运行。企业代理证书问题应由 IT 提供正确配置，不关闭证书验证。
- Compose 不识别 `format: raw`：需要 v2.30+，按你自己的维护流程升级；脚本不自动安装/升级。
- 启动/健康失败：执行 logs；端口冲突需更换端口。修正后重试。没有已安装版本时，`docker logs loong-ai-portal-portal-1` 可查看首次启动错误。
- 不要把 `docker compose config` 的完整输出发给别人，它可能含密钥；部署脚本只用 `config --quiet` 验证。Docker 权限拥有者可查看容器环境，因此仅在可信服务器使用。
- 对话只在浏览器内存中，刷新/关闭会清空；服务中心导航保留当前对话。Presentation 是模拟故事板，不能生成 PPTX。无 SSO、下游 API 集成或企业数据访问。
- 部署证据和未运行项见 `docs/UBUNTU_ACCEPTANCE.md`。环境是 Linux Docker，不等同于已访问或验收你的 Ubuntu 主机。

## 构建环境说明

普通 Ubuntu 无需自定义证书。若已有获批准的企业代理 CA，可通过 `PORTAL_BUILD_CA=/已有/CA文件` 将它作为临时 BuildKit secret 提供给依赖下载；不复制进最终镜像，也不修改系统信任库。不要使用未知证书或关闭校验。此执行环境用它继承原有代理信任完成构建；交付镜像没有该代理 CA 或代理配置。
