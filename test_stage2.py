#!/usr/bin/env python3
"""
环节2测试：AI分析处理
测试从消息中提取反馈、分类、去重的功能
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

from feedback_collector.analyzer import FeedbackAnalyzer
from feedback_collector.config import Config, set_config
from feedback_collector.models import ChatMessage, Feedback, MessageType
from feedback_collector.utils.logger import get_logger, setup_logging

logger = get_logger(__name__)
setup_logging()


def create_test_messages() -> List[ChatMessage]:
    """创建测试消息数据"""
    messages = []
    base_time = datetime.now().replace(hour=9, minute=0, second=0)
    
    test_data = [
        # (时间偏移分钟, 发送者, 内容, 类型)
        (0, "用户A", "这个软件怎么用啊？新手求助", "question"),
        (5, "用户B", "发现了一个bug，点击保存按钮程序就崩溃了", "bug"),
        (6, "用户B", "报错信息显示空指针异常", "bug"),
        (10, "用户C", "希望能添加导出功能，导出Excel格式", "feature"),
        (12, "用户C", "现在数据只能看不能导出，很不方便", "feature"),
        (15, "用户D", "程序启动好慢，要30秒以上", "performance"),
        (16, "用户D", "能不能优化一下启动速度", "performance"),
        (20, "用户E", "界面挺好看的，就是操作有点复杂", "ui"),
        (25, "用户F", "我也遇到保存崩溃的问题了，急需修复", "bug"),
        (26, "用户F", "重现步骤：1.打开文件 2.编辑 3.点击保存 4.崩溃", "bug"),
        (30, "用户G", "建议增加深色模式，夜间使用更方便", "feature"),
        (35, "用户H", "文档能再详细一些吗？有些功能不会用", "documentation"),
        (40, "用户I", "同样的崩溃问题，什么时候能修复啊？", "bug"),
        (45, "用户J", "想要一个批量导入的功能", "feature"),
    ]
    
    for i, (offset, sender, content, msg_type) in enumerate(test_data):
        msg_time = base_time.replace(minute=base_time.minute + offset)
        messages.append(ChatMessage(
            message_id=f"msg_{i}",
            sender_id=f"user_{sender[-1]}",
            sender_name=sender,
            content=content,
            message_type=MessageType.TEXT,
            timestamp=msg_time,
            group_id="test_group",
            group_name="测试群",
            platform="wechat",
        ))
    
    return messages


def load_messages_from_file(file_path: str) -> List[ChatMessage]:
    """从文件加载消息"""
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    messages = []
    for item in data.get("messages", []):
        messages.append(ChatMessage(
            message_id=item.get("id", ""),
            sender_id=item.get("sender_id", ""),
            sender_name=item.get("sender_name", ""),
            content=item.get("content", ""),
            message_type=MessageType(item.get("message_type", "text")),
            timestamp=datetime.fromisoformat(item.get("timestamp", datetime.now().isoformat())),
            group_id=item.get("group_id", ""),
            group_name=item.get("group_name", ""),
            platform=item.get("platform", "wechat"),
        ))
    
    return messages


async def test_extraction(messages: List[ChatMessage]):
    """测试反馈提取"""
    print("\n" + "="*60)
    print("环节2.1：测试反馈提取")
    print("="*60)
    
    from feedback_collector.analyzer.extractor import FeedbackExtractor
    
    extractor = FeedbackExtractor()
    print(f"\n输入: {len(messages)} 条消息")
    print("开始提取反馈...")
    
    # 注意：实际提取需要AI服务，这里使用模拟数据
    # 如果需要真实测试，请配置AI API密钥
    config = Config()
    if not config.ai.api_key:
        print("⚠️  未配置AI API，使用模拟提取结果")
        feedbacks = create_mock_feedbacks(messages)
    else:
        try:
            feedbacks = await extractor.extract_from_messages(messages)
            print(f"✅ 提取完成: {len(feedbacks)} 条反馈")
        except Exception as e:
            print(f"❌ 提取失败: {e}")
            print("⚠️  使用模拟数据继续测试")
            feedbacks = create_mock_feedbacks(messages)
    
    print(f"\n✅ 提取到 {len(feedbacks)} 条反馈")
    
    # 显示提取结果
    print("\n[提取结果]")
    for i, fb in enumerate(feedbacks[:5], 1):
        print(f"\n{i}. {fb.title}")
        print(f"   类型: {fb.feedback_type.value}")
        print(f"   描述: {fb.description[:80]}..." if len(fb.description) > 80 else f"   描述: {fb.description}")
        print(f"   报告者: {', '.join(fb.reported_by)}")
    
    return feedbacks


def create_mock_feedbacks(messages: List[ChatMessage]) -> List[Feedback]:
    """创建模拟反馈数据（用于无AI时的测试）"""
    feedbacks = []
    
    # 根据消息内容模拟提取
    bug_msgs = [m for m in messages if "崩溃" in m.content or "bug" in m.content.lower()]
    feature_msgs = [m for m in messages if "希望" in m.content or "想要" in m.content or "建议" in m.content]
    perf_msgs = [m for m in messages if "慢" in m.content or "性能" in m.content or "速度" in m.content]
    ui_msgs = [m for m in messages if "界面" in m.content or "操作" in m.content]
    doc_msgs = [m for m in messages if "文档" in m.content]
    
    # 创建反馈
    if bug_msgs:
        feedbacks.append(Feedback(
            title="保存按钮导致程序崩溃",
            description="多个用户反馈点击保存按钮后程序崩溃，报错信息显示空指针异常。重现步骤：1.打开文件 2.编辑 3.点击保存",
            feedback_type=__import__('feedback_collector.models', fromlist=['FeedbackType']).FeedbackType.BUG,
            priority="critical",
            source_messages=bug_msgs,
            reported_by=list(set(m.sender_name for m in bug_msgs)),
            keywords=["崩溃", "保存", "空指针"],
            confidence=0.95,
        ))
    
    if feature_msgs:
        feedbacks.append(Feedback(
            title="添加导出功能",
            description="用户希望能导出数据为Excel格式，目前数据只能查看不能导出，使用不方便",
            feedback_type=__import__('feedback_collector.models', fromlist=['FeedbackType']).FeedbackType.FEATURE,
            priority="high",
            source_messages=feature_msgs,
            reported_by=list(set(m.sender_name for m in feature_msgs)),
            keywords=["导出", "Excel"],
            confidence=0.90,
        ))
        
        feedbacks.append(Feedback(
            title="增加深色模式",
            description="建议增加深色模式，方便夜间使用",
            feedback_type=__import__('feedback_collector.models', fromlist=['FeedbackType']).FeedbackType.FEATURE,
            priority="medium",
            source_messages=[m for m in feature_msgs if "深色" in m.content],
            reported_by=list(set(m.sender_name for m in feature_msgs if "深色" in m.content)),
            keywords=["深色模式", "夜间"],
            confidence=0.85,
        ))
    
    if perf_msgs:
        feedbacks.append(Feedback(
            title="程序启动速度慢",
            description="用户反馈程序启动需要30秒以上，希望能优化启动速度",
            feedback_type=__import__('feedback_collector.models', fromlist=['FeedbackType']).FeedbackType.PERFORMANCE,
            priority="high",
            source_messages=perf_msgs,
            reported_by=list(set(m.sender_name for m in perf_msgs)),
            keywords=["启动", "速度", "性能"],
            confidence=0.88,
        ))
    
    if ui_msgs:
        feedbacks.append(Feedback(
            title="界面操作复杂",
            description="界面设计好看，但操作流程较为复杂，新手上手困难",
            feedback_type=__import__('feedback_collector.models', fromlist=['FeedbackType']).FeedbackType.UI,
            priority="medium",
            source_messages=ui_msgs,
            reported_by=list(set(m.sender_name for m in ui_msgs)),
            keywords=["界面", "操作", "新手"],
            confidence=0.82,
        ))
    
    if doc_msgs:
        feedbacks.append(Feedback(
            title="文档不够详细",
            description="用户反映文档说明不够详细，部分功能使用方法不清晰",
            feedback_type=__import__('feedback_collector.models', fromlist=['FeedbackType']).FeedbackType.DOCUMENTATION,
            priority="low",
            source_messages=doc_msgs,
            reported_by=list(set(m.sender_name for m in doc_msgs)),
            keywords=["文档", "说明"],
            confidence=0.80,
        ))
    
    return feedbacks


async def test_classification(feedbacks: List[Feedback]):
    """测试反馈分类"""
    print("\n" + "="*60)
    print("环节2.2：测试反馈分类")
    print("="*60)
    
    from feedback_collector.analyzer.classifier import FeedbackClassifier
    
    classifier = FeedbackClassifier()
    print(f"\n输入: {len(feedbacks)} 条反馈")
    
    # 分类
    classified = classifier.classify_batch(feedbacks)
    
    print(f"✅ 分类完成")
    
    # 统计分类结果
    from collections import Counter
    type_counts = Counter(fb.feedback_type.value for fb in classified)
    priority_counts = Counter(fb.priority for fb in classified)
    
    print("\n[分类统计]")
    print("按类型:")
    for fb_type, count in sorted(type_counts.items()):
        print(f"   {fb_type}: {count}")
    
    print("\n按优先级:")
    for priority, count in sorted(priority_counts.items(), reverse=True):
        print(f"   {priority}: {count}")
    
    # 显示分类详情
    print("\n[分类详情]")
    for fb in classified:
        labels = ', '.join(fb.suggested_labels) if fb.suggested_labels else '无'
        print(f"   {fb.title[:30]}... -> 类型:{fb.feedback_type.value}, 优先级:{fb.priority}, 标签:[{labels}]")
    
    return classified


async def test_deduplication(feedbacks: List[Feedback]):
    """测试反馈去重"""
    print("\n" + "="*60)
    print("环节2.3：测试反馈去重")
    print("="*60)
    
    from feedback_collector.analyzer.deduplicator import FeedbackDeduplicator
    
    # 先添加一些重复/相似的反馈
    print("\n添加测试用的重复反馈...")
    
    # 创建相似反馈
    if len(feedbacks) > 0:
        # 复制第一个反馈，稍作修改
        dup1 = feedbacks[0].model_copy()
        dup1.id = "dup_1"
        dup1.title = feedbacks[0].title + "（重复）"
        dup1.reported_by = ["新用户"]
        feedbacks.append(dup1)
        
        # 创建相似反馈
        dup2 = feedbacks[0].model_copy()
        dup2.id = "dup_2"
        dup2.title = feedbacks[0].title.replace("崩溃", "闪退")
        dup2.description = feedbacks[0].description.replace("崩溃", "闪退")
        dup2.reported_by = ["另一个用户"]
        feedbacks.append(dup2)
    
    print(f"输入: {len(feedbacks)} 条反馈（包含重复/相似）")
    
    deduplicator = FeedbackDeduplicator()
    deduplicated = await deduplicator.deduplicate(feedbacks)
    
    merged_count = len(feedbacks) - len(deduplicated)
    print(f"✅ 去重完成: {len(feedbacks)} -> {len(deduplicated)} 条")
    print(f"   合并/移除: {merged_count} 条")
    
    # 显示合并的反馈
    merged = [fb for fb in deduplicated if fb.is_merged]
    if merged:
        print(f"\n[合并的反馈]")
        for fb in merged:
            print(f"   {fb.title}")
            print(f"   合并了 {fb.merge_count} 条相似反馈")
            print(f"   报告者: {', '.join(fb.reported_by)}")
    
    return deduplicated


async def test_full_analysis(messages: List[ChatMessage]):
    """测试完整的分析流程"""
    print("\n" + "="*60)
    print("环节2.4：完整分析流程")
    print("="*60)
    
    analyzer = FeedbackAnalyzer()
    print(f"\n输入: {len(messages)} 条消息")
    print("开始完整分析...")
    
    # 模拟历史反馈（用于去重测试）
    history = []
    
    result = await analyzer.analyze(
        messages=messages,
        platform="wechat",
        group="测试群",
        history_feedbacks=history,
    )
    
    print(f"\n✅ 分析完成")
    print(f"   总消息: {result.total_messages}")
    print(f"   相关消息: {result.relevant_messages}")
    print(f"   提取反馈: {len(result.feedbacks)}")
    print(f"   重复反馈: {result.duplicates_found}")
    
    # 按类型统计
    print("\n[类型分布]")
    from feedback_collector.models import FeedbackType
    for fb_type in FeedbackType:
        count = len(result.get_feedbacks_by_type(fb_type))
        if count > 0:
            print(f"   {fb_type.value}: {count}")
    
    return result


def main():
    parser = argparse.ArgumentParser(description="测试环节2：AI分析处理")
    parser.add_argument("--input", "-i", help="输入消息文件（JSON格式）")
    parser.add_argument("--output", "-o", default="./test_output", help="输出目录")
    parser.add_argument("--skip-extraction", action="store_true", help="跳过提取测试")
    parser.add_argument("--skip-classification", action="store_true", help="跳过分类测试")
    parser.add_argument("--skip-deduplication", action="store_true", help="跳过去重测试")
    parser.add_argument("--skip-full", action="store_true", help="跳过完整流程测试")
    args = parser.parse_args()
    
    print("\n" + "="*60)
    print("环节2测试：AI分析处理")
    print("="*60)
    
    # 加载配置
    config = Config()
    set_config(config)
    
    # 准备测试数据
    if args.input:
        print(f"\n从文件加载消息: {args.input}")
        messages = load_messages_from_file(args.input)
    else:
        print("\n使用内置测试数据")
        messages = create_test_messages()
    
    print(f"✅ 准备了 {len(messages)} 条测试消息")
    
    # 显示消息示例
    print("\n[消息示例]")
    for msg in messages[:3]:
        print(f"   [{msg.sender_name}] {msg.content}")
    
    # 运行测试
    async def run_tests():
        results = {}
        
        # 测试2.1: 提取
        if not args.skip_extraction:
            feedbacks = await test_extraction(messages)
            results["feedbacks"] = feedbacks
        else:
            feedbacks = create_mock_feedbacks(messages)
            results["feedbacks"] = feedbacks
        
        # 测试2.2: 分类
        if not args.skip_classification:
            classified = await test_classification(feedbacks)
            results["classified"] = classified
        else:
            classified = feedbacks
        
        # 测试2.3: 去重
        if not args.skip_deduplication:
            deduplicated = await test_deduplication(classified)
            results["deduplicated"] = deduplicated
        else:
            deduplicated = classified
        
        # 测试2.4: 完整流程
        if not args.skip_full:
            full_result = await test_full_analysis(messages)
            results["full"] = full_result
        
        return results
    
    results = asyncio.run(run_tests())
    
    # 保存结果
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    if "deduplicated" in results:
        output_file = output_dir / f"stage2_feedbacks_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(
                [fb.model_dump() for fb in results["deduplicated"]],
                f,
                ensure_ascii=False,
                indent=2,
                default=str
            )
        print(f"\n✅ 结果已保存: {output_file}")
    
    # 总结
    print("\n" + "="*60)
    print("测试总结")
    print("="*60)
    print("\n✅ 环节2测试完成")
    print("   - 提取: 从消息中提取反馈")
    print("   - 分类: 按类型和优先级分类")
    print("   - 去重: 合并相似反馈")
    print("\n下一步:")
    print("   运行环节3测试 -> python test_stage3.py")
    print("   或使用真实数据: python test_stage2.py -i <消息文件>")


if __name__ == "__main__":
    main()
