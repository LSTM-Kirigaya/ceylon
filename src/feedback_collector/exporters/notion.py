"""Notion 导出器

使用 Notion API 将反馈上传到 Notion 数据库
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx

from ..config import get_config
from ..models import AnalysisResult, Feedback
from ..utils.logger import get_logger
from .base import BaseExporter

logger = get_logger(__name__)


class NotionAPI:
    """Notion API 客户端"""
    
    BASE_URL = "https://api.notion.com/v1"
    VERSION = "2022-06-28"
    
    def __init__(self, token: str):
        self.token = token
    
    def _get_headers(self) -> Dict[str, str]:
        """获取请求头"""
        return {
            "Authorization": f"Bearer {self.token}",
            "Notion-Version": self.VERSION,
            "Content-Type": "application/json",
        }
    
    async def _request(
        self,
        method: str,
        path: str,
        **kwargs,
    ) -> Dict[str, Any]:
        """发送 API 请求"""
        headers = kwargs.pop("headers", {})
        headers.update(self._get_headers())
        
        url = f"{self.BASE_URL}{path}"
        
        async with httpx.AsyncClient() as client:
            resp = await client.request(
                method,
                url,
                headers=headers,
                **kwargs,
            )
            resp.raise_for_status()
            return resp.json()
    
    async def query_database(
        self,
        database_id: str,
        filter_obj: Optional[Dict] = None,
    ) -> List[Dict]:
        """查询数据库"""
        path = f"/databases/{database_id}/query"
        
        body = {}
        if filter_obj:
            body["filter"] = filter_obj
        
        results = []
        has_more = True
        start_cursor = None
        
        while has_more:
            if start_cursor:
                body["start_cursor"] = start_cursor
            
            resp = await self._request("POST", path, json=body)
            
            results.extend(resp.get("results", []))
            has_more = resp.get("has_more", False)
            start_cursor = resp.get("next_cursor")
        
        return results
    
    async def create_page(
        self,
        database_id: str,
        properties: Dict[str, Any],
        content: Optional[List[Dict]] = None,
    ) -> Dict[str, Any]:
        """创建页面"""
        path = "/pages"
        
        body = {
            "parent": {"database_id": database_id},
            "properties": properties,
        }
        
        if content:
            body["children"] = content
        
        return await self._request("POST", path, json=body)
    
    async def update_page(
        self,
        page_id: str,
        properties: Dict[str, Any],
    ) -> Dict[str, Any]:
        """更新页面"""
        path = f"/pages/{page_id}"
        return await self._request("PATCH", path, json={"properties": properties})


class NotionExporter(BaseExporter):
    """Notion 导出器"""
    
    def __init__(self):
        super().__init__(name="notion")
        config = get_config().export.notion
        self.enabled = config.enabled
        self.token = config.token
        self.database_id = config.database_id
        
        self._api: Optional[NotionAPI] = None
    
    def _get_api(self) -> NotionAPI:
        """获取 API 客户端"""
        if self._api is None:
            self._api = NotionAPI(self.token)
        return self._api
    
    async def export(self, result: AnalysisResult) -> bool:
        """导出分析结果"""
        if not self.enabled:
            logger.warning("Notion 导出器未启用")
            return False
        
        try:
            return await self.export_feedbacks(result.feedbacks)
        except Exception as e:
            logger.error(f"Notion 导出失败: {e}")
            return False
    
    async def export_feedbacks(
        self,
        feedbacks: List[Feedback],
        **kwargs,
    ) -> bool:
        """导出反馈列表"""
        if not self.enabled:
            return False
        
        if not feedbacks:
            logger.info("没有反馈需要导出")
            return True
        
        try:
            api = self._get_api()
            
            success_count = 0
            skip_count = 0
            
            for feedback in feedbacks:
                try:
                    # 检查是否已存在
                    existing = await self.check_existing(feedback)
                    if existing:
                        logger.debug(f"反馈已存在，跳过: {feedback.title}")
                        skip_count += 1
                        continue
                    
                    # 转换为 Notion 属性格式
                    properties = self._convert_to_notion_properties(feedback)
                    
                    # 创建页面
                    await api.create_page(self.database_id, properties)
                    success_count += 1
                    
                except Exception as e:
                    logger.error(f"导出单条反馈失败: {e}")
                    continue
            
            logger.info(f"Notion 导出完成: 成功 {success_count} 条，跳过 {skip_count} 条")
            return success_count > 0
            
        except Exception as e:
            logger.error(f"导出反馈列表失败: {e}")
            return False
    
    async def check_existing(self, feedback: Feedback) -> Optional[str]:
        """检查反馈是否已存在"""
        try:
            api = self._get_api()
            
            # 使用标题作为去重依据
            filter_obj = {
                "property": "标题",
                "title": {
                    "equals": feedback.title,
                }
            }
            
            results = await api.query_database(self.database_id, filter_obj)
            
            if results:
                return results[0].get("id")
            
        except Exception as e:
            logger.debug(f"检查现有反馈失败: {e}")
        
        return None
    
    def _convert_to_notion_properties(self, feedback: Feedback) -> Dict[str, Any]:
        """将反馈转换为 Notion 属性格式"""
        properties = {
            "标题": {
                "title": [{"text": {"content": feedback.title}}]
            },
            "描述": {
                "rich_text": [{"text": {"content": feedback.description[:2000]}}]
            },
            "类型": {
                "select": {"name": feedback.feedback_type.value}
            },
            "优先级": {
                "select": {"name": feedback.priority}
            },
            "状态": {
                "status": {"name": feedback.status.value}
            },
            "置信度": {
                "number": feedback.confidence
            },
            "关键词": {
                "rich_text": [{"text": {"content": ", ".join(feedback.keywords)}}]
            },
            "标签": {
                "multi_select": [{"name": tag} for tag in feedback.suggested_labels]
            },
            "报告者": {
                "rich_text": [{"text": {"content": ", ".join(feedback.reported_by)}}]
            },
            "报告时间": {
                "date": {"start": feedback.reported_at.isoformat()}
            },
            "来源平台": {
                "select": {"name": feedback.source_platform or "未知"}
            },
            "来源群聊": {
                "rich_text": [{"text": {"content": feedback.source_group or ""}}]
            },
            "是否合并": {
                "checkbox": feedback.is_merged
            },
        }
        
        return properties
