#!/usr/bin/env python3
"""
从飞书多维表格获取需求数据

使用方法:
    export FEISHU_APP_ID="cli_xxx"
    export FEISHU_APP_SECRET="xxx"
    export FEISHU_APP_TOKEN="xxx"  # 可选，也可以从 URL 获取
    
    python scripts/fetch_feishu_requirements.py \
        --url "https://dcnvul43dz0u.feishu.cn/wiki/..." \
        --output data/requirements_from_feishu.json

或者直接传递凭证（仅用于测试，生产环境请使用环境变量）:
    python scripts/fetch_feishu_requirements.py \
        --app-id "cli_xxx" \
        --app-secret "xxx" \
        --app-token "xxx" \
        --url "https://dcnvul43dz0u.feishu.cn/wiki/..." \
        --output data/requirements_from_feishu.json
"""

import os
import sys
import json
import argparse
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.feishu.client import FeishuClient, FeishuCredentials, FeishuAPIError
from src.feishu.base_reader import FeishuRequirementsReader


def main():
    parser = argparse.ArgumentParser(
        description="从飞书多维表格获取需求数据",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
环境变量:
  FEISHU_APP_ID       飞书应用 ID
  FEISHU_APP_SECRET   飞书应用 Secret
  FEISHU_APP_TOKEN    多维表格 App Token

示例:
  # 使用环境变量
  export FEISHU_APP_ID="cli_xxx"
  export FEISHU_APP_SECRET="xxx"
  python scripts/fetch_feishu_requirements.py \\
      --url "https://dcnvul43dz0u.feishu.cn/wiki/..." \\
      --output data/feishu_req.json

  # 直接传递参数
  python scripts/fetch_feishu_requirements.py \\
      --app-id "cli_xxx" \\
      --app-secret "xxx" \\
      --app-token "xxx" \\
      --url "https://dcnvul43dz0u.feishu.cn/wiki/..." \\
      --output data/feishu_req.json
        """
    )
    
    parser.add_argument(
        "--url",
        required=True,
        help="飞书 Wiki 页面 URL"
    )
    parser.add_argument(
        "--output",
        "-o",
        required=True,
        help="输出文件路径"
    )
    parser.add_argument(
        "--app-id",
        default=os.getenv("FEISHU_APP_ID"),
        help="飞书应用 ID (默认从环境变量 FEISHU_APP_ID 读取)"
    )
    parser.add_argument(
        "--app-secret",
        default=os.getenv("FEISHU_APP_SECRET"),
        help="飞书应用 Secret (默认从环境变量 FEISHU_APP_SECRET 读取)"
    )
    parser.add_argument(
        "--app-token",
        default=os.getenv("FEISHU_APP_TOKEN"),
        help="多维表格 App Token (默认从环境变量 FEISHU_APP_TOKEN 读取)"
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        default=True,
        help="美化输出 JSON"
    )
    
    args = parser.parse_args()
    
    # 验证凭证
    if not args.app_id or not args.app_secret:
        print("❌ 错误: 需要提供飞书应用凭证")
        print("   方式 1: 设置环境变量 FEISHU_APP_ID 和 FEISHU_APP_SECRET")
        print("   方式 2: 使用 --app-id 和 --app-secret 参数")
        return 1
    
    try:
        # 创建客户端
        print("🔄 正在连接飞书 API...")
        credentials = FeishuCredentials(
            app_id=args.app_id,
            app_secret=args.app_secret
        )
        client = FeishuClient(credentials)
        reader = FeishuRequirementsReader(client)
        
        # 解析 URL
        url_info = client.parse_wiki_url(args.url)
        print(f"📋 解析 URL:")
        print(f"   Wiki Token: {url_info['wiki_token']}")
        print(f"   Table ID: {url_info['table_id']}")
        print(f"   View ID: {url_info['view_id'] or '默认视图'}")
        
        # 读取需求
        print("\n🔄 正在读取需求数据...")
        requirements = reader.read_requirements_from_url(
            wiki_url=args.url,
            app_token=args.app_token
        )
        
        print(f"✅ 成功读取 {len(requirements)} 条需求")
        
        # 构建输出格式（兼容 analyze-requirements 的输入格式）
        output_data = {
            "source": "feishu",
            "url": args.url,
            "total": len(requirements),
            "items": requirements
        }
        
        # 确保输出目录存在
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # 写入文件
        indent = 2 if args.pretty else None
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(output_data, f, ensure_ascii=False, indent=indent)
        
        print(f"\n📁 输出文件: {output_path.absolute()}")
        
        # 预览前几条
        if requirements:
            print("\n📄 数据预览（前3条）:")
            for i, req in enumerate(requirements[:3], 1):
                title = req.get("title", req.get("content", "")[:30])
                print(f"   {i}. {title}")
        
        return 0
        
    except FeishuAPIError as e:
        print(f"\n❌ 飞书 API 错误: {e}")
        return 1
    except Exception as e:
        print(f"\n❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
