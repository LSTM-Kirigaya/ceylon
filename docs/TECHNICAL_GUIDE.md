# 技术部署与开发指南

本文件承接主 README 中移出的技术信息，供开发与运维使用。

## 环境文件约定

- 开发环境：`.env.development`
- 生产环境：`.env.production`
- 示例模板：`.env.example`

> 不再使用根目录 `.env`。

## 本地开发

```bash
npm install
npm run dev
```

## 生产构建

```bash
npm run build
npm start
```

## 生产部署（服务器 + PM2 + Nginx + HTTPS）

本项目采用 Next.js `output: 'standalone'` 部署方式。部署目标：
- **服务器**：`ssh ubuntu@kirigaya.cn`
- **目录**：`~/website/ceylonm`
- **进程守护**：PM2（进程名 `ceylonm`，入口 `server.js`）
- **反向代理**：Nginx（配置文件：`/usr/local/nginx/conf/nginx.conf`）
- **证书**：Let’s Encrypt（certbot）

### 0）部署前置（本地）

1) 跑测试门禁（必须全绿）：

```bash
npx playwright test tests/api tests/db tests/e2e
```

2) 确认构建通过并生成 standalone：

```bash
npm run build
ls -la .next/standalone/server.js
```

### 1）一键部署（推荐）

执行本地部署脚本（会自动：build → 打包 → scp → 远端解压替换 → pm2 reload/start）：

```bash
bash scripts/deploy-ceylonm.sh
```

部署脚本默认约定：
- 上传包：`~/website/ceylonm.tar.gz`
- 解压目录：`~/website/ceylonm`
- PM2：若已存在则 `pm2 reload ceylonm --update-env`，否则 `pm2 start ~/website/ceylonm/server.js --name ceylonm`

#### 服务器是 zsh 的注意点

服务器侧 `node/pm2` 的 PATH 可能写在 `~/.zshrc` 里，非交互登录时不一定自动加载。
部署脚本在远端执行前会 `source ~/.zshrc`，以确保 `node`/`pm2` 可用。

### 2）Nginx 反向代理（ceylonm.com）

编辑配置：`/usr/local/nginx/conf/nginx.conf`

需要为 `ceylonm.com` 和 `www.ceylonm.com` 加两段：
- **80**：HTTP → HTTPS（301）
- **443**：反向代理到 `http://localhost:3000`（也就是 PM2 跑起来的 standalone 服务）

变更后校验并重载：

```bash
sudo nginx -t
sudo nginx -s reload
```

### 3）HTTPS 证书（certbot）

本机 Nginx 不在 `/etc/nginx`，需要告诉 certbot 正确的 root 和 nginx 可执行文件：

```bash
sudo certbot --nginx -n --agree-tos -m admin@kirigaya.cn \
  --nginx-server-root /usr/local/nginx/conf \
  --nginx-ctl /usr/local/sbin/nginx \
  -d ceylonm.com -d www.ceylonm.com
```

签发完成后再验证一次：

```bash
sudo nginx -t && sudo nginx -s reload
```

### 4）上线验证（服务器内）

检查 PM2：

```bash
source ~/.zshrc >/dev/null 2>&1 || true
pm2 describe ceylonm
pm2 logs ceylonm --lines 100
```

检查反代（在服务器本机用 Host/resolve 验证）：

```bash
curl -I -H "Host: ceylonm.com" http://127.0.0.1
curl -Ik --resolve ceylonm.com:443:127.0.0.1 https://ceylonm.com
```

## CLI（如需）

```bash
cd cli
npm install
npm run build
```

## 关键模块（简述）

- Web 应用：`app/`
- 业务组件：`components/`
- 服务与工具：`lib/`
- 数据迁移：`supabase/migrations/`
- CLI：`cli/`

## 相关文档

- 权限与鉴权：`docs/AUTH_ARCHITECTURE.md`
- 用户资料字段：`docs/PROFILE_FIELDS.md`
- 启动背景与需求：`docs/start.md`
