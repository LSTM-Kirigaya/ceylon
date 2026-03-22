#!/usr/bin/env python3
"""
飞书 (Lark) API 客户端
用于访问飞书多维表格 (Base) 数据
"""

import requests
import json
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from urllib.parse import urlparse, parse_qs


@dataclass
class FeishuCredentials:
    """飞书应用凭证"""
    app_id: str
    app_secret: str


class FeishuClient:
    """
    飞书 API 客户端
    
    使用流程:
    1. 使用 app_id + app_secret 获取 tenant_access_token
    2. 使用 token 访问多维表格 API
    """
    
    BASE_URL = "https://open.feishu.cn/open-apis"
    
    def __init__(self, credentials: FeishuCredentials):
        self.credentials = credentials
        self._token: Optional[str] = None
        self._token_expires: int = 0
    
    def _get_tenant_access_token(self) -> str:
        """
        获取 tenant_access_token
        
        API: POST /auth/v3/tenant_access_token/internal
        """
        url = f"{self.BASE_URL}/auth/v3/tenant_access_token/internal"
        
        payload = {
            "app_id": self.credentials.app_id,
            "app_secret": self.credentials.app_secret
        }
        
        response = requests.post(url, json=payload, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        
        if data.get("code") != 0:
            raise FeishuAPIError(f"获取 token 失败: {data.get('msg')}")
        
        self._token = data["tenant_access_token"]
        self._token_expires = data.get("expire", 7200)
        
        return self._token
    
    @property
    def token(self) -> str:
        """获取有效的 access token（带缓存）"""
        if self._token is None:
            return self._get_tenant_access_token()
        return self._token
    
    def _request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """
        发送 API 请求
        
        Args:
            method: HTTP 方法
            endpoint: API 端点（不含 BASE_URL）
            **kwargs: 传递给 requests 的参数
        """
        url = f"{self.BASE_URL}/{endpoint.lstrip('/')}"
        
        headers = kwargs.pop("headers", {})
        headers["Authorization"] = f"Bearer {self.token}"
        
        # 自动设置 Content-Type
        if method.upper() in ["POST", "PUT", "PATCH"] and "json" in kwargs:
            headers.setdefault("Content-Type", "application/json")
        
        response = requests.request(
            method=method,
            url=url,
            headers=headers,
            timeout=30,
            **kwargs
        )
        
        response.raise_for_status()
        data = response.json()
        
        # 检查飞书 API 错误码
        if data.get("code") != 0:
            raise FeishuAPIError(
                f"API 错误: {data.get('msg')} (code: {data.get('code')})"
            )
        
        return data
    
    def get_base_tables(self, app_token: str) -> List[Dict[str, Any]]:
        """
        获取多维表格的所有数据表
        
        API: GET /bitable/v1/apps/{app_token}/tables
        
        Args:
            app_token: 多维表格的 app_token
        """
        endpoint = f"/bitable/v1/apps/{app_token}/tables"
        
        result = self._request("GET", endpoint)
        return result.get("data", {}).get("items", [])
    
    def get_table_records(
        self,
        app_token: str,
        table_id: str,
        view_id: Optional[str] = None,
        filter_condition: Optional[Dict] = None,
        page_size: int = 500,
        page_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        获取数据表记录
        
        API: POST /bitable/v1/apps/{app_token}/tables/{table_id}/records/search
        
        Args:
            app_token: 多维表格的 app_token
            table_id: 数据表 ID
            view_id: 视图 ID（可选）
            filter_condition: 过滤条件（可选）
            page_size: 每页记录数，默认 500
            page_token: 分页 token（可选）
        """
        endpoint = f"/bitable/v1/apps/{app_token}/tables/{table_id}/records/search"
        
        payload: Dict[str, Any] = {
            "page_size": min(page_size, 500)  # 最大 500
        }
        
        if view_id:
            payload["view_id"] = view_id
        
        if filter_condition:
            payload["filter"] = filter_condition
        
        if page_token:
            payload["page_token"] = page_token
        
        return self._request("POST", endpoint, json=payload)
    
    def get_all_table_records(
        self,
        app_token: str,
        table_id: str,
        view_id: Optional[str] = None,
        filter_condition: Optional[Dict] = None
    ) -> List[Dict[str, Any]]:
        """
        获取数据表所有记录（自动处理分页）
        
        Returns:
            所有记录的列表
        """
        all_records = []
        page_token = None
        
        while True:
            result = self.get_table_records(
                app_token=app_token,
                table_id=table_id,
                view_id=view_id,
                filter_condition=filter_condition,
                page_token=page_token
            )
            
            items = result.get("data", {}).get("items", [])
            all_records.extend(items)
            
            # 检查是否有更多页
            page_token = result.get("data", {}).get("page_token")
            has_more = result.get("data", {}).get("has_more", False)
            
            if not has_more or not page_token:
                break
        
        return all_records
    
    def parse_wiki_url(self, wiki_url: str) -> Dict[str, str]:
        """
        解析飞书 Wiki URL 获取参数
        
        Args:
            wiki_url: 飞书 Wiki 页面 URL
            
        Returns:
            包含 base_token, table_id, view_id 的字典
            
        Example:
            URL: https://dcnvul43dz0u.feishu.cn/wiki/MRdKw34zEiHrttkQkX4cg3qKnUf?table=tbleySTh2QXbwRqu&view=vewMnpNgGD
            返回: {"wiki_token": "MRdKw34zEiHrttkQkX4cg3qKnUf", "table_id": "tbleySTh2QXbwRqu", "view_id": "vewMnpNgGD"}
        """
        parsed = urlparse(wiki_url)
        
        # 从 path 获取 wiki_token
        # /wiki/MRdKw34zEiHrttkQkX4cg3qKnUf -> MRdKw34zEiHrttkQkX4cg3qKnUf
        path_parts = parsed.path.strip("/").split("/")
        wiki_token = path_parts[-1] if len(path_parts) > 0 else ""
        
        # 从 query 获取 table_id 和 view_id
        query_params = parse_qs(parsed.query)
        table_id = query_params.get("table", [""])[0]
        view_id = query_params.get("view", [""])[0]
        
        return {
            "wiki_token": wiki_token,
            "table_id": table_id,
            "view_id": view_id
        }


class FeishuAPIError(Exception):
    """飞书 API 错误"""
    pass
