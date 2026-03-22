#!/usr/bin/env python3
"""
Check Duplicates - 重复检测模块

参考 Sentry Skill 设计模式：
- 规模评估决定策略
- 多级匹配算法
- 明确的决策框架
"""

import json
import argparse
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict, field
from difflib import SequenceMatcher
from enum import Enum


class Recommendation(Enum):
    SKIP = "skip"
    MERGE = "merge"
    CREATE_NEW = "create_new"
    REVIEW = "review"


@dataclass
class MatchResult:
    issue_id: str
    title: str
    similarity: float
    match_method: str


@dataclass
class DuplicateCheckResult:
    requirement_id: str
    is_duplicate: bool
    confidence: float
    recommendation: str
    matched_issues: List[MatchResult]
    action_taken: Optional[str] = None


@dataclass
class CheckSummary:
    total_checked: int
    duplicates: int
    similar: int
    new: int
    processing_time_ms: int = 0


class DuplicateChecker:
    """
    重复检测器
    
    Step 1: Assess scale
    Step 2: Choose matching algorithm
    Step 3: Find similar issues
    Step 4: Generate recommendation
    """
    
    def __init__(
        self,
        threshold: float = 0.75,
        auto_merge_threshold: float = 0.90,
        method: str = "keyword"
    ):
        self.threshold = threshold
        self.auto_merge_threshold = auto_merge_threshold
        self.method = method
        self.ai_available = False  # TODO: 检测 AI 可用性
    
    def check(
        self,
        requirements: List[Dict[str, Any]],
        existing_db: List[Dict[str, Any]]
    ) -> Tuple[CheckSummary, List[DuplicateCheckResult]]:
        """
        主检测流程
        
        Returns:
            (summary, results)
        """
        results = []
        stats = {"duplicates": 0, "similar": 0, "new": 0}
        
        for req in requirements:
            result = self._check_single(req, existing_db)
            results.append(result)
            
            if result.is_duplicate:
                stats["duplicates"] += 1
            elif result.recommendation == Recommendation.MERGE.value:
                stats["similar"] += 1
            else:
                stats["new"] += 1
        
        summary = CheckSummary(
            total_checked=len(requirements),
            duplicates=stats["duplicates"],
            similar=stats["similar"],
            new=stats["new"]
        )
        
        return summary, results
    
    def _check_single(
        self,
        requirement: Dict[str, Any],
        existing_db: List[Dict[str, Any]]
    ) -> DuplicateCheckResult:
        """检测单个需求"""
        req_id = requirement.get("id", "unknown")
        
        # 查找相似 Issue
        matches = self._find_matches(requirement, existing_db)
        
        # 确定推荐操作
        if not matches:
            return DuplicateCheckResult(
                requirement_id=req_id,
                is_duplicate=False,
                confidence=0.0,
                recommendation=Recommendation.CREATE_NEW.value,
                matched_issues=[]
            )
        
        best_match = matches[0]
        confidence = best_match.similarity
        
        # 决策逻辑
        if confidence >= self.auto_merge_threshold:
            is_dup = True
            rec = Recommendation.SKIP
        elif confidence >= self.threshold:
            is_dup = False
            rec = Recommendation.REVIEW
        else:
            is_dup = False
            rec = Recommendation.CREATE_NEW
        
        return DuplicateCheckResult(
            requirement_id=req_id,
            is_duplicate=is_dup,
            confidence=round(confidence, 2),
            recommendation=rec.value,
            matched_issues=matches[:5]  # 最多返回 5 个匹配
        )
    
    def _find_matches(
        self,
        requirement: Dict[str, Any],
        existing_db: List[Dict[str, Any]]
    ) -> List[MatchResult]:
        """查找匹配的 Issue"""
        if self.method == "semantic" and self.ai_available:
            return self._semantic_match(requirement, existing_db)
        else:
            return self._keyword_match(requirement, existing_db)
    
    def _keyword_match(
        self,
        requirement: Dict[str, Any],
        existing_db: List[Dict[str, Any]]
    ) -> List[MatchResult]:
        """基于关键词的匹配"""
        matches = []
        
        req_keywords = set(requirement.get("keywords", []))
        req_text = f"{requirement.get('title', '')} {requirement.get('description', '')}"
        
        for issue in existing_db:
            scores = []
            
            # 1. 精确哈希匹配
            if self._exact_match(requirement, issue):
                scores.append((1.0, "exact"))
            
            # 2. 关键词 Jaccard 相似度
            issue_keywords = set(issue.get("keywords", []))
            if req_keywords and issue_keywords:
                intersection = req_keywords & issue_keywords
                union = req_keywords | issue_keywords
                keyword_score = len(intersection) / len(union) if union else 0
                scores.append((keyword_score, "keyword"))
            
            # 3. 文本相似度
            issue_text = f"{issue.get('title', '')} {issue.get('description', '')}"
            text_score = SequenceMatcher(None, req_text.lower(), issue_text.lower()).ratio()
            scores.append((text_score, "text"))
            
            # 取最高分
            if scores:
                best_score, method = max(scores, key=lambda x: x[0])
                if best_score >= self.threshold * 0.5:  # 只保留潜在匹配
                    matches.append(MatchResult(
                        issue_id=issue.get("id", "unknown"),
                        title=issue.get("title", ""),
                        similarity=round(best_score, 2),
                        match_method=method
                    ))
        
        # 按相似度排序
        matches.sort(key=lambda x: x.similarity, reverse=True)
        return matches
    
    def _semantic_match(
        self,
        requirement: Dict[str, Any],
        existing_db: List[Dict[str, Any]]
    ) -> List[MatchResult]:
        """基于语义的匹配（需要 AI）"""
        # TODO: 实现基于 embeddings 的语义匹配
        return self._keyword_match(requirement, existing_db)
    
    def _exact_match(self, req: Dict[str, Any], issue: Dict[str, Any]) -> bool:
        """检查是否完全匹配"""
        req_title = req.get("title", "").strip()
        issue_title = issue.get("title", "").strip()
        
        if req_title and issue_title:
            return req_title == issue_title
        
        req_desc = req.get("description", "").strip()
        issue_desc = issue.get("description", "").strip()
        return req_desc == issue_desc and len(req_desc) > 10


