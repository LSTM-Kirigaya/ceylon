<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Mandatory pre-push test gate

Before any push operation, the agent must run the full local test suite and fix failing tests first.

Required command:

```bash
npx playwright test tests/api tests/db tests/e2e
```

Rules:
- Never push when the command above has any failures.
- Use `.env` / `.env.test` variables for DB connectivity.
- If failures happen, fix code or test setup, rerun tests, then push only after green.

## 部署/上线（ceylonm.com）

目标：将 Next.js `standalone` 产物部署到服务器 `ubuntu@kirigaya.cn`，目录 `~/website/ceylonm`，并由 PM2 守护运行；Nginx 为 `ceylonm.com` / `www.ceylonm.com` 做反向代理（HTTP→HTTPS）。

### 部署前置

- **必须先跑测试门禁**（同上）：`npx playwright test tests/api tests/db tests/e2e`
- **必须确保生产构建通过**：`npm run build`
  - 需要存在 `/.next/standalone/server.js`

### 部署脚本（本地执行）

本仓库使用本地脚本完成打包+上传+远端解压+PM2 reload/start：

```bash
bash scripts/deploy-ceylonm.sh
```

约定：
- 远端路径：`~/website/ceylonm`（上传包为 `~/website/ceylonm.tar.gz`）
- 远端 shell：zsh；执行 PM2 前需 `source ~/.zshrc` 以加载 Node/PM2 的 PATH

> 注意：脚本与产物可能在 `.gitignore` 中（例如 `/.deploy/`），但部署文档必须保持可复现。
