#!/usr/bin/env python3
"""
Analyze Requirements - 需求分析模块

参考 Sentry Skill 设计模式：
- 清晰的步骤流程
- 决策表驱动
- 检查清单验证
"""

import json
import argparse
import os
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict, field
from enum import Enum
from datetime import datetime


class RequirementType(Enum):
    BUG = "bug"
    FEATURE = "feature"
    IMPROVEMENT = "improvement"
    DOCS = "documentation"
    OTHER = "other"


class Priority(Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass
class Requirement:
    id: str
    title: str
    description: str
    type: str
    priority: str
    source: str
    keywords: List[str]
    confidence: float
    created_at: str
    # 原始上下文信息
    raw_context: Dict[str, Any] = field(default_factory=dict)
    """
    raw_context 包含:
    - raw_content: 原始用户对话文本
    - raw_images: 相关图片链接/ID列表
    - source_messages: 原始消息对象列表
    - conversation_snippet: 对话片段（前后文）
    """



@dataclass
class AnalysisResult:
    meta: Dict[str, Any]
    requirements: List[Requirement]
    low_confidence_items: List[Dict[str, Any]] = field(default_factory=list)


class RequirementAnalyzer:
    """
    需求分析器
    
    Step 1: Validate input
    Step 2: Extract requirements using AI or keyword-based fallback
    Step 3: Classify and prioritize
    Step 4: Filter by confidence threshold
    """
    
    # 分类关键词映射表
    TYPE_KEYWORDS = {
        RequirementType.BUG: ["bug", "错误", "崩溃", "闪退", "fix", "error", "crash", "exception", "fail"],
        RequirementType.FEATURE: ["feature", "功能", "新增", "添加", "add", "support", "enable", "实现"],
        RequirementType.IMPROVEMENT: ["improve", "优化", "改进", "提升", "enhance", "better", "performance", "faster"],
        RequirementType.DOCS: ["doc", "文档", "说明", "document", "guide", "readme", "tutorial"],
    }
    
    # 优先级信号词
    PRIORITY_SIGNALS = {
        Priority.CRITICAL: ["崩溃", "无法使用", "数据丢失", "安全", "紧急", "critical", "urgent", "security", "crash", "data loss"],
        Priority.HIGH: ["重要", "核心", "严重", "high", "important", "major", "blocking"],
        Priority.MEDIUM: ["建议", "希望", "medium", "enhancement", "improvement", "suggest"],
        Priority.LOW: ["低", "minor", "low", "nice to have", "optional"],
    }
    
    def __init__(
        self,
        ai_provider: str = "deepseek",
        api_key: Optional[str] = None,
        min_confidence: float = 0.7
    ):
        self.ai_provider = ai_provider
        self.api_key = api_key or os.getenv(f"{ai_provider.upper()}_API_KEY")
        self.min_confidence = min_confidence
        self.use_ai = self._check_ai_available()
    
    def _check_ai_available(self) -> bool:
        """检查 AI 服务是否可用"""
        return self.api_key is not None
    
    def analyze(self, raw_input: Dict[str, Any]) -> AnalysisResult:
        """
        主分析流程
        
        Returns:
            AnalysisResult: 包含元数据、需求列表和低置信度项目
        """
        # Step 1: 验证输入
        self._validate_input(raw_input)
        
        total_input = len(raw_input.get("items", []))
        requirements = []
        low_confidence_items = []
        
        # Step 2 & 3: 处理每个输入项
        for idx, item in enumerate(raw_input.get("items", [])):
            result = self._process_item(item, idx)
            
            if result["confidence"] >= self.min_confidence:
                requirements.append(result["requirement"])
            else:
                low_confidence_items.append({
                    "original": item,
                    "extracted": result["requirement"],
                    "confidence": result["confidence"]
                })
        
        # Step 4: 构建结果
        meta = {
            "total_input": total_input,
            "extracted": len(requirements),
            "filtered_low_confidence": len(low_confidence_items),
            "processing_time_ms": 0,  # TODO: 添加实际计时
            "ai_used": self.use_ai,
            "min_confidence": self.min_confidence
        }
        
        return AnalysisResult(
            meta=meta,
            requirements=requirements,
            low_confidence_items=low_confidence_items
        )
    
    def _validate_input(self, raw_input: Dict[str, Any]) -> None:
        """验证输入数据格式"""
        if not isinstance(raw_input, dict):
            raise ValueError("Input must be a JSON object")
        
        if "items" not in raw_input:
            raise ValueError("Input must contain 'items' array")
        
        if not raw_input["items"]:
            raise ValueError("'items' array cannot be empty")
        
        valid_sources = {"wechat", "qq", "slack", "email", "form", "feishu"}
        source = raw_input.get("source", "")
        if source and source not in valid_sources:
            raise ValueError(f"Invalid source '{source}'. Must be one of: {valid_sources}")
    
    def _process_item(self, item: Dict[str, Any], idx: int) -> Dict[str, Any]:
        """处理单个输入项"""
        content = item.get("content", "")
        
        if self.use_ai:
            return self._extract_with_ai(item, idx)
        else:
            return self._extract_with_keywords(item, idx)
    
    def _extract_with_ai(self, item: Dict[str, Any], idx: int) -> Dict[str, Any]:
        """使用 AI 提取需求（当前使用模拟实现）"""
        # TODO: 集成实际的 AI API
        # 当前回退到关键词方法
        return self._extract_with_keywords(item, idx)
    
    def _extract_with_keywords(self, item: Dict[str, Any], idx: int) -> Dict[str, Any]:
        """使用关键词规则提取需求"""
        content = item.get("content", "")
        
        # 生成标题（取前 20 个字符或第一行）
        title = content[:30] + "..." if len(content) > 30 else content
        
        # 分类
        req_type = self._classify_type(content)
        
        # 优先级
        priority = self._calculate_priority(content)
        
        # 关键词
        keywords = self._extract_keywords(content)
        
        # 置信度（关键词匹配度）
        confidence = self._calculate_confidence(content, req_type, keywords)
        
        # 构建原始上下文信息
        raw_context = {
            # 原始文本内容
            "raw_content": content,
            "raw_title": item.get("title", ""),
            # 图片信息（如果有）
            "raw_images": item.get("images", []),
            # 完整的原始数据（保留所有字段）
            "source_data": {k: v for k, v in item.items() if k not in ['content', 'title']},
            # 对话片段（包含前后文）
            "conversation_snippet": {
                "current": content,
                "has_more_context": False  # 标记是否有更多上下文
            }
        }
        
        requirement = Requirement(
            id=f"REQ-{idx+1:04d}",
            title=title,
            description=content,
            type=req_type.value,
            priority=priority.value,
            source=item.get("source", "unknown"),
            keywords=keywords,
            confidence=round(confidence, 2),
            created_at=item.get("timestamp", datetime.now().isoformat()),
            raw_context=raw_context
        )
        
        return {
            "requirement": requirement,
            "confidence": confidence
        }
    
    def _classify_type(self, content: str) -> RequirementType:
        """基于关键词分类"""
        content_lower = content.lower()
        scores = {}
        
        for req_type, keywords in self.TYPE_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in content_lower)
            if score > 0:
                scores[req_type] = score
        
        if scores:
            return max(scores, key=scores.get)
        return RequirementType.OTHER
    
    def _calculate_priority(self, content: str) -> Priority:
        """基于信号词计算优先级"""
        content_lower = content.lower()
        
        for priority, signals in self.PRIORITY_SIGNALS.items():
            if any(sig in content_lower for sig in signals):
                return priority
        
        return Priority.LOW
    
    def _extract_keywords(self, content: str) -> List[str]:
        """提取关键词"""
        import re
        
        # 提取中文词汇（2字以上）
        chinese_words = re.findall(r'[\u4e00-\u9fa5]{2,}', content)
        
        # 提取英文单词（3字母以上）
        english_words = re.findall(r'[a-zA-Z]{3,}', content.lower())
        
        # 合并去重，限制数量
        all_words = chinese_words + english_words
        return list(set(all_words))[:10]
    
    def _calculate_confidence(self, content: str, req_type: RequirementType, keywords: List[str]) -> float:
        """计算置信度"""
        score = 0.5  # 基础分
        
        # 内容长度加分
        if len(content) >= 10:
            score += 0.1
        if len(content) >= 30:
            score += 0.1
        
        # 分类确定性加分
        if req_type != RequirementType.OTHER:
            score += 0.2
        
        # 关键词数量加分
        if len(keywords) >= 3:
            score += 0.1
        
        return min(score, 1.0)


