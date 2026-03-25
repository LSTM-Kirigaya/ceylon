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
