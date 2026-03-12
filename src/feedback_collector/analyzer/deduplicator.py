"""反馈去重器

检测并合并相似的反馈，避免重复记录
"""

import hashlib
import re
from typing import Dict, List, Optional, Set, Tuple

from ..config import get_config
from ..models import ChatMessage, Feedback
from ..utils.logger import get_logger
from .llm import get_llm_client

logger = get_logger(__name__)


class FeedbackDeduplicator:
    """反馈去重器"""
    
    def __init__(self):
        self.config = get_config().analysis.deduplication
        self.similarity_threshold = self.config.similarity_threshold
    
    async def deduplicate(self, feedbacks: List[Feedback]) -> List[Feedback]:
        """
        对反馈列表进行去重
        
        Args:
            feedbacks: 原始反馈列表
        
        Returns:
            List[Feedback]: 去重后的反馈列表
        """
        if not feedbacks:
            return []
        
        logger.info(f"开始对 {len(feedbacks)} 条反馈进行去重")
        
        # 1. 基于哈希快速去重（完全相同的反馈）
        unique_feedbacks = self._hash_deduplicate(feedbacks)
        logger.debug(f"哈希去重后: {len(unique_feedbacks)} 条")
        
        # 2. 基于文本相似度去重
        merged_feedbacks = await self._similarity_deduplicate(unique_feedbacks)
        logger.info(f"去重完成: {len(feedbacks)} -> {len(merged_feedbacks)}")
        
        return merged_feedbacks
    
    def _hash_deduplicate(self, feedbacks: List[Feedback]) -> List[Feedback]:
        """基于哈希的去重"""
        seen_hashes: Set[str] = set()
        unique: List[Feedback] = []
        
        for fb in feedbacks:
            # 计算反馈的哈希值
            content = (fb.title + fb.description).lower().strip()
            hash_val = hashlib.md5(content.encode()).hexdigest()
            
            if hash_val not in seen_hashes:
                seen_hashes.add(hash_val)
                unique.append(fb)
            else:
                logger.debug(f"发现重复反馈（哈希）: {fb.title}")
        
        return unique
    
    async def _similarity_deduplicate(
        self,
        feedbacks: List[Feedback],
    ) -> List[Feedback]:
        """基于相似度的去重"""
        if len(feedbacks) <= 1:
            return feedbacks
        
        # 按类型分组，只在同类型间去重
        type_groups: Dict[str, List[Feedback]] = {}
        for fb in feedbacks:
            fb_type = fb.feedback_type.value
            if fb_type not in type_groups:
                type_groups[fb_type] = []
            type_groups[fb_type].append(fb)
        
        # 对每个类型组进行去重
        result: List[Feedback] = []
        for fb_type, group in type_groups.items():
            merged = await self._merge_similar_in_group(group)
            result.extend(merged)
        
        return result
    
    async def _merge_similar_in_group(
        self,
        feedbacks: List[Feedback],
    ) -> List[Feedback]:
        """在组内合并相似的反馈"""
        if len(feedbacks) <= 1:
            return feedbacks
        
        # 使用简单的文本相似度算法
        merged: List[Feedback] = []
        merged_indices: Set[int] = set()
        
        for i, fb1 in enumerate(feedbacks):
            if i in merged_indices:
                continue
            
            # 查找相似的反馈
            similar_feedbacks = [fb1]
            for j, fb2 in enumerate(feedbacks[i+1:], start=i+1):
                if j in merged_indices:
                    continue
                
                similarity = self._calculate_similarity(fb1, fb2)
                if similarity >= self.similarity_threshold:
                    similar_feedbacks.append(fb2)
                    merged_indices.add(j)
            
            # 合并相似的反馈
            if len(similar_feedbacks) > 1:
                merged_fb = self._merge_feedbacks(similar_feedbacks)
                merged.append(merged_fb)
                logger.debug(f"合并了 {len(similar_feedbacks)} 条相似反馈: {merged_fb.title}")
            else:
                merged.append(fb1)
        
        return merged
    
    def _calculate_similarity(self, fb1: Feedback, fb2: Feedback) -> float:
        """
        计算两个反馈的相似度
        
        使用简单的文本相似度算法（基于关键词和 n-gram）
        """
        # 提取文本特征
        text1 = self._extract_features(fb1)
        text2 = self._extract_features(fb2)
        
        # 如果标题非常相似，增加权重
        title_sim = self._text_similarity(fb1.title.lower(), fb2.title.lower())
        
        # 内容相似度
        content_sim = self._text_similarity(text1, text2)
        
        # 如果类型相同，增加相似度权重
        type_bonus = 0.1 if fb1.feedback_type == fb2.feedback_type else 0
        
        # 综合相似度
        similarity = max(title_sim, content_sim) + type_bonus
        return min(similarity, 1.0)
    
    def _extract_features(self, fb: Feedback) -> str:
        """提取反馈的特征文本"""
        # 组合标题、描述和关键词
        features = [
            fb.title or "",
            fb.description or "",
            " ".join(fb.keywords or []),
        ]
        
        text = " ".join(features).lower()
        
        # 清理文本
        text = re.sub(r'[^\w\s]', ' ', text)  # 移除标点
        text = re.sub(r'\s+', ' ', text)  # 合并空格
        
        return text.strip()
    
    def _text_similarity(self, text1: str, text2: str) -> float:
        """计算两段文本的相似度（基于词集合）"""
        if not text1 or not text2:
            return 0.0
        
        # 分词（简单按空格分割）
        words1 = set(text1.split())
        words2 = set(text2.split())
        
        if not words1 or not words2:
            return 0.0
        
        # 计算 Jaccard 相似度
        intersection = len(words1 & words2)
        union = len(words1 | words2)
        
        if union == 0:
            return 0.0
        
        return intersection / union
    
    def _merge_feedbacks(self, feedbacks: List[Feedback]) -> Feedback:
        """合并多个相似的反馈"""
        if len(feedbacks) == 1:
            return feedbacks[0]
        
        # 选择信息最完整的作为基础
        base = max(feedbacks, key=lambda f: len(f.description or ""))
        
        # 合并所有信息
        all_messages: List[ChatMessage] = []
        all_reporters: Set[str] = set()
        merged_from: List[str] = []
        max_confidence = base.confidence
        all_keywords: Set[str] = set(base.keywords or [])
        all_labels: Set[str] = set(base.suggested_labels or [])
        
        for fb in feedbacks:
            all_messages.extend(fb.source_messages)
            all_reporters.update(fb.reported_by or [])
            all_keywords.update(fb.keywords or [])
            all_labels.update(fb.suggested_labels or [])
            merged_from.append(fb.id)
            max_confidence = max(max_confidence, fb.confidence)
        
        # 更新基础反馈
        base.source_messages = all_messages
        base.reported_by = list(all_reporters)
        base.merged_from = merged_from
        base.is_merged = True
        base.merge_count = len(feedbacks)
        base.confidence = max_confidence
        base.keywords = list(all_keywords)
        base.suggested_labels = list(all_labels)
        base.updated_at = __import__('datetime').datetime.now()
        
        return base
    
    async def check_duplicate_with_history(
        self,
        feedback: Feedback,
        history_feedbacks: List[Feedback],
    ) -> Optional[Feedback]:
        """
        检查反馈是否与历史反馈重复
        
        Args:
            feedback: 新反馈
            history_feedbacks: 历史反馈列表
        
        Returns:
            Optional[Feedback]: 如果重复，返回匹配的历史反馈；否则返回 None
        """
        for hist_fb in history_feedbacks:
            similarity = self._calculate_similarity(feedback, hist_fb)
            if similarity >= self.similarity_threshold:
                return hist_fb
        
        return None
