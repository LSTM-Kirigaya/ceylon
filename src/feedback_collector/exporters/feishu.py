"""飞书多维表格导出器

使用飞书开放平台 API 将反馈上传到多维表格
"""

import json
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx

from ..config import get_config
from ..models import AnalysisResult, Feedback
from ..utils.logger import get_logger
from .base import BaseExporter

logger = get_logger(__name__)


class FeishuAPI:
    """飞书 API 客户端"""
    
    BASE_URL = "https://open.feishu.cn/open-apis"
    
    def __init__(self, app_id: str, app_secret: str):
        self.app_id = app_id
        self.app_secret = app_secret
        self._token: Optional[str] = None
        self._token_expire: Optional[datetime] = None
    
    async def _get_access_token(self) -> str:
        """获取访问令牌"""
        if self._token and self._token_expire and datetime.now() < self._token_expire:
            return self._token
        
        url = f"{self.BASE_URL}/auth/v3/tenant_access_token/internal"
        
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                url,
                json={
                    "app_id": self.app_id,
                    "app_secret": self.app_secret,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            
            if data.get("code") != 0:
                raise RuntimeError(f"获取 token 失败: {data}")
            
            self._token = data["tenant_access_token"]
            # token 有效期约 2 小时，提前 10 分钟刷新
            expire = data.get("expire", 7200)
            self._token_expire = datetime.now() + __import__('datetime').timedelta(seconds=expire - 600)
            
            return self._token
    
    async def _request(
        self,
        method: str,
        path: str,
        **kwargs,
    ) -> Dict[str, Any]:
        """发送 API 请求"""
        token = await self._get_access_token()
        
        headers = kwargs.pop("headers", {})
        headers["Authorization"] = f"Bearer {token}"
        
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
    
    async def get_table_fields(self, table_id: str) -> List[Dict]:
        """获取表格字段列表"""
        path = f"/bitable/v1/apps/{table_id}/tables/{table_id}/fields"
        resp = await self._request("GET", path)
        
        if resp.get("code") != 0:
            raise RuntimeError(f"获取字段失败: {resp}")
        
        return resp.get("data", {}).get("items", [])
    
    async def search_records(
        self,
        table_id: str,
        filter_conditions: Optional[Dict] = None,
    ) -> List[Dict]:
        """搜索记录"""
        path = f"/bitable/v1/apps/{table_id}/tables/{table_id}/records/search"
        
        body = {}
        if filter_conditions:
            body["filter"] = filter_conditions
        
        resp = await self._request("POST", path, json=body)
        
        if resp.get("code") != 0:
            raise RuntimeError(f"搜索记录失败: {resp}")
        
        return resp.get("data", {}).get("items", [])
    
    async def create_record(
        self,
        table_id: str,
        fields: Dict[str, Any],
    ) -> Dict[str, Any]:
        """创建记录"""
        path = f"/bitable/v1/apps/{table_id}/tables/{table_id}/records"
        
        resp = await self._request(
            "POST",
            path,
            json={"fields": fields},
        )
        
        if resp.get("code") != 0:
            raise RuntimeError(f"创建记录失败: {resp}")
        
        return resp.get("data", {})
    
    async def update_record(
        self,
        table_id: str,
        record_id: str,
        fields: Dict[str, Any],
    ) -> Dict[str, Any]:
        """更新记录"""
        path = f"/bitable/v1/apps/{table_id}/tables/{table_id}/records/{record_id}"
        
        resp = await self._request(
            "PUT",
            path,
            json={"fields": fields},
        )
        
        if resp.get("code") != 0:
            raise RuntimeError(f"更新记录失败: {resp}")
        
        return resp.get("data", {})


class FeishuExporter(BaseExporter):
    """飞书多维表格导出器"""
    
    def __init__(self):
        super().__init__(name="feishu")
        config = get_config().export.feishu
        self.enabled = config.enabled
        self.app_id = config.app_id
        self.app_secret = config.app_secret
        self.table_id = config.table_id
        self.view_id = config.view_id
        
        self._api: Optional[FeishuAPI] = None
        self._field_mapping: Optional[Dict[str, str]] = None
    
    def _get_api(self) -> FeishuAPI:
        """获取 API 客户端"""
        if self._api is None:
            self._api = FeishuAPI(self.app_id, self.app_secret)
        return self._api
    
    async def export(self, result: AnalysisResult) -> bool:
        """导出分析结果"""
        if not self.enabled:
            logger.warning("飞书导出器未启用")
            return False
        
        try:
            return await self.export_feedbacks(result.feedbacks)
        except Exception as e:
            logger.error(f"飞书导出失败: {e}")
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
            
            # 获取字段映射
            await self._init_field_mapping()
            
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
                    
                    # 转换为飞书字段格式
                    fields = self._convert_to_feishu_fields(feedback)
                    
                    # 创建记录
                    await api.create_record(self.table_id, fields)
                    success_count += 1
                    
                except Exception as e:
                    logger.error(f"导出单条反馈失败: {e}")
                    continue
            
            logger.info(f"飞书导出完成: 成功 {success_count} 条，跳过 {skip_count} 条")
            return success_count > 0
            
        except Exception as e:
            logger.error(f"导出反馈列表失败: {e}")
            return False
    
    async def check_existing(self, feedback: Feedback) -> Optional[str]:
        """检查反馈是否已存在"""
        try:
            api = self._get_api()
            
            # 使用标题作为去重依据
            # 注意：这里假设表格中有"标题"字段，实际使用时需要根据字段映射调整
            title_field = self._field_mapping.get("标题", "标题") if self._field_mapping else "标题"
            
            filter_conditions = {
                "conjunction": "and",
                "conditions": [
                    {
                        "field_name": title_field,
                        "operator": "is",
                        "value": [feedback.title],
                    }
                ]
            }
            
            records = await api.search_records(self.table_id, filter_conditions)
            
            if records:
                return records[0].get("record_id")
            
        except Exception as e:
            logger.debug(f"检查现有反馈失败: {e}")
        
        return None
    
    async def _init_field_mapping(self) -> None:
        """初始化字段映射"""
        if self._field_mapping is not None:
            return
        
        try:
            api = self._get_api()
            fields = await api.get_table_fields(self.table_id)
            
            # 建立字段名到 field_id 的映射
            self._field_mapping = {}
            for field in fields:
                field_name = field.get("field_name", "")
                field_id = field.get("field_id", "")
                self._field_mapping[field_name] = field_id
            
            logger.debug(f"飞书表格字段: {self._field_mapping}")
            
        except Exception as e:
            logger.warning(f"初始化字段映射失败: {e}")
            self._field_mapping = {}
    
    def _convert_to_feishu_fields(self, feedback: Feedback) -> Dict[str, Any]:
        """将反馈转换为飞书字段格式"""
        fields = {
            "标题": feedback.title,
            "描述": feedback.description,
            "类型": feedback.feedback_type.value,
            "优先级": feedback.priority,
            "状态": feedback.status.value,
            "置信度": feedback.confidence,
            "关键词": ", ".join(feedback.keywords) if feedback.keywords else "",
            "标签": ", ".join(feedback.suggested_labels) if feedback.suggested_labels else "",
            "报告者": ", ".join(feedback.reported_by) if feedback.reported_by else "",
            "报告时间": feedback.reported_at.strftime("%Y-%m-%d %H:%M:%S"),
            "来源平台": feedback.source_platform,
            "来源群聊": feedback.source_group,
            "是否合并": "是" if feedback.is_merged else "否",
            "合并数量": feedback.merge_count,
        }
        
        return fields
