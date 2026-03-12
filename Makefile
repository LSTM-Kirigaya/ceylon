.PHONY: help install install-dev test lint format clean run example

help: ## 显示帮助信息
	@echo "Feedback Collector - 可用命令:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## 安装生产依赖
	pip install -e .

install-dev: ## 安装开发依赖
	pip install -e ".[dev,feishu,notion]"

install-all: ## 安装所有依赖
	pip install -e ".[all]"

test: ## 运行测试
	pytest tests/ -v

test-cov: ## 运行测试并生成覆盖率报告
	pytest tests/ -v --cov=feedback_collector --cov-report=html --cov-report=term

lint: ## 运行代码检查
	flake8 src tests
	mypy src

format: ## 格式化代码
	black src tests
	isort src tests

format-check: ## 检查代码格式
	black --check src tests
	isort --check-only src tests

clean: ## 清理构建文件
	rm -rf build/ dist/ *.egg-info/ .pytest_cache/ .mypy_cache/
	rm -rf htmlcov/ .coverage
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete

init-config: ## 初始化配置文件
	mkdir -p config
	cp config/config.example.yaml config/config.yaml
	@echo "请编辑 config/config.yaml 文件配置您的设置"

run-example: ## 运行示例（需要配置）
	feedback-collector collect --platform wechat --output local --dry-run

submodule-init: ## 初始化 Git 子模块
	git submodule update --init --recursive

submodule-update: ## 更新 Git 子模块
	git submodule update --remote

build: ## 构建分发包
	python -m build

publish: ## 发布到 PyPI (需要权限)
	python -m twine upload dist/*
