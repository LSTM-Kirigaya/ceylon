"""反馈提取器

从群聊消息中提取软件相关的需求和 Bug
"""

import json
from typing import Dict, List, Optional

from ..config import get_config
from ..models import ChatMessage, Feedback, FeedbackType
from ..utils.logger import get_logger
from .llm import get_llm_client

logger = get_logger(__name__)


class FeedbackExtractor:
    """反馈提取器"""
    
    def __init__(self):
        self.config = get_config().analysis
        self.software_name = self.config.software_name
        self.software_desc = self.config.software_description
    
    async def extract_from_messages(
        self,
        messages: List[ChatMessage],
    ) -> List[Feedback]:
        """
        从消息列表中提取反馈
        
        Args:
            messages: 聊天消息列表
        
        Returns:
            List[Feedback]: 提取的反馈列表
        """
        if not messages:
            return []
        
        logger.info(f"开始从 {len(messages)} 条消息中提取反馈")
        
        # 按时间窗口分批处理，避免超出上下文长度
        batch_size = 50  # 每批处理的消息数
        all_feedbacks: List[Feedback] = []
        
        for i in range(0, len(messages), batch_size):
            batch = messages[i:i + batch_size]
            batch_feedbacks = await self._extract_batch(batch)
            all_feedbacks.extend(batch_feedbacks)
            logger.debug(f"批次 {i//batch_size + 1} 提取了 {len(batch_feedbacks)} 条反馈")
        
        logger.info(f"共提取 {len(all_feedbacks)} 条反馈")
        return all_feedbacks
    
    async def _extract_batch(self, messages: List[ChatMessage]) -> List[Feedback]:
        """处理一批消息"""
        # 构建提示词
        prompt = self._build_extraction_prompt(messages)
        
        try:
            llm = await get_llm_client()
            response = await llm.extract_json([
                {"role": "system", "content": self._get_system_prompt()},
                {"role": "user", "content": prompt},
            ])
            
            feedbacks = self._parse_extraction_response(response, messages)
            return feedbacks
            
        except Exception as e:
            logger.error(f"提取反馈失败: {e}")
            return []
    
    def _get_system_prompt(self) -> str:
        """获取系统提示词"""
        return f"""你是一个专业的软件反馈分析助手。你的任务是从用户群聊消息中提取与软件「{self.software_name}」相关的需求和 Bug 报告。

软件描述：{self.software_desc}

提取规则：
1. 只提取与 {self.software_name} 相关的反馈，忽略无关闲聊
2. 区分 Bug（功能异常）和 Feature（新需求）
3. 合并同一用户连续发送的关于同一问题的多条消息
4. 提取关键信息：问题描述、复现步骤、期望结果（Bug）或需求描述（Feature）
5. 评估优先级：critical（严重故障）、high（重要）、medium（一般）、low（建议）
6. 提取关键词和标签

输出格式必须是 JSON，包含以下字段：
- feedbacks: 反馈列表，每个反馈包含：
  - title: 简短标题（20字以内）
  - description: 详细描述
  - type: "bug" | "feature" | "enhancement" | "documentation" | "performance" | "ui" | "other"
  - priority: "critical" | "high" | "medium" | "low"
  - keywords: 关键词列表
  - confidence: 置信度（0-1）
"""
    
    def _build_extraction_prompt(self, messages: List[ChatMessage]) -> str:
        """构建提取提示词"""
        # 格式化消息
        message_texts = []
        for msg in messages:
            time_str = msg.timestamp.strftime("%H:%M")
            sender = msg.sender_name or msg.sender_id or "未知用户"
            content = msg.content or ""
            
            # 跳过系统消息和空消息
            if not content or msg.message_type.value == "system":
                continue
            
            message_texts.append(f"[{time_str}] {sender}: {content}")
        
        messages_str = "\n".join(message_texts)
        
        return f"""请分析以下群聊消息，提取与「{self.software_name}」相关的反馈：

消息记录：
```
{messages_str}
```

请按 JSON 格式输出提取结果。如果没有相关反馈，返回空数组。
"""
    
    def _parse_extraction_response(
        self,
        response: Dict,
        source_messages: List[ChatMessage],
    ) -> List[Feedback]:
        """解析提取响应"""
        feedbacks = []
        
        try:
            items = response.get("feedbacks", [])
            if not isinstance(items, list):
                logger.warning(f"返回的 feedbacks 不是列表: {type(items)}")
                return feedbacks
            
            for item in items:
                try:
                    feedback = self._create_feedback(item, source_messages)
                    if feedback:
                        feedbacks.append(feedback)
                except Exception as e:
                    logger.debug(f"创建反馈对象失败: {e}")
                    continue
                    
        except Exception as e:
            logger.error(f"解析提取响应失败: {e}")
        
        return feedbacks
    
    def _create_feedback(
        self,
        item: Dict,
        source_messages: List[ChatMessage],
    ) -> Optional[Feedback]:
        """从提取结果创建反馈对象"""
        try:
            feedback_type_str = item.get("type", "other").lower()
            try:
                feedback_type = FeedbackType(feedback_type_str)
            except ValueError:
                feedback_type = FeedbackType.OTHER
            
            # 查找相关的源消息（简单匹配，可以优化）
            related_messages = self._find_related_messages(
                item.get("description", ""),
                source_messages,
            )
            
            # 获取报告者列表
            reporters = list(set([
                msg.sender_name or msg.sender_id
                for msg in related_messages
                if msg.sender_id
            ]))
            
            return Feedback(
                title=item.get("title", "未命名反馈"),
                description=item.get("description", ""),
                feedback_type=feedback_type,
                priority=item.get("priority", "medium"),
                confidence=item.get("confidence", 0.5),
                keywords=item.get("keywords", []),
                suggested_labels=[feedback_type_str],
                source_messages=related_messages,
                source_platform=related_messages[0].platform if related_messages else "",
                source_group=related_messages[0].group_name if related_messages else "",
                reported_by=reporters,
            )
            
        except Exception as e:
            logger.debug(f"创建反馈失败: {e}")
            return None
    
    def _find_related_messages(
        self,
        description: str,
        messages: List[ChatMessage],
    ) -> List[ChatMessage]:
        """查找与反馈相关的源消息"""
        related = []
        description_lower = description.lower()
        
        for msg in messages:
            content = (msg.content or "").lower()
            # 简单匹配：描述中包含消息内容或消息内容包含描述中的关键词
            if content and (
                any(keyword in content for keyword in description_lower.split()[:5])
                or content in description_lower
            ):
                related.append(msg)
        
        # 如果找不到直接相关的，返回最近的非系统消息
        if not related:
            related = [
                msg for msg in messages
                if msg.content and msg.message_type.value != "system"
            ][-3:]  # 取最近3条
        
        return related
