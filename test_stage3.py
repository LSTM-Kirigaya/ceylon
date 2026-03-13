#!/usr/bin/env python3
"""
环节3测试：数据导出
测试将反馈导出到本地文件、飞书、Notion的功能
"""

import argparse
import asyncio
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import List

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent / "src"))

from feedback_collector.config import Config, set_config
from feedback_collector.exporters import LocalExporter
from feedback_collector.models import AnalysisResult, Feedback, FeedbackType
from feedback_collector.utils.logger import get_logger, setup_logging

logger = get_logger(__name__)
setup_logging()


def create_test_feedbacks() -> List[Feedback]:
    """创建测试反馈数据"""
    base_time = datetime.now()
    
    return [
        Feedback(
            title="保存按钮导致程序崩溃",
            description="多个用户反馈点击保存按钮后程序崩溃，报错信息显示空指针异常。重现步骤：1.打开文件 2.编辑 3.点击保存",
            feedback_type=FeedbackType.BUG,
            priority="critical",
            status=__import__('feedback_collector.models', fromlist=['FeedbackStatus']).FeedbackStatus.NEW,
            keywords=["崩溃", "保存", "空指针"],
            suggested_labels=["bug", "critical"],
            reported_by=["用户B", "用户F", "用户I"],
            source_platform="wechat",
            source_group="产品反馈群",
            confidence=0.95,
            created_at=base_time,
            updated_at=base_time,
        ),
        Feedback(
            title="添加导出功能",
            description="用户希望能导出数据为Excel格式，目前数据只能查看不能导出，使用不方便",
            feedback_type=FeedbackType.FEATURE,
            priority="high",
            keywords=["导出", "Excel"],
            suggested_labels=["feature", "export"],
            reported_by=["用户C"],
            source_platform="wechat",
            source_group="产品反馈群",
            confidence=0.90,
            created_at=base_time,
        ),
        Feedback(
            title="程序启动速度慢",
            description="用户反馈程序启动需要30秒以上，希望能优化启动速度",
            feedback_type=FeedbackType.PERFORMANCE,
            priority="high",
            keywords=["启动", "速度", "性能"],
            suggested_labels=["performance", "optimization"],
            reported_by=["用户D"],
            source_platform="wechat",
            source_group="产品反馈群",
            confidence=0.88,
            created_at=base_time,
        ),
        Feedback(
            title="增加深色模式",
            description="建议增加深色模式，方便夜间使用",
            feedback_type=FeedbackType.FEATURE,
            priority="medium",
            keywords=["深色模式", "夜间"],
            suggested_labels=["feature", "ui", "theme"],
            reported_by=["用户G"],
            source_platform="wechat",
            source_group="产品反馈群",
            confidence=0.85,
            created_at=base_time,
        ),
        Feedback(
            title="界面操作复杂",
            description="界面设计好看，但操作流程较为复杂，新手上手困难",
            feedback_type=FeedbackType.UI,
            priority="medium",
            keywords=["界面", "操作", "新手"],
            suggested_labels=["ui", "ux", "usability"],
            reported_by=["用户E"],
            source_platform="wechat",
            source_group="产品反馈群",
            confidence=0.82,
            created_at=base_time,
        ),
        Feedback(
            title="文档不够详细",
            description="用户反映文档说明不够详细，部分功能使用方法不清晰",
            feedback_type=FeedbackType.DOCUMENTATION,
            priority="low",
            keywords=["文档", "说明"],
            suggested_labels=["documentation"],
            reported_by=["用户H"],
            source_platform="wechat",
            source_group="产品反馈群",
            confidence=0.80,
            created_at=base_time,
        ),
    ]


def create_analysis_result(feedbacks: List[Feedback]) -> AnalysisResult:
    """创建分析结果"""
    return AnalysisResult(
        date=datetime.now(),
        platform="wechat",
        group="产品反馈群",
        total_messages=100,
        relevant_messages=50,
        feedbacks=feedbacks,
        duplicates_found=2,
    )


