"""导出器基类"""

from abc import ABC, abstractmethod
from typing import List, Optional

from ..models import AnalysisResult, Feedback


class BaseExporter(ABC):
    """数据导出器基类"""
    
    def __init__(self, name: str):
        self.name = name
        self.enabled = True
    
    @abstractmethod
    async def export(
        self,
        result: AnalysisResult,
    ) -> bool:
        """
        导出分析结果
        
        Args:
            result: 分析结果
        
        Returns:
            bool: 是否导出成功
        """
        pass
    
    @abstractmethod
    async def export_feedbacks(
        self,
        feedbacks: List[Feedback],
        **kwargs,
    ) -> bool:
        """
        导出反馈列表
        
        Args:
            feedbacks: 反馈列表
            **kwargs: 额外参数
        
        Returns:
            bool: 是否导出成功
        """
        pass
    
    @abstractmethod
    async def check_existing(
        self,
        feedback: Feedback,
    ) -> Optional[str]:
        """
        检查反馈是否已存在
        
        Args:
            feedback: 反馈对象
        
        Returns:
            Optional[str]: 如果存在，返回现有记录的ID；否则返回 None
        """
        pass
    
    async def is_duplicate(self, feedback: Feedback) -> bool:
        """
        检查是否为重复反馈
        
        Args:
            feedback: 反馈对象
        
        Returns:
            bool: 是否重复
        """
        existing_id = await self.check_existing(feedback)
        return existing_id is not None
