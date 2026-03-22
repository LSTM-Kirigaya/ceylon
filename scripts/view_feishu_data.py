#!/usr/bin/env python3
"""
查看飞书多维表格数据（只读）

用法:
    export FEISHU_APP_ID="cli_a93ed391e6389bca"
    export FEISHU_APP_SECRET="yl74mGIj8YD80vFMPn7qjdE04ub6I1uq"
    export FEISHU_APP_TOKEN="从表格设置获取"
    
    python scripts/view_feishu_data.py \
        --app-token "BasilXXX" \
        --table-id "tbleySTh2QXbwRqu"
"""

import os
import sys
import json
import argparse
from pathlib import Path

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

import requests
from urllib.parse import urlparse, parse_qs


class FeishuViewer:
    """飞书多维表格只读查看器"""
    
    BASE_URL = "https://open.feishu.cn/open-apis"
    
    def __init__(self, app_id: str, app_secret: str):
        self.app_id = app_id
        self.app_secret = app_secret
        self._token = None
    
    def get_token(self) -> str:
        """获取 access token"""
        if self._token:
            return self._token
            
        url = f"{self.BASE_URL}/auth/v3/tenant_access_token/internal"
        headers = {"Content-Type": "application/json"}
        data = {
            "app_id": self.app_id,
            "app_secret": self.app_secret
        }
        
        resp = requests.post(url, headers=headers, json=data, timeout=10)
        result = resp.json()
        
        if result.get("code") != 0:
            raise Exception(f"获取 token 失败: {result}")
        
        self._token = result["tenant_access_token"]
        return self._token
    
    def get_tables(self, app_token: str) -> list:
        """获取多维表格中的所有数据表"""
        url = f"{self.BASE_URL}/bitable/v1/apps/{app_token}/tables"
        headers = {"Authorization": f"Bearer {self.get_token()}"}
        
        resp = requests.get(url, headers=headers, timeout=10)
        result = resp.json()
        
        if result.get("code") != 0:
            raise Exception(f"获取数据表失败: {result}")
        
        return result.get("data", {}).get("items", [])
    
    def get_table_views(self, app_token: str, table_id: str) -> list:
        """获取数据表的所有视图"""
        url = f"{self.BASE_URL}/bitable/v1/apps/{app_token}/tables/{table_id}/views"
        headers = {"Authorization": f"Bearer {self.get_token()}"}
        
        resp = requests.get(url, headers=headers, timeout=10)
        result = resp.json()
        
        if result.get("code") != 0:
            raise Exception(f"获取视图失败: {result}")
        
        return result.get("data", {}).get("items", [])
    
    def get_records(self, app_token: str, table_id: str, view_id: str = None, max_records: int = 500) -> list:
        """获取数据表记录"""
        url = f"{self.BASE_URL}/bitable/v1/apps/{app_token}/tables/{table_id}/records/search"
        headers = {
            "Authorization": f"Bearer {self.get_token()}",
            "Content-Type": "application/json"
        }
        
        payload = {"page_size": min(max_records, 500)}
        if view_id:
            payload["view_id"] = view_id
        
        all_records = []
        page_token = None
        
        while True:
            if page_token:
                payload["page_token"] = page_token
            
            resp = requests.post(url, headers=headers, json=payload, timeout=30)
            result = resp.json()
            
            if result.get("code") != 0:
                raise Exception(f"获取记录失败: {result}")
            
            data = result.get("data", {})
            items = data.get("items", [])
            all_records.extend(items)
            
            # 检查是否有更多页
            has_more = data.get("has_more", False)
            page_token = data.get("page_token")
            
            if not has_more or not page_token or len(all_records) >= max_records:
                break
        
        return all_records[:max_records]
    
    def parse_url(self, wiki_url: str) -> dict:
        """解析 Wiki URL"""
        parsed = urlparse(wiki_url)
        path_parts = parsed.path.strip("/").split("/")
        
        wiki_token = path_parts[-1] if len(path_parts) > 0 else ""
        query_params = parse_qs(parsed.query)
        
        return {
            "wiki_token": wiki_token,
            "table_id": query_params.get("table", [""])[0],
            "view_id": query_params.get("view", [""])[0]
        }


