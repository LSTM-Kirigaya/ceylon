# 管理员博客管理功能需求文档

## 需求概述

在管理员面板中新增博客管理功能，允许管理员撰写、管理和发布博客文章。博客与首页博客页面一一绑定，支持 Markdown 格式，支持 LaTeX、Mermaid 图表和语法高亮。

## 功能模块

### 1. 侧边栏导航

位置：`components/admin/AdminShell.tsx`

新增第三个导航项：
- 图标：`Article` (Material UI)
- 标签：博客管理 / Blog / ブログ管理
- 路径：`/[locale]/admin/blog`

### 2. 数据库表结构

迁移文件：`supabase/migrations/000020_blog_posts.sql`

表名：`blog_posts`

字段：
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | uuid | 主键 |
| slug | text | URL 唯一标识 |
| title | text | 文章标题 |
| subtitle | text | 副标题 |
| content | text | Markdown 正文 |
| excerpt | text | 摘要 |
| cover_image | text | 封面图片 URL |
| category | text | 分类 (journey/release/tech/case) |
| status | text | 状态 (draft/published/archived) |
| author_id | uuid | 作者 ID |
| published_at | timestamptz | 发布时间 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |
| meta_title | text | SEO 标题 |
| meta_description | text | SEO 描述 |
| view_count | integer | 浏览量 |

### 3. API 接口

#### 管理端 API (需要管理员权限)

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/admin/blog` | 获取所有博客文章 |
| POST | `/api/admin/blog` | 创建新文章 |
| GET | `/api/admin/blog/[slug]` | 获取单篇文章 |
| PUT | `/api/admin/blog/[slug]` | 更新文章 |
| DELETE | `/api/admin/blog/[slug]` | 删除文章 |

#### 公开 API

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/blog` | 获取已发布文章列表 |
| GET | `/api/blog/[slug]` | 获取单篇已发布文章 |

### 4. Markdown 编辑器组件

位置：`components/blog/MarkdownEditor.tsx`

功能：
- 编辑/预览/分屏三种模式
- 支持 Markdown 语法
- 实时预览

位置：`components/blog/MarkdownRenderer.tsx`

功能：
- 使用 `react-markdown` 渲染
- 插件支持：
  - `remark-gfm`: GitHub 风格 Markdown
  - `remark-math`: LaTeX 数学公式
  - `rehype-katex`: 渲染数学公式
  - `rehype-highlight`: 代码语法高亮
- Mermaid 图表支持（客户端动态渲染）
- 暗色/亮色主题适配

### 5. 管理页面

位置：`app/[locale]/admin/blog/page.tsx`

功能：
- 博客文章列表展示
- 状态筛选（草稿/已发布/已归档）
- 分类标签显示
- 创建/编辑/删除操作

位置：`app/[locale]/admin/blog/[slug]/page.tsx`

功能：
- 新建/编辑文章表单
- 字段：slug、标题、副标题、分类、状态、封面图、摘要、正文、SEO设置
- Markdown 编辑器集成
- 预览功能
- 自动保存 slug（从标题生成）

### 6. 服务端渲染博客展示

位置：`app/[locale]/blog/[slug]/page.tsx`

特性：
- 服务端获取数据（SEO 友好）
- 生成动态元数据（title、description、OG tags）
- 60 秒 ISR 重新验证

位置：`app/[locale]/blog/[slug]/BlogPostContent.tsx`

功能：
- 客户端渲染组件
- Markdown 内容渲染
- 分类颜色标识
- 浏览量显示

### 7. 首页博客列表

位置：`app/[locale]/blog/page.tsx`

更新内容：
- 从数据库 API 获取文章
- 分类筛选功能
- 首篇文章大图展示
- 其余文章小图卡片

## 国际化翻译

新增翻译键值：

