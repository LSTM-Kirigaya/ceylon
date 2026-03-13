# 测试指南

本文档介绍如何测试 Feedback Collector 项目。

## 测试类型

1. **单元测试** - 测试单个模块和函数
2. **集成测试** - 测试模块间的协作
3. **手动测试** - 使用真实数据测试

## 快速开始

```bash
# 安装开发依赖
pip install -e ".[dev]"

# 运行所有测试
pytest tests/ -v

# 运行特定测试文件
pytest tests/test_analyzer.py -v

# 运行带覆盖率的测试
pytest tests/ -v --cov=feedback_collector --cov-report=html
```

## 单元测试

### 测试分析器模块

```bash
pytest tests/test_analyzer.py -v
```

测试内容包括：
- `FeedbackClassifier` - 反馈分类
- `FeedbackDeduplicator` - 反馈去重
- `FeedbackExtractor` - 反馈提取

### 测试数据模型

```bash
pytest tests/test_models.py -v
```

测试内容包括：
- `ChatMessage` - 消息模型序列化
- `Feedback` - 反馈模型创建和合并
- `AnalysisResult` - 分析结果统计

## 集成测试

### 1. 测试 Skill 工具

#### 测试消息收集器 (collect_messages.py)

```bash
# 创建测试配置文件
cat > /tmp/test_config.yaml << 'EOF'
platforms:
  wechat:
    enabled: true
    wxid: "test_wxid"
    db_path: "/tmp/test_wechat_db"
  qq:
    enabled: false
EOF

# 运行测试（需要先有解密的数据库）
python .agents/skills/feedback-collector/scripts/collect_messages.py \
  --platform wechat \
  --group "测试群" \
  --date 2026-03-13 \
  --config /tmp/test_config.yaml \
  --output /tmp/test_messages.json \
  --verbose
```

#### 测试反馈搜索器 (query_feedback.py)

```bash
# 创建测试反馈数据库
cat > /tmp/test_feedbacks.json << 'EOF'
{
  "feedbacks": [
    {
      "id": "fb1",
      "title": "添加导出功能",
      "description": "希望能导出数据为Excel格式",
      "type": "feature",
      "priority": "high",
      "keywords": ["导出", "Excel"],
      "reported_by": ["用户A"],
      "created_at": "2026-03-10T09:00:00"
    },
    {
      "id": "fb2", 
      "title": "程序崩溃问题",
      "description": "点击保存按钮后程序崩溃",
      "type": "bug",
      "priority": "critical",
      "keywords": ["崩溃", "保存"],
      "reported_by": ["用户B"],
      "created_at": "2026-03-11T10:00:00"
    },
    {
      "id": "fb3",
      "title": "深色模式",
      "description": "希望支持深色模式，夜间使用更方便",
      "type": "feature",
      "priority": "medium",
      "keywords": ["深色模式", "主题"],
      "reported_by": ["用户C"],
      "created_at": "2026-03-12T11:00:00"
    }
  ]
}
EOF

# 测试关键词搜索
python .agents/skills/feedback-collector/scripts/query_feedback.py \
  --query "导出" \
  --feedback-file /tmp/test_feedbacks.json \
  --top-k 5

# 测试相似度搜索
python .agents/skills/feedback-collector/scripts/query_feedback.py \
  --query "程序闪退崩溃" \
  --feedback-file /tmp/test_feedbacks.json \
  --top-k 3

# 导出 JSON 格式
python .agents/skills/feedback-collector/scripts/query_feedback.py \
  --query "暗黑模式" \
  --feedback-file /tmp/test_feedbacks.json \
  --format json \
  --output /tmp/search_results.json
```

### 2. 测试 CLI 命令

```bash
# 测试初始化命令
feedback-collector init

# 测试列表群聊命令（需要配置）
feedback-collector list-groups --platform wechat

# 测试收集命令（试运行模式）
feedback-collector collect \
  --platform wechat \
  --group "测试群" \
  --date 2026-03-13 \
  --output local \
  --dry-run
```

## 手动测试（真实环境）

### 前置条件

1. **微信数据库已解密**
   - 使用 CipherTalk 或其他工具解密微信数据库
   - 记录微信 ID (wxid_xxx 格式)
   - 记录数据库路径

2. **配置 AI API 密钥**
   - 获取 DeepSeek/OpenAI API 密钥

### 测试步骤

#### 步骤 1: 创建配置文件

```bash
# 复制示例配置
cp config/config.example.yaml config/config.yaml

# 编辑配置
vim config/config.yaml
```

