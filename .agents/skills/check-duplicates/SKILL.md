---
name: check-duplicates
description: Check for duplicate or similar requirements against existing issue database. Use when you need to (1) detect duplicate feature requests or bugs, (2) find similar existing issues before creating new ones, (3) determine whether to skip, merge, or create new issues, or (4) batch process requirements for deduplication.
---

# Check Duplicates

Detect duplicate or semantically similar requirements against existing issue database.

## Critical Constraints

> **ALWAYS** run this before creating new issues. Prevent issue tracker pollution.

> **NEVER** auto-close as duplicate without human review when similarity is 0.75-0.85.

> **ALWAYS** preserve original requirement IDs for traceability.

> **Use semantic search** for short titles, **keyword matching** for long descriptions.

## Step 1: Assess Scale

Count requirements to determine strategy:

```bash
python -m src.check_duplicates \
  --requirements ./output/analyzed_requirements.json \
  --count-only
```

| Count | Strategy | Go To |
|-------|----------|-------|
| < 10 | Interactive review | Step 2 |
| 10-100 | Batch processing | Step 3 |
| > 100 | Staged rollout | Step 4 |

## Step 2: Interactive Review (Small Batch)

### Command

```bash
python -m src.check_duplicates \
  --requirements ./requirements.json \
  --existing-db ./existing_issues.json \
  --interactive \
  --threshold 0.75
```

### Interactive Mode Flow

For each potential duplicate:

```
[REQ-0001] "添加导出功能"
Similar to: ISSUE-123 "支持数据导出" (similarity: 0.82)

Actions:
  [s] Skip (duplicate)
  [m] Merge (add comment to existing)
  [c] Create new
  [v] View details
  [q] Quit

Choice: _
```

## Step 3: Batch Processing

### Command

```bash
python -m src.check_duplicates \
  --requirements ./requirements.json \
  --existing-db ./existing_issues.json \
  --output ./deduplicated.json \
  --threshold 0.75 \
  --auto-merge-threshold 0.90
```

### Thresholds Explanation

| Threshold | Action | Recommendation |
|-----------|--------|----------------|
| ≥ 0.90 | `skip` | High confidence duplicate, auto-skip |
| 0.75-0.90 | `review` | Potential duplicate, needs human review |
| < 0.75 | `create_new` | Not a duplicate, create new issue |

### Output Format

```json
{
  "summary": {
    "total_checked": 50,
    "duplicates": 8,
    "similar": 12,
    "new": 30,
    "processing_time_ms": 2500
  },
  "results": [
    {
      "requirement_id": "REQ-0001",
      "is_duplicate": true,
      "confidence": 0.92,
      "recommendation": "skip",
      "matched_issues": [
        {
          "issue_id": "ISSUE-123",
          "title": "支持数据导出",
          "similarity": 0.92,
          "match_method": "semantic"
        }
      ],
      "action_taken": "skipped"
    }
  ]
}
```

## Step 4: Staged Rollout (Large Scale)

For >100 requirements, process in stages:

### Stage 1: High Confidence Duplicates (Auto-skip)

```bash
python -m src.check_duplicates \
  --requirements ./batch/phase1.json \
  --existing-db ./existing_issues.json \
  --threshold 0.90 \
  --auto-action skip \
  --output ./results/phase1_done.json
```

### Stage 2: Medium Confidence (Review Queue)

```bash
python -m src.check_duplicates \
  --requirements ./batch/phase2.json \
  --existing-db ./existing_issues.json \
  --threshold 0.75 \
  --max-similarity 0.90 \
  --output ./results/review_queue.json
```

### Stage 3: New Requirements

```bash
python -m src.check_duplicates \
  --requirements ./batch/phase3.json \
  --existing-db ./existing_issues.json \
  --threshold 0.75 \
  --recommendation create_new \
  --output ./results/new_requirements.json
```

## Matching Algorithms

### Algorithm Selection

| Scenario | Primary Method | Fallback |
|----------|---------------|----------|
| Short titles (< 10 words) | Semantic embeddings | Keyword overlap |
| Long descriptions | Keyword + TF-IDF | Semantic similarity |
| Code snippets | Exact hash match | Normalized code comparison |

### Semantic Search

Use AI embeddings for semantic similarity:

```bash
python -m src.check_duplicates \
  --requirements ./requirements.json \
  --existing-db ./existing_issues.json \
  --method semantic \
  --ai-provider deepseek \
  --api-key $API_KEY
```

### Keyword Matching

Fast, offline matching based on keyword overlap:

```bash
python -m src.check_duplicates \
  --requirements ./requirements.json \
  --existing-db ./existing_issues.json \
  --method keyword
```

## Existing Database Format

```json
{
  "meta": {
    "version": "1.0",
    "last_updated": "2026-03-22T00:00:00",
    "total_issues": 1500
  },
  "issues": [
    {
      "id": "ISSUE-123",
      "title": "支持数据导出",
      "description": "希望能导出数据为Excel格式",
      "type": "feature",
      "status": "open",
      "keywords": ["导出", "Excel", "数据"],
      "created_at": "2026-01-15T10:00:00"
    }
  ]
}
```

## Decision Framework

### When to `skip`?

- Similarity ≥ 0.90
- Same feature/bug described
- No new information

### When to `merge`?

- Similarity 0.75-0.90
- Related but additional context
- Same area, different angle

### When to `create_new`?

- Similarity < 0.75
- Clearly distinct requirement
- Different component/feature area

## Common Pitfalls

### False Positives

| Scenario | Solution |
|----------|----------|
| Generic terms match | Require at least 2 keyword matches |
| Different platforms, same bug | Check component tags |
| Similar titles, different features | Compare description embeddings |

### False Negatives

| Scenario | Solution |
|----------|----------|
| Different wording, same issue | Use semantic search |
| Abbreviations vs full terms | Normalize keywords |
| Chinese vs English description | Translate before matching |

## Verification Checklist

Before using results:

- [ ] Review at least 10 random samples
- [ ] Verify threshold is appropriate for your data
- [ ] Check that similarity scores make sense
- [ ] Confirm action recommendations align with expectations

After processing:

- [ ] Skipped items truly are duplicates
- [ ] Merged items added value to existing issues
- [ ] New items don't have overlooked matches
- [ ] Update existing database with newly created issues

## Integration

### Previous Step

Input comes from `analyze-requirements`:

```bash
python -m src.analyze_requirements \
  --input ./raw.json \
  --output ./analyzed.json

python -m src.check_duplicates \
  --requirements ./analyzed.json \
  --existing-db ./issues.json
```

### Next Step

Pass deduplicated requirements to `breakdown-tasks`:

```bash
python -m src.breakdown_tasks \
  --requirements ./deduplicated.json \
  --output ./tasks.json
```
