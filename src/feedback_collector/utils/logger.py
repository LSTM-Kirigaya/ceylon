"""日志配置"""

import logging
import sys
from pathlib import Path

from rich.console import Console
from rich.logging import RichHandler

from ..config import get_config

# 全局 console 实例
console = Console()


def setup_logging() -> logging.Logger:
    """配置日志"""
    config = get_config().logging
    
    # 根日志配置
    logger = logging.getLogger("feedback_collector")
    logger.setLevel(getattr(logging, config.level.upper()))
    
    # 清除现有处理器
    logger.handlers = []
    
    # Rich 处理器（终端输出）
    rich_handler = RichHandler(
        console=console,
        rich_tracebacks=True,
        markup=True,
        show_time=True,
        show_path=False,
    )
    rich_handler.setLevel(logging.INFO)
    logger.addHandler(rich_handler)
    
    # 文件处理器
    if config.file:
        log_path = Path(config.file).expanduser()
        log_path.parent.mkdir(parents=True, exist_ok=True)
        
        file_handler = logging.FileHandler(log_path, encoding="utf-8")
        file_handler.setLevel(getattr(logging, config.level.upper()))
        
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    return logger


def get_logger(name: str) -> logging.Logger:
    """获取命名日志器"""
    return logging.getLogger(f"feedback_collector.{name}")