最小配置示例：
```yaml
platforms:
  wechat:
    enabled: true
    wxid: "your_wxid_here"
    db_path: "/path/to/decrypted/wechat/db"

ai:
  provider: "deepseek"
  api_key: "your_api_key_here"
  model: "deepseek-chat"

analysis:
  software_name: "YourApp"
  software_description: "这是一个测试软件"
```

#### 步骤 2: 列出群聊

```bash
feedback-collector list-groups --platform wechat
```

预期输出：
```
WECHAT 群聊列表
┌────────┬────────────────────────────────┬─────────────────┐
│ 序号   │ ID                             │ 名称            │
├────────┼────────────────────────────────┼─────────────────┤
│ 1      │ xxxxx@chatroom                 │ 产品反馈群      │
│ 2      │ yyyyy@chatroom                 │ 测试群          │
└────────┴────────────────────────────────┴─────────────────┘
共 2 个群聊
```

#### 步骤 3: 收集消息

```bash
# 收集今天的消息
feedback-collector collect \
  --platform wechat \
  --group "产品反馈群" \
  --output local
```

#### 步骤 4: 检查输出文件

```bash
# 查看输出目录
ls -la output/

# 查看 Markdown 报告
cat output/2026-03-13/feedbacks_*.md

# 查看 JSON 数据
cat output/2026-03-13/feedbacks_*.json | jq
```

## 测试用例示例

### 测试数据生成脚本

```bash
#!/bin/bash
# generate_test_data.sh

mkdir -p test_data

# 生成模拟消息数据
cat > test_data/mock_messages.json << 'EOF'
{
  "platform": "wechat",
  "date": "2026-03-13",
  "total_messages": 5,
  "messages": [
    {
      "id": "msg1",
      "sender_id": "user1",
      "sender_name": "张三",
      "content": "这个软件怎么用啊？",
      "timestamp": "2026-03-13T10:00:00",
      "message_type": "text"
    },
    {
      "id": "msg2",
      "sender_id": "user2",
      "sender_name": "李四",
      "content": "发现了一个bug，点击保存会崩溃",
      "timestamp": "2026-03-13T10:05:00",
      "message_type": "text"
    },
    {
      "id": "msg3",
      "sender_id": "user3",
      "sender_name": "王五",
      "content": "希望能添加导出功能，导出Excel",
      "timestamp": "2026-03-13T10:10:00",
      "message_type": "text"
    },
    {
      "id": "msg4",
      "sender_id": "user4",
      "sender_name": "赵六",
      "content": "程序运行好慢啊，能不能优化一下性能",
      "timestamp": "2026-03-13T10:15:00",
      "message_type": "text"
    },
    {
      "id": "msg5",
      "sender_id": "user2",
      "sender_name": "李四",
      "content": "我也是，保存就崩溃，急需修复",
      "timestamp": "2026-03-13T10:20:00",
      "message_type": "text"
    }
  ]
}
EOF

echo "测试数据已生成到 test_data/"
```

## 持续集成测试

GitHub Actions 会自动运行：

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - name: Install dependencies
        run: pip install -e ".[dev]"
      - name: Run tests
        run: pytest tests/ -v
```

## 调试技巧

### 启用详细日志

```bash
# 设置日志级别
export LOG_LEVEL=DEBUG

# 或者在配置中设置
logging:
  level: "DEBUG"
```

### 使用 Python 调试器

```python
# 在代码中添加断点
import pdb; pdb.set_trace()

# 或者在测试中使用
pytest --pdb
```

### 检查数据库连接

```python
# test_db_connection.py
import sqlite3

db_path = "/path/to/your/decrypted/db/session.db"
conn = sqlite3.connect(db_path)
cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
print("Tables:", [row[0] for row in cursor.fetchall()])
conn.close()
```

## 常见问题

### 1. 测试失败：ModuleNotFoundError

```bash
# 确保已安装包
pip install -e ".[dev]"
```

### 2. 数据库连接失败

- 检查数据库路径是否正确
- 确认数据库文件存在且有读取权限
- 确认数据库已解密

### 3. AI 分析失败

- 检查 API 密钥是否配置正确
- 检查网络连接
- 查看 API 提供商的状态页面

## 性能测试

```bash
# 使用 pytest-benchmark
pip install pytest-benchmark

# 运行性能测试
pytest tests/ -v --benchmark-only
```

## 覆盖率报告

```bash
# 生成 HTML 覆盖率报告
pytest tests/ --cov=feedback_collector --cov-report=html

# 查看报告
open htmlcov/index.html
```

## 下一步

- 运行单元测试确保代码正确性
- 使用模拟数据测试核心功能
- 配置真实环境进行集成测试
- 提交代码触发 CI 测试