```json
{
  "admin": {
    "nav": {
      "blog": "博客管理"
    },
    "blog": {
      "heading": "博客管理",
      "subtitle": "撰写和管理博客文章，支持 Markdown 格式。",
      "create": "新建文章",
      "createTitle": "创建新文章",
      "editTitle": "编辑文章",
      "preview": "预览",
      "publish": "发布",
      "empty": "暂无博客文章",
      "deleteTitle": "删除文章",
      "deleteConfirm": "确定要删除文章「{title}」吗？此操作不可恢复。",
      "table": {
        "title": "标题",
        "category": "分类",
        "status": "状态",
        "views": "浏览量",
        "created": "创建时间",
        "actions": "操作"
      },
      "form": {
        "slug": "URL 标识",
        "slugHelp": "用于 URL 的唯一标识，创建后不可修改",
        "title": "文章标题",
        "subtitle": "副标题",
        "category": "分类",
        "status": "状态",
        "coverImage": "封面图片 URL",
        "excerpt": "摘要",
        "excerptHelp": "显示在博客列表中的简短描述",
        "content": "正文内容",
        "seo": "SEO 设置",
        "metaTitle": "SEO 标题",
        "metaDescription": "SEO 描述"
      }
    }
  }
}
```

支持语言：中文、英文、日文

## 测试覆盖

### API 测试
文件：`tests/api/admin-blog.spec.ts`

测试点：
- 创建博客文章
- 获取文章列表
- 更新文章
- 删除文章
- 公开 API 仅显示已发布文章
- 非管理员访问控制

### E2E 测试
文件：`tests/e2e/admin-blog.spec.ts`

测试点：
- 导航到博客管理
- 创建新文章
- Markdown 编辑器功能
- 预览渲染
- 公开博客页面
- 博客详情页渲染

## 依赖包

```bash
npm install react-markdown remark-gfm remark-math rehype-katex rehype-highlight mermaid lucide-react
```

## 部署步骤

1. 应用数据库迁移：
```bash
supabase db push
```

2. 安装依赖：
```bash
npm install
```

3. 运行测试：
```bash
npx playwright test tests/api/admin-blog.spec.ts
npx playwright test tests/e2e/admin-blog.spec.ts
```

## 验证测试

### 自动化验证脚本

运行完整验证：
```bash
node scripts/verify-blog-system.mjs
```

测试内容包括：
- ✅ 公开访问博客列表
- ✅ 公开访问单篇博客
- ✅ Markdown 内容渲染（代码块、表格、LaTeX）
- ✅ 浏览量统计
- ✅ 未认证访问被拒绝（401）
- ✅ 管理端修改功能
- ✅ 管理端删除功能
- ✅ 草稿状态隔离（草稿对公众不可见）

### 示例博客文章

已创建示例文章：
- **Slug**: `introducing-ceylon-ai-requirements-platform`
- **标题**: Introducing Ceylon: The AI-Powered Requirements Platform
- **分类**: journey
- **状态**: published
- **访问**: http://localhost:3000/blog/introducing-ceylon-ai-requirements-platform

### 安全验证

| 场景 | 预期结果 | 状态 |
|------|----------|------|
| 未登录访问 /api/admin/blog | 401 Unauthorized | ✅ |
| 未登录访问 /api/blog | 200 OK | ✅ |
| 访问草稿文章 | 404 Not Found | ✅ |
| 服务端数据库访问 | 无前端直接访问 | ✅ |

## 数据库安全架构

### RLS 策略

```sql
-- 管理员拥有所有权限
CREATE POLICY "blog_posts_admin_all"
  ON public.blog_posts
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 公众只能查看已发布文章
CREATE POLICY "blog_posts_public_read"
  ON public.blog_posts
  FOR SELECT
  USING (status = 'published');
```

### 前端安全设计

- **无直接数据库访问**：前端仅通过 API 交互
- **服务端渲染**：博客详情页 SSR，利于 SEO
- **权限中间件**：API 路由统一验证管理员身份
- **Service Role 隔离**：后端使用 Service Key 访问数据库

## 技术亮点

1. **服务端渲染**：博客详情页使用 SSR，利于 SEO
2. **Markdown 全功能**：支持 GFM、LaTeX、Mermaid、语法高亮
3. **响应式设计**：适配移动端和桌面端
4. **类型安全**：TypeScript 全程类型支持
5. **权限控制**：RLS 策略确保只有管理员能管理博客
