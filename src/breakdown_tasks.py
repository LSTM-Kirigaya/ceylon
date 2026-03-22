#!/usr/bin/env python3
"""
Breakdown Tasks - 任务拆分模块

参考 Sentry Skill 设计模式：
- 类型特定的模板
- 复杂度乘数
- 依赖规则
- 多格式输出
"""

import json
import argparse
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict, field
from enum import Enum


class TaskType(Enum):
    RESEARCH = "research"
    DESIGN = "design"
    DEVELOPMENT = "development"
    TESTING = "testing"
    DOCUMENTATION = "documentation"
    DEPLOYMENT = "deployment"


class TaskStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    DONE = "done"


@dataclass
class Task:
    id: str
    requirement_id: str
    title: str
    description: str
    type: str
    estimated_hours: float
    dependencies: List[str]
    assignee: Optional[str]
    status: str
    acceptance_criteria: List[str]


@dataclass
class BreakdownSummary:
    total_requirements: int
    total_tasks: int
    total_hours: float
    by_type: Dict[str, int]


class TaskBreakdownEngine:
    """
    任务拆分引擎
    
    Step 1: Identify requirement type
    Step 2: Apply type-specific template
    Step 3: Calculate estimates with complexity/uncertainty
    Step 4: Validate dependencies
    """
    
    # 任务类型基础工时
    BASE_HOURS = {
        TaskType.RESEARCH: 4,
        TaskType.DESIGN: 8,
        TaskType.DEVELOPMENT: 8,
        TaskType.TESTING: 4,
        TaskType.DOCUMENTATION: 4,
        TaskType.DEPLOYMENT: 2,
    }
    
    # 复杂度乘数
    COMPLEXITY_MULTIPLIERS = {
        "simple": 0.6,
        "medium": 1.0,
        "complex": 1.5,
        "very_complex": 2.0,
    }
    
    # 不确定性缓冲
    UNCERTAINTY_BUFFERS = {
        "low": 1.0,
        "medium": 1.2,
        "high": 1.5,
    }
    
    def __init__(self, max_task_hours: float = 8, include_estimates: bool = True):
        self.max_task_hours = max_task_hours
        self.include_estimates = include_estimates
    
    def breakdown_batch(
        self,
        requirements: List[Dict[str, Any]]
    ) -> Tuple[BreakdownSummary, List[Task]]:
        """
        批量拆分需求
        
        Returns:
            (summary, tasks)
        """
        all_tasks = []
        
        for req in requirements:
            tasks = self._breakdown_single(req)
            all_tasks.extend(tasks)
        
        # 计算统计
        by_type = {}
        for task in all_tasks:
            by_type[task.type] = by_type.get(task.type, 0) + 1
        
        summary = BreakdownSummary(
            total_requirements=len(requirements),
            total_tasks=len(all_tasks),
            total_hours=sum(t.estimated_hours for t in all_tasks),
            by_type=by_type
        )
        
        return summary, all_tasks
    
    def _breakdown_single(self, requirement: Dict[str, Any]) -> List[Task]:
        """拆分单个需求"""
        req_type = requirement.get("type", "other")
        complexity = requirement.get("complexity", "medium")
        uncertainty = requirement.get("uncertainty", "medium")
        
        # 选择模板
        if req_type == "bug":
            tasks = self._bug_template(requirement)
        elif req_type == "feature":
            tasks = self._feature_template(requirement)
        elif req_type == "improvement":
            tasks = self._improvement_template(requirement)
        elif req_type == "documentation":
            tasks = self._docs_template(requirement)
        else:
            tasks = self._generic_template(requirement)
        
        # 应用复杂度/不确定性调整
        if self.include_estimates:
            multiplier = self.COMPLEXITY_MULTIPLIERS.get(complexity, 1.0)
            buffer = self.UNCERTAINTY_BUFFERS.get(uncertainty, 1.0)
            
            for task in tasks:
                adjusted = task.estimated_hours * multiplier * buffer
                task.estimated_hours = round(adjusted, 1)
        
        return tasks
    
    def _bug_template(self, req: Dict[str, Any]) -> List[Task]:
        """Bug 修复模板"""
        req_id = req.get("id", "REQ-0000")
        base_id = req_id.replace("REQ", "TASK")
        severity = req.get("severity", "medium")
        
        # 根据严重级别调整工时
        hour_map = {
            "critical": (4, 8, 4),
            "high": (2, 4, 2),
            "medium": (2, 2, 2),
            "low": (1, 2, 1),
        }
        research_h, dev_h, test_h = hour_map.get(severity, (2, 4, 2))
        
        return [
            Task(
                id=f"{base_id}-01",
                requirement_id=req_id,
                title="问题复现与定位",
                description="复现 Bug，定位问题根因，确定影响范围",
                type=TaskType.RESEARCH.value,
                estimated_hours=research_h,
                dependencies=[],
                assignee=None,
                status=TaskStatus.PENDING.value,
                acceptance_criteria=["能够稳定复现问题", "确定问题根因", "确定影响范围"]
            ),
            Task(
                id=f"{base_id}-02",
                requirement_id=req_id,
                title="修复实现",
                description="编写修复代码，确保不引入新问题",
                type=TaskType.DEVELOPMENT.value,
                estimated_hours=dev_h,
                dependencies=[f"{base_id}-01"],
                assignee=None,
                status=TaskStatus.PENDING.value,
                acceptance_criteria=["代码修复完成", "自测通过", "代码审查通过"]
            ),
            Task(
                id=f"{base_id}-03",
                requirement_id=req_id,
                title="回归测试",
                description="添加测试用例，验证修复，确保无回归",
                type=TaskType.TESTING.value,
                estimated_hours=test_h,
                dependencies=[f"{base_id}-02"],
                assignee=None,
                status=TaskStatus.PENDING.value,
                acceptance_criteria=["新增测试覆盖 Bug 场景", "所有相关测试通过", "无回归问题"]
            ),
        ]
    
    def _feature_template(self, req: Dict[str, Any]) -> List[Task]:
        """新功能开发模板"""
        req_id = req.get("id", "REQ-0000")
        base_id = req_id.replace("REQ", "TASK")
        
        tasks = [
            Task(
                id=f"{base_id}-01",
                requirement_id=req_id,
                title="需求细化与技术方案",
                description="细化需求，设计技术方案，接口设计",
                type=TaskType.DESIGN.value,
                estimated_hours=6,
                dependencies=[],
                assignee=None,
                status=TaskStatus.PENDING.value,
                acceptance_criteria=["技术方案文档", "接口设计完成", "方案评审通过"]
            ),
            Task(
                id=f"{base_id}-02",
                requirement_id=req_id,
                title="UI/UX 设计",
                description="设计用户界面和交互流程",
                type=TaskType.DESIGN.value,
                estimated_hours=12,
                dependencies=[f"{base_id}-01"],
                assignee=None,
                status=TaskStatus.PENDING.value,
                acceptance_criteria=["设计稿完成", "设计评审通过"]
            ),
            Task(
                id=f"{base_id}-03",
                requirement_id=req_id,
                title="后端开发",
                description="实现后端接口和业务逻辑",
                type=TaskType.DEVELOPMENT.value,
                estimated_hours=16,
                dependencies=[f"{base_id}-01"],
                assignee=None,
                status=TaskStatus.PENDING.value,
                acceptance_criteria=["API 实现完成", "单元测试覆盖 ≥ 80%", "API 文档更新"]
            ),
            Task(
                id=f"{base_id}-04",
                requirement_id=req_id,
                title="前端开发",
                description="实现前端页面和交互",
                type=TaskType.DEVELOPMENT.value,
                estimated_hours=16,
                dependencies=[f"{base_id}-02", f"{base_id}-03"],
                assignee=None,
                status=TaskStatus.PENDING.value,
                acceptance_criteria=["页面开发完成", "联调通过"]
            ),
            Task(
                id=f"{base_id}-05",
                requirement_id=req_id,
                title="集成测试",
                description="端到端测试验证，性能测试",
                type=TaskType.TESTING.value,
                estimated_hours=8,
                dependencies=[f"{base_id}-04"],
                assignee=None,
                status=TaskStatus.PENDING.value,
                acceptance_criteria=["端到端测试通过", "性能指标达标"]
            ),
            Task(
                id=f"{base_id}-06",
                requirement_id=req_id,
                title="文档更新",
                description="更新用户文档和 CHANGELOG",
                type=TaskType.DOCUMENTATION.value,
                estimated_hours=4,
                dependencies=[f"{base_id}-05"],
                assignee=None,
                status=TaskStatus.PENDING.value,
                acceptance_criteria=["用户文档更新", "CHANGELOG 更新"]
            ),
        ]
        
        # 如果是纯后端功能，移除 UI 相关任务
        if req.get("backend_only"):
            tasks = [t for t in tasks if t.id not in [f"{base_id}-02", f"{base_id}-04"]]
            # 调整依赖
            for t in tasks:
                if f"{base_id}-04" in t.dependencies:
                    t.dependencies = [f"{base_id}-03"]
        
        return tasks
    
    def _improvement_template(self, req: Dict[str, Any]) -> List[Task]:
        """优化改进模板"""
        req_id = req.get("id", "REQ-0000")
        base_id = req_id.replace("REQ", "TASK")
        
        return [
            Task(
                id=f"{base_id}-01",
                requirement_id=req_id,
                title="现状分析与目标设定",
                description="分析现状，性能基线测试，瓶颈定位",
                type=TaskType.RESEARCH.value,
                estimated_hours=6,
                dependencies=[],
                assignee=None,
                status=TaskStatus.PENDING.value,
                acceptance_criteria=["性能基线测试", "瓶颈定位", "优化目标确定"]
            ),
            Task(
                id=f"{base_id}-02",
                requirement_id=req_id,
                title="优化方案设计",
                description="设计优化方案，风险评估",
                type=TaskType.DESIGN.value,
                estimated_hours=6,
                dependencies=[f"{base_id}-01"],
                assignee=None,
                status=TaskStatus.PENDING.value,
                acceptance_criteria=["优化方案文档", "风险评估完成"]
            ),
            Task(
                id=f"{base_id}-03",
                requirement_id=req_id,
                title="优化实现",
                description="执行优化方案",
                type=TaskType.DEVELOPMENT.value,
                estimated_hours=12,
                dependencies=[f"{base_id}-02"],
                assignee=None,
                status=TaskStatus.PENDING.value,
                acceptance_criteria=["优化代码完成", "代码审查通过"]
            ),
            Task(
                id=f"{base_id}-04",
                requirement_id=req_id,
                title="效果验证",
                description="验证优化效果，确保无回归",
                type=TaskType.TESTING.value,
                estimated_hours=6,
                dependencies=[f"{base_id}-03"],
                assignee=None,
                status=TaskStatus.PENDING.value,
                acceptance_criteria=["性能提升达标", "无回归问题"]
            ),
        ]
    
    def _docs_template(self, req: Dict[str, Any]) -> List[Task]:
        """文档模板"""
        req_id = req.get("id", "REQ-0000")
        base_id = req_id.replace("REQ", "TASK")
        
        return [
            Task(
                id=f"{base_id}-01",
                requirement_id=req_id,
                title="内容规划",
                description="确定文档大纲和内容清单",
                type=TaskType.RESEARCH.value,
                estimated_hours=3,
                dependencies=[],
                assignee=None,
                status=TaskStatus.PENDING.value,
                acceptance_criteria=["文档大纲", "内容清单"]
            ),
            Task(
                id=f"{base_id}-02",
                requirement_id=req_id,
                title="内容编写",
                description="编写文档内容",
                type=TaskType.DOCUMENTATION.value,
                estimated_hours=8,
                dependencies=[f"{base_id}-01"],
                assignee=None,
                status=TaskStatus.PENDING.value,
                acceptance_criteria=["初稿完成", "技术审核通过"]
            ),
            Task(
                id=f"{base_id}-03",
                requirement_id=req_id,
                title="格式与发布",
                description="格式规范检查，正式发布",
                type=TaskType.DOCUMENTATION.value,
                estimated_hours=3,
                dependencies=[f"{base_id}-02"],
                assignee=None,
                status=TaskStatus.PENDING.value,
                acceptance_criteria=["格式规范检查", "正式发布"]
            ),
        ]
    
    def _generic_template(self, req: Dict[str, Any]) -> List[Task]:
        """通用模板"""
        req_id = req.get("id", "REQ-0000")
        base_id = req_id.replace("REQ", "TASK")
        
        return [
            Task(
                id=f"{base_id}-01",
                requirement_id=req_id,
                title="需求理解与方案设计",
                description="理解需求，设计实现方案",
                type=TaskType.DESIGN.value,
                estimated_hours=4,
                dependencies=[],
                assignee=None,
                status=TaskStatus.PENDING.value,
                acceptance_criteria=["方案设计完成"]
            ),
            Task(
                id=f"{base_id}-02",
                requirement_id=req_id,
                title="开发实现",
                description="执行开发工作",
                type=TaskType.DEVELOPMENT.value,
                estimated_hours=8,
                dependencies=[f"{base_id}-01"],
                assignee=None,
                status=TaskStatus.PENDING.value,
                acceptance_criteria=["开发完成", "自测通过"]
            ),
            Task(
                id=f"{base_id}-03",
                requirement_id=req_id,
                title="测试验证",
                description="测试验证",
                type=TaskType.TESTING.value,
                estimated_hours=4,
                dependencies=[f"{base_id}-02"],
                assignee=None,
                status=TaskStatus.PENDING.value,
                acceptance_criteria=["测试通过"]
            ),
        ]


