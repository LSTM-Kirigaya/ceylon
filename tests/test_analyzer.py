"""分析器模块测试"""

import pytest
from datetime import datetime

from feedback_collector.analyzer.classifier import FeedbackClassifier
from feedback_collector.analyzer.deduplicator import FeedbackDeduplicator
from feedback_collector.models import Feedback, FeedbackType, ChatMessage


class TestFeedbackClassifier:
    """测试反馈分类器"""
    
    def test_classify_bug(self):
        """测试 Bug 分类"""
        fb = Feedback(
            title="程序崩溃了",
            description="点击按钮后程序崩溃，报错信息如下...",
            feedback_type=FeedbackType.OTHER,
        )
        
        classifier = FeedbackClassifier()
        result = classifier.classify(fb)
        
        assert "bug" in result.suggested_labels
        assert result.feedback_type in (FeedbackType.BUG, FeedbackType.OTHER)
    
    def test_classify_feature(self):
        """测试功能需求分类"""
        fb = Feedback(
            title="希望能添加导出功能",
            description="建议增加一键导出数据的功能",
            feedback_type=FeedbackType.OTHER,
        )
        
        classifier = FeedbackClassifier()
        result = classifier.classify(fb)
        
        assert "feature" in result.suggested_labels or "enhancement" in result.suggested_labels
    
    def test_classify_performance(self):
        """测试性能问题分类"""
        fb = Feedback(
            title="程序运行很慢",
            description="启动需要很长时间，操作卡顿",
            feedback_type=FeedbackType.OTHER,
        )
        
        classifier = FeedbackClassifier()
        result = classifier.classify(fb)
        
        assert "performance" in result.suggested_labels


class TestFeedbackDeduplicator:
    """测试反馈去重器"""
    
    @pytest.mark.asyncio
    async def test_hash_deduplicate(self):
        """测试哈希去重"""
        fb1 = Feedback(title="相同反馈", description="描述内容")
        fb2 = Feedback(title="相同反馈", description="描述内容")  # 完全相同
        fb3 = Feedback(title="不同反馈", description="其他内容")
        
        dedup = FeedbackDeduplicator()
        result = await dedup.deduplicate([fb1, fb2, fb3])
        
        assert len(result) == 2
    
    @pytest.mark.asyncio
    async def test_similarity_deduplicate(self):
        """测试相似度去重"""
        fb1 = Feedback(
            title="程序崩溃了",
            description="点击保存按钮后程序崩溃",
            feedback_type=FeedbackType.BUG,
        )
        fb2 = Feedback(
            title="程序崩溃问题",
            description="保存时程序会崩溃",
            feedback_type=FeedbackType.BUG,
        )
        fb3 = Feedback(
            title="希望能添加新功能",
            description="建议增加导出功能",
            feedback_type=FeedbackType.FEATURE,
        )
        
        dedup = FeedbackDeduplicator()
        result = await dedup.deduplicate([fb1, fb2, fb3])
        
        # fb1 和 fb2 应该被合并
        assert len(result) <= 2
