#!/usr/bin/env python3
"""
简化版飞书数据获取脚本
基于 docs/feishu_api_guide.md 的最佳实践

用法:
    export FEISHU_APP_ID="cli_xxx"
    export FEISHU_APP_SECRET="xxx"
    python scripts/fetch_feishu_simple.py
"""

import os
import sys
import json
import requests
from pathlib import Path


# 飞书 API 配置
BASE_URL = "https://open.feishu.cn/open-apis"
WIKI_TOKEN = "MRdKw34zEiHrttkQkX4cg3qKnUf"
TABLE_ID = "tbleySTh2QXbwRqu"
VIEW_ID = "vewMnpNgGD"


def load_env():
    """加载 .env 文件到环境变量"""
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    if value and key not in os.environ:
                        os.environ[key] = value


def get_access_token(app_id: str, app_secret: str) -> str:
    """获取 Tenant Access Token"""
    resp = requests.post(
        f"{BASE_URL}/auth/v3/tenant_access_token/internal",
        json={"app_id": app_id, "app_secret": app_secret},
        timeout=10
    )
    result = resp.json()
    if result.get("code") != 0:
        raise Exception(f"获取 Token 失败: {result.get('msg')}")
    return result["tenant_access_token"]


def get_app_token(wiki_token: str, access_token: str) -> str:
    """从 Wiki Token 获取 App Token"""
    resp = requests.get(
        f"{BASE_URL}/wiki/v2/spaces/get_node?token={wiki_token}",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10
    )
    result = resp.json()
    if result.get("code") != 0:
        raise Exception(f"获取 Wiki 节点失败: {result.get('msg')}")
    return result["data"]["node"]["obj_token"]


def get_records(app_token: str, table_id: str, access_token: str, view_id: str = None) -> list:
    """获取表格记录"""
    url = f"{BASE_URL}/bitable/v1/apps/{app_token}/tables/{table_id}/records/search"
    
    payload = {"page_size": 500}
    if view_id:
        payload["view_id"] = view_id
    
    all_records = []
    page_token = None
    
    while True:
        if page_token:
            payload["page_token"] = page_token
        
        resp = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            },
            json=payload,
            timeout=30
        )
        result = resp.json()
        
        if result.get("code") != 0:
            raise Exception(f"获取记录失败: {result.get('msg')}")
        
        data = result.get("data", {})
        items = data.get("items", [])
        all_records.extend(items)
        
        # 分页处理
        page_token = data.get("page_token")
        has_more = data.get("has_more", False)
        
        if not has_more or not page_token:
            break
    
    return all_records


def parse_record(record: dict) -> dict:
    """解析单条记录为标准格式"""
    fields = record.get("fields", {})
    
    # 解析需求名称
    name_field = fields.get("需求名称", [])
    title = ""
    if isinstance(name_field, list) and len(name_field) > 0:
        if isinstance(name_field[0], dict):
            title = name_field[0].get("text", "")
        else:
            title = str(name_field[0])
    
    # 解析需求描述
    desc_field = fields.get("需求描述", [])
    content = ""
    if isinstance(desc_field, list) and len(desc_field) > 0:
        if isinstance(desc_field[0], dict):
            content = desc_field[0].get("text", "")
        else:
            content = str(desc_field[0])
    
    # 解析负责人
    assignee_field = fields.get("负责人", [])
    assignee = ""
    if isinstance(assignee_field, list) and len(assignee_field) > 0:
        if isinstance(assignee_field[0], dict):
            assignee = assignee_field[0].get("name", "")
    
    return {
        "id": record.get("record_id", "")[:10],
        "title": title,
        "content": content or title,
        "priority": fields.get("优先级", ""),
        "status": fields.get("状态", ""),
        "assignee": assignee,
        "source": "feishu",
        "timestamp": record.get("created_time")
    }


def main():
    print("=" * 60)
    print("🚀 飞书多维表格数据获取")
    print("=" * 60)
    
    # 加载环境变量
    load_env()
    
    app_id = os.getenv("FEISHU_APP_ID")
    app_secret = os.getenv("FEISHU_APP_SECRET")
    
    if not app_id or not app_secret:
        print("\n❌ 错误: 缺少飞书应用凭证")
        print("   请设置环境变量 FEISHU_APP_ID 和 FEISHU_APP_SECRET")
        print("   或在 .env 文件中配置")
        return 1
    
    try:
        # 1. 获取 Access Token
        print("\n1️⃣ 获取 Access Token...")
        token = get_access_token(app_id, app_secret)
        print(f"   ✅ 成功")
        
        # 2. 获取 App Token
        print("\n2️⃣ 获取 Wiki 节点信息...")
        app_token = get_app_token(WIKI_TOKEN, token)
        print(f"   ✅ App Token: {app_token}")
        
        # 3. 获取表格记录
        print(f"\n3️⃣ 获取表格记录 (View: {VIEW_ID})...")
        records = get_records(app_token, TABLE_ID, token, VIEW_ID)
        print(f"   ✅ 获取到 {len(records)} 条记录")
        
        # 4. 解析记录
        print("\n4️⃣ 解析记录...")
        requirements = [parse_record(r) for r in records]
        valid_items = [r for r in requirements if r["title"] or r["content"]]
        print(f"   ✅ 有效需求: {len(valid_items)} 条")
        
        # 5. 保存结果
        output = {
            "source": "feishu",
            "url": f"https://dcnvul43dz0u.feishu.cn/wiki/{WIKI_TOKEN}?table={TABLE_ID}&view={VIEW_ID}",
            "date": "2026-03-23",
            "total": len(valid_items),
            "raw_total": len(records),
            "items": valid_items
        }
        
        output_path = Path("data/feishu_requirements_latest.json")
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        
        # 6. 显示结果
        print("\n" + "=" * 60)
        print("📋 有效需求列表")
        print("=" * 60)
        
        for i, item in enumerate(valid_items, 1):
            title = item["title"] or item["content"][:50]
            priority = item["priority"] or "-"
            status = item["status"] or "-"
            print(f"\n{i:2}. {title}")
            print(f"    优先级: {priority} | 状态: {status}")
        
        print("\n" + "=" * 60)
        print(f"✅ 完成！数据已保存到: {output_path}")
        print("=" * 60)
        
        return 0
        
    except Exception as e:
        print(f"\n❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
