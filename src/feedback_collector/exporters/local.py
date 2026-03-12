"""本地文件导出器"""

import csv
import json
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from jinja2 import Template

from ..config import get_config
from ..models import AnalysisResult, Feedback, FeedbackType
from ..utils.logger import get_logger
from .base import BaseExporter

logger = get_logger(__name__)


# Markdown 模板
MARKDOWN_TEMPLATE = """# 用户反馈报告

**生成时间**: {{ generated_at }}  
**分析范围**: {{ result.platform }} / {{ result.group }}  
**统计**: {{ result.total_messages }} 条消息，{{ result.feedbacks | length }} 条反馈

---

## 概览

### 按类型分布

| 类型 | 数量 | 占比 |
|------|------|------|
{% for type_name, count in type_stats.items() %}
| {{ type_name }} | {{ count }} | {{ "%.1f" | format(count / result.feedbacks | length * 100) }}% |
{% endfor %}

### 按优先级分布

| 优先级 | 数量 |
|--------|------|
{% for priority, count in priority_stats.items() %}
| {{ priority }} | {{ count }} |
{% endfor %}

---

## 反馈详情

{% for feedback in result.feedbacks %}
### {{ loop.index }}. {{ feedback.title }}

**类型**: {{ feedback.feedback_type.value }} | **优先级**: {{ feedback.priority }} | **置信度**: {{ "%.2f" | format(feedback.confidence) }}

**描述**:  
{{ feedback.description }}

**关键词**: {{ feedback.keywords | join(", ") or "无" }}  
**建议标签**: {{ feedback.suggested_labels | join(", ") or "无" }}  
**报告者**: {{ feedback.reported_by | join(", ") or "未知" }}

**源消息**:
{% for msg in feedback.source_messages[:3] %}
- [{{ msg.timestamp.strftime("%H:%M") }}] {{ msg.sender_name }}: {{ msg.content[:100] }}{% if msg.content | length > 100 %}...{% endif %}
{% endfor %}

{% if feedback.is_merged %}
> ⚠️ 此反馈由 {{ feedback.merge_count }} 条相似反馈合并而成
{% endif %}

---

{% endfor %}

## 附录

### 原始数据

- JSON 文件: `feedbacks_{{ date_str }}.json`
- CSV 文件: `feedbacks_{{ date_str }}.csv`

### 统计信息

- 总消息数: {{ result.total_messages }}
- 相关消息数: {{ result.relevant_messages }}
- 提取反馈数: {{ result.feedbacks | length }}
- 重复反馈数: {{ result.duplicates_found }}

---

*本报告由 Feedback Collector 自动生成*
"""


