# 飞书多维表格接入指南

## 1. 获取应用凭证

### 1.1 创建飞书应用

1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 登录后点击"开发者后台"
3. 点击"创建企业自建应用"
4. 填写应用名称（如"需求管理助手"）
5. 点击"确定创建"

### 1.2 获取 App ID 和 App Secret

1. 进入应用详情页
2. 点击左侧"凭证与基础信息"
3. 复制 **App ID** 和 **App Secret**

```
App ID: cli_xxxxxxxxxxxxxxxx
App Secret: xxxxxxxxxxxxxxxx
```

### 1.3 开启多维表格权限

1. 点击左侧"权限管理"
2. 在"云文档"分类下，开启以下权限：
   - `bitable:app:readonly` - 读取多维表格
   - `bitable:record:readonly` - 读取记录
   - `wiki:wiki:readonly` - 读取知识库（如果从 Wiki 访问）
3. 点击"批量开通"

### 1.4 发布应用

1. 点击左侧"版本管理与发布"
2. 点击"创建版本"
3. 填写版本号和应用描述
4. 点击"保存"
5. 点击"申请发布"
6. 请组织管理员审批通过

## 2. 获取多维表格 App Token

### 方法 1: 从多维表格设置获取（推荐）

1. 打开目标多维表格
2. 点击右上角 "..."（更多）按钮
3. 选择"设置"
4. 在右侧找到"App Token"
5. 点击"复制"

```
App Token 格式示例:
- XXXXXXXXXXXXXXXX (16位字符串)
- BasilXXXXXXXXXXXX (20位字符串，以 Basil 开头)
```

### 方法 2: 通过 Wiki URL 获取

如果你的表格是通过 Wiki 页面访问的：

1. 打开 Wiki 页面
2. 复制浏览器地址栏的 URL
3. URL 格式如:
   ```
   https://dcnvul43dz0u.feishu.cn/wiki/MRdKw34zEiHrttkQkX4cg3qKnUf?table=tbleySTh2QXbwRqu
   ```

从 URL 可以解析出：
- `wiki_token`: `MRdKw34zEiHrttkQkX4cg3qKnUf`
- `table_id`: `tbleySTh2QXbwRqu`

**注意**: 还需要额外的 API 调用才能从 wiki_token 获取 app_token。

## 3. 配置环境变量

### 方法 1: 使用 .env 文件（推荐）

1. 复制示例文件:
   ```bash
   cp .env.example .env
   ```

2. 编辑 `.env` 文件，填入你的凭证:
   ```bash
   FEISHU_APP_ID=cli_a93ed391e6389bca
   FEISHU_APP_SECRET=yl74mGIj8YD80vFMPn7qjdE04ub6I1uq
   FEISHU_APP_TOKEN=你的表格AppToken
   ```

3. **确保 .env 已添加到 .gitignore**（已默认添加）

### 方法 2: 使用环境变量

```bash
export FEISHU_APP_ID="cli_a93ed391e6389bca"
export FEISHU_APP_SECRET="yl74mGIj8YD80vFMPn7qjdE04ub6I1uq"
export FEISHU_APP_TOKEN="你的表格AppToken"
```

## 4. 使用脚本获取数据

### 基本用法

```bash
python scripts/fetch_feishu_requirements.py \
    --url "https://dcnvul43dz0u.feishu.cn/wiki/MRdKw34zEiHrttkQkX4cg3qKnUf?table=tbleySTh2QXbwRqu" \
    --output data/feishu_requirements.json
```

### 直接传递凭证（不推荐用于生产环境）

```bash
python scripts/fetch_feishu_requirements.py \
    --app-id "cli_a93ed391e6389bca" \
    --app-secret "yl74mGIj8YD80vFMPn7qjdE04ub6I1uq" \
    --app-token "你的表格AppToken" \
    --url "https://dcnvul43dz0u.feishu.cn/wiki/MRdKw34zEiHrttkQkX4cg3qKnUf?table=tbleySTh2QXbwRqu" \
    --output data/feishu_requirements.json
```

## 5. 表格字段映射

脚本会自动将飞书表格字段映射为标准需求格式：

| 飞书表格字段 | 标准字段 | 说明 |
|------------|---------|------|
| 需求标题 / 标题 | title | 需求标题 |
| 需求描述 / 描述 | description | 详细描述 |
| 需求内容 / 内容 | content | 原始内容 |
| 反馈来源 / 来源 | source | 来源渠道 |
| 优先级 | priority | 优先级 |
| 类型 / 需求类型 | type | 需求类型 |
| 提出人 | reporter | 反馈人 |
| 创建时间 | created_at | 创建时间 |
| 标签 / 关键词 | tags/keywords | 标签关键词 |

## 6. 完整工作流示例

```bash
# 1. 设置环境变量
export FEISHU_APP_ID="cli_a93ed391e6389bca"
export FEISHU_APP_SECRET="yl74mGIj8YD80vFMPn7qjdE04ub6I1uq"
export FEISHU_APP_TOKEN="你的表格AppToken"

# 2. 从飞书获取需求
python scripts/fetch_feishu_requirements.py \
    --url "https://dcnvul43dz0u.feishu.cn/wiki/MRdKw34zEiHrttkQkX4cg3qKnUf?table=tbleySTh2QXbwRqu" \
    --output data/from_feishu.json

# 3. 分析需求
python -m src.analyze_requirements \
    --input data/from_feishu.json \
    --output output/analyzed.json

# 4. 检查重复
python -m src.check_duplicates \
    --requirements output/analyzed.json \
    --existing-db data/existing_issues.json \
    --output output/deduplicated.json

# 5. 拆分任务
python -m src.breakdown_tasks \
    --requirements output/deduplicated.json \
    --output output/tasks.md \
    --format markdown
```

## 7. 常见问题

### Q: 提示 "app_token is required"

**原因**: 从 Wiki URL 无法直接获取 app_token，需要手动提供。

**解决**: 
1. 打开多维表格
2. 点击右上角 "..." → 设置
3. 复制 "App Token"
4. 通过 `--app-token` 参数或环境变量传递

### Q: 提示 "权限不足"

**原因**: 应用没有开通相应权限，或者应用未发布。

**解决**:
1. 检查权限管理中的 `bitable:app:readonly` 和 `bitable:record:readonly` 是否已开启
2. 确认应用已发布并通过审批
3. 确认应用有权限访问该多维表格

### Q: 数据格式不正确

**原因**: 表格字段名与标准映射不匹配。

**解决**:
1. 检查表格字段名是否为以下之一：
   - 需求标题 / 标题 / 描述 / 内容
2. 或修改 `src/feishu/base_reader.py` 中的 `FIELD_MAPPING`

## 8. 安全提示

⚠️ **重要**: 永远不要将凭证提交到 Git！

已配置的防护措施：
- `.gitignore` 已排除 `.env` 和 `*.secret`
- 脚本优先从环境变量读取凭证
- 日志中不会打印敏感信息

如果意外提交了凭证：
1. 立即在飞书开放平台重置 App Secret
2. 从 Git 历史移除敏感信息（使用 `git filter-branch` 或 BFG Repo-Cleaner）
