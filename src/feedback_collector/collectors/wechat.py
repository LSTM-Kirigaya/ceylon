"""微信消息收集器

基于 CipherTalk 项目的数据库读取逻辑实现
"""

import hashlib
import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from ..config import get_config
from ..models import ChatMessage, CollectorStats, MessageType
from ..utils.logger import get_logger
from .base import BaseCollector

logger = get_logger(__name__)


class WeChatCollector(BaseCollector):
    """微信消息收集器"""
    
    def __init__(self):
        super().__init__(platform="wechat")
        self.db_path: Optional[Path] = None
        self.wxid: str = ""
        self._connections: Dict[str, sqlite3.Connection] = {}
        self._message_db_cache: Dict[str, sqlite3.Connection] = {}
    
    async def connect(self) -> bool:
        """
        连接到微信数据库
        
        Returns:
            bool: 是否连接成功
        """
        try:
            config = get_config()
            wechat_config = config.platforms.wechat
            
            if not wechat_config.enabled:
                logger.error("微信收集器未启用")
                return False
            
            self.wxid = wechat_config.wxid
            self.db_path = Path(wechat_config.db_path).expanduser()
            
            if not self.db_path.exists():
                logger.error(f"数据库路径不存在: {self.db_path}")
                return False
            
            # 测试连接 session.db
            session_db_path = self.db_path / "session.db"
            if not session_db_path.exists():
                logger.error(f"未找到 session.db: {session_db_path}")
                return False
            
            conn = sqlite3.connect(str(session_db_path), check_same_thread=False)
            conn.execute("SELECT 1")
            conn.close()
            
            logger.info(f"微信数据库连接成功: {self.db_path}")
            return True
            
        except Exception as e:
            logger.error(f"微信数据库连接失败: {e}")
            self.stats.errors.append(str(e))
            return False
    
    async def disconnect(self) -> None:
        """断开数据库连接"""
        for conn in self._connections.values():
            try:
                conn.close()
            except:
                pass
        for conn in self._message_db_cache.values():
            try:
                conn.close()
            except:
                pass
        self._connections.clear()
        self._message_db_cache.clear()
        logger.info("微信数据库连接已关闭")
    
    async def get_groups(self) -> List[dict]:
        """
        获取群聊列表
        
        Returns:
            List[dict]: 群聊列表
        """
        groups = []
        try:
            contact_db_path = self.db_path / "contact.db"
            if not contact_db_path.exists():
                logger.warning(f"联系人数据库不存在: {contact_db_path}")
                return groups
            
            conn = sqlite3.connect(str(contact_db_path), check_same_thread=False)
            conn.row_factory = sqlite3.Row
            
            # 查询群聊（username 包含 @chatroom）
            cursor = conn.execute(
                """
                SELECT username, remark, nick_name, alias
                FROM contact
                WHERE username LIKE '%@chatroom%'
                ORDER BY remark, nick_name
                """
            )
            
            for row in cursor.fetchall():
                username = row["username"]
                display_name = row["remark"] or row["nick_name"] or row["alias"] or username
                groups.append({
                    "id": username,
                    "name": display_name,
                    "raw_name": username,
                })
            
            conn.close()
            logger.info(f"获取到 {len(groups)} 个群聊")
            
        except Exception as e:
            logger.error(f"获取群聊列表失败: {e}")
            self.stats.errors.append(str(e))
        
        return groups
    
    async def collect_messages(
        self,
        group_id: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> List[ChatMessage]:
        """
        收集指定群聊的消息
        
        Args:
            group_id: 群聊ID (wxid_xxx@chatroom)
            start_time: 开始时间
            end_time: 结束时间
        
        Returns:
            List[ChatMessage]: 消息列表
        """
        self.stats.start_time = datetime.now()
        messages: List[ChatMessage] = []
        
        try:
            start_time, end_time = self._parse_time_range(start_time, end_time)
            start_timestamp = int(start_time.timestamp())
            end_timestamp = int(end_time.timestamp())
            
            logger.info(f"收集群聊 {group_id} 的消息，时间范围: {start_time} - {end_time}")
            
            # 查找消息表
            table_info = self._find_message_tables(group_id)
            if not table_info:
                logger.warning(f"未找到群聊 {group_id} 的消息表")
                return messages
            
            # 从所有相关数据库收集消息
            for db_path, table_name in table_info:
                msgs = self._query_messages(
                    db_path, table_name, group_id,
                    start_timestamp, end_timestamp
                )
                messages.extend(msgs)
            
            # 按时间排序
            messages.sort(key=lambda m: m.timestamp)
            
            self.stats.messages_collected = len(messages)
            self.stats.end_time = datetime.now()
            
            logger.info(f"成功收集 {len(messages)} 条消息")
            
        except Exception as e:
            logger.error(f"收集消息失败: {e}")
            self.stats.errors.append(str(e))
        
        return messages
    
    def _find_message_tables(self, group_id: str) -> List[Tuple[str, str]]:
        """
        查找群聊对应的消息表
        
        微信将消息分散存储在多个 message_xxx.db 文件中，
        每个文件包含多个 msg_md5hash 表
        
        Args:
            group_id: 群聊ID
        
        Returns:
            List[Tuple[str, str]]: (数据库路径, 表名) 列表
        """
        result = []
        
        try:
            # 计算群聊ID的 MD5 hash（用于匹配表名）
            hash_value = hashlib.md5(group_id.encode()).hexdigest().lower()
            table_name_pattern = f"msg_{hash_value}"
            
            # 查找所有 message 数据库
            for db_file in self.db_path.glob("message*.db"):
                try:
                    conn = sqlite3.connect(str(db_file), check_same_thread=False)
                    cursor = conn.execute(
                        "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE ?",
                        (f"%{table_name_pattern}%",)
                    )
                    
                    tables = cursor.fetchall()
                    conn.close()
                    
                    if tables:
                        for (table_name,) in tables:
                            result.append((str(db_file), table_name))
                            
                except Exception as e:
                    logger.debug(f"检查数据库 {db_file} 失败: {e}")
                    continue
            
        except Exception as e:
            logger.error(f"查找消息表失败: {e}")
        
        return result
    
    def _query_messages(
        self,
        db_path: str,
        table_name: str,
        group_id: str,
        start_timestamp: int,
        end_timestamp: int,
    ) -> List[ChatMessage]:
        """
        从指定表查询消息
        
        Args:
            db_path: 数据库路径
            table_name: 表名
            group_id: 群聊ID
            start_timestamp: 开始时间戳
            end_timestamp: 结束时间戳
        
        Returns:
            List[ChatMessage]: 消息列表
        """
        messages = []
        
        try:
            # 使用缓存的连接
            if db_path not in self._message_db_cache:
                self._message_db_cache[db_path] = sqlite3.connect(
                    db_path, check_same_thread=False
                )
            
            conn = self._message_db_cache[db_path]
            conn.row_factory = sqlite3.Row
            
            # 查询消息
            # 注意：微信消息表结构可能有变化，这里使用通用字段名
            cursor = conn.execute(
                f"""
                SELECT 
                    localId,
                    MsgSvrID,
                    Type,
                    SubType,
                    CreateTime,
                    Sequence,
                    StatusEx,
                    FlagEx,
                    Status,
                    MsgServerSeq,
                    MsgSequence,
                    StrTalker,
                    StrContent,
                    DisplayContent,
                    Reserved0,
                    Reserved1,
                    Reserved2,
                    Reserved3,
                    Reserved4,
                    Reserved5,
                    Reserved6,
                    CompressContent
                FROM {table_name}
                WHERE CreateTime >= ? AND CreateTime <= ?
                ORDER BY CreateTime ASC
                """,
                (start_timestamp, end_timestamp)
            )
            
            # 加载联系人信息用于昵称映射
            contact_map = self._load_contact_map()
            
            for row in cursor.fetchall():
                try:
                    msg = self._parse_message_row(row, contact_map, group_id)
                    if msg:
                        messages.append(msg)
                except Exception as e:
                    logger.debug(f"解析消息失败: {e}")
                    continue
                    
        except Exception as e:
            logger.error(f"查询消息失败 [{db_path}.{table_name}]: {e}")
        
        return messages
    
    def _parse_message_row(
        self,
        row: sqlite3.Row,
        contact_map: Dict[str, str],
        group_id: str,
    ) -> Optional[ChatMessage]:
        """
        解析消息行
        
        Args:
            row: 数据库行
            contact_map: 联系人映射
            group_id: 群聊ID
        
        Returns:
            Optional[ChatMessage]: 解析后的消息
        """
        try:
            # 解析时间
            create_time = row["CreateTime"]
            if isinstance(create_time, int):
                timestamp = datetime.fromtimestamp(create_time)
            else:
                timestamp = datetime.now()
            
            # 解析内容
            content = row["StrContent"] or ""
            
            # 尝试从内容中提取发送者（群聊消息格式通常为：发送者:\n消息内容）
            sender_id = ""
            sender_name = "未知用户"
            
            if content and ":\n" in content:
                parts = content.split(":\n", 1)
                sender_id = parts[0]
                content = parts[1] if len(parts) > 1 else ""
                sender_name = contact_map.get(sender_id, sender_id)
            
            # 确定消息类型
            msg_type = self._determine_message_type(row["Type"], content)
            
            # 获取群聊名称
            group_name = contact_map.get(group_id, group_id)
            
            return ChatMessage(
                message_id=str(row["MsgSvrID"] or row["localId"]),
                sender_id=sender_id,
                sender_name=sender_name,
                content=content,
                message_type=msg_type,
                timestamp=timestamp,
                group_id=group_id,
                group_name=group_name,
                platform="wechat",
                raw_data={
                    "local_id": row["localId"],
                    "type": row["Type"],
                    "sub_type": row["SubType"],
                    "status": row["Status"],
                }
            )
            
        except Exception as e:
            logger.debug(f"解析消息行失败: {e}")
            return None
    
    def _load_contact_map(self) -> Dict[str, str]:
        """
        加载联系人映射表
        
        Returns:
            Dict[str, str]: wxid -> 昵称/备注 映射
        """
        contact_map = {}
        
        try:
            contact_db_path = self.db_path / "contact.db"
            if not contact_db_path.exists():
                return contact_map
            
            conn = sqlite3.connect(str(contact_db_path), check_same_thread=False)
            conn.row_factory = sqlite3.Row
            
            cursor = conn.execute(
                "SELECT username, remark, nick_name, alias FROM contact"
            )
            
            for row in cursor.fetchall():
                username = row["username"]
                display_name = row["remark"] or row["nick_name"] or row["alias"] or username
                contact_map[username] = display_name
            
            conn.close()
            
        except Exception as e:
            logger.debug(f"加载联系人映射失败: {e}")
        
        return contact_map
    
    def _determine_message_type(self, msg_type: Optional[int], content: str) -> MessageType:
        """
        根据消息类型和内容确定消息类型
        
        Args:
            msg_type: 消息类型代码
            content: 消息内容
        
        Returns:
            MessageType: 消息类型枚举
        """
        # 微信消息类型参考：
        # 1: 文本
        # 3: 图片
        # 34: 语音
        # 43: 视频
        # 47: 表情
        # 49: 链接/文件/小程序等
        # 10000: 系统消息
        
        if msg_type is None:
            return MessageType.TEXT
        
        type_mapping = {
            1: MessageType.TEXT,
            3: MessageType.IMAGE,
            34: MessageType.VOICE,
            43: MessageType.VIDEO,
            47: MessageType.IMAGE,  # 表情也算图片
            10000: MessageType.SYSTEM,
        }
        
        result = type_mapping.get(msg_type, MessageType.OTHER)
        
        # 特殊处理文件/链接
        if msg_type == 49:
            if content and ("<file" in content or "<filename" in content):
                result = MessageType.FILE
            elif content and "<url" in content:
                result = MessageType.LINK
            else:
                result = MessageType.TEXT
        
        return result
    
    async def search_messages(
        self,
        group_id: str,
        keyword: str,
        days: int = 7,
    ) -> List[ChatMessage]:
        """
        搜索包含关键词的消息
        
        Args:
            group_id: 群聊ID
            keyword: 关键词
            days: 搜索最近几天的消息
        
        Returns:
            List[ChatMessage]: 匹配的消息列表
        """
        end_time = datetime.now()
        start_time = end_time - __import__('datetime').timedelta(days=days)
        
        messages = await self.collect_messages(group_id, start_time, end_time)
        
        # 过滤包含关键词的消息
        filtered = [
            msg for msg in messages
            if keyword.lower() in msg.content.lower()
        ]
        
        return filtered