def print_records(records: list, max_display: int = 20):
    """格式化打印记录"""
    if not records:
        print("  暂无数据")
        return
    
    print(f"\n  共 {len(records)} 条记录，显示前 {min(len(records), max_display)} 条:\n")
    
    for i, record in enumerate(records[:max_display], 1):
        fields = record.get("fields", {})
        record_id = record.get("record_id", "")[:8]
        
        print(f"  [{i}] Record: ...{record_id}")
        
        # 打印字段内容
        for key, value in fields.items():
            # 简化显示
            if isinstance(value, list):
                if len(value) > 0 and isinstance(value[0], dict):
                    # 人员/关联字段
                    display_val = ", ".join(v.get("name", v.get("text", str(v))) for v in value[:3])
                else:
                    display_val = ", ".join(str(v) for v in value[:3])
                if len(value) > 3:
                    display_val += f" ...等{len(value)}项"
            elif isinstance(value, dict):
                display_val = value.get("text", value.get("link", str(value)))
            else:
                display_val = str(value)
                if len(display_val) > 100:
                    display_val = display_val[:100] + "..."
            
            print(f"      {key}: {display_val}")
        print()


def main():
    parser = argparse.ArgumentParser(description="查看飞书多维表格数据（只读）")
    parser.add_argument("--app-id", default=os.getenv("FEISHU_APP_ID"), help="App ID")
    parser.add_argument("--app-secret", default=os.getenv("FEISHU_APP_SECRET"), help="App Secret")
    parser.add_argument("--app-token", default=os.getenv("FEISHU_APP_TOKEN"), help="多维表格 App Token")
    parser.add_argument("--table-id", help="数据表 ID（从 URL 获取）")
    parser.add_argument("--view-id", help="视图 ID（可选）")
    parser.add_argument("--url", help="Wiki 页面 URL（可选，用于解析参数）")
    parser.add_argument("--max-records", type=int, default=50, help="最多显示多少条记录")
    
    args = parser.parse_args()
    
    # 验证凭证
    if not args.app_id or not args.app_secret:
        print("❌ 请提供 App ID 和 App Secret")
        print("   方式1: 设置环境变量 FEISHU_APP_ID 和 FEISHU_APP_SECRET")
        print("   方式2: 使用 --app-id 和 --app-secret 参数")
        return 1
    
    # 解析 URL
    url_info = {}
    if args.url:
        viewer = FeishuViewer(args.app_id, args.app_secret)
        url_info = viewer.parse_url(args.url)
        print(f"📋 解析 URL:")
        print(f"   Wiki Token: {url_info.get('wiki_token')}")
        print(f"   Table ID: {url_info.get('table_id')}")
        print(f"   View ID: {url_info.get('view_id')}")
        print()
    
    # 使用命令行参数或 URL 解析的参数
    table_id = args.table_id or url_info.get("table_id")
    view_id = args.view_id or url_info.get("view_id")
    
    if not args.app_token:
        print("❌ 需要提供 App Token")
        print("   获取方式：打开多维表格 → 右上角 '...' → 设置 → 复制 App Token")
        return 1
    
    try:
        # 创建查看器
        viewer = FeishuViewer(args.app_id, args.app_secret)
        
        print("🔄 正在连接飞书 API...")
        token = viewer.get_token()
        print("✅ 连接成功\n")
        
        # 获取所有数据表
        print("📊 获取数据表列表...")
        tables = viewer.get_tables(args.app_token)
        print(f"   找到 {len(tables)} 个数据表:\n")
        
        for t in tables:
            print(f"   - {t['name']}")
            print(f"     ID: {t['table_id']}")
            
            # 如果是目标表或没有指定表ID，显示详情
            if not table_id or t['table_id'] == table_id:
                # 获取视图
                views = viewer.get_table_views(args.app_token, t['table_id'])
                if views:
                    print(f"     视图: {', '.join(v['view_name'] for v in views)}")
                
                # 获取记录
                target_view = view_id if t['table_id'] == table_id else None
                print(f"\n   📋 读取记录...")
                records = viewer.get_records(args.app_token, t['table_id'], target_view, args.max_records)
                print_records(records, args.max_records)
                
                # 如果只查看指定表，到此为止
                if table_id and t['table_id'] == table_id:
                    break
            print()
        
        print("✅ 查看完成")
        return 0
        
    except Exception as e:
        print(f"\n❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
