"""反馈分析器主类

整合提取器、分类器和去重器，完成完整的分析流程
"""

from typing import List, Optional

from ..config import get_config
from ..models import AnalysisResult, ChatMessage, Feedback
from ..utils.logger import get_logger
from .classifier import FeedbackClassifier
from .deduplicator import FeedbackDeduplicator
from .extractor import FeedbackExtractor

logger = get_logger(__name__)


class FeedbackAnalyzer:
    """反馈分析器"""
    
    def __init__(self):
        self.config = get_config().analysis
        self.extractor = FeedbackExtractor()
        self.classifier = FeedbackClassifier()
        self.deduplicator = FeedbackDeduplicator()
    
    async def analyze(
        self,
        messages: List[ChatMessage],
        platform: str,
        group: str,
        history_feedbacks: Optional[List[Feedback]] = None,
    ) -> AnalysisResult:
        """
        分析群聊消息，提取反馈
        
        Args:
            messages: 群聊消息列表
            platform: 平台名称
            group: 群聊名称
            history_feedbacks: 历史反馈（用于去重）
        
        Returns:
            AnalysisResult: 分析结果
        """
        logger.info(f"开始分析 {platform}/{group} 的 {len(messages)} 条消息")
        
        # 统计相关消息数（非系统消息、有内容的消息）
        relevant_messages = [
            m for m in messages
            if m.content and m.message_type.value != "system"
        ]
        
        result = AnalysisResult(
            platform=platform,
            group=group,
            total_messages=len(messages),
            relevant_messages=len(relevant_messages),
        )
        
        if not relevant_messages:
            logger.info("没有相关消息需要分析")
            return result
        
        # 1. 提取反馈
        logger.info("步骤 1/3: 提取反馈...")
        feedbacks = await self.extractor.extract_from_messages(relevant_messages)
        logger.info(f"提取到 {len(feedbacks)} 条原始反馈")
        
        if not feedbacks:
            return result
        
        # 2. 分类反馈
        logger.info("步骤 2/3: 分类反馈...")
        feedbacks = self.classifier.classify_batch(feedbacks)
        
        # 3. 去重
        logger.info("步骤 3/3: 去重处理...")
        feedbacks = await self.deduplicator.deduplicate(feedbacks)
        
        # 4. 与历史数据去重
        if history_feedbacks:
            logger.info(f"与 {len(history_feedbacks)} 条历史反馈去重...")
            new_feedbacks = []
            duplicates_found = 0
            
            for fb in feedbacks:
                duplicate = await self.deduplicator.check_duplicate_with_history(
                    fb, history_feedbacks
                )
                if duplicate:
                    duplicates_found += 1
                    logger.debug(f"发现与历史反馈重复: {fb.title} -> {duplicate.title}")
                else:
                    new_feedbacks.append(fb)
            
            feedbacks = new_feedbacks
            result.duplicates_found = duplicates_found
            logger.info(f"与历史数据去重后: {len(feedbacks)} 条新反馈")
        
        result.feedbacks = feedbacks
        
        # 输出统计信息
        self._log_statistics(result)
        
        return result
    
    def _log_statistics(self, result: AnalysisResult) -> None:
        """输出统计信息"""
        if not result.feedbacks:
            logger.info("未发现新的反馈")
            return
        
        # 按类型统计
        type_stats = self.classifier.get_category_stats(result.feedbacks)
        # 按优先级统计
        priority_stats = self.classifier.get_priority_stats(result.feedbacks)
        
        logger.info("=" * 50)
        logger.info("分析结果统计:")
        logger.info(f"  总消息数: {result.total_messages}")
        logger.info(f"  相关消息数: {result.relevant_messages}")
        logger.info(f"  发现反馈: {len(result.feedbacks)} 条")
        logger.info(f"  重复反馈: {result.duplicates_found} 条")
        logger.info("-" * 50)
        logger.info("按类型分布:")
        for fb_type, count in sorted(type_stats.items()):
            logger.info(f"  - {fb_type}: {count}")
        logger.info("-" * 50)
        logger.info("按优先级分布:")
        for priority, count in sorted(priority_stats.items()):
            logger.info(f"  - {priority}: {count}")
        logger.info("=" * 50)
    
    async def analyze_single(
        self,
        message: ChatMessage,
    ) -> Optional[Feedback]:
        """
        分析单条消息（用于实时分析场景）
        
        Args:
            message: 单条消息
        
        Returns:
            Optional[Feedback]: 如果是反馈则返回，否则返回 None
        """
        if not message.content:
            return None
        
        feedbacks = await self.extractor.extract_from_messages([message])
        
        if feedbacks:
            feedback = self.classifier.classify(feedbacks[0])
            return feedback
        
        return None
