#!/usr/bin/env python3
"""
从微信导出 JSON 中提取规整的文本信息
"""

import json
import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from typing import Optional, List
from datetime import datetime


@dataclass
class Message:
    """规整后的消息对象"""
    id: str
    timestamp: int
    datetime: str
    sender: Optional[str]  # 发送者昵称（如果能提取到）
    type: str
    content: str  # 规整后的文本内容
    raw_type: str  # 原始类型


class MessageExtractor:
    """消息提取器"""
    
    # 消息类型映射
    TYPE_MAP = {
        "文本": "text",
        "图片": "image",
        "表情": "emoji",
        "视频": "video",
        "系统消息": "system",
        "其他": "link"
    }
    
    def __init__(self, json_path: str):
        with open(json_path, 'r', encoding='utf-8') as f:
            self.data = json.load(f)
        self.messages = self.data.get('messages', [])
    
    def extract_sender(self, content: str) -> Optional[str]:
        """从 content 开头提取发送者昵称"""
        # 格式: "昵称:\n" 或 "昵称：\n"
        match = re.match(r'^([^:\n]+)[:：]\n', content)
        if match:
            return match.group(1).strip()
        return None
    
    def remove_sender_prefix(self, content: str) -> str:
        """移除发送者前缀"""
        return re.sub(r'^[^:\n]+[:：]\n', '', content)
    
    def parse_xml(self, content: str) -> Optional[ET.Element]:
        """尝试解析 XML"""
        try:
            # 有些 XML 缺少根标签包装
            if not content.strip().startswith('<?xml') and not content.strip().startswith('<'):
                content = '<root>' + content + '</root>'
            return ET.fromstring(content)
        except ET.ParseError:
            return None
    
    def extract_link_info(self, content: str) -> str:
        """从链接卡片提取信息"""
        # 提取 title、des、url
        # 有些 title 在开头没有 <title> 标签
        title_match = re.search(r'(?:<title>)?(.*?)</title>', content, re.DOTALL)
        des_match = re.search(r'<des>(.*?)</des>', content, re.DOTALL)
        url_match = re.search(r'<url>(.*?)</url>', content, re.DOTALL)
        
        parts = []
        if title_match:
            title = title_match.group(1).strip()
            # 处理 CDATA
            title = re.sub(r'<!\[CDATA\[(.*?)\]\]>', r'\1', title)
            # 过滤掉 null 或空字符串
            if title and title.lower() != 'null':
                parts.append(f"【分享】{title}")
        
        if des_match:
            des = des_match.group(1).strip()
            des = re.sub(r'<!\[CDATA\[(.*?)\]\]>', r'\1', des)
            if des:
                parts.append(des)
        
        if url_match:
            url = url_match.group(1).strip()
            url = html_unescape(url)
            if url:
                parts.append(f"链接: {url}")
        
        return '\n'.join(parts) if parts else '[链接卡片]'
    
    def extract_system_message(self, content: str) -> str:
        """提取系统消息文本"""
        # 尝试从 XML 中提取文本
        text_match = re.search(r'<text>.*?<!\[CDATA\[(.*?)\]\]>.*?</text>', content, re.DOTALL)
        if text_match:
            return text_match.group(1).strip()
        
        # 撤回消息
        revoke_match = re.search(r'<replacemsg>.*?<!\[CDATA\[(.*?)\]\]>.*?</replacemsg>', content)
        if revoke_match:
            return revoke_match.group(1).strip()
        
        # 移除 XML 标签
        text = re.sub(r'<[^>]+>', '', content)
        return text.strip() if text else '[系统消息]'
    
    def extract(self) -> List[Message]:
        """提取所有消息"""
        results = []
        
        for msg in self.messages:
            raw_type = msg.get('type', '')
            content = msg.get('content', '')
            sender = None
            extracted_content = ''
            
            # 根据类型处理
            if raw_type == '文本':
                sender = self.extract_sender(content)
                extracted_content = self.remove_sender_prefix(content)
                
            elif raw_type == '图片':
                sender = self.extract_sender(content)
                extracted_content = '[图片]'
                
            elif raw_type == '表情':
                extracted_content = '[表情]'
                
            elif raw_type == '视频':
                extracted_content = '[视频]'
                
            elif raw_type == '系统消息':
                extracted_content = self.extract_system_message(content)
                
            elif raw_type == '其他':
                extracted_content = self.extract_link_info(content)
                
            else:
                extracted_content = f'[{raw_type}]'
            
            # 清理内容
            extracted_content = self.clean_content(extracted_content)
            
            results.append(Message(
                id=msg.get('id', ''),
                timestamp=msg.get('timestamp', 0),
                datetime=msg.get('datetime', ''),
                sender=sender,
                type=self.TYPE_MAP.get(raw_type, raw_type),
                content=extracted_content,
                raw_type=raw_type
            ))
        
        return results
    
    def clean_content(self, text: str) -> str:
        """清理文本内容"""
        # 移除多余的空白字符
        text = re.sub(r'\n+', '\n', text)
        text = re.sub(r'[ \t]+', ' ', text)
        return text.strip()
    
    def to_text_file(self, output_path: str, include_meta: bool = True):
        """导出为文本文件"""
        messages = self.extract()
        
        with open(output_path, 'w', encoding='utf-8') as f:
            # 写入头部信息
            if include_meta:
                f.write(f"会话: {self.data.get('sessionName', 'Unknown')}\n")
                f.write(f"导出时间: {self.data.get('exportedAt', '')}\n")
                f.write(f"消息总数: {len(messages)}\n")
                f.write("=" * 50 + "\n\n")
            
            # 写入消息
            for msg in messages:
                if include_meta:
                    sender_str = f"[{msg.sender}]" if msg.sender else ""
                    f.write(f"{msg.datetime} {sender_str}\n")
                f.write(f"{msg.content}\n")
                f.write("-" * 30 + "\n")
    
    def to_json_file(self, output_path: str):
        """导出为规整的 JSON 文件"""
        messages = self.extract()
        output = {
            'sessionId': self.data.get('sessionId'),
            'sessionName': self.data.get('sessionName'),
            'exportedAt': self.data.get('exportedAt'),
            'totalMessages': len(messages),
            'messages': [
                {
                    'id': m.id,
                    'timestamp': m.timestamp,
                    'datetime': m.datetime,
                    'sender': m.sender,
                    'type': m.type,
                    'content': m.content
                }
                for m in messages
            ]
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(output, f, ensure_ascii=False, indent=2)


def html_unescape(text: str) -> str:
    """简单的 HTML 实体解码"""
    replacements = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text


def main():
    import sys
    
    input_file = 'food-seed-7d.json'
    output_txt = 'output/messages.txt'
    output_json = 'output/messages_clean.json'
    
    print(f"正在处理: {input_file}")
    
    extractor = MessageExtractor(input_file)
    messages = extractor.extract()
    
    # 统计信息
    type_counts = {}
    for m in messages:
        type_counts[m.type] = type_counts.get(m.type, 0) + 1
    
    print(f"\n提取完成!")
    print(f"总消息数: {len(messages)}")
    print(f"类型分布:")
    for t, c in sorted(type_counts.items(), key=lambda x: -x[1]):
        print(f"  - {t}: {c}")
    
    # 导出
    extractor.to_text_file(output_txt)
    extractor.to_json_file(output_json)
    
    print(f"\n输出文件:")
    print(f"  - 文本格式: {output_txt}")
    print(f"  - JSON格式: {output_json}")
    
    # 显示前 5 条消息示例
    print("\n前 5 条消息预览:")
    print("=" * 50)
    for msg in messages[:5]:
        sender = f"[{msg.sender}]" if msg.sender else ""
        print(f"{msg.datetime} {sender} ({msg.type})")
        preview = msg.content[:100] + "..." if len(msg.content) > 100 else msg.content
        print(f"内容: {preview}")
        print("-" * 50)


if __name__ == '__main__':
    main()
