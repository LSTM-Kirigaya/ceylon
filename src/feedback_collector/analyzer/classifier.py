"""反馈分类器

对反馈进行分类，基于 GitHub 风格的标签体系
"""

import re
from typing import Dict, List, Set

from ..config import get_config
from ..models import Feedback, FeedbackType
from ..utils.logger import get_logger

logger = get_logger(__name__)


class FeedbackClassifier:
    """反馈分类器"""
    
    def __init__(self):
        self.config = get_config().analysis
        self.categories = {c.name: c for c in self.config.categories}
    
    def classify(self, feedback: Feedback) -> Feedback:
        """
        对单个反馈进行分类
        
        Args:
            feedback: 反馈对象
        
        Returns:
            Feedback: 更新分类后的反馈
        """
        # 1. 基于关键词规则分类
        self._apply_keyword_rules(feedback)
        
        # 2. 基于内容特征分类
        self._apply_content_features(feedback)
        
        # 3. 确定主要类别
        self._determine_primary_category(feedback)
        
        return feedback
    
    def classify_batch(self, feedbacks: List[Feedback]) -> List[Feedback]:
        """
        批量分类反馈
        
        Args:
            feedbacks: 反馈列表
        
        Returns:
            List[Feedback]: 分类后的反馈列表
        """
        for feedback in feedbacks:
            self.classify(feedback)
        return feedbacks
    
    def _apply_keyword_rules(self, feedback: Feedback) -> None:
        """应用关键词规则分类"""
        title = (feedback.title or "").lower()
        desc = (feedback.description or "").lower()
        content = title + " " + desc
        keywords = set()
        
        # Bug 相关关键词
        bug_keywords = [
            "bug", "error", "crash", "崩溃", "报错", "异常", "闪退",
            "无法", "不能", "失败", "出错", "问题", "fix", "修复",
            "broken", "not working", "doesn't work", "failed",
        ]
        
        # 功能需求关键词
        feature_keywords = [
            "feature", "功能", "需求", "希望", "想要", "建议", "能不能",
            "add", "support", "implement", "request", "would like",
            "需要", "缺少", "增加", "添加", "优化", "改进",
        ]
        
        # 性能关键词
        performance_keywords = [
            "slow", "lag", "卡顿", "慢", "性能", "内存", "cpu",
            "加载", "响应", "延迟", "hang", "freeze", "性能",
            "optimize", "performance", "speed", "memory", "leak",
        ]
        
        # UI 关键词
        ui_keywords = [
            "ui", "界面", "样式", "布局", "显示", "颜色", "字体",
            "按钮", "菜单", "窗口", "对话框", "theme", "css",
            "design", "layout", "style", "visual", "appearance",
        ]
        
        # 文档关键词
        doc_keywords = [
            "doc", "文档", "说明", "教程", "guide", "readme",
            "documentation", "help", "wiki", "manual", "example",
        ]
        
        # 匹配关键词
        if any(kw in content for kw in bug_keywords):
            keywords.add("bug")
        
        if any(kw in content for kw in feature_keywords):
            keywords.add("feature")
        
        if any(kw in content for kw in performance_keywords):
            keywords.add("performance")
        
        if any(kw in content for kw in ui_keywords):
            keywords.add("ui")
        
        if any(kw in content for kw in doc_keywords):
            keywords.add("documentation")
        
        # 添加到反馈的标签
        feedback.suggested_labels.extend(keywords)
        feedback.suggested_labels = list(set(feedback.suggested_labels))
    
    def _apply_content_features(self, feedback: Feedback) -> None:
        """基于内容特征分类"""
        content = (feedback.title + " " + feedback.description).lower()
        
        # 严重级别判断
        critical_patterns = [
            r"crash", r"崩溃", r"闪退", r"死机",
            r"数据丢失", r"无法启动", r"白屏",
            r"严重", r"critical", r"urgent",
        ]
        
        if any(re.search(p, content) for p in critical_patterns):
            if feedback.priority not in ("critical", "high"):
                feedback.priority = "high"
        
        # 判断是否是增强需求（对现有功能的改进）
        enhancement_patterns = [
            r"更好", r"改进", r"优化", r"enhance", r"improve",
            r"更快", r"更方便", r"体验", r"体验优化",
        ]
        
        if any(re.search(p, content) for p in enhancement_patterns):
            if "enhancement" not in feedback.suggested_labels:
                feedback.suggested_labels.append("enhancement")
            
            # 如果是功能请求，同时标记为 enhancement
            if feedback.feedback_type == FeedbackType.FEATURE:
                # 检查是否是对现有功能的改进
                if not any(kw in content for kw in ["新增", "添加", "新功能"]):
                    feedback.feedback_type = FeedbackType.ENHANCEMENT
    
    def _determine_primary_category(self, feedback: Feedback) -> None:
        """确定主要类别"""
        # 基于当前类型和标签确定最佳类别
        labels = set(feedback.suggested_labels)
        current_type = feedback.feedback_type
        
        # 优先级：bug > performance > ui > documentation > feature > enhancement > other
        priority_order = [
            FeedbackType.BUG,
            FeedbackType.PERFORMANCE,
            FeedbackType.UI,
            FeedbackType.DOCUMENTATION,
            FeedbackType.FEATURE,
            FeedbackType.ENHANCEMENT,
            FeedbackType.OTHER,
        ]
        
        # 检查标签是否暗示更合适的类型
        type_mapping = {
            "bug": FeedbackType.BUG,
            "feature": FeedbackType.FEATURE,
            "enhancement": FeedbackType.ENHANCEMENT,
            "documentation": FeedbackType.DOCUMENTATION,
            "performance": FeedbackType.PERFORMANCE,
            "ui": FeedbackType.UI,
        }
        
        # 如果当前是 OTHER，尝试从标签推断
        if current_type == FeedbackType.OTHER:
            for label, fb_type in type_mapping.items():
                if label in labels:
                    feedback.feedback_type = fb_type
                    break
        
        # 设置分类字段
        feedback.category = feedback.feedback_type.value
    
    def get_category_stats(self, feedbacks: List[Feedback]) -> Dict[str, int]:
        """
        获取分类统计
        
        Args:
            feedbacks: 反馈列表
        
        Returns:
            Dict[str, int]: 类别 -> 数量
        """
        stats: Dict[str, int] = {}
        for fb in feedbacks:
            category = fb.feedback_type.value
            stats[category] = stats.get(category, 0) + 1
        return stats
    
    def get_priority_stats(self, feedbacks: List[Feedback]) -> Dict[str, int]:
        """
        获取优先级统计
        
        Args:
            feedbacks: 反馈列表
        
        Returns:
            Dict[str, int]: 优先级 -> 数量
        """
        stats: Dict[str, int] = {}
        for fb in feedbacks:
            priority = fb.priority
            stats[priority] = stats.get(priority, 0) + 1
        return stats
