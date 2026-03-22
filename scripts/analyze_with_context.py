#!/usr/bin/env python3
"""
需求分析工具 - 保留原始对话上下文版本

从原始聊天记录中提取需求，并保留完整的对话上下文作为参考
"""

import json
import sys
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.analyze_requirements import RequirementAnalyzer, Requirement


def load_wechat_messages(json_path: str) -> List[Dict[str, Any]]:
    """加载微信聊天记录"""
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    items = []
    for msg in data.get('messages', []):
        content = msg.get('content', '')
        msg_type = msg.get('type', '')
        
        # 提取文本内容（根据之前extract_messages.py的逻辑）
        if msg_type == '文本':
            # 移除发送者前缀
            import re
            clean_content = re.sub(r'^[^:\n]+[:：]\n', '', content)
        elif msg_type == '图片':
            clean_content = '[图片]'
        elif msg_type == '表情':
            clean_content = '[表情]'
        elif msg_type == '视频':
            clean_content = '[视频]'
        else:
            clean_content = content[:100] if len(content) > 100 else content
        
        # 只保留有实际内容的文本消息
        if clean_content and clean_content not in ['[图片]', '[表情]', '[视频]'] and len(clean_content) > 5:
            items.append({
                'id': msg.get('id', ''),
                'content': clean_content,
                'raw_content': content,  # 保留原始内容
                'type': 'text',
                'msg_type': msg_type,
                'timestamp': msg.get('datetime', ''),
                'is_send': msg.get('isSend', False),
                'source': 'wechat',
                # 保留图片信息
                'images': extract_image_info(content) if msg_type == '图片' else [],
                'has_media': msg_type in ['图片', '表情', '视频']
            })
    
    return items


def extract_image_info(content: str) -> List[Dict[str, str]]:
    """从XML内容中提取图片信息"""
    import re
    images = []
    
    # 提取AES key
    aeskey_match = re.search(r'aeskey="([^"]+)"', content)
    if aeskey_match:
        images.append({
            'type': 'image',
            'aeskey': aeskey_match.group(1),
            'note': '图片需要通过微信客户端查看'
        })
    
    return images


def build_conversation_context(items: List[Dict], window_size: int = 3) -> List[Dict]:
    """
    为每个需求项构建对话上下文
    
    Args:
        items: 消息列表
        window_size: 前后文窗口大小（多少条消息）
    """
    result = []
    
    for i, item in enumerate(items):
        # 获取前后文
        start = max(0, i - window_size)
        end = min(len(items), i + window_size + 1)
        
        context_before = items[start:i]
        context_after = items[i+1:end]
        
        item_with_context = item.copy()
        item_with_context['conversation_context'] = {
            'before': [
                {'content': ctx['content'], 'timestamp': ctx['timestamp']}
                for ctx in context_before
            ],
            'current': {'content': item['content'], 'timestamp': item['timestamp']},
            'after': [
                {'content': ctx['content'], 'timestamp': ctx['timestamp']}
                for ctx in context_after
            ],
            'has_images': any(ctx.get('has_media') for ctx in items[start:end])
        }
        
        result.append(item_with_context)
    
    return result


def analyze_with_context(input_path: str, output_path: str, source_type: str = 'wechat'):
    """分析需求并保留上下文"""
    
    print(f"📖 加载 {source_type} 数据...")
    
    if source_type == 'wechat':
        items = load_wechat_messages(input_path)
    else:
        with open(input_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        items = data.get('items', [])
    
    print(f"   加载了 {len(items)} 条消息")
    
    # 构建对话上下文
    print("🔗 构建对话上下文...")
    items_with_context = build_conversation_context(items, window_size=2)
    
    # 创建分析器
    analyzer = RequirementAnalyzer(min_confidence=0.5)
    
    # 分析需求
    print("🔍 分析需求...")
    requirements = []
    low_confidence_items = []
    
    for idx, item in enumerate(items_with_context):
        result = analyzer._extract_with_keywords(item, idx)
        
        # 添加上下文信息到 raw_context
        result['requirement'].raw_context['conversation_context'] = item.get('conversation_context', {})
        result['requirement'].raw_context['has_media'] = item.get('has_media', False)
        result['requirement'].raw_context['raw_images'] = item.get('images', [])
        
        if result['confidence'] >= analyzer.min_confidence:
            requirements.append(result['requirement'])
        else:
            low_confidence_items.append({
                'original': item,
                'extracted': result['requirement'],
                'confidence': result['confidence']
            })
    
    # 构建输出
    output = {
        'meta': {
            'total_input': len(items),
            'extracted': len(requirements),
            'filtered_low_confidence': len(low_confidence_items),
            'processing_time': datetime.now().isoformat(),
            'source_type': source_type
        },
        'requirements': [
            {
                'id': r.id,
                'title': r.title,
                'description': r.description,
                'type': r.type,
                'priority': r.priority,
                'keywords': r.keywords,
                'confidence': r.confidence,
                'created_at': r.created_at,
                # 关键：包含原始上下文
                'raw_context': r.raw_context
            }
            for r in requirements
        ],
        'low_confidence_items': [
            {
                'original': item['original'],
                'extracted': {
                    'id': item['extracted'].id,
                    'title': item['extracted'].title,
                    'confidence': item['extracted'].confidence
                },
                'confidence': item['confidence']
            }
            for item in low_confidence_items
        ]
    }
    
    # 保存结果
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ 分析完成!")
    print(f"   提取需求: {len(requirements)}")
    print(f"   过滤: {len(low_confidence_items)}")
    print(f"   输出: {output_path}")
    
    # 显示示例
    if requirements:
        print(f"\n📋 示例输出（第一条）:")
        example = requirements[0]
        print(f"   ID: {example.id}")
        print(f"   标题: {example.title}")
        print(f"   类型: {example.type}")
        print(f"\n   原始上下文:")
        ctx = example.raw_context.get('conversation_context', {})
        if ctx.get('before'):
            print(f"   [前文]")
            for c in ctx['before']:
                print(f"     - {c['content'][:50]}...")
        print(f"   [当前] {ctx.get('current', {}).get('content', '')}")
        if ctx.get('after'):
            print(f"   [后文]")
            for c in ctx['after']:
                print(f"     - {c['content'][:50]}...")
    
    return output


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='分析需求并保留对话上下文')
    parser.add_argument('--input', '-i', required=True, help='输入文件路径')
    parser.add_argument('--output', '-o', required=True, help='输出文件路径')
    parser.add_argument('--source', choices=['wechat', 'feishu', 'generic'], 
                        default='wechat', help='数据源类型')
    
    args = parser.parse_args()
    
    analyze_with_context(args.input, args.output, args.source)


if __name__ == '__main__':
    main()
