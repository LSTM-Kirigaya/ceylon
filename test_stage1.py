#!/usr/bin/env python3
"""
环节1测试：群聊消息收集
测试从微信/QQ群聊收集消息的功能
"""

import argparse
import asyncio
import json
import sys
from datetime import datetime
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent / "src"))

from feedback_collector.collectors import WeChatCollector, QQCollector
from feedback_collector.config import Config, set_config
from feedback_collector.utils.logger import get_logger, setup_logging

logger = get_logger(__name__)
setup_logging()


def create_mock_messages(group_name: str, count: int = 10):
    """创建模拟消息数据用于测试"""
    messages = []
    base_time = datetime.now()
    
    test_contents = [
        "这个功能怎么用啊？",
        "发现了一个bug，点击保存会崩溃",
        "希望能添加导出功能",
        "程序运行好慢，能不能优化一下",
        "界面好看，但是操作不太方便",
        "闪退了，急需修复",
        "建议增加深色模式",
        "数据同步有问题",
        "想要批量导入功能",
        "搜索功能不太好用",
    ]
    
    for i in range(count):
        messages.append({
            "id": f"msg_{i}",
            "sender_id": f"user_{i % 5}",
            "sender_name": f"用户{chr(65 + i % 5)}",  # 用户A, 用户B...
            "content": test_contents[i % len(test_contents)],
            "timestamp": (base_time.replace(hour=9, minute=i*5)).isoformat(),
            "message_type": "text",
            "group_id": f"group_{group_name}",
            "group_name": group_name,
        })
    
    return messages


async def test_wechat_collector(config: Config, group_name: str = None):
    """测试微信收集器"""
    print("\n" + "="*60)
    print("测试微信收集器")
    print("="*60)
    
    collector = WeChatCollector()
    
    # 测试1: 连接
    print("\n[测试1] 连接数据库...")
    connected = await collector.connect()
    
    if not connected:
        print("❌ 连接失败（可能是配置问题或数据库不存在）")
        print("⚠️  将使用模拟数据进行测试")
        use_mock = True
    else:
        print("✅ 连接成功")
        use_mock = False
    
    # 测试2: 获取群聊列表
    print("\n[测试2] 获取群聊列表...")
    if not use_mock:
        groups = await collector.get_groups()
        print(f"✅ 获取到 {len(groups)} 个群聊")
        for i, g in enumerate(groups[:5], 1):
            print(f"   {i}. {g['name']} ({g['id'][:20]}...)")
    else:
        print("⚠️  使用模拟数据: 3个群聊")
        groups = [
            {"id": "test_group_1", "name": "产品反馈群"},
            {"id": "test_group_2", "name": "测试群"},
            {"id": "test_group_3", "name": "用户交流群"},
        ]
    
    # 测试3: 收集消息
    target_group = group_name or groups[0]["name"]
    print(f"\n[测试3] 从 '{target_group}' 收集消息...")
    
    if not use_mock:
        # 查找匹配的群聊
        target = None
        for g in groups:
            if g["name"] == target_group or g["id"] == target_group:
                target = g
                break
        
        if target:
            from datetime import timedelta
            end_time = datetime.now()
            start_time = end_time - timedelta(days=1)
            
            messages = await collector.collect_messages(
                target["id"],
                start_time,
                end_time
            )
            print(f"✅ 收集到 {len(messages)} 条消息")
        else:
            print(f"❌ 未找到群聊: {target_group}")
            messages = []
    else:
        messages = create_mock_messages(target_group, 10)
        print(f"✅ 使用模拟数据: {len(messages)} 条消息")
    
    # 显示消息示例
    if messages:
        print("\n[消息示例]")
        for msg in messages[:3]:
            content = msg.content if hasattr(msg, 'content') else msg.get('content', '')
            sender = msg.sender_name if hasattr(msg, 'sender_name') else msg.get('sender_name', '')
            print(f"   [{sender}] {content[:50]}...")
    
    # 断开连接
    if not use_mock:
        await collector.disconnect()
        print("\n✅ 已断开连接")
    
    # 保存结果
    output_file = f"test_output/stage1_messages_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    Path(output_file).parent.mkdir(parents=True, exist_ok=True)
    
    output_data = {
        "platform": "wechat",
        "group": target_group,
        "test_time": datetime.now().isoformat(),
        "message_count": len(messages),
        "messages": [
            {
                "id": m.id if hasattr(m, 'id') else m.get('id'),
                "sender": m.sender_name if hasattr(m, 'sender_name') else m.get('sender_name'),
                "content": m.content if hasattr(m, 'content') else m.get('content'),
                "timestamp": m.timestamp.isoformat() if hasattr(m, 'timestamp') else m.get('timestamp'),
            }
            for m in messages
        ]
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ 结果已保存: {output_file}")
    return output_data


async def test_qq_collector(config: Config, group_name: str = None):
    """测试QQ收集器"""
    print("\n" + "="*60)
    print("测试QQ收集器")
    print("="*60)
    
    collector = QQCollector()
    
    # 测试1: 连接
    print("\n[测试1] 连接数据库...")
    connected = await collector.connect()
    
    if not connected:
        print("❌ 连接失败（QQ功能未配置或数据库不存在）")
        return None
    
    print("✅ 连接成功")
    
    # 获取群聊列表
    groups = await collector.get_groups()
    print(f"✅ 获取到 {len(groups)} 个群聊")
    
    await collector.disconnect()
    return {"groups": groups}


def main():
    parser = argparse.ArgumentParser(description="测试环节1：群聊消息收集")
    parser.add_argument("--platform", "-p", choices=["wechat", "qq", "all"], default="wechat",
                        help="测试哪个平台")
    parser.add_argument("--group", "-g", help="指定群聊名称")
    parser.add_argument("--config", "-c", default="./config.yaml", help="配置文件路径")
    parser.add_argument("--mock", action="store_true", help="使用模拟数据（不连接真实数据库）")
    args = parser.parse_args()
    
    print("\n" + "="*60)
    print("环节1测试：群聊消息收集")
    print("="*60)
    
    # 加载配置
    config_path = Path(args.config)
    if config_path.exists():
        config = Config.from_yaml(str(config_path))
        set_config(config)
        print(f"✅ 已加载配置: {config_path}")
    else:
        print(f"⚠️  未找到配置文件，使用默认配置")
        config = Config()
        set_config(config)
    
    # 运行测试
    async def run_tests():
        results = {}
        
        if args.platform in ("wechat", "all"):
            result = await test_wechat_collector(config, args.group)
            results["wechat"] = result
        
        if args.platform in ("qq", "all"):
            result = await test_qq_collector(config, args.group)
            results["qq"] = result
        
        return results
    
    results = asyncio.run(run_tests())
    
    # 总结
    print("\n" + "="*60)
    print("测试总结")
    print("="*60)
    print(f"\n✅ 环节1测试完成")
    print(f"   测试平台: {args.platform}")
    print(f"   输出目录: test_output/")
    print("\n下一步: 运行环节2测试 -> python test_stage2.py")


if __name__ == "__main__":
    main()