def format_json(summary: BreakdownSummary, tasks: List[Task]) -> str:
    """JSON 格式输出"""
    data = {
        "summary": asdict(summary),
        "tasks": [asdict(t) for t in tasks]
    }
    return json.dumps(data, ensure_ascii=False, indent=2)


def format_markdown(summary: BreakdownSummary, tasks: List[Task]) -> str:
    """Markdown 格式输出"""
    lines = [
        "# 开发任务清单",
        "",
        f"**总需求数**: {summary.total_requirements}",
        f"**总任务数**: {summary.total_tasks}",
        f"**预估总工时**: {summary.total_hours} 小时",
        "",
        "## 按类型统计",
        "",
        "| 类型 | 数量 |",
        "|------|------|",
    ]
    
    for task_type, count in summary.by_type.items():
        lines.append(f"| {task_type} | {count} |")
    
    lines.extend(["", "## 任务列表", ""])
    
    # 按需求分组
    current_req = None
    for task in tasks:
        if task.requirement_id != current_req:
            current_req = task.requirement_id
            lines.append(f"### {current_req}")
            lines.append("")
        
        status_icon = "⬜" if task.status == "pending" else "✅"
        lines.append(f"#### {status_icon} {task.id}: {task.title}")
        lines.append(f"- **类型**: {task.type}")
        lines.append(f"- **预估工时**: {task.estimated_hours}h")
        lines.append(f"- **依赖**: {', '.join(task.dependencies) if task.dependencies else '无'}")
        lines.append(f"- **验收标准**:")
        for criteria in task.acceptance_criteria:
            lines.append(f"  - [ ] {criteria}")
        lines.append("")
    
    return "\n".join(lines)


