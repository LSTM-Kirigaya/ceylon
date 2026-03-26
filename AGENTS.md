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

## 浏览器测试与截图（Playwright MCP）

本项目已配置 `@playwright/mcp` 用于浏览器自动化测试和截图。

### 配置

`mcp.json` 中已配置 Playwright MCP：

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

### 使用场景

当需要进行以下操作时，**优先使用 Playwright MCP**：

1. **网页截图验证** - 验证 UI 更改、部署效果
2. **端到端交互测试** - 模拟用户点击、表单填写等
3. **性能测试** - 页面加载时间、响应速度
4. **可视化回归测试** - 对比前后版本差异

### 常用工具

- `browser_navigate` - 导航到指定 URL
- `browser_screenshot` - 截取页面或元素截图
- `browser_click` - 点击页面元素
- `browser_fill` - 填写表单
- `browser_select_option` - 选择下拉选项
- `browser_evaluate` - 执行 JavaScript

### 示例

```typescript
// 导航到页面并截图
await browser_navigate({ url: "https://ceylonm.com" });
await browser_screenshot({ save_path: "/tmp/homepage.png" });
```

### 注意事项

- **本地开发环境**：使用 `http://localhost:3000`
- **生产环境验证**：使用 `https://ceylonm.com`
- 截图文件建议保存到 `/tmp` 或项目根目录以便查看
- 如需使用 Playwright MCP，确保 Kimi Code CLI 已加载最新 `mcp.json` 配置
