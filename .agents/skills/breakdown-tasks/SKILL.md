---
name: breakdown-tasks
description: Break down requirements into executable atomic tasks with estimation and dependencies. Use when you need to (1) decompose requirements into development tasks, (2) estimate task workload and timeline, (3) identify task dependencies and create execution plan, or (4) assign tasks to team members.
---

# Breakdown Tasks

Decompose requirements into executable atomic tasks with time estimation and dependency mapping.

## Critical Constraints

> **ALWAYS** break tasks down until they can be completed in ≤ 8 hours.

> **NEVER** create circular dependencies between tasks.

> **ALWAYS** include clear acceptance criteria for each task.

> **Use type-specific templates** for bug/feature/improvement requirements.

## Step 1: Identify Requirement Type

Determine task breakdown strategy based on requirement type:

| Type | Template | Go To |
|------|----------|-------|
| `bug` | Bug Fix Template | Step 2 |
| `feature` | Feature Development Template | Step 3 |
| `improvement` | Optimization Template | Step 4 |
| `docs` | Documentation Template | Step 5 |
| `other` | Generic Template | Step 6 |

## Step 2: Bug Fix Breakdown

### Standard Bug Fix Tasks

```
TASK-{REQ_ID}-01: 问题复现与定位
├── Type: research
├── Estimated Hours: 2-4
├── Dependencies: none
└── Acceptance Criteria:
    ├── [ ] 能够稳定复现问题
    ├── [ ] 确定问题根因
    └── [ ] 确定影响范围

TASK-{REQ_ID}-02: 修复实现
├── Type: development
├── Estimated Hours: 2-8
├── Dependencies: TASK-{REQ_ID}-01
└── Acceptance Criteria:
    ├── [ ] 代码修复完成
    ├── [ ] 自测通过
    └── [ ] 代码审查通过

TASK-{REQ_ID}-03: 回归测试
├── Type: testing
├── Estimated Hours: 2-4
├── Dependencies: TASK-{REQ_ID}-02
└── Acceptance Criteria:
    ├── [ ] 新增测试用例覆盖 Bug 场景
    ├── [ ] 所有相关测试通过
    └── [ ] 无回归问题
```

### Severity-Based Adjustments

| Severity | Research Hours | Implementation Hours | Testing Hours |
|----------|----------------|---------------------|---------------|
| `critical` | 4 | 8 | 4 |
| `high` | 2 | 4 | 2 |
| `medium` | 2 | 2 | 2 |
| `low` | 1 | 2 | 1 |

## Step 3: Feature Development Breakdown

### Standard Feature Tasks

```
TASK-{REQ_ID}-01: 需求细化与技术方案
├── Type: design
├── Estimated Hours: 4-8
├── Dependencies: none
└── Acceptance Criteria:
    ├── [ ] 技术方案文档
    ├── [ ] 接口设计完成
    └── [ ] 方案评审通过

TASK-{REQ_ID}-02: UI/UX 设计 (if applicable)
├── Type: design
├── Estimated Hours: 8-16
├── Dependencies: TASK-{REQ_ID}-01
└── Acceptance Criteria:
    ├── [ ] 设计稿完成
    └── [ ] 设计评审通过

TASK-{REQ_ID}-03: 后端开发
├── Type: development
├── Estimated Hours: 16-40
├── Dependencies: TASK-{REQ_ID}-01
└── Acceptance Criteria:
    ├── [ ] API 实现完成
    ├── [ ] 单元测试覆盖 ≥ 80%
    └── [ ] API 文档更新

TASK-{REQ_ID}-04: 前端开发 (if applicable)
├── Type: development
├── Estimated Hours: 16-32
├── Dependencies: TASK-{REQ_ID}-02, TASK-{REQ_ID}-03
└── Acceptance Criteria:
    ├── [ ] 页面开发完成
    └── [ ] 联调通过

TASK-{REQ_ID}-05: 集成测试
├── Type: testing
├── Estimated Hours: 4-8
├── Dependencies: TASK-{REQ_ID}-04 (or TASK-{REQ_ID}-03 for backend-only)
└── Acceptance Criteria:
    ├── [ ] 端到端测试通过
    └── [ ] 性能指标达标

TASK-{REQ_ID}-06: 文档更新
├── Type: documentation
├── Estimated Hours: 2-4
├── Dependencies: TASK-{REQ_ID}-05
└── Acceptance Criteria:
    ├── [ ] 用户文档更新
    └── [ ] CHANGELOG 更新
```

### Complexity Multipliers

| Complexity | Multiplier | Indicator |
|------------|------------|-----------|
| Simple | 0.6 | Single component, familiar tech |
| Medium | 1.0 | Multiple components, standard integration |
| Complex | 1.5 | New technology, cross-team dependency |
| Very Complex | 2.0+ | Architecture change, high uncertainty |

## Step 4: Improvement Breakdown

### Standard Optimization Tasks

```
TASK-{REQ_ID}-01: 现状分析与目标设定
├── Type: research
├── Estimated Hours: 4-8
├── Dependencies: none
└── Acceptance Criteria:
    ├── [ ] 性能基线测试
    ├── [ ] 瓶颈定位
    └── [ ] 优化目标确定

TASK-{REQ_ID}-02: 优化方案设计
├── Type: design
├── Estimated Hours: 4-8
├── Dependencies: TASK-{REQ_ID}-01
└── Acceptance Criteria:
    ├── [ ] 优化方案文档
    └── [ ] 风险评估

TASK-{REQ_ID}-03: 优化实现
├── Type: development
├── Estimated Hours: 8-24
├── Dependencies: TASK-{REQ_ID}-02
└── Acceptance Criteria:
    ├── [ ] 优化代码完成
    └── [ ] 代码审查通过

TASK-{REQ_ID}-04: 效果验证
├── Type: testing
├── Estimated Hours: 4-8
├── Dependencies: TASK-{REQ_ID}-03
└── Acceptance Criteria:
    ├── [ ] 性能提升达标
    └── [ ] 无回归问题
```

