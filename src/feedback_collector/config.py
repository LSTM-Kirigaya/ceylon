"""配置管理模块"""

import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class WeChatConfig(BaseModel):
    """微信配置"""
    enabled: bool = False
    wxid: str = ""
    db_path: str = ""


class QQConfig(BaseModel):
    """QQ配置"""
    enabled: bool = False
    uin: str = ""
    db_path: str = ""


class PlatformConfig(BaseModel):
    """平台配置"""
    wechat: WeChatConfig = Field(default_factory=WeChatConfig)
    qq: QQConfig = Field(default_factory=QQConfig)


class AIConfig(BaseModel):
    """AI 服务配置"""
    provider: str = "deepseek"
    api_key: str = ""
    model: str = "deepseek-chat"
    base_url: str = "https://api.deepseek.com/v1"
    temperature: float = 0.7
    max_tokens: int = 4000
    timeout: int = 60
    proxy: Optional[Dict[str, str]] = None


class CategoryConfig(BaseModel):
    """分类配置"""
    name: str
    color: str = "#000000"
    description: str = ""


class DeduplicationConfig(BaseModel):
    """去重配置"""
    similarity_threshold: float = 0.85
    use_vector: bool = True


class AnalysisConfig(BaseModel):
    """分析配置"""
    software_name: str = ""
    software_description: str = ""
    categories: List[CategoryConfig] = Field(default_factory=list)
    deduplication: DeduplicationConfig = Field(default_factory=DeduplicationConfig)


class LocalExportConfig(BaseModel):
    """本地导出配置"""
    output_dir: str = "./output"
    format: str = "markdown"
    group_by_date: bool = True


class FeishuExportConfig(BaseModel):
    """飞书导出配置"""
    enabled: bool = False
    app_id: str = ""
    app_secret: str = ""
    table_id: str = ""
    view_id: Optional[str] = None


class NotionExportConfig(BaseModel):
    """Notion 导出配置"""
    enabled: bool = False
    token: str = ""
    database_id: str = ""


class ExportConfig(BaseModel):
    """导出配置"""
    default_target: str = "local"
    local: LocalExportConfig = Field(default_factory=LocalExportConfig)
    feishu: FeishuExportConfig = Field(default_factory=FeishuExportConfig)
    notion: NotionExportConfig = Field(default_factory=NotionExportConfig)


class ScheduleConfig(BaseModel):
    """定时任务配置"""
    enabled: bool = False
    run_time: str = "09:00"
    collect_previous_day: bool = True


class LoggingConfig(BaseModel):
    """日志配置"""
    level: str = "INFO"
    file: str = "logs/feedback-collector.log"
    max_size: str = "10MB"
    backup_count: int = 7


class Config(BaseModel):
    """主配置类"""
    platforms: PlatformConfig = Field(default_factory=PlatformConfig)
    ai: AIConfig = Field(default_factory=AIConfig)
    analysis: AnalysisConfig = Field(default_factory=AnalysisConfig)
    export: ExportConfig = Field(default_factory=ExportConfig)
    schedule: ScheduleConfig = Field(default_factory=ScheduleConfig)
    logging: LoggingConfig = Field(default_factory=LoggingConfig)

    @classmethod
    def from_yaml(cls, path: str) -> "Config":
        """从 YAML 文件加载配置"""
        with open(path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return cls.model_validate(data or {})

    def to_yaml(self, path: str) -> None:
        """保存配置到 YAML 文件"""
        with open(path, "w", encoding="utf-8") as f:
            yaml.dump(self.model_dump(), f, allow_unicode=True, sort_keys=False)


# 全局配置实例
_config: Optional[Config] = None


def get_config() -> Config:
    """获取全局配置"""
    global _config
    if _config is None:
        # 查找配置文件
        config_paths = [
            os.environ.get("FC_CONFIG", ""),
            "./config/config.yaml",
            "./config/config.local.yaml",
            "~/.config/feedback-collector/config.yaml",
        ]
        
        for path in config_paths:
            if path and Path(path).expanduser().exists():
                _config = Config.from_yaml(str(Path(path).expanduser()))
                break
        else:
            # 使用默认配置
            _config = Config()
    
    return _config


def set_config(config: Config) -> None:
    """设置全局配置"""
    global _config
    _config = config
