#!/bin/bash
# 快速测试脚本

set -e

echo "=========================================="
echo "Feedback Collector 快速测试"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# 检查 Python
if ! command -v python &> /dev/null; then
    echo -e "${RED}✗ Python 未安装${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Python 已安装: $(python --version)${NC}"

# 检查包安装
echo ""
echo "检查包安装..."
python -c "from feedback_collector.collectors import WeChatCollector; from feedback_collector.analyzer import FeedbackAnalyzer; from feedback_collector.models import Feedback" 2>/dev/null && echo -e "${GREEN}✓ feedback-collector 包已安装${NC}" || {
    echo -e "${RED}✗ 包未安装，正在安装...${NC}"
    pip install -e "." --quiet
}

# 创建测试数据目录
mkdir -p test_output

# 创建测试反馈数据
echo ""
echo "创建测试数据..."
cat > test_output/test_feedbacks.json << 'EOF'
{
  "feedbacks": [
    {
      "id": "fb1",
      "title": "添加导出功能",
      "description": "希望能导出数据为Excel格式，方便数据分析",
      "type": "feature",
      "priority": "high",
      "keywords": ["导出", "Excel", "数据"],
      "reported_by": ["用户A"],
      "created_at": "2026-03-10T09:00:00"
    },
    {
      "id": "fb2", 
      "title": "程序崩溃问题",
      "description": "点击保存按钮后程序崩溃，报错信息：NullPointerException",
      "type": "bug",
      "priority": "critical",
      "keywords": ["崩溃", "保存", "异常"],
      "reported_by": ["用户B", "用户C"],
      "created_at": "2026-03-11T10:00:00"
    },
    {
      "id": "fb3",
      "title": "深色模式支持",
      "description": "希望支持深色模式，夜间使用更方便，保护眼睛",
      "type": "feature",
      "priority": "medium",
      "keywords": ["深色模式", "主题", "夜间"],
      "reported_by": ["用户D"],
      "created_at": "2026-03-12T11:00:00"
    }
  ]
}
EOF
echo -e "${GREEN}✓ 测试数据已创建${NC}"

# 测试 1: 测试反馈搜索器
echo ""
echo "=========================================="
echo "测试 1: 反馈搜索器 (query_feedback.py)"
echo "=========================================="

# 测试关键词搜索
echo ""
echo "1.1 测试关键词搜索 '导出'..."
python ../.agents/skills/feedback-collector/scripts/query_feedback.py \
    --query "导出" \
    --feedback-file test_output/test_feedbacks.json \
    --top-k 3

echo ""
echo "1.2 测试关键词搜索 '崩溃'..."
python ../.agents/skills/feedback-collector/scripts/query_feedback.py \
    --query "崩溃" \
    --feedback-file test_output/test_feedbacks.json \
    --top-k 3

echo ""
echo "1.3 测试 JSON 输出..."
python ../.agents/skills/feedback-collector/scripts/query_feedback.py \
    --query "深色模式" \
    --feedback-file test_output/test_feedbacks.json \
    --format json \
    --output test_output/search_result.json

echo -e "${GREEN}✓ 反馈搜索器测试完成${NC}"

# 测试 2: 单元测试
echo ""
echo "=========================================="
echo "测试 2: 单元测试"
echo "=========================================="

if command -v pytest &> /dev/null; then
    pytest tests/ -v --tb=short 2>&1 | tail -20
    echo -e "${GREEN}✓ 单元测试完成${NC}"
else
    echo "pytest 未安装，跳过单元测试"
    echo "运行 'pip install pytest pytest-asyncio' 安装测试依赖"
fi

# 测试 3: 模块导入
echo ""
echo "=========================================="
echo "测试 3: 模块导入测试"
echo "=========================================="

python << 'PYTEST'
import sys
sys.path.insert(0, 'src')

tests = [
    ("feedback_collector", "主包"),
    ("feedback_collector.collectors", "收集器模块"),
    ("feedback_collector.analyzer", "分析器模块"),
    ("feedback_collector.exporters", "导出器模块"),
    ("feedback_collector.models", "数据模型"),
]

for module, name in tests:
    try:
        __import__(module)
        print(f"✓ {name}")
    except Exception as e:
        print(f"✗ {name}: {e}")
PYTEST

echo -e "${GREEN}✓ 模块导入测试完成${NC}"

# 测试 4: CLI
echo ""
echo "=========================================="
echo "测试 4: CLI 测试"
echo "=========================================="

# 测试帮助信息
echo "测试 CLI 帮助..."
feedback-collector --help > /dev/null 2>&1 && echo -e "${GREEN}✓ CLI 可执行${NC}" || echo -e "${RED}✗ CLI 不可执行${NC}"

# 总结
echo ""
echo "=========================================="
echo "测试完成"
echo "=========================================="
echo ""
echo "测试输出文件保存在: test_output/"
echo ""
echo "下一步:"
echo "1. 配置 config.yaml 进行真实环境测试"
echo "2. 运行完整测试: pytest tests/ -v"
echo "3. 查看测试文档: docs/testing.md"
