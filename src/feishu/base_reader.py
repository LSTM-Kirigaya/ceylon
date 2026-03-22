#!/usr/bin/env python3
"""
飞书多维表格需求读取器
专门用于从飞书表格读取需求数据
"""

import json
from typing import List, Dict, Any, Optional
from datetime import datetime
from .client import FeishuClient, FeishuCredentials, FeishuAPIError


class FeishuRequirementsReader:
    """
    飞书需求表格读取器
    
    将飞书表格记录转换为需求分析模块可用的格式
    """
    
    # 飞书表格字段名到标准字段名的映射
    FIELD_MAPPING = {
        # 常见需求字段名变体
        "需求标题": "title",
        "标题": "title",
        "需求描述": "description",
        "描述": "description",
        "需求内容": "content",
        "内容": "content",
        "反馈来源": "source",
        "来源": "source",
        "优先级": "priority",
        "类型": "type",
        "需求类型": "type",
        "状态": "status",
        "提出人": "reporter",
        "创建时间": "created_at",
        "更新时间": "updated_at",
        "标签": "tags",
        "关键词": "keywords",
    }
    
    def __init__(self, client: FeishuClient):
        self.client = client
    
    def read_requirements_from_url(
        self,
        wiki_url: str,
        app_token: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        从飞书 Wiki URL 读取需求
        
        Args:
            wiki_url: 飞书 Wiki 页面 URL
            app_token: 多维表格的 app_token（如果已知）
                      如果为 None，需要通过其他方式获取
        """
        # 解析 URL
        url_info = self.client.parse_wiki_url(wiki_url)
        
        table_id = url_info.get("table_id")
        view_id = url_info.get("view_id")
        
        if not table_id:
            raise ValueError(f"无法从 URL 解析 table_id: {wiki_url}")
        
        if not app_token:
            raise ValueError(
                "需要提供 app_token 来访问多维表格。\n"
                "获取方式：\n"
                "1. 打开飞书多维表格\n"
                "2. 点击右上角 '...' → 设置\n"
                "3. 复制 'App Token'"
            )
        
        # 获取所有记录
        records = self.client.get_all_table_records(
            app_token=app_token,
            table_id=table_id,
            view_id=view_id if view_id else None
        )
        
        # 转换为标准格式
        return self._convert_records(records)
    
    def read_requirements(
        self,
        app_token: str,
        table_id: str,
        view_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        从指定的多维表格读取需求
        
        Args:
            app_token: 多维表格的 app_token
            table_id: 数据表 ID
            view_id: 视图 ID（可选）
        """
        records = self.client.get_all_table_records(
            app_token=app_token,
            table_id=table_id,
            view_id=view_id
        )
        
        return self._convert_records(records)
    
    def _convert_records(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        将飞书记录转换为标准需求格式
        
        飞书记录格式:
        {
            "record_id": "recxxx",
            "fields": {
                "需求标题": "xxx",
                "需求描述": "xxx",
                ...
            },
            "created_time": 1234567890,
            "updated_time": 1234567890
        }
        
        转换为:
        {
            "id": "recxxx",
            "title": "xxx",
            "description": "xxx",
            "source": "feishu",
            "timestamp": "2026-03-22T10:00:00"
        }
        """
        requirements = []
        
        for record in records:
            fields = record.get("fields", {})
            
            # 转换字段名
            converted = self._map_fields(fields)
            
            # 添加元数据
            converted["id"] = record.get("record_id", "")
            converted["source"] = converted.get("source", "feishu")
            
            # 处理时间戳
            created_time = record.get("created_time")
            if created_time:
                converted["timestamp"] = self._timestamp_to_iso(created_time)
            
            # 如果没有内容字段，尝试组合标题和描述
            if "content" not in converted and "description" in converted:
                converted["content"] = converted["description"]
            
            requirements.append(converted)
        
        return requirements
    
    def _map_fields(self, fields: Dict[str, Any]) -> Dict[str, Any]:
        """映射字段名"""
        converted = {}
        
        for key, value in fields.items():
            # 查找映射
            standard_key = self.FIELD_MAPPING.get(key, key)
            
            # 处理飞书特殊字段类型
            if isinstance(value, list):
                # 多选、人员等字段是列表
                if len(value) > 0 and isinstance(value[0], dict):
                    # 人员字段: [{"name": "xxx", "id": "ou_xxx"}]
                    if "name" in value[0]:
                        converted[standard_key] = ", ".join(
                            item.get("name", "") for item in value
                        )
                    else:
                        converted[standard_key] = value
                else:
                    # 普通数组（多选）
                    converted[standard_key] = ", ".join(str(v) for v in value)
            elif isinstance(value, dict):
                # 链接、附件等
                if "text" in value:
                    converted[standard_key] = value["text"]
                elif "link" in value:
                    converted[standard_key] = value["link"]
                else:
                    converted[standard_key] = json.dumps(value, ensure_ascii=False)
            else:
                converted[standard_key] = value
        
        return converted
    
    def _timestamp_to_iso(self, timestamp: int) -> str:
        """将飞书时间戳转换为 ISO 格式"""
        # 飞书时间戳是毫秒
        if timestamp > 10**10:
            timestamp = timestamp / 1000
        
        dt = datetime.fromtimestamp(timestamp)
        return dt.isoformat()
    
    def get_table_schema(self, app_token: str, table_id: str) -> List[Dict[str, Any]]:
        """
        获取表格结构信息（用于调试）
        """
        tables = self.client.get_base_tables(app_token)
        
        for table in tables:
            if table.get("table_id") == table_id:
                return table.get("fields", [])
        
        return []


def create_reader(app_id: str, app_secret: str) -> FeishuRequirementsReader:
    """
    便捷函数：创建飞书需求读取器
    
    Args:
        app_id: 飞书应用的 App ID
        app_secret: 飞书应用的 App Secret
    """
    credentials = FeishuCredentials(app_id=app_id, app_secret=app_secret)
    client = FeishuClient(credentials)
    return FeishuRequirementsReader(client)