def format_csv(summary: BreakdownSummary, tasks: List[Task]) -> str:
    """CSV 格式输出"""
    lines = [
        "id,requirement_id,title,type,estimated_hours,dependencies,status,acceptance_criteria"
    ]
    
    for task in tasks:
        deps = "|".join(task.dependencies)
        criteria = "|".join(task.acceptance_criteria)
        lines.append(
            f'"{task.id}","{task.requirement_id}","{task.title}","{task.type}",'
            f'"{task.estimated_hours}","{deps}","{task.status}","{criteria}"'
        )
    
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="拆分任务")
    parser.add_argument("--requirements", "-r", required=True, help="需求文件路径")
    parser.add_argument("--output", "-o", required=True, help="输出文件路径")
    parser.add_argument("--format", choices=["json", "markdown", "csv"], default="json", help="输出格式")
    parser.add_argument("--max-task-hours", type=float, default=8, help="最大任务工时")
    parser.add_argument("--include-estimates", type=bool, default=True, help="包含工时估算")
    
    args = parser.parse_args()
    
    # 读取需求
    with open(args.requirements, "r", encoding="utf-8") as f:
        req_data = json.load(f)
    
    requirements = req_data.get("requirements", [])
    
    if not requirements:
        print("⚠️ 没有需求需要拆分")
        return
    
    # 拆分任务
    engine = TaskBreakdownEngine(
        max_task_hours=args.max_task_hours,
        include_estimates=args.include_estimates
    )
    
    summary, tasks = engine.breakdown_batch(requirements)
    
    # 格式化输出
    if args.format == "json":
        content = format_json(summary, tasks)
    elif args.format == "markdown":
        content = format_markdown(summary, tasks)
    else:  # csv
        content = format_csv(summary, tasks)
    
    with open(args.output, "w", encoding="utf-8") as f:
        f.write(content)
    
    # 统计报告
    print(f"✅ 任务拆分完成")
    print(f"   需求数: {summary.total_requirements} | 任务数: {summary.total_tasks} | 总工时: {summary.total_hours}h")
    print(f"   类型分布: {', '.join(f'{k}({v})' for k, v in summary.by_type.items())}")
    print(f"📁 输出文件: {args.output}")


if __name__ == "__main__":
    main()