## Step 5: Documentation Breakdown

```
TASK-{REQ_ID}-01: 内容规划
├── Type: research
├── Estimated Hours: 2-4
└── Acceptance Criteria:
    ├── [ ] 文档大纲
    └── [ ] 内容清单

TASK-{REQ_ID}-02: 内容编写
├── Type: documentation
├── Estimated Hours: 4-16
├── Dependencies: TASK-{REQ_ID}-01
└── Acceptance Criteria:
    ├── [ ] 初稿完成
    └── [ ] 技术审核通过

TASK-{REQ_ID}-03: 格式与发布
├── Type: documentation
├── Estimated Hours: 2-4
├── Dependencies: TASK-{REQ_ID}-02
└── Acceptance Criteria:
    ├── [ ] 格式规范检查
    └── [ ] 正式发布
```

## Step 6: Run Task Breakdown

### Command

```bash
python -m src.breakdown_tasks \
  --requirements ./deduplicated_requirements.json \
  --output ./tasks.json \
  --format json
```

### Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `--requirements` | Yes | - | Path to deduplicated requirements JSON |
| `--output` | Yes | - | Output file path |
| `--format` | No | `json` | Output format: `json`, `markdown`, `csv` |
| `--max-task-hours` | No | `8` | Maximum hours per task (split if exceeded) |
| `--include-estimates` | No | `true` | Include time estimates |
| `--include-assignee` | No | `false` | Auto-assign based on task type |

## Step 7: Output Formats

### JSON Format (for automation)

```json
{
  "summary": {
    "total_requirements": 5,
    "total_tasks": 23,
    "total_hours": 156,
    "by_type": {
      "research": 3,
      "design": 4,
      "development": 10,
      "testing": 4,
      "documentation": 2
    }
  },
  "tasks": [
    {
      "id": "TASK-0001-01",
      "requirement_id": "REQ-0001",
      "title": "问题复现与定位",
      "description": "复现 Bug，定位问题根因",
      "type": "research",
      "estimated_hours": 2,
      "dependencies": [],
      "assignee": null,
      "status": "pending",
      "acceptance_criteria": [
        "能够稳定复现问题",
        "确定问题根因"
      ]
    }
  ]
}
```

### Markdown Format (for humans)

```bash
python -m src.breakdown_tasks \
  --requirements ./deduplicated.json \
  --output ./tasks.md \
  --format markdown
```

Generates a readable task list with checkboxes.

### CSV Format (for project management tools)

```bash
python -m src.breakdown_tasks \
  --requirements ./deduplicated.json \
  --output ./tasks.csv \
  --format csv
```

Compatible with Jira, Linear, Notion, etc.

## Task Types

| Type | Description | Typical Hours |
|------|-------------|---------------|
| `research` | 调研、分析、方案设计 | 2-8 |
| `design` | UI/UX 设计、架构设计 | 4-16 |
| `development` | 编码实现 | 4-40 |
| `testing` | 测试、验证 | 2-8 |
| `documentation` | 文档编写 | 2-8 |
| `deployment` | 部署、发布 | 1-4 |

## Dependency Rules

### Valid Dependencies

- Research → Design → Development → Testing → Documentation
- Backend Development || Frontend Development (parallel)
- Integration Testing depends on both Backend and Frontend

### Invalid Dependencies (Circular)

- Testing → Development → Testing
- Design → Research (should be Research → Design)

## Estimation Guidelines

### Base Estimation Formula

```
Estimated Hours = Base Hours × Complexity Multiplier × Uncertainty Buffer
```

| Uncertainty | Buffer |
|-------------|--------|
| Low (familiar tech) | 1.0 |
| Medium (some unknowns) | 1.2 |
| High (new tech/area) | 1.5 |

### Common Task Estimates

| Task | Simple | Medium | Complex |
|------|--------|--------|---------|
| API endpoint | 4h | 8h | 16h |
| UI component | 4h | 8h | 16h |
| Bug fix | 2h | 4h | 8h |
| Database migration | 1h | 2h | 4h |
| Unit tests | 2h | 4h | 8h |

## Quick Reference Checklist

Before breakdown:

- [ ] Requirements are analyzed and deduplicated
- [ ] Each requirement has clear acceptance criteria
- [ ] Requirement type is correctly classified
- [ ] Complexity level is assessed

After breakdown:

- [ ] No task exceeds max hours limit
- [ ] No circular dependencies
- [ ] All tasks have acceptance criteria
- [ ] Critical path is identified
- [ ] Total estimate matches team capacity

## Integration

### Previous Step

Input comes from `check-duplicates`:

```bash
python -m src.check_duplicates \
  --requirements ./analyzed.json \
  --existing-db ./issues.json \
  --output ./deduplicated.json

python -m src.breakdown_tasks \
  --requirements ./deduplicated.json \
  --output ./tasks.json
```

### Next Steps

After task breakdown:

1. Import tasks to project management tool
2. Assign tasks to team members
3. Set up tracking dashboard
4. Schedule sprint planning
