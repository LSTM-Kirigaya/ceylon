---
name: analyze-requirements
description: Analyze raw feedback/requirements using AI to extract structured requirements with classification and priority. Use when you need to (1) process user feedback into structured requirements, (2) classify requirements into types (bug/feature/improvement/docs/other), (3) prioritize requirements based on urgency and impact, or (4) extract keywords from requirements for searchability.
---

# Analyze Requirements

Extract structured requirements from raw user feedback using AI-powered analysis.

## Critical Constraints

> **ALWAYS** validate input data format before processing.

> **NEVER** store raw PII (Personally Identifiable Information) in extracted requirements. Sanitize user names, emails, phone numbers.

> **ALWAYS** include confidence score (0-1) for AI-extracted fields.

> **Use keyword-based classification as fallback** when AI service is unavailable.

## Step 1: Determine Operation

Classify what you need to do:

| Intent | Input Type | Go To |
|--------|-----------|-------|
| Process batch feedback from chat/messaging | Raw messages JSON | Step 2 |
| Analyze single requirement description | Text string | Step 3 |
| Re-analyze existing requirements with different criteria | Structured requirements | Step 4 |

## Step 2: Prepare Input Data

### Input Format (Batch)

```json
{
  "source": "wechat",
  "date": "2026-03-22",
  "items": [
    {
      "id": "msg_001",
      "content": "用户反馈的原始文本内容",
      "sender_name": "匿名用户",
      "timestamp": "2026-03-22T10:30:00"
    }
  ]
}
```

### Validation Checklist

- [ ] `items` array is not empty
- [ ] Each item has `content` field with non-empty text
- [ ] `timestamp` is ISO 8601 format
- [ ] `source` is one of supported platforms: `wechat`, `qq`, `slack`, `email`, `form`

## Step 3: Run Analysis

### Command

```bash
python -m src.analyze_requirements \
  --input ./data/raw_feedback.json \
  --output ./output/analyzed_requirements.json \
  --ai-provider deepseek \
  --api-key $DEEPSEEK_API_KEY
```

### Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `--input` | Yes | - | Path to raw feedback JSON |
| `--output` | Yes | - | Path to output file |
| `--ai-provider` | No | `deepseek` | AI provider: `deepseek`, `openai`, `zhipu`, `moonshot` |
| `--api-key` | No | env var | API key for AI provider |
| `--min-confidence` | No | `0.7` | Minimum confidence threshold for extraction |

## Step 4: Understanding Output

### Output Format

```json
{
  "meta": {
    "total_input": 10,
    "extracted": 8,
    "filtered_low_confidence": 2,
    "processing_time_ms": 1500
  },
  "requirements": [
    {
      "id": "REQ-0001",
      "title": "需求标题",
      "description": "需求详细描述",
      "type": "bug",
      "priority": "high",
      "source": "wechat",
      "keywords": ["崩溃", "登录", "iOS"],
      "confidence": 0.92,
      "created_at": "2026-03-22T10:30:00"
    }
  ]
}
```

### Classification Rules

| Type | Keywords | Example |
|------|----------|---------|
| `bug` | 崩溃、闪退、错误、bug、fix、error、crash | "App 崩溃了" |
| `feature` | 功能、新增、添加、feature、add、support | "希望能导出 Excel" |
| `improvement` | 优化、改进、提升、improve、enhance、better | "加载速度太慢" |
| `docs` | 文档、说明、doc、document、guide | "API 文档不清楚" |
| `other` | - | 其他无法分类的内容 |

### Priority Calculation

| Priority | Signals |
|----------|---------|
| `critical` | 崩溃、无法使用、数据丢失、安全漏洞、大量用户受影响 |
| `high` | 核心功能受影响、性能严重下降、用户强烈反馈 |
| `medium` | 一般功能改进、非阻塞问题 |
| `low` | 建议、 Enhancement、边缘场景 |

## Step 5: Handle Low Confidence Items

Items with confidence < `--min-confidence` are excluded from output but logged.

### Review Low Confidence Items

```bash
python -m src.analyze_requirements \
  --input ./data/raw_feedback.json \
  --output ./output/analyzed.json \
  --review-low-confidence ./output/review_needed.json
```

## Decision Guide

### When to use keyword-based classification?

- AI service is unavailable or rate limited
- Processing time is critical (< 100ms per item)
- Input is very short (< 10 characters)

### When to adjust `--min-confidence`?

| Scenario | Recommended Value |
|----------|------------------|
| Strict quality control | `0.85` |
| Balanced (default) | `0.70` |
| Maximum extraction | `0.50` |

## Quick Reference Checklist

Before running analysis:

- [ ] Input file exists and is valid JSON
- [ ] API key is configured or environment variable is set
- [ ] Output directory exists
- [ ] PII sanitization is enabled (if required)

After running analysis:

- [ ] Review items with confidence < 0.8
- [ ] Verify classification accuracy on sample
- [ ] Check extracted keywords are relevant
- [ ] Confirm priority levels match business impact

## Integration

### Next Step

After analysis, typically run `check-duplicates` to detect duplicates:

```bash
python -m src.check_duplicates \
  --requirements ./output/analyzed_requirements.json \
  --existing-db ./data/existing_issues.json
```