async def test_local_exporter(result: AnalysisResult):
    """测试本地导出"""
    print("\n" + "="*60)
    print("环节3.1：测试本地文件导出")
    print("="*60)
    
    exporter = LocalExporter()
    
    print(f"\n输入: {len(result.feedbacks)} 条反馈")
    print(f"输出格式: Markdown, JSON, CSV")
    print(f"输出目录: {exporter.output_dir}")
    
    try:
        success = await exporter.export(result)
        if success:
            print("✅ 本地导出成功")
            
            # 查找生成的文件
            output_dir = exporter.output_dir
            if exporter.group_by_date:
                today = datetime.now().strftime("%Y-%m-%d")
                output_dir = output_dir / today
            
            if output_dir.exists():
                files = list(output_dir.glob("*"))
                print(f"\n生成的文件:")
                for f in files:
                    size = f.stat().st_size
                    print(f"   {f.name} ({size} bytes)")
                    
                    # 显示 Markdown 内容预览
                    if f.suffix == '.md':
                        with open(f, 'r', encoding='utf-8') as file:
                            content = file.read()
                            print(f"\n   Markdown 预览:")
                            preview = '\n   '.join(content.split('\n')[:15])
                            print(f"   {preview}")
                            print(f"   ...")
        else:
            print("❌ 本地导出失败")
    except Exception as e:
        print(f"❌ 导出错误: {e}")


async def test_local_exporter_direct(feedbacks: List[Feedback]):
    """测试直接导出反馈列表"""
    print("\n" + "="*60)
    print("环节3.2：测试直接导出反馈列表")
    print("="*60)
    
    exporter = LocalExporter()
    
    output_path = "./test_output/stage3_direct"
    print(f"\n导出 {len(feedbacks)} 条反馈到 {output_path}")
    
    try:
        success = await exporter.export_feedbacks(feedbacks, output_dir=output_path)
        if success:
            print("✅ 直接导出成功")
            
            # 列出文件
            output_dir = Path(output_path)
            if output_dir.exists():
                files = list(output_dir.glob("*"))
                for f in files:
                    print(f"   {f.name}")
        else:
            print("❌ 直接导出失败")
    except Exception as e:
        print(f"❌ 导出错误: {e}")


async def test_duplicate_check(feedbacks: List[Feedback]):
    """测试重复检查"""
    print("\n" + "="*60)
    print("环节3.3：测试重复检查")
    print("="*60)
    
    exporter = LocalExporter()
    
    print("\n测试反馈是否存在...")
    
    # 测试已存在的反馈
    if feedbacks:
        test_fb = feedbacks[0]
        print(f"\n检查反馈: '{test_fb.title}'")
        
        existing = await exporter.check_existing(test_fb)
        if existing:
            print(f"✅ 发现重复: ID={existing}")
        else:
            print("ℹ️  未找到重复（这是新反馈）")


async def test_feishu_exporter(feedbacks: List[Feedback]):
    """测试飞书导出（需要配置）"""
    print("\n" + "="*60)
    print("环节3.4：测试飞书导出")
    print("="*60)
    
    try:
        from feedback_collector.exporters import FeishuExporter
        
        exporter = FeishuExporter()
        
        if not exporter.enabled:
            print("⚠️  飞书导出未启用（请在config.yaml中配置）")
            return
        
        print(f"\n准备导出 {len(feedbacks)} 条反馈到飞书")
        print(f"表格ID: {exporter.table_id}")
        
        # 只导出前2条用于测试
        test_feedbacks = feedbacks[:2]
        success = await exporter.export_feedbacks(test_feedbacks)
        
        if success:
            print("✅ 飞书导出成功")
        else:
            print("❌ 飞书导出失败")
            
    except ImportError:
        print("⚠️  飞书导出依赖未安装")
        print("   运行: pip install lark-oapi")
    except Exception as e:
        print(f"❌ 飞书导出错误: {e}")


