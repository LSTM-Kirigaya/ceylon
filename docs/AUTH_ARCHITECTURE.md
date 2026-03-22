# Ceylon 身份验证架构说明

## 1. 用户数据存储

### auth.users（Supabase 内置）
存储位置：`auth` schema（受保护，无法直接查询）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `email` | VARCHAR | 用户邮箱 |
| `encrypted_password` | VARCHAR | **bcrypt 加密密码** |
| `email_confirmed_at` | TIMESTAMP | 邮箱验证时间 |
| `raw_user_meta_data` | JSONB | 用户元数据（显示名称等） |
| `created_at` | TIMESTAMP | 创建时间 |

**密码处理**：Supabase Auth 自动使用 bcrypt 加密，我们**永不接触明文密码**。

### public.profiles（业务扩展）
存储位置：`public` schema（可查询）

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 2. 认证流程

### 注册流程
```
1. 前端：收集邮箱、密码、显示名称
2. 调用：supabase.auth.signUp()
3. Supabase：创建 auth.users 记录
4. 触发器：自动创建 public.profiles 记录
5. Supabase：发送验证邮件（如启用）
6. 前端：引导用户验证邮箱
```

### 登录流程
```
1. 前端：收集邮箱、密码
2. 调用：supabase.auth.signInWithPassword()
3. Supabase：验证密码，返回 JWT Token
4. 前端：存储 Token，跳转 Dashboard
5. Token 自动附带到后续 API 请求
```

### 身份校验流程
```
1. 访问受保护页面
2. 检查 Session：supabase.auth.getSession()
3. 无 Session → 重定向到 /login
4. 有 Session → 允许访问
5. 每次请求自动带上 JWT Token
```

## 3. 安全机制

### RLS（Row Level Security）
所有表启用 RLS，用户只能访问自己的数据：

```sql
-- 示例：profiles 表策略
CREATE POLICY "Users can view their own profile" 
ON profiles FOR SELECT USING (auth.uid() = id);
```

### JWT Token
- 位置：localStorage
- 自动刷新：Supabase 处理
- 有效期：默认 1 小时

## 4. 后端代码中的身份校验

### 服务端组件（Server Components）
```typescript
import { createServerClient } from '@/lib/supabase-server'

async function Page() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    redirect('/login')
  }
  
  // 用户已认证，继续处理...
}
```

### API 路由（API Routes）
```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  // 用户已认证...
}
```

### CLI Token 认证
CLI 使用特殊 token 而非 JWT：
```sql
CREATE TABLE cli_tokens (
  token TEXT UNIQUE,  -- 随机生成的 API Key
  user_id UUID REFERENCES auth.users(id),
  -- ...
);
```
