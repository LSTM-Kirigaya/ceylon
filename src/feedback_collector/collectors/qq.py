"""QQ 消息收集器

支持从 QQ 数据库或 NTQQ 数据库读取消息
"""

import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from ..config import get_config
from ..models import ChatMessage, MessageType
from ..utils.logger import get_logger
from .base import BaseCollector

logger = get_logger(__name__)


class QQCollector(BaseCollector):
    """QQ 消息收集器"""
    
    def __init__(self):
        super().__init__(platform="qq")
        self.db_path: Optional[Path] = None
        self.uin: str = ""
        self._conn: Optional[sqlite3.Connection] = None
    
    async def connect(self) -> bool:
        """连接到 QQ 数据库"""
        try:
            config = get_config()
            qq_config = config.platforms.qq
            
            if not qq_config.enabled:
                logger.error("QQ 收集器未启用")
                return False
            
            self.uin = qq_config.uin
            self.db_path = Path(qq_config.db_path).expanduser()
            
            if not self.db_path.exists():
                logger.error(f"数据库路径不存在: {self.db_path}")
                return False
            
            # QQ 数据库可能是 SQLite 格式
            # 尝试连接
            self._conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
            self._conn.execute("SELECT 1")
            
            logger.info(f"QQ 数据库连接成功: {self.db_path}")
            return True
            
        except Exception as e:
            logger.error(f"QQ 数据库连接失败: {e}")
            return False
    
    async def disconnect(self) -> None:
        """断开连接"""
        if self._conn:
            self._conn.close()
            self._conn = None
    
    async def get_groups(self) -> List[dict]:
        """获取群聊列表"""
        groups = []
        
        try:
            # QQ NT 数据库表结构可能不同
            # 这里提供一个通用的查询示例
            if not self._conn:
                return groups
            
            # 尝试常见的群聊表名
            table_queries = [
                "SELECT troopuin, troopname FROM TroopInfoV2",
                "SELECT group_id, group_name FROM groups",
                "SELECT uin, name FROM GroupInfo",
            ]
            
            for query in table_queries:
                try:
                    cursor = self._conn.execute(query)
                    for row in cursor.fetchall():
                        groups.append({
                            "id": str(row[0]),
                            "name": row[1] or str(row[0]),
                            "raw_name": str(row[0]),
                        })
                    break  # 成功后跳出
                except:
                    continue
            
        except Exception as e:
            logger.error(f"获取群聊列表失败: {e}")
        
        return groups
    
    async def collect_messages(
        self,
        group_id: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> List[ChatMessage]:
        """收集指定群聊的消息"""
        messages = []
        
        try:
            start_time, end_time = self._parse_time_range(start_time, end_time)
            
            if not self._conn:
                logger.error("数据库未连接")
                return messages
            
            # QQ 消息表结构可能不同，这里提供通用查询
            # 尝试常见的消息表名和字段
            query_patterns = [
                # QQ NT 格式
                """
                SELECT msgId, senderUid, senderNick, content, msgTime, msgType
                FROM NTMsg_{group_id}
                WHERE msgTime >= ? AND msgTime <= ?
                ORDER BY msgTime ASC
                """,
                # 旧版 QQ 格式
                """
                SELECT msgseq, senderuin, friendnick, msgdata, time, msgtype
                FROM mr_troop_{group_id}
                WHERE time >= ? AND time <= ?
                ORDER BY time ASC
                """,
            ]
            
            # 转换时间戳
            start_ts = int(start_time.timestamp()) * 1000  # QQ 通常是毫秒
            end_ts = int(end_time.timestamp()) * 1000
            
            for query in query_patterns:
                try:
                    cursor = self._conn.execute(
                        query.format(group_id=group_id.replace("-", "")),
                        (start_ts, end_ts)
                    )
                    
                    for row in cursor.fetchall():
                        msg = self._parse_qq_message(row, group_id)
                        if msg:
                            messages.append(msg)
                    
                    break  # 成功后跳出
                    
                except Exception as e:
                    logger.debug(f"查询失败，尝试下一个模式: {e}")
                    continue
            
            logger.info(f"成功收集 {len(messages)} 条 QQ 消息")
            
        except Exception as e:
            logger.error(f"收集 QQ 消息失败: {e}")
        
        return messages
    
    def _parse_qq_message(
        self,
        row: tuple,
        group_id: str,
    ) -> Optional[ChatMessage]:
        """解析 QQ 消息行"""
        try:
            # 根据实际表结构解析
            # 这里假设是通用的列顺序
            msg_id = str(row[0])
            sender_id = str(row[1]) if row[1] else ""
            sender_name = row[2] or sender_id
            content = row[3] or ""
            
            # 时间戳可能是秒或毫秒
            time_val = row[4]
            if isinstance(time_val, int):
                if time_val > 1e12:  # 毫秒
                    timestamp = datetime.fromtimestamp(time_val / 1000)
                else:
                    timestamp = datetime.fromtimestamp(time_val)
            else:
                timestamp = datetime.now()
            
            msg_type = self._determine_qq_message_type(row[5] if len(row) > 5 else None)
            
            return ChatMessage(
                message_id=msg_id,
                sender_id=sender_id,
                sender_name=sender_name,
                content=content,
                message_type=msg_type,
                timestamp=timestamp,
                group_id=group_id,
                group_name=group_id,  # 可后续补充
                platform="qq",
            )
            
        except Exception as e:
            logger.debug(f"解析 QQ 消息失败: {e}")
            return None
    
    def _determine_qq_message_type(self, msg_type: Optional[int]) -> MessageType:
        """确定 QQ 消息类型"""
        if msg_type is None:
            return MessageType.TEXT
        
        # QQ 消息类型（参考）
        # - 文本: 0
        # - 图片: 1
        # - 语音: 2
        # - 视频: 3
        # - 文件: 4
        
        type_mapping = {
            0: MessageType.TEXT,
            1: MessageType.IMAGE,
            2: MessageType.VOICE,
            3: MessageType.VIDEO,
            4: MessageType.FILE,
        }
        
        return type_mapping.get(msg_type, MessageType.OTHER)
