# 飞书多维表格数据获取指南

## 概述

本文档记录了如何成功从飞书多维表格（Base）获取数据的完整流程和关键经验。

## 前置条件

### 1. 飞书应用凭证

在 [飞书开放平台](https://open.feishu.cn/) 创建应用，获取：
- `App ID` (格式: `cli_xxx`)
- `App Secret` (35-45位字符串)

### 2. 开通权限

必须开通以下权限才能访问 Wiki 和多维表格：

| 权限 | 用途 |
|------|------|
| `wiki:wiki` 或 `wiki:wiki:readonly` | 访问 Wiki 空间 |
| `wiki:node:read` | 读取 Wiki 节点信息 |
| `bitable:app` 或 `bitable:app:readonly` | 访问多维表格 |

开通地址：`https://open.feishu.cn/app/{APP_ID}/auth`

### 3. 环境变量配置

创建 `.env` 文件：

```bash
FEISHU_APP_ID=cli_xxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxx
```

## 核心获取流程

### 步骤 1: 获取 Tenant Access Token

```python
import requests

response = requests.post(
    "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
    json={
        "app_id": app_id,       # 从 .env 读取
        "app_secret": app_secret  # 从 .env 读取
    },
    timeout=10
)
token = response.json()["tenant_access_token"]
```

**响应示例：**
```json
{
  "code": 0,
  "msg": "ok",
  "tenant_access_token": "t-g1043n1KODU54RLQVNRRPSRLN5RNQCIAUH7HJQQE",
  "expire": 7157
}
```

### 步骤 2: 从 Wiki URL 获取 App Token

飞书 Wiki 页面 URL 格式：
```
https://{domain}.feishu.cn/wiki/{wiki_token}?table={table_id}&view={view_id}
```

**关键 API - 获取 Wiki 节点信息：**

```python
wiki_token = "MRdKw34zEiHrttkQkX4cg3qKnUf"  # 从 URL 提取

response = requests.get(
    f"https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token={wiki_token}",
    headers={"Authorization": f"Bearer {token}"},
    timeout=10
)
result = response.json()

# 提取 App Token
app_token = result["data"]["node"]["obj_token"]
```

**响应示例：**
```json
{
  "code": 0,
  "data": {
    "node": {
      "title": "foodAI-需求以及bug管理",
      "obj_type": "bitable",
      "obj_token": "Chaab6zmXaOkAQsShIIc9iCLnEe",
      "space_id": "7602333609684372685",
      "node_token": "MRdKw34zEiHrttkQkX4cg3qKnUf"
    }
  }
}
```

**关键字段说明：**
- `obj_token`: 多维表格的 App Token（用于访问表格数据）
- `obj_type`: 节点类型，`bitable` 表示多维表格
- `space_id`: Wiki 空间 ID

### 步骤 3: 获取表格记录

```python
table_id = "tbleySTh2QXbwRqu"  # 从 URL 提取
view_id = "vewMnpNgGD"         # 从 URL 提取（可选）

url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records/search"

response = requests.post(
    url,
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    },
    json={
        "page_size": 500,           # 最大 500
        "view_id": view_id          # 可选，指定视图
    },
    timeout=30
)

result = response.json()
items = result["data"]["items"]  # 记录列表
```

**响应示例：**
```json
{
  "code": 0,
  "data": {
    "has_more": false,
    "items": [
      {
        "record_id": "recnDg3ZMl",
        "fields": {
          "需求名称": [{"text": "食物测试端", "type": "text"}],
          "需求描述": [{"text": "食物测试端", "type": "mention"}],
          "优先级": "P1",
          "状态": "验收中",
          "负责人": [{"name": "肖如旸", "id": "ou_xxx"}]
        },
        "created_time": 1769021570
      }
    ]
  }
}
```

## 数据解析要点

### 字段类型处理

飞书多维表格的字段可能是多种格式：

```python
def parse_field(field_value):
    """解析飞书表格字段"""
    
    # 1. 文本数组（多行文本、富文本）
    if isinstance(field_value, list) and len(field_value) > 0:
        if isinstance(field_value[0], dict):
            return field_value[0].get("text", "")
        return str(field_value[0])
    
    # 2. 人员数组
    if isinstance(field_value, list) and len(field_value) > 0:
        if "name" in field_value[0]:
            return ", ".join(p["name"] for p in field_value)
    
    # 3. 普通字符串
    if isinstance(field_value, str):
        return field_value
    
    # 4. 空值
    return ""
```

### 常见字段映射

| 飞书字段 | 标准字段 | 类型 |
|---------|---------|------|
| `需求名称` | `title` | 文本数组 |
| `需求描述` | `content` | 文本数组/链接 |
| `优先级` | `priority` | 字符串 |
| `状态` | `status` | 字符串 |
| `负责人` | `assignee` | 人员数组 |

## 完整代码示例

```python
#!/usr/bin/env python3
"""
飞书多维表格数据获取完整示例
"""

import os
import requests
import json


def load_env():
    """加载 .env 文件"""
    with open('.env', 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                if value:
                    os.environ[key] = value


def get_access_token(app_id: str, app_secret: str) -> str:
    """获取 Tenant Access Token"""
    resp = requests.post(
        "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
        json={"app_id": app_id, "app_secret": app_secret},
        timeout=10
    )
    return resp.json()["tenant_access_token"]


def get_app_token_from_wiki(wiki_token: str, access_token: str) -> str:
    """从 Wiki Token 获取多维表格 App Token"""
    resp = requests.get(
        f"https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token={wiki_token}",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10
    )
    return resp.json()["data"]["node"]["obj_token"]


def get_table_records(
    app_token: str,
    table_id: str,
    access_token: str,
    view_id: str = None
) -> list:
    """获取表格记录"""
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records/search"
    
    payload = {"page_size": 500}
    if view_id:
        payload["view_id"] = view_id
    
    resp = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        },
        json=payload,
        timeout=30
    )
    return resp.json()["data"]["items"]


def parse_record(record: dict) -> dict:
    """解析单条记录"""
    fields = record.get("fields", {})
    
    # 解析需求名称
    name_field = fields.get("需求名称", [])
    title = name_field[0].get("text", "") if name_field else ""
    
    # 解析需求描述
    desc_field = fields.get("需求描述", [])
    content = desc_field[0].get("text", "") if desc_field else ""
    
    # 解析负责人
    assignee_field = fields.get("负责人", [])
    assignee = assignee_field[0].get("name", "") if assignee_field else ""
    
    return {
        "id": record.get("record_id", "")[:8],
        "title": title,
        "content": content,
        "priority": fields.get("优先级", ""),
        "status": fields.get("状态", ""),
        "assignee": assignee,
        "source": "feishu"
    }


def main():
    # 加载环境变量
    load_env()
    app_id = os.getenv("FEISHU_APP_ID")
    app_secret = os.getenv("FEISHU_APP_SECRET")
    
    # Wiki URL 参数
    wiki_token = "MRdKw34zEiHrttkQkX4cg3qKnUf"
    table_id = "tbleySTh2QXbwRqu"
    view_id = "vewMnpNgGD"
    
    # 1. 获取 Access Token
    print("1. 获取 Access Token...")
    token = get_access_token(app_id, app_secret)
    print(f"   ✓ Token: {token[:25]}...")
    
    # 2. 获取 App Token
    print("2. 获取 App Token...")
    app_token = get_app_token_from_wiki(wiki_token, token)
    print(f"   ✓ App Token: {app_token}")
    
    # 3. 获取表格记录
    print("3. 获取表格记录...")
    records = get_table_records(app_token, table_id, token, view_id)
    print(f"   ✓ 获取到 {len(records)} 条记录")
    
    # 4. 解析记录
    print("4. 解析记录...")
    requirements = [parse_record(r) for r in records]
    valid_items = [r for r in requirements if r["title"] or r["content"]]
    print(f"   ✓ 有效需求: {len(valid_items)} 条")
    
    # 5. 保存结果
    output = {
        "source": "feishu",
        "total": len(valid_items),
        "items": valid_items
    }
    
    with open("feishu_requirements.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print("\n✅ 完成！数据已保存到 feishu_requirements.json")


if __name__ == "__main__":
    main()
```

## 常见问题

### 1. 权限错误 (code: 99991672)

**错误信息：**
```
Access denied. One of the following scopes is required: [wiki:wiki, wiki:wiki:readonly, wiki:node:read]
```

**解决：** 在飞书开放平台开通 Wiki 相关权限。

### 2. 认证失败 (code: 10014)

**错误信息：**
```
app secret invalid
```

**解决：** 检查 `.env` 文件中的 `FEISHU_APP_SECRET` 是否正确。

### 3. 空数据问题

飞书表格可能包含大量空行，获取后需要过滤：

```python
valid_items = [item for item in items if item["title"] or item["content"]]
```

## 项目使用说明

### 快速获取

```bash
# 使用现有脚本
export $(grep -v '^#' .env | xargs)
python scripts/fetch_feishu_requirements.py \
    --url "https://dcnvul43dz0u.feishu.cn/wiki/MRdKw34zEiHrttkQkX4cg3qKnUf?table=tbleySTh2QXbwRqu&view=vewMnpNgGD" \
    --output data/feishu_requirements.json
```

### 完整处理流程

```bash
# 1. 获取需求
python scripts/fetch_feishu_requirements.py \
    --url "..." \
    --output data/feishu_requirements.json

# 2. 需求分析
python src/analyze_requirements.py \
    -i data/feishu_requirements.json \
    -o data/analyzed.json

# 3. 重复检测
python src/check_duplicates.py \
    -r data/analyzed.json \
    -d data/existing_issues.json

# 4. 任务拆分
python src/breakdown_tasks.py \
    -r data/analyzed.json \
    -o output/tasks.md \
    --format markdown
```

## 实际数据示例

**表格：** foodAI-需求以及bug管理
**获取结果：**
- 总记录：121 条
- 有效需求：28 条
- 优先级分布：P0(2), P1(3)
- 状态分布：已完成(7), 开发中(2), 验收中(2)

---

*文档更新时间：2026-03-23*
