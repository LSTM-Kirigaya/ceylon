# Feedback Collector - Agent 指南

本文档为 AI 助手提供项目背景、架构和开发指南。

## 项目概述

Feedback Collector 是一个智能的软件用户群反馈收集和自动化需求分析工具。

### 核心功能

1. **消息收集**: 从微信、QQ 群聊收集用户反馈
2. **AI 分析**: 使用大模型自动提取需求、Bug，进行分类
3. **智能去重**: 合并相似反馈，避免重复记录
4. **多平台导出**: 支持本地文件、飞书、Notion 等导出方式

## 架构设计

### 模块划分

```
┌─────────────────────────────────────────────────────────────┐
│                      CLI / CLI Entry                        │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    Core Pipeline                             │
│  ┌────────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Collectors │→ │ Analyzer │→ │ Deduplic │→ │ Exporters│  │
│  └────────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 主要模块

#### 1. Collectors (收集器)

- **BaseCollector**: 抽象基类，定义收集器接口
- **WeChatCollector**: 微信收集器，读取微信本地数据库
- **QQCollector**: QQ 收集器（基础实现）

关键接口：
- `connect()`: 连接数据源
- `collect_messages()`: 收集指定群聊的消息
- `get_groups()`: 获取群聊列表

#### 2. Analyzer (分析器)

- **FeedbackAnalyzer**: 主分析器，协调各子模块
- **FeedbackExtractor**: 使用 LLM 从消息中提取反馈
- **FeedbackClassifier**: 基于关键词和规则分类反馈
- **FeedbackDeduplicator**: 检测并合并相似反馈

#### 3. Exporters (导出器)

- **LocalExporter**: 导出到本地文件（Markdown/JSON/CSV）
- **FeishuExporter**: 导出到飞书多维表格
- **NotionExporter**: 导出到 Notion 数据库

## 关键技术决策

### 1. 微信数据获取

- **方案**: 直接读取微信解密后的 SQLite 数据库
- **依赖**: CipherTalk 项目（Git 子模块）
- **优势**: 不需要微信 API，数据完整
- **限制**: 需要本地解密数据库

### 2. AI 分析

- **模型**: 支持多种大模型（OpenAI、DeepSeek、智谱等）
- **接口**: OpenAI SDK 兼容接口
- **策略**: 批量处理 + 流式输出

### 3. 去重策略

- **Level 1**: 哈希去重（完全相同的反馈）
- **Level 2**: 文本相似度（Jaccard 相似度）
- **Level 3**: 与历史数据比对

## 代码规范

### 类型注解

必须添加类型注解：

```python
async def collect_messages(
    self,
    group_id: str,
    start_time: Optional[datetime] = None,
) -> List[ChatMessage]:
    ...
```

### 错误处理

使用 try-except 捕获具体异常，记录日志：

```python
try:
    result = await some_operation()
except SomeSpecificError as e:
    logger.error(f"操作失败: {e}")
    # 适当处理
```

### 日志记录

使用结构化日志：

```python
from feedback_collector.utils.logger import get_logger

logger = get_logger(__name__)
logger.info(f"处理完成: {count} 条记录")
logger.debug(f"详细数据: {data}")
```

## 配置管理

### 配置文件加载顺序

1. `FC_CONFIG` 环境变量指定的路径
2. `./config/config.yaml`
3. `./config/config.local.yaml`
4. `~/.config/feedback-collector/config.yaml`
5. 默认配置

### 配置结构

```yaml
platforms:
  wechat:
    enabled: true
    wxid: ""
    db_path: ""

ai:
  provider: "deepseek"
  api_key: ""
  model: "deepseek-chat"
```

## 第三方依赖

### CipherTalk 集成

```
third_party/CipherTalk  (Git 子模块)
  ├── 读取微信数据库逻辑参考
  └── 需要独立更新
```

升级命令：
```bash
cd third_party/CipherTalk
git pull origin main
```

## 测试

### 运行测试

```bash
pytest tests/ -v
```

### 测试覆盖率

```bash
pytest --cov=feedback_collector --cov-report=html
```

## 常见任务

### 添加新的收集器

1. 继承 `BaseCollector`
2. 实现必要的方法
3. 在 `collectors/__init__.py` 导出

### 添加新的导出器

1. 继承 `BaseExporter`
2. 实现 `export()` 和 `export_feedbacks()`
3. 在 `cli.py` 中添加导出逻辑

### 修改 AI 提示词

编辑 `analyzer/extractor.py` 中的提示词模板。

## 注意事项

1. **数据隐私**: 处理用户数据时注意隐私保护
2. **API 限制**: 注意 AI API 的调用频率限制
3. **数据库连接**: 使用连接池或及时关闭连接
4. **异常处理**: 网络操作都要有超时和重试

## 相关资源

- CipherTalk: https://github.com/ILoveBingLu/CipherTalk
- OpenAI API: https://platform.openai.com/docs
- 飞书开放平台: https://open.feishu.cn/
- Notion API: https://developers.notion.com/
