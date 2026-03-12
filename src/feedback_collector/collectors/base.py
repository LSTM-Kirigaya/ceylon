"""收集器基类"""

from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import AsyncIterator, List, Optional

from ..models import ChatMessage, CollectorStats


class BaseCollector(ABC):
    """群聊消息收集器基类"""
    
    def __init__(self, platform: str):
        self.platform = platform
        self.stats = CollectorStats(platform=platform)
    
    @abstractmethod
    async def connect(self) -> bool:
        """
        连接到数据源
        
        Returns:
            bool: 是否连接成功
        """
        pass
    
    @abstractmethod
    async def disconnect(self) -> None:
        """断开数据源连接"""
        pass
    
    @abstractmethod
    async def get_groups(self) -> List[dict]:
        """
        获取可访问的群聊列表
        
        Returns:
            List[dict]: 群聊列表，每个群聊包含 id 和 name
        """
        pass
    
    @abstractmethod
    async def collect_messages(
        self,
        group_id: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> List[ChatMessage]:
        """
        收集指定群聊的消息
        
        Args:
            group_id: 群聊ID
            start_time: 开始时间，默认为当天 00:00
            end_time: 结束时间，默认为当天 23:59
        
        Returns:
            List[ChatMessage]: 收集到的消息列表
        """
        pass
    
    async def collect_messages_iter(
        self,
        group_id: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> AsyncIterator[ChatMessage]:
        """
        迭代收集消息（用于大量消息场景）
        
        Args:
            group_id: 群聊ID
            start_time: 开始时间
            end_time: 结束时间
        
        Yields:
            ChatMessage: 单个消息
        """
        messages = await self.collect_messages(group_id, start_time, end_time)
        for msg in messages:
            yield msg
    
    def get_stats(self) -> CollectorStats:
        """获取收集统计信息"""
        return self.stats
    
    def _is_relevant_message(self, message: ChatMessage) -> bool:
        """
        判断消息是否与软件反馈相关
        
        子类可以覆盖此方法以实现平台特定的过滤逻辑
        
        Args:
            message: 消息对象
        
        Returns:
            bool: 是否与软件反馈相关
        """
        # 默认不过滤，具体过滤逻辑在分析器中进行
        return True
    
    def _parse_time_range(
        self,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> tuple:
        """
        解析时间范围，默认为当天
        
        Args:
            start_time: 开始时间
            end_time: 结束时间
        
        Returns:
            tuple: (start_time, end_time)
        """
        if start_time is None:
            now = datetime.now()
            start_time = datetime(now.year, now.month, now.day, 0, 0, 0)
        
        if end_time is None:
            now = datetime.now()
            end_time = datetime(now.year, now.month, now.day, 23, 59, 59)
        
        return start_time, end_time