async def test_notion_exporter(feedbacks: List[Feedback]):
    """测试Notion导出（需要配置）"""
    print("\n" + "="*60)
    print("环节3.5：测试Notion导出")
    print("="*60)
    
    try:
        from feedback_collector.exporters import NotionExporter
        
        exporter = NotionExporter()
        
        if not exporter.enabled:
            print("⚠️  Notion导出未启用（请在config.yaml中配置）")
            return
        
        print(f"\n准备导出 {len(feedbacks)} 条反馈到Notion")
        print(f"数据库ID: {exporter.database_id}")
        
        # 只导出前2条用于测试
        test_feedbacks = feedbacks[:2]
        success = await exporter.export_feedbacks(test_feedbacks)
        
        if success:
            print("✅ Notion导出成功")
        else:
            print("❌ Notion导出失败")
            
    except ImportError:
        print("⚠️  Notion导出依赖未安装")
        print("   运行: pip install notion-client")
    except Exception as e:
        print(f"❌ Notion导出错误: {e}")


def load_feedbacks_from_file(file_path: str) -> List[Feedback]:
    """从文件加载反馈"""
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 支持多种格式
    if isinstance(data, dict):
        if "feedbacks" in data:
            items = data["feedbacks"]
        elif "messages" in data:
            # 从AnalysisResult格式
            items = data.get("feedbacks", [])
        else:
            items = [data]
    elif isinstance(data, list):
        items = data
    else:
        items = []
    
    feedbacks = []
    for item in items:
        try:
            fb = Feedback.model_validate(item)
            feedbacks.append(fb)
        except Exception as e:
            print(f"警告: 跳过无效反馈数据: {e}")
    
    return feedbacks


def main():
    parser = argparse.ArgumentParser(description="测试环节3：数据导出")
    parser.add_argument("--input", "-i", help="输入反馈文件（JSON格式）")
    parser.add_argument("--output", "-o", default="./test_output", help="输出目录")
    parser.add_argument("--skip-local", action="store_true", help="跳过本地导出测试")
    parser.add_argument("--skip-feishu", action="store_true", help="跳过飞书导出测试")
    parser.add_argument("--skip-notion", action="store_true", help="跳过Notion导出测试")
    args = parser.parse_args()
    
    print("\n" + "="*60)
    print("环节3测试：数据导出")
    print("="*60)
    
    # 加载配置
    config = Config()
    set_config(config)
    
    # 准备测试数据
    if args.input:
        print(f"\n从文件加载反馈: {args.input}")
        feedbacks = load_feedbacks_from_file(args.input)
    else:
        print("\n使用内置测试数据")
        feedbacks = create_test_feedbacks()
    
    print(f"✅ 准备了 {len(feedbacks)} 条测试反馈")
    
    # 显示反馈摘要
    print("\n[反馈摘要]")
    from collections import Counter
    type_counts = Counter(fb.feedback_type.value for fb in feedbacks)
    for fb_type, count in sorted(type_counts.items()):
        print(f"   {fb_type}: {count}")
    
    # 创建分析结果
    result = create_analysis_result(feedbacks)
    
    # 运行测试
    async def run_tests():
        if not args.skip_local:
            await test_local_exporter(result)
            await test_local_exporter_direct(feedbacks)
            await test_duplicate_check(feedbacks)
        
        if not args.skip_feishu:
            await test_feishu_exporter(feedbacks)
        
        if not args.skip_notion:
            await test_notion_exporter(feedbacks)
    
    asyncio.run(run_tests())
    
    # 总结
    print("\n" + "="*60)
    print("测试总结")
    print("="*60)
    print("\n✅ 环节3测试完成")
    print("   - 本地导出: Markdown/JSON/CSV")
    print("   - 重复检查: 防止重复添加")
    if not args.skip_feishu:
        print("   - 飞书导出: 多维表格（需配置）")
    if not args.skip_notion:
        print("   - Notion导出: 数据库（需配置）")
    
    print("\n输出文件位置:")
    print(f"   {Path(args.output).absolute()}/")
    
    print("\n完整流程测试:")
    print("   1. 运行环节1 -> python test_stage1.py")
    print("   2. 运行环节2 -> python test_stage2.py -i <环节1输出>")
    print("   3. 运行环节3 -> python test_stage3.py -i <环节2输出>")


if __name__ == "__main__":
    main()
