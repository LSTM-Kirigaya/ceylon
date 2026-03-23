# Profile 表字段说明

## 新增字段

### 1. role - 用户角色

**类型**: `TEXT`  
**默认值**: `'user'`  
**可选值**: `admin`, `super_user`, `user`

| 角色 | 说明 | 权限 |
|------|------|------|
| `admin` | 系统管理员 | 拥有所有权限，可管理所有用户和项目 |
| `super_user` | 高级用户 | 拥有比普通用户更多的权限，但低于管理员 |
| `user` | 普通用户 | 标准用户权限，只能管理自己的内容 |

**使用场景**:
- 第一个注册的用户自动成为 `admin`
- 用于后台管理系统权限控制
- 用于区分不同级别的用户功能访问权限

### 2. subscription_tier - 订阅等级

**类型**: `TEXT`  
**默认值**: `'free'`  
**可选值**: `free`, `pro`, `team`, `enterprise`

| 等级 | 说明 | 价格 |
|------|------|------|
| `free` | 免费版 | ¥0/月 |
| `pro` | 专业版 | ¥10/月 |
| `team` | 团队版 | ¥20/月 |
| `enterprise` | 企业版 | 自定义 |

**使用场景**:
- 商业化功能限制
- 区分免费和付费用户功能
- 后续实现支付订阅系统的基础

### 3. subscription_expires_at - 订阅过期时间

**类型**: `TIMESTAMP WITH TIME ZONE`  
**默认值**: `NULL` (永不过期)

**使用场景**:
- 追踪订阅有效期
- 实现订阅续费提醒
- 过期后自动降级到免费版

## 前端使用示例

### 检查用户角色

```typescript
import { useAuthStore } from '@/stores/authStore'
import { isAdmin } from '@/types'

function MyComponent() {
  const { profile } = useAuthStore()
  
  if (profile && isAdmin(profile.role)) {
    return <AdminPanel />
  }
  
  return <UserPanel />
}
```

### 检查订阅等级

```typescript
import { useAuthStore } from '@/stores/authStore'

function FeatureComponent() {
  const { profile } = useAuthStore()
  
  const canUseProFeature = ['pro', 'team', 'enterprise'].includes(
    profile?.subscription_tier || 'free'
  )
  
  if (!canUseProFeature) {
    return <UpgradePrompt />
  }
  
  return <ProFeature />
}
```

### 获取角色/订阅标签

```typescript
import { getRoleLabel, getSubscriptionTierLabel } from '@/types'

// 显示中文标签
const roleLabel = getRoleLabel(profile.role) // "管理员"
const tierLabel = getSubscriptionTierLabel(profile.subscription_tier) // "专业版"
```

## 数据库操作示例

### 设置用户为管理员

```sql
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'admin@example.com';
```

### 设置用户订阅

```sql
UPDATE public.profiles 
SET 
  subscription_tier = 'pro',
  subscription_expires_at = '2025-12-31 23:59:59+00'
WHERE email = 'user@example.com';
```

### 查询所有管理员

```sql
SELECT * FROM public.profiles 
WHERE role IN ('admin', 'super_user');
```

### 查询即将过期的订阅

```sql
SELECT * FROM public.profiles 
WHERE subscription_expires_at IS NOT NULL 
  AND subscription_expires_at < NOW() + INTERVAL '7 days';
```

## 迁移说明

迁移文件位于:
- `supabase/migrations/000002_add_profile_role_and_subscription.sql`
- `sql/add_profile_role_and_subscription.sql` (手动执行版本)

迁移会自动:
1. 添加三个新字段到 profiles 表
2. 创建索引优化查询
3. 更新 trigger 函数设置默认角色
4. 更新 RLS 策略允许管理员查看所有用户
5. 将第一个用户设置为 admin

## 注意事项

1. **role 字段**:
   - 普通用户不应该能修改自己的 role
   - 只有 admin 可以修改其他用户的 role
   - 第一个注册用户自动成为 admin

2. **subscription_tier 字段**:
   - 需要配合支付系统实现自动更新
   - 过期后应该自动降级到 free
   - 建议实现 webhook 接收支付平台通知

3. **subscription_expires_at 字段**:
   - 设置为 NULL 表示永不过期
   - 建议定期检查并处理过期订阅
