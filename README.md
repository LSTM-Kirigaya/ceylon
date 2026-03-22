# 锡兰 CEYLON - 智能化需求管理平台

锡兰是一个现代化的需求管理平台，帮助团队更好地组织、跟踪和协作处理需求。

## 技术栈

- **前端**: Next.js 14 + TypeScript + Tailwind CSS + Material UI
- **后端**: Supabase (PostgreSQL + Auth + Storage)
- **CLI**: Node.js + TypeScript + Commander.js

## 项目结构

```
ceylon/
├── app/                    # Next.js 应用路由
│   ├── page.tsx           # 首页
│   ├── layout.tsx         # 根布局
│   ├── login/             # 登录页
│   ├── register/          # 注册页
│   ├── dashboard/         # 控制台
│   ├── projects/          # 项目相关页面
│   └── api/               # API 路由
├── components/            # React 组件
│   ├── ThemeProvider.tsx
│   ├── AuthProvider.tsx
│   ├── MainLayout.tsx
│   └── requirements/
├── lib/                   # 工具库
│   └── supabase.ts
├── stores/                # Zustand 状态管理
│   ├── themeStore.ts
│   └── authStore.ts
├── types/                 # TypeScript 类型
│   └── index.ts
├── sql/                   # 数据库 SQL 文件
│   └── setup.sql
├── cli/                   # CLI 命令行工具
│   ├── src/
│   └── dist/
├── 参考图/                 # UI 设计参考图
├── package.json
├── tsconfig.json
├── next.config.ts
├── .env.example
├── .env.development
├── .env.production
└── README.md
```

## 功能特性

### 核心功能

1. **用户认证**
   - 邮箱注册/登录
   - 密码强度验证（至少8位，包含数字和字母）
   - 头像上传（Supabase Storage）

2. **项目管理**
   - 创建/编辑/删除项目
   - 项目列表展示
   - 项目设置管理

3. **团队协作**
   - 邀请成员加入项目
   - 三级权限控制：只读、可写、管理
   - 创建者默认为项目所有者

4. **版本视图管理**
   - 为每个项目创建多个版本视图
   - 切换不同版本视图查看需求

5. **需求管理**
   - 需求表格展示
   - 需求字段：
     - 需求编号（每个版本从0开始）
     - 需求名称
     - 负责人
     - 优先级（P0-P10）
     - 类型（Bug、Feature、Improvement、Documentation、Security、Discussion）
     - 状态（待启动、开发中、已完成、已拒绝）
   - 创建/编辑/删除需求

6. **主题系统**
   - 支持浅色、深色、跟随系统三种模式
   - 锡兰橙主题色 (#C85C1B)

### CLI 命令行工具

```bash
# 全局安装 CLI
cd cli && npm install -g .

# 登录
ceylon login

# 查看认证状态
ceylon status

# 列出所有项目
ceylon projects

# 列出版本视图
ceylon views --project <project-id>

# 列出需求
ceylon requirements --project <project-id> --view <view-id>

# 创建需求
ceylon create --project <project-id> --view <view-id> --title "需求名称"

# 更新需求
ceylon update <requirement-id> --title "新名称" --status completed

# 删除需求
ceylon delete <requirement-id>

# 登出
ceylon logout
```

## 环境配置

### Web 应用

1. 环境变量已预配置在以下文件：
   - `.env.example` - 模板
   - `.env.development` - 开发环境
   - `.env.production` - 生产环境

2. 安装依赖：
```bash
npm install
```

3. 运行开发服务器：
```bash
npm run dev
```

4. 构建：
```bash
npm run build
```

### CLI 工具

1. 安装依赖：
```bash
cd cli
npm install
```

2. 构建：
```bash
npm run build
```

3. 全局安装：
```bash
npm install -g .
```

## 数据库设置

项目使用 Supabase 作为后端，数据库 Schema 定义在 `sql/setup.sql` 中。

### 主要表结构

- `profiles` - 用户资料
- `projects` - 项目
- `project_members` - 项目成员关系
- `version_views` - 版本视图
- `requirements` - 需求
- `cli_tokens` - CLI 认证令牌

在 Supabase SQL Editor 中执行 `sql/setup.sql` 文件来创建所有表和策略。

## MCP 配置

项目已配置 Supabase MCP：

```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=vaukvwgvklnpmlwhgyei"
    }
  }
}
```

配置文件位置：
- `.vscode/mcp.json` - VS Code 配置
- `mcp.json` - 项目根目录配置

## API 接口

CLI 使用的 API 接口：

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/cli/projects` | POST | 获取项目列表 |
| `/api/cli/views` | POST | 获取版本视图列表 |
| `/api/cli/requirements` | POST | 获取需求列表 |
| `/api/cli/requirements/create` | POST | 创建需求 |
| `/api/cli/requirements/update` | POST | 更新需求 |
| `/api/cli/requirements/delete` | POST | 删除需求 |

## 主题设计

参考 `参考图/UI_SPEC.md`：

- **锡兰橙主题色**: #C85C1B
- **大圆角设计**: rounded-2xl (16px) 或 rounded-3xl (24px)
- **呼吸感边界**: 使用极浅灰色调 surface-100/surface-200
- **紧凑字间距**: -0.025em
- **物理按压缩放**: scale(0.98)
- **骨架屏加载**: 不使用转圈圈加载

## License

MIT
