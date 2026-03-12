"""数据模型定义"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


class MessageType(str, Enum):
    """消息类型"""
    TEXT = "text"
    IMAGE = "image"
    VOICE = "voice"
    VIDEO = "video"
    FILE = "file"
    LINK = "link"
    SYSTEM = "system"
    OTHER = "other"


class ChatMessage(BaseModel):
    """聊天消息模型"""
    id: str = Field(default_factory=lambda: str(uuid4()))
    message_id: str = ""  # 原始消息ID
    sender_id: str = ""  # 发送者ID
    sender_name: str = ""  # 发送者昵称
    content: str = ""  # 消息内容
    message_type: MessageType = MessageType.TEXT
    timestamp: datetime = Field(default_factory=datetime.now)
    group_id: Optional[str] = None  # 群聊ID
    group_name: Optional[str] = None  # 群聊名称
    platform: str = ""  # 平台 (wechat, qq)
    raw_data: Dict[str, Any] = Field(default_factory=dict)  # 原始数据
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class FeedbackType(str, Enum):
    """反馈类型"""
    BUG = "bug"
    FEATURE = "feature"
    ENHANCEMENT = "enhancement"
    DOCUMENTATION = "documentation"
    PERFORMANCE = "performance"
    UI = "ui"
    QUESTION = "question"
    OTHER = "other"


class FeedbackStatus(str, Enum):
    """反馈状态"""
    NEW = "new"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    DUPLICATE = "duplicate"
    WONT_FIX = "wont_fix"


class Feedback(BaseModel):
    """反馈条目模型"""
    id: str = Field(default_factory=lambda: str(uuid4()))
    title: str = ""  # 标题
    description: str = ""  # 详细描述
    feedback_type: FeedbackType = FeedbackType.OTHER
    category: str = ""  # 分类标签
    status: FeedbackStatus = FeedbackStatus.NEW
    priority: str = "medium"  # 优先级: low, medium, high, critical
    
    # 来源信息
    source_messages: List[ChatMessage] = Field(default_factory=list)
    source_platform: str = ""  # 来源平台
    source_group: str = ""  # 来源群聊
    reported_by: List[str] = Field(default_factory=list)  # 报告者列表
    reported_at: datetime = Field(default_factory=datetime.now)
    
    # AI 分析结果
    confidence: float = 0.0  # 置信度
    keywords: List[str] = Field(default_factory=list)
    suggested_labels: List[str] = Field(default_factory=list)
    
    # 合并信息
    is_merged: bool = False
    merged_from: List[str] = Field(default_factory=list)  # 合并的反馈ID
    merge_count: int = 1  # 合并次数
    
    # 元数据
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class AnalysisResult(BaseModel):
    """分析结果模型"""
    date: datetime = Field(default_factory=datetime.now)
    platform: str = ""
    group: str = ""
    total_messages: int = 0
    relevant_messages: int = 0
    feedbacks: List[Feedback] = Field(default_factory=list)
    duplicates_found: int = 0
    
    def get_feedbacks_by_type(self, feedback_type: FeedbackType) -> List[Feedback]:
        """按类型获取反馈"""
        return [f for f in self.feedbacks if f.feedback_type == feedback_type]
    
    def get_feedbacks_by_priority(self, priority: str) -> List[Feedback]:
        """按优先级获取反馈"""
        return [f for f in self.feedbacks if f.priority == priority]
    
    def get_high_priority_feedbacks(self) -> List[Feedback]:
        """获取高优先级反馈"""
        return [f for f in self.feedbacks if f.priority in ("high", "critical")]


class CollectorStats(BaseModel):
    """收集器统计"""
    platform: str = ""
    group: str = ""
    start_time: datetime = Field(default_factory=datetime.now)
    end_time: Optional[datetime] = None
    messages_collected: int = 0
    errors: List[str] = Field(default_factory=list)
    
    @property
    def duration_seconds(self) -> float:
        """收集耗时（秒）"""
        end = self.end_time or datetime.now()
        return (end - self.start_time).total_seconds()