def main():
    parser = argparse.ArgumentParser(description="检测重复需求")
    parser.add_argument("--requirements", "-r", required=True, help="需求文件路径")
    parser.add_argument("--existing-db", "-d", required=True, help="现有 Issue 数据库路径")
    parser.add_argument("--output", "-o", help="输出文件路径")
    parser.add_argument("--threshold", "-t", type=float, default=0.75, help="相似度阈值")
    parser.add_argument("--auto-merge-threshold", type=float, default=0.90, help="自动合并阈值")
    parser.add_argument("--method", choices=["keyword", "semantic"], default="keyword", help="匹配方法")
    parser.add_argument("--count-only", action="store_true", help="仅计数")
    
    args = parser.parse_args()
    
    # 读取数据
    with open(args.requirements, "r", encoding="utf-8") as f:
        req_data = json.load(f)
    
    with open(args.existing_db, "r", encoding="utf-8") as f:
        existing_data = json.load(f)
    
    requirements = req_data.get("requirements", [])
    existing_db = existing_data.get("issues", existing_data.get("feedbacks", []))
    
    # 仅计数模式
    if args.count_only:
        print(f"待检测需求: {len(requirements)}")
        print(f"现有 Issue 库: {len(existing_db)}")
        return
    
    # 检测
    checker = DuplicateChecker(
        threshold=args.threshold,
        auto_merge_threshold=args.auto_merge_threshold,
        method=args.method
    )
    
    summary, results = checker.check(requirements, existing_db)
    
    # 输出
    if args.output:
        output_data = {
            "summary": asdict(summary),
            "results": [
                {
                    "requirement_id": r.requirement_id,
                    "is_duplicate": r.is_duplicate,
                    "confidence": r.confidence,
                    "recommendation": r.recommendation,
                    "matched_issues": [asdict(m) for m in r.matched_issues]
                }
                for r in results
            ]
        }
        
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)
        
        print(f"📁 输出文件: {args.output}")
    
    # 统计报告
    print(f"✅ 重复检测完成")
    print(f"   总需求: {summary.total_checked}")
    print(f"   重复: {summary.duplicates} | 需复核: {summary.similar} | 新建: {summary.new}")
    
    # 建议
    if summary.duplicates > 0:
        print(f"\n💡 建议: {summary.duplicates} 条需求可直接跳过（高置信度重复）")
    if summary.similar > 0:
        print(f"💡 建议: {summary.similar} 条需求需要人工复核（0.75-0.90 相似度）")


if __name__ == "__main__":
    main()
