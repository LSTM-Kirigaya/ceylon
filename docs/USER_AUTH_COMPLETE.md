# Ceylon 用户认证系统 - 完整说明

## 📊 用户数据存储架构

### 1. 内置认证表：`auth.users`

**位置**：Supabase 内部 schema（不可直接访问）
**管理**：Supabase Auth 自动管理

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键，唯一标识用户 |
| `email` | VARCHAR | 用户邮箱地址 |
| `encrypted_password` | VARCHAR | **bcrypt 加密后的密码** |
| `email_confirmed_at` | TIMESTAMP | 邮箱验证时间戳 |
| `raw_user_meta_data` | JSONB | 用户元数据（显示名称等） |
| `created_at` | TIMESTAMP | 账户创建时间 |
| `last_sign_in_at` | TIMESTAMP | 最后登录时间 |

**密码安全**：
- Supabase 使用 **bcrypt** 自动加密密码
- 我们**永不接触明文密码**
- 密码强度由 Supabase 配置控制

### 2. 业务扩展表：`public.profiles`

**创建 SQL**：
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 创建策略
CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);
```

**自动创建触发器**：
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 🔐 身份验证流程

### 注册流程

```
┌─────────────┐
│   用户填写   │
│ 注册表单     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 前端调用     │
supabase.auth.signUp()
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Supabase    │
│ 创建用户     │
│ (auth.users)│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 触发器自动   │
│ 创建 profile │
│ (profiles)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 发送验证邮件 │
│ (如启用)     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 用户验证邮箱 │
│ 后即可登录   │
└─────────────┘
```

### 登录流程

```
┌─────────────┐
│   用户填写   │
│ 登录凭证     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 前端调用     │
supabase.auth.signInWithPassword()
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Supabase    │
│ 验证密码     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 返回 JWT    │
│ Token       │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 存储在       │
│ Cookie/     │
│ LocalStorage│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 后续请求     │
│ 自动携带     │
│ Token       │
└─────────────┘
```

### 身份校验（路由保护）

**中间件保护** (`middleware.ts`)：
```typescript
// 受保护路由 - 需要登录
const protectedRoutes = ['/dashboard', '/projects', '/settings']

// 游客路由 - 未登录才能访问
const guestRoutes = ['/login', '/register']

// 中间件自动检查 Session
const { data: { session } } = await supabase.auth.getSession()

// 未登录访问受保护路由 → 重定向到 /login
// 已登录访问游客路由 → 重定向到 /dashboard
```

**组件级别保护** (`hooks/useAuth.ts`)：
```typescript
// 在 Dashboard 页面中使用
function DashboardPage() {
  useRequireAuth('/login')  // 未登录则跳转
  // ...
}

// 在 Login 页面中使用
function LoginPage() {
  useRequireGuest('/dashboard')  // 已登录则跳转
  // ...
}
```

---

## 🛡️ 安全机制

### 1. Row Level Security (RLS)

所有业务表启用 RLS，用户只能访问自己的数据：

```sql
-- profiles 表策略示例
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- projects 表策略示例
CREATE POLICY "Users can view their own projects" 
  ON projects FOR SELECT 
  USING (owner_id = auth.uid());
```

### 2. JWT Token 机制

- **存储位置**：HTTP Cookie (推荐) 或 localStorage
- **自动刷新**：Supabase 自动处理 Token 刷新
- **有效期**：默认 1 小时
- **携带方式**：每个请求自动带上 `Authorization: Bearer <token>`

### 3. 密码安全

- **加密算法**：bcrypt ( industry standard )
- **盐值**：自动生成，每个密码唯一
- **强度要求**：
  - 最少 8 个字符
  - 必须包含英文字母
  - 必须包含数字

---

## 📁 后端代码结构

### 文件位置

```
lib/
├── supabase.ts              # 客户端 Supabase 客户端
├── supabase-server.ts       # 服务端 Supabase 客户端
└── ...

hooks/
└── useAuth.ts               # 认证相关 React Hooks

middleware.ts                # Next.js 中间件（路由保护）

stores/
└── authStore.ts             # 全局认证状态管理

app/
├── login/
│   └── page.tsx             # 登录页面
├── register/
│   └── page.tsx             # 注册页面
├── dashboard/
│   └── page.tsx             # Dashboard（受保护）
└── ...
```

### 核心 Hooks

```typescript
// useAuth.ts
export function useAuth() {
  const { user, session, isAuthenticated, isLoading } = useAuth()
  const { signIn, signUp, signOut } = useAuth()
  // ...
}

export function useRequireAuth(redirectTo = '/login') {
  // 未登录自动跳转
}

export function useRequireGuest(redirectTo = '/dashboard') {
  // 已登录自动跳转
}
```

### 服务端工具

```typescript
// supabase-server.ts
export async function createServerSupabaseClient() {
  // 创建服务端客户端
}

export async function getCurrentUser() {
  // 获取当前登录用户
}

export async function getCurrentSession() {
  // 获取当前会话
}

export async function isAuthenticated() {
  // 检查是否已认证
}
```

---

## ✅ 测试结果

### 已验证功能

| 功能 | 状态 | 说明 |
|------|------|------|
| 用户注册 | ✅ | 创建 auth.users + 自动创建 profile |
| 邮箱验证 | ✅ | 支持邮件验证和 Admin API 预验证 |
| 用户登录 | ✅ | JWT Token 正常发放和存储 |
| 路由保护 | ✅ | Middleware + Hook 双重保护 |
| RLS 策略 | ✅ | 用户只能访问自己的数据 |
| Session 持久化 | ✅ | Cookie 自动存储和刷新 |

### 测试用户

- **邮箱**: `autotest_1774216249112@ceylon.test`
- **密码**: `Test123456!`
- **显示名**: `Auto Test User`

---

## 📝 手动测试步骤

### 1. 注册新账户

```bash
open http://localhost:3000/register
```

1. 填写邮箱、显示名称、密码（8位+字母+数字）
2. 点击"下一步"
3. （可选）上传头像或跳过
4. 查看注册成功提示
5. 去邮箱查收验证邮件并点击链接

### 2. 登录账户

```bash
open http://localhost:3000/login
```

1. 输入邮箱和密码
2. 点击"登录"
3. 成功跳转到 Dashboard

### 3. 验证登录状态

- Dashboard 显示用户名（左下角）
- 刷新页面仍保持登录
- 访问 /login 自动跳回 Dashboard

### 4. 退出登录

- 点击左下角用户菜单
- 选择"退出登录"
- 成功退出并跳转到 /login

---

## 🔧 数据库查看命令

```bash
# 查看所有用户（需 Service Role Key）
supabase inspect db table-stats --linked

# 查看 profiles 表
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('URL', 'SERVICE_KEY');
supabase.from('profiles').select('*').then(({ data }) => console.log(data));
"

# 查看 auth 用户列表
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('URL', 'SERVICE_KEY');
supabase.auth.admin.listUsers().then(({ data }) => {
  console.log(data.users.map(u => ({ email: u.email, id: u.id })));
});
"
```

---

## 🎉 总结

✅ **用户认证系统已完全实现并正常工作**

- **数据存储**：auth.users（内置）+ profiles（扩展）
- **密码安全**：bcrypt 自动加密
- **身份验证**：JWT Token + Cookie
- **路由保护**：Middleware + Hook 双重保护
- **权限控制**：RLS 策略保障数据安全
- **自动流程**：注册自动创建 profile

系统已准备好投入生产使用！