class LocalExporter(BaseExporter):
    """本地文件导出器"""
    
    def __init__(self):
        super().__init__(name="local")
        self.config = get_config().export.local
        self.output_dir = Path(self.config.output_dir).expanduser()
        self.format = self.config.format
        self.group_by_date = self.config.group_by_date
    
    async def export(self, result: AnalysisResult) -> bool:
        """导出分析结果"""
        try:
            # 确保输出目录存在
            if self.group_by_date:
                today = datetime.now().strftime("%Y-%m-%d")
                output_dir = self.output_dir / today
            else:
                output_dir = self.output_dir
            
            output_dir.mkdir(parents=True, exist_ok=True)
            
            # 导出多种格式
            date_str = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            # 1. 导出 Markdown
            if self.format == "markdown":
                md_path = output_dir / f"feedbacks_{date_str}.md"
                await self._export_markdown(result, md_path)
                logger.info(f"Markdown 报告已导出: {md_path}")
            
            # 2. 导出 JSON
            json_path = output_dir / f"feedbacks_{date_str}.json"
            await self._export_json(result, json_path)
            logger.info(f"JSON 数据已导出: {json_path}")
            
            # 3. 导出 CSV
            csv_path = output_dir / f"feedbacks_{date_str}.csv"
            await self._export_csv(result.feedbacks, csv_path)
            logger.info(f"CSV 数据已导出: {csv_path}")
            
            return True
            
        except Exception as e:
            logger.error(f"本地导出失败: {e}")
            return False
    
    async def export_feedbacks(
        self,
        feedbacks: List[Feedback],
        **kwargs,
    ) -> bool:
        """导出反馈列表"""
        try:
            output_dir = kwargs.get("output_dir") or self.output_dir
            output_path = Path(output_dir).expanduser()
            output_path.mkdir(parents=True, exist_ok=True)
            
            date_str = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            # 导出为 JSON
            json_path = output_path / f"feedbacks_{date_str}.json"
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(
                    [fb.model_dump() for fb in feedbacks],
                    f,
                    ensure_ascii=False,
                    indent=2,
                    default=str,
                )
            
            # 导出为 CSV
            csv_path = output_path / f"feedbacks_{date_str}.csv"
            await self._export_csv(feedbacks, csv_path)
            
            return True
            
        except Exception as e:
            logger.error(f"导出反馈列表失败: {e}")
            return False
    
    async def check_existing(self, feedback: Feedback) -> Optional[str]:
        """
        检查反馈是否已存在（在本地通过文件比对）
        
        简单实现：检查最近7天的文件中是否存在相似标题
        """
        try:
            from datetime import timedelta
            
            today = datetime.now()
            for i in range(7):
                date = today - timedelta(days=i)
                date_dir = self.output_dir / date.strftime("%Y-%m-%d")
                
                if not date_dir.exists():
                    continue
                
                # 查找 JSON 文件
                for json_file in date_dir.glob("*.json"):
                    try:
                        with open(json_file, "r", encoding="utf-8") as f:
                            data = json.load(f)
                        
                        # 检查是否为 AnalysisResult 格式
                        if isinstance(data, dict) and "feedbacks" in data:
                            data = data["feedbacks"]
                        
                        for item in data:
                            if isinstance(item, dict):
                                existing_title = item.get("title", "")
                                # 简单标题匹配
                                if existing_title.lower() == feedback.title.lower():
                                    return item.get("id", "existing")
                                    
                    except:
                        continue
                        
        except Exception as e:
            logger.debug(f"检查现有反馈失败: {e}")
        
        return None
    
    async def _export_markdown(self, result: AnalysisResult, path: Path) -> None:
        """导出 Markdown 报告"""
        # 计算统计数据
        type_stats = {}
        priority_stats = {}
        
        for fb in result.feedbacks:
            type_name = fb.feedback_type.value
            type_stats[type_name] = type_stats.get(type_name, 0) + 1
            
            priority = fb.priority
            priority_stats[priority] = priority_stats.get(priority, 0) + 1
        
        # 渲染模板
        template = Template(MARKDOWN_TEMPLATE)
        content = template.render(
            result=result,
            generated_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            date_str=datetime.now().strftime("%Y%m%d"),
            type_stats=type_stats,
            priority_stats=priority_stats,
        )
        
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
    
    async def _export_json(self, result: AnalysisResult, path: Path) -> None:
        """导出 JSON 数据"""
        with open(path, "w", encoding="utf-8") as f:
            json.dump(
                result.model_dump(),
                f,
                ensure_ascii=False,
                indent=2,
                default=str,
            )
    
    async def _export_csv(self, feedbacks: List[Feedback], path: Path) -> None:
        """导出 CSV 数据"""
        if not feedbacks:
            # 创建空文件带表头
            with open(path, "w", encoding="utf-8-sig", newline="") as f:
                writer = csv.writer(f)
                writer.writerow([
                    "ID", "标题", "描述", "类型", "优先级", "状态",
                    "置信度", "关键词", "标签", "报告者", "报告时间",
                    "平台", "群聊", "是否合并", "合并数量",
                ])
            return
        
        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            
            # 写入表头
            writer.writerow([
                "ID", "标题", "描述", "类型", "优先级", "状态",
                "置信度", "关键词", "标签", "报告者", "报告时间",
                "平台", "群聊", "是否合并", "合并数量",
            ])
            
            # 写入数据
            for fb in feedbacks:
                writer.writerow([
                    fb.id,
                    fb.title,
                    fb.description.replace("\n", " "),
                    fb.feedback_type.value,
                    fb.priority,
                    fb.status.value,
                    fb.confidence,
                    ", ".join(fb.keywords),
                    ", ".join(fb.suggested_labels),
                    ", ".join(fb.reported_by),
                    fb.reported_at.strftime("%Y-%m-%d %H:%M:%S"),
                    fb.source_platform,
                    fb.source_group,
                    "是" if fb.is_merged else "否",
                    fb.merge_count,
                ])
