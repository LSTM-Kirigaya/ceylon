"""群聊信息收集模块"""

from .base import BaseCollector
from .wechat import WeChatCollector

try:
    from .qq import QQCollector
except ImportError:
    QQCollector = None  # type: ignore

__all__ = ["BaseCollector", "WeChatCollector", "QQCollector"]
