#!/bin/bash

# SVG to PNG 转换脚本
# 用法: ./scripts/svg-to-png.sh [输入文件] [输出文件] [宽度(可选)]

set -e

# 默认参数
INPUT_FILE="${1:-design/icon.svg}"
OUTPUT_FILE="${2:-design/icon.png}"
WIDTH="${3:-}"

# 检查输入文件是否存在
if [ ! -f "$INPUT_FILE" ]; then
    echo "❌ 错误: 输入文件不存在: $INPUT_FILE"
    exit 1
fi

# 确保输出目录存在
mkdir -p "$(dirname "$OUTPUT_FILE")"

# 构建命令
CMD="cairosvg \"$INPUT_FILE\" -o \"$OUTPUT_FILE\""

# 如果指定了宽度，添加缩放参数
if [ -n "$WIDTH" ]; then
    CMD="$CMD --output-width $WIDTH"
    echo "📐 转换: $INPUT_FILE -> $OUTPUT_FILE (宽度: ${WIDTH}px)"
else
    echo "📐 转换: $INPUT_FILE -> $OUTPUT_FILE (原始尺寸)"
fi

# 执行转换
eval $CMD

if [ $? -eq 0 ]; then
    echo "✅ 转换成功: $OUTPUT_FILE"
    # 显示文件信息
    ls -lh "$OUTPUT_FILE"
else
    echo "❌ 转换失败"
    exit 1
fi
