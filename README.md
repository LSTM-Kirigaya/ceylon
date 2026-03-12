# Feedback Collector

一个智能的软件用户群反馈收集和自动化需求分析工具。

## 功能特性

- 📱 **多平台支持**: 支持微信、QQ等群聊平台
- 🤖 **AI 智能分析**: 使用大模型自动提取需求、Bug，并进行分类
- 🔄 **智能去重**: 自动合并相似的反馈，避免重复记录
- 📊 **多维导出**: 支持导出到多维表格或本地文件
- ⚙️ **灵活配置**: 命令行参数支持，易于集成到 CI/CD

## 快速开始

### 安装

```bash
pip install -e .
```

### 配置

复制 `config/config.example.yaml` 到 `config/config.yaml` 并填写相关配置：

```bash
cp config/config.example.yaml config/config.yaml
```

### 使用

```bash
# 收集并分析今天的群聊反馈
feedback-collector --platform wechat --group "产品反馈群" --output markdown

# 收集指定日期的反馈
feedback-collector --platform wechat --group "产品反馈群" --date 2026-03-12 --output feishu

# 仅输出到本地文件
feedback-collector --platform wechat --group "产品反馈群" --output json
```

## 项目架构

```
feedback-collector/
├── src/
│   ├── collectors/          # 群聊信息收集模块
│   │   ├── base.py          # 收集器基类
│   │   ├── wechat.py        # 微信收集器
│   │   └── qq.py            # QQ收集器
│   ├── analyzer/            # AI 分析模块
│   │   ├── llm.py           # 大模型接口
│   │   ├── extractor.py     # 需求/Bug 提取器
│   │   ├── classifier.py    # 分类器
│   │   └── deduplicator.py  # 去重器
│   ├── exporters/           # 数据导出模块
│   │   ├── base.py          # 导出器基类
│   │   ├── feishu.py        # 飞书多维表格导出
│   │   ├── notion.py        # Notion 导出
│   │   └── local.py         # 本地文件导出
│   └── utils/               # 工具函数
├── config/                  # 配置文件
├── tests/                   # 测试用例
├── docs/                    # 文档
└── third_party/             # 第三方依赖（CipherTalk 等）
```

## 模块说明

### 1. 收集器模块 (collectors)

负责从指定的群聊中收集当天的消息记录。

- **微信收集器**: 基于 CipherTalk 项目，读取微信本地数据库
- **QQ收集器**: 支持 QQ 群聊消息收集

### 2. 分析器模块 (analyzer)

使用大模型对收集到的消息进行分析：

- **提取器**: 从群聊消息中提取软件相关的需求和 Bug
- **分类器**: 根据 GitHub 标签体系对需求和 Bug 进行分类
- **去重器**: 合并相似的反馈，确保不重复记录

### 3. 导出器模块 (exporters)

将分析结果导出到目标位置：

- **飞书导出器**: 上传到飞书多维表格
- **Notion 导出器**: 上传到 Notion 数据库
- **本地导出器**: 保存为 Markdown、JSON、CSV 等格式

## 支持的 AI 服务提供商

- OpenAI (GPT-4, GPT-3.5)
- DeepSeek
- 智谱 AI (GLM)
- 通义千问
- Moonshot (Kimi)
- Azure OpenAI
- 本地模型 (Ollama)

## 依赖的第三方项目

### CipherTalk

本项目集成了 [CipherTalk](https://github.com/ILoveBingLu/CipherTalk) 项目用于微信数据收集。

**升级方式**:

```bash
# 进入 third_party 目录
cd third_party/CipherTalk

# 拉取最新代码
git pull origin main

# 重新安装依赖（如有需要）
npm install
```

## 配置说明

### 微信配置

需要在 `config.yaml` 中配置微信数据库路径和微信ID：

```yaml
wechat:
  wxid: "your_wxid"  # 微信ID
  db_path: "/path/to/wechat/decrypted/db"  # 解密后的数据库路径
```

### AI 服务配置

```yaml
ai:
  provider: "deepseek"  # 服务提供商
  api_key: "your_api_key"
  model: "deepseek-chat"
  base_url: "https://api.deepseek.com/v1"
```

### 导出配置

```yaml
export:
  target: "feishu"  # 或 "notion", "local"
  feishu:
    app_id: "your_app_id"
    app_secret: "your_app_secret"
    table_id: "your_table_id"
```

## 开发

### 运行测试

```bash
pytest tests/
```

### 代码风格

```bash
black src/
isort src/
flake8 src/
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
