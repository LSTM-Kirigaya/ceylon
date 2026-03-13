"""大模型接口"""

import json
from typing import Any, AsyncIterator, Dict, List, Optional

import httpx
from openai import AsyncOpenAI

from ..config import get_config
from ..utils.logger import get_logger

logger = get_logger(__name__)


class LLMClient:
    """大模型客户端"""
    
    def __init__(self):
        self.config = get_config().ai
        self.client: Optional[AsyncOpenAI] = None
        self._init_client()
    
    def _init_client(self) -> None:
        """初始化 OpenAI 客户端"""
        try:
            client_kwargs: Dict[str, Any] = {
                "api_key": self.config.get_api_key(),
                "base_url": self.config.base_url,
                "timeout": self.config.timeout,
            }
            
            # 配置代理
            if self.config.proxy:
                http_client = httpx.AsyncClient(
                    proxies=self.config.proxy,
                    timeout=self.config.timeout,
                )
                client_kwargs["http_client"] = http_client
            
            self.client = AsyncOpenAI(**client_kwargs)
            logger.info(f"LLM 客户端初始化成功，提供商: {self.config.provider}")
            
        except Exception as e:
            logger.error(f"LLM 客户端初始化失败: {e}")
            raise
    
    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        response_format: Optional[Dict[str, str]] = None,
    ) -> str:
        """
        非流式对话
        
        Args:
            messages: 消息列表
            temperature: 温度参数
            max_tokens: 最大 token 数
            response_format: 响应格式（如 json_object）
        
        Returns:
            str: 模型回复内容
        """
        if not self.client:
            raise RuntimeError("LLM 客户端未初始化")
        
        try:
            kwargs: Dict[str, Any] = {
                "model": self.config.model,
                "messages": messages,
                "temperature": temperature or self.config.temperature,
            }
            
            if max_tokens:
                kwargs["max_tokens"] = max_tokens
            
            if response_format:
                kwargs["response_format"] = response_format
            
            response = await self.client.chat.completions.create(**kwargs)
            
            content = response.choices[0].message.content or ""
            
            # 记录 token 使用情况
            if response.usage:
                logger.debug(
                    f"Token 使用: prompt={response.usage.prompt_tokens}, "
                    f"completion={response.usage.completion_tokens}"
                )
            
            return content
            
        except Exception as e:
            logger.error(f"LLM 请求失败: {e}")
            raise
    
    async def chat_stream(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> AsyncIterator[str]:
        """
        流式对话
        
        Args:
            messages: 消息列表
            temperature: 温度参数
            max_tokens: 最大 token 数
        
        Yields:
            str: 模型回复的流式片段
        """
        if not self.client:
            raise RuntimeError("LLM 客户端未初始化")
        
        try:
            kwargs: Dict[str, Any] = {
                "model": self.config.model,
                "messages": messages,
                "temperature": temperature or self.config.temperature,
                "stream": True,
            }
            
            if max_tokens:
                kwargs["max_tokens"] = max_tokens
            
            stream = await self.client.chat.completions.create(**kwargs)
            
            async for chunk in stream:
                content = chunk.choices[0].delta.content
                if content:
                    yield content
                    
        except Exception as e:
            logger.error(f"LLM 流式请求失败: {e}")
            raise
    
    async def extract_json(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        提取 JSON 格式的响应
        
        Args:
            messages: 消息列表
            temperature: 温度参数
        
        Returns:
            Dict: 解析后的 JSON 对象
        """
        content = await self.chat(
            messages,
            temperature=temperature,
            response_format={"type": "json_object"},
        )
        
        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            logger.error(f"JSON 解析失败: {e}, 内容: {content}")
            # 尝试清理并重新解析
            try:
                # 尝试提取 JSON 部分
                start = content.find("{")
                end = content.rfind("}")
                if start != -1 and end != -1:
                    return json.loads(content[start:end+1])
            except:
                pass
            raise


# 全局客户端实例
_llm_client: Optional[LLMClient] = None


async def get_llm_client() -> LLMClient:
    """获取全局 LLM 客户端"""
    global _llm_client
    if _llm_client is None:
        _llm_client = LLMClient()
    return _llm_client
