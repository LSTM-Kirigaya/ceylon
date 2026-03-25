# 重置密码功能说明

## 功能概述

基于 Supabase Auth 实现了完整的重置密码流程，已整合到登录页面中。

## 文件结构

```
app/
├── [locale]/
│   ├── login/page.tsx              # 登录页面（包含找回密码功能）
│   ├── reset-password/page.tsx     # 重置密码页面（邮件链接跳转）
│   └── auth/callback/page.tsx      # OAuth 回调页面
├── api/auth/
│   ├── reset-password/route.ts     # 发送重置邮件 API
│   ├── update-password/route.ts    # 更新密码 API
│   └── callback/route.ts           # 处理 code 交换 session API
```

## 重置密码流程

### 1. 登录页面的找回密码功能
- 用户在登录页面点击"忘记密码？"链接
- 页面切换到找回密码表单
- 输入邮箱地址，点击"发送重置链接"
- 系统调用 `/api/auth/reset-password` 发送邮件
- 显示成功提示，可返回登录

### 2. 邮件链接跳转
- 用户收到邮件，点击链接：`/reset-password?code=xxx`
- 重置密码页面验证 code，交换 session
- 输入新密码并确认
- 调用 `/api/auth/update-password` 更新密码
- 重置成功，跳转到登录页面

## 页面说明

### 登录页面 (`/login`)

包含两个模式：
1. **登录模式**：正常的邮箱密码登录表单
2. **找回密码模式**：仅输入邮箱，发送重置链接

**新增元素：**
- 密码输入框下方的"忘记密码？"链接
- 点击后切换到找回密码表单
- 找回密码表单包含：
  - 邮箱输入框
  - "发送重置链接"按钮
  - "返回登录"按钮

### 重置密码页面 (`/reset-password?code=xxx`)

用户点击邮件链接后进入：
- 自动验证 code 有效性
- 输入新密码（至少 8 位）
- 确认新密码
- 提交后重置成功，跳转到登录页

## API 接口

### POST /api/auth/reset-password
发送重置密码邮件

**请求体：**
```json
{
  "email": "user@example.com"
}
```

### POST /api/auth/update-password
更新用户密码（需要有效 session）

**请求体：**
```json
{
  "password": "newpassword123"
}
```

## Supabase 配置

在 Supabase Dashboard → Authentication → URL Configuration 中配置：

- Site URL: `http://localhost:3000`
- Redirect URLs: 
  - `http://localhost:3000/reset-password`
  - `https://yourdomain.com/reset-password`

## 测试步骤

1. 访问 http://localhost:3000/login
2. 点击密码输入框下方的"忘记密码？"
3. 输入注册邮箱，点击"发送重置链接"
4. 检查邮箱获取重置链接
5. 点击链接跳转到重置密码页面
6. 输入新密码并提交
7. 使用新密码登录

## 界面交互

```
登录页面
├── 登录表单
│   ├── 邮箱输入框
│   ├── 密码输入框
│   ├── [忘记密码？] ← 点击切换
│   └── 登录按钮
│
└── 找回密码表单（切换后显示）
    ├── 邮箱输入框
    ├── 发送重置链接按钮
    └── [返回登录] ← 点击返回
```