def main():
    parser = argparse.ArgumentParser(description="分析需求")
    parser.add_argument("--input", "-i", required=True, help="输入文件路径")
    parser.add_argument("--output", "-o", required=True, help="输出文件路径")
    parser.add_argument("--ai-provider", default="deepseek", help="AI 服务提供商")
    parser.add_argument("--api-key", help="API 密钥")
    parser.add_argument("--min-confidence", type=float, default=0.7, help="最小置信度阈值")
    parser.add_argument("--review-low-confidence", help="低置信度项目输出路径")
    
    args = parser.parse_args()
    
    # 读取输入
    with open(args.input, "r", encoding="utf-8") as f:
        raw_data = json.load(f)
    
    # 分析
    analyzer = RequirementAnalyzer(
        ai_provider=args.ai_provider,
        api_key=args.api_key,
        min_confidence=args.min_confidence
    )
    
    result = analyzer.analyze(raw_data)
    
    # 输出主结果
    output_data = {
        "meta": result.meta,
        "requirements": [asdict(r) for r in result.requirements]
    }
    
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    # 输出低置信度项目（如果指定）
    if args.review_low_confidence and result.low_confidence_items:
        # 转换 Requirement 对象为字典
        review_items = []
        for item in result.low_confidence_items:
            review_items.append({
                "original": item["original"],
                "extracted": asdict(item["extracted"]) if hasattr(item["extracted"], "__dataclass_fields__") else item["extracted"],
                "confidence": item["confidence"]
            })
        with open(args.review_low_confidence, "w", encoding="utf-8") as f:
            json.dump(review_items, f, ensure_ascii=False, indent=2)
        print(f"⚠️  {len(result.low_confidence_items)} 条低置信度项目需要人工复核")
        print(f"📁 复核文件: {args.review_low_confidence}")
    
    print(f"✅ 分析完成")
    print(f"   输入: {result.meta['total_input']} | 提取: {result.meta['extracted']} | 过滤: {result.meta['filtered_low_confidence']}")
    print(f"📁 输出文件: {args.output}")


if __name__ == "__main__":
    main()
