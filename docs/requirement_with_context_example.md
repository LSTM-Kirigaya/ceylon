# 需求分析 - 保留原始对话上下文示例

## 功能说明

修改后的需求分析流程会在提取需求时，保留原始的用户对话内容作为参考上下文。

## 数据结构变化

### 修改前

```json
{
  "id": "REQ-0001",
  "title": "食物库推荐系统",
  "description": "食物库推荐系统优化",
  "type": "feature",
  "priority": "high",
  "keywords": ["推荐", "食物库"]
}
```

### 修改后（增加 raw_context）

```json
{
  "id": "REQ-0001",
  "title": "食物库推荐系统",
  "description": "食物库推荐系统优化",
  "type": "feature",
  "priority": "high",
  "keywords": ["推荐", "食物库"],
  "raw_context": {
    // 原始文本内容
    "raw_content": "食物库推荐系统-  ",
    "raw_title": "食物库推荐系统",
    
    // 原始图片信息
    "raw_images": [
      {
        "type": "image",
        "aeskey": "xxx",
        "note": "图片需要通过微信客户端查看"
      }
    ],
    
    // 对话上下文（前后2条消息）
    "conversation_context": {
      "before": [
        {
          "content": "位置搜索，地图选点",
          "timestamp": "2026/03/22 12:14"
        },
        {
          "content": "饮食记录删除",
          "timestamp": "2026/03/22 12:14"
        }
      ],
      "current": {
        "content": "食物库推荐系统",
        "timestamp": "2026/03/22 12:14"
      },
      "after": [
        {
          "content": "加餐选项细化",
          "timestamp": "2026/03/22 12:14"
        },
        {
          "content": "首页餐食优化为卡片形式",
          "timestamp": "2026/03/22 12:14"
        }
      ],
      "has_images": false
    },
    
    // 是否包含媒体
    "has_media": false,
    
    // 原始数据源的其他字段
    "source_data": {
      "priority": "P1",
      "status": "待启动",
      "assignee": "马健文"
    }
  }
}
```

## 实际示例

### 示例1：飞书需求 + 原始上下文

**AI提取的需求：**
```
ID: REQ-0004
标题: 食物库推荐系统
类型: feature
优先级: P1
```

**原始上下文参考：**
```
前文:
  1. [2026/03/22 12:14] 位置搜索，地图选点
  2. [2026/03/22 12:14] 饮食记录删除

当前消息:
  [2026/03/22 12:14] 食物库推荐系统-  

后文:
  1. [2026/03/22 12:14] 加餐选项细化
  2. [2026/03/22 12:14] 首页餐食优化为卡片形式

飞书表格原始字段:
  - 需求名称: 食物库推荐系统
  - 优先级: P1
  - 状态: 待启动
  - 负责人: 马健文
```

### 示例2：微信消息 + 原始上下文（含图片）

**AI提取的需求：**
```
ID: REQ-0021
标题: 分析时弹出确认窗口
类型: feature
优先级: medium
```

**原始上下文参考：**
```
前文:
  1. [2026/03/21 16:44] 可以考虑一下
  2. [2026/03/21 16:44] 哈哈哈接受了

当前消息:
  [2026/03/21 15:32] 问，分析的时候可出个弹窗吗？
                      弹窗内容就是是否需要修改菜品或者是否需要纠正

后文:
  1. [2026/03/21 15:26] 已请求被拒绝
  2. [2026/03/21 15:25] 请求食探好友

图片信息:
  - 消息类型: 文本（无图片）
```

### 示例3：微信消息 + 图片上下文

**AI提取的需求：**
```
ID: REQ-0015
标题: [图片] 用户反馈截图
类型: other
优先级: high
```

**原始上下文参考：**
```
前文:
  1. [2026/03/22 12:21] 文本消息

当前消息:
  [2026/03/22 12:21] [图片]
  
图片信息:
  - 类型: image
  - AES Key: 849020c823f6b512c2974bcfe8e769c0
  - 备注: 用户反馈的界面截图

后文:
  1. [2026/03/22 12:21] 文本消息
```

## 使用场景

### 场景1：需求评审会议
当产品经理和开发团队讨论需求时，可以看到原始用户的完整表达，而不是仅看AI总结的标题。

### 场景2：需求澄清
当开发人员对需求有疑问时，可以查看原始对话上下文，理解用户的真实意图。

### 场景3：图片需求
当用户发送截图反馈问题时，保留图片信息（AES key），可以通过微信客户端查看原图。

## 命令行使用

### 分析微信聊天记录

```bash
python scripts/analyze_with_context.py \
    -i food-seed-7d.json \
    -o output/requirements_with_context.json \
    --source wechat
```

### 分析飞书数据（保留原始字段）

```bash
python scripts/analyze_with_context.py \
    -i data/feishu_requirements_latest.json \
    -o output/feishu_with_context.json \
    --source feishu
```

## 输出文件结构

```
output/
├── requirements_with_context.json    # 带上下文的分析结果
├── feishu_tasks_final.md              # 任务清单（Markdown）
└── requirement_with_context_example.md # 本文档
```

## 后续处理流程

带上下文的分析结果可以直接输入到后续流程：

```bash
# 1. 重复检测（可以基于原始内容检测相似性）
python src/check_duplicates.py \
    -r output/requirements_with_context.json \
    -d data/existing_issues.json

# 2. 任务拆分（开发人员可以看到原始上下文）
python src/breakdown_tasks.py \
    -r output/requirements_with_context.json \
    -o output/tasks_with_context.md \
    --format markdown
```

## 优势

1. **可追溯性**：每个需求都可以追溯到原始对话
2. **上下文完整性**：前后2条消息帮助理解语境
3. **多媒体支持**：保留图片信息（AES key）
4. **多源支持**：同时支持微信、飞书等多种数据源
