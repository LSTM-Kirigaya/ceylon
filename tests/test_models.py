"""数据模型测试"""

from datetime import datetime

from feedback_collector.models import (
    ChatMessage,
    Feedback,
    FeedbackType,
    MessageType,
    AnalysisResult,
)


class TestChatMessage:
    """测试聊天消息模型"""
    
    def test_create_message(self):
        """测试创建消息"""
        msg = ChatMessage(
            message_id="123",
            sender_id="wxid_xxx",
            sender_name="测试用户",
            content="这是一条测试消息",
            message_type=MessageType.TEXT,
            timestamp=datetime.now(),
            group_id="group_xxx",
            group_name="测试群",
            platform="wechat",
        )
        
        assert msg.message_id == "123"
        assert msg.sender_name == "测试用户"
        assert msg.content == "这是一条测试消息"
    
    def test_message_serialization(self):
        """测试消息序列化"""
        msg = ChatMessage(
            message_id="123",
            sender_name="用户",
            content="内容",
            platform="wechat",
        )
        
        data = msg.model_dump()
        assert data["message_id"] == "123"
        assert data["sender_name"] == "用户"


class TestFeedback:
    """测试反馈模型"""
    
    def test_create_feedback(self):
        """测试创建反馈"""
        fb = Feedback(
            title="测试反馈",
            description="这是一个测试反馈",
            feedback_type=FeedbackType.BUG,
            priority="high",
        )
        
        assert fb.title == "测试反馈"
        assert fb.feedback_type == FeedbackType.BUG
        assert fb.priority == "high"
        assert fb.status.value == "new"
    
    def test_feedback_merge(self):
        """测试反馈合并"""
        fb1 = Feedback(
            id="1",
            title="反馈1",
            description="描述1",
            reported_by=["用户A"],
        )
        fb2 = Feedback(
            id="2",
            title="反馈2",
            description="描述2",
            reported_by=["用户B"],
        )
        
        # 模拟合并后的反馈
        fb1.reported_by.extend(fb2.reported_by)
        fb1.is_merged = True
        fb1.merge_count = 2
        
        assert len(fb1.reported_by) == 2
        assert fb1.is_merged
        assert fb1.merge_count == 2


class TestAnalysisResult:
    """测试分析结果模型"""
    
    def test_get_feedbacks_by_type(self):
        """测试按类型获取反馈"""
        result = AnalysisResult(
            feedbacks=[
                Feedback(title="Bug1", feedback_type=FeedbackType.BUG),
                Feedback(title="Bug2", feedback_type=FeedbackType.BUG),
                Feedback(title="Feature1", feedback_type=FeedbackType.FEATURE),
            ]
        )
        
        bugs = result.get_feedbacks_by_type(FeedbackType.BUG)
        features = result.get_feedbacks_by_type(FeedbackType.FEATURE)
        
        assert len(bugs) == 2
        assert len(features) == 1
    
    def test_get_high_priority_feedbacks(self):
        """测试获取高优先级反馈"""
        result = AnalysisResult(
            feedbacks=[
                Feedback(title="Critical", priority="critical"),
                Feedback(title="High", priority="high"),
                Feedback(title="Low", priority="low"),
            ]
        )
        
        high_priority = result.get_high_priority_feedbacks()
        
        assert len(high_priority) == 2
