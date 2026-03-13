#!/usr/bin/env python3
"""
全流程测试：串联三个环节
测试从消息收集到导出的完整流程
"""

import argparse
import asyncio
import json
import sys
from datetime import datetime
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent / "src"))

from feedback_collector.config import Config, set_config


def print_header(text: str):
    """打印标题"""
    print("\n" + "="*70)
    print(text.center(70))
    print("="*70)


def print_stage(stage_num: int, title: str):
    """打印阶段标题"""
    print("\n" + ">>>"*20)
    print(f"  环节 {stage_num}: {title}")
    print(">>>"*20 + "\n")


async def run_stage1(args) -> str:
    """运行环节1测试"""
    print_stage(1, "群聊消息收集")
    
    import subprocess
    
    cmd = [
        sys.executable,
        "test_stage1.py",
        "--platform", args.platform,
        "--output", args.output,
    ]
    
    if args.group:
        cmd.extend(["--group", args.group])
    
    if args.mock:
        cmd.append("--mock")
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print("错误:", result.stderr)
    
    # 查找输出文件
    output_dir = Path(args.output)
    if output_dir.exists():
        files = sorted(output_dir.glob("stage1_messages_*.json"), reverse=True)
        if files:
            return str(files[0])
    
    return None


async def run_stage2(input_file: str, args) -> str:
    """运行环节2测试"""
    print_stage(2, "AI分析处理")
    
    import subprocess
    
    cmd = [
        sys.executable,
        "test_stage2.py",
        "--input", input_file,
        "--output", args.output,
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print("错误:", result.stderr)
    
    # 查找输出文件
    output_dir = Path(args.output)
    if output_dir.exists():
        files = sorted(output_dir.glob("stage2_feedbacks_*.json"), reverse=True)
        if files:
            return str(files[0])
    
    return None


async def run_stage3(input_file: str, args):
    """运行环节3测试"""
    print_stage(3, "数据导出")
    
    import subprocess
    
    cmd = [
        sys.executable,
        "test_stage3.py",
        "--input", input_file,
        "--output", args.output,
    ]
    
    if args.skip_feishu:
        cmd.append("--skip-feishu")
    if args.skip_notion:
        cmd.append("--skip-notion")
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print("错误:", result.stderr)


async def run_individual_tests(args):
    """运行独立环节测试"""
    print_header("独立环节测试模式")
    
    results = {}
    
    # 环节1
    if args.test_stage in (1, 0):
        print_stage(1, "群聊消息收集")
        import subprocess
        result = subprocess.run([
            sys.executable, "test_stage1.py",
            "--platform", args.platform,
            "--mock" if args.mock else "",
        ], capture_output=True, text=True)
        print(result.stdout)
        results[1] = result.returncode == 0
    
    # 环节2
    if args.test_stage in (2, 0):
        print_stage(2, "AI分析处理")
        import subprocess
        result = subprocess.run([
            sys.executable, "test_stage2.py",
        ], capture_output=True, text=True)
        print(result.stdout)
        results[2] = result.returncode == 0
    
    # 环节3
    if args.test_stage in (3, 0):
        print_stage(3, "数据导出")
        import subprocess
        result = subprocess.run([
            sys.executable, "test_stage3.py",
        ], capture_output=True, text=True)
        print(result.stdout)
        results[3] = result.returncode == 0
    
    return results


async def run_pipeline_test(args):
    """运行管道测试（串联三个环节）"""
    print_header("全流程管道测试")
    
    # 环节1: 收集
    stage1_output = await run_stage1(args)
    if not stage1_output:
        print("❌ 环节1失败，无法继续")
        return False
    print(f"✅ 环节1完成: {stage1_output}")
    
    # 环节2: 分析
    stage2_output = await run_stage2(stage1_output, args)
    if not stage2_output:
        print("❌ 环节2失败，无法继续")
        return False
    print(f"✅ 环节2完成: {stage2_output}")
    
    # 环节3: 导出
    await run_stage3(stage2_output, args)
    print("✅ 环节3完成")
    
    return True


def print_summary(results: dict):
    """打印测试总结"""
    print_header("测试总结")
    
    print("\n各环节测试结果:")
    for stage, passed in results.items():
        status = "✅ 通过" if passed else "❌ 失败"
        print(f"   环节{stage}: {status}")
    
    all_passed = all(results.values())
    
    print("\n" + "="*70)
    if all_passed:
        print("🎉 所有测试通过！".center(70))
    else:
        print("⚠️  部分测试失败，请检查输出".center(70))
    print("="*70)
    
    print("\n输出文件位置:")
    print(f"   {Path('./test_output').absolute()}/")
    
    print("\n下一步:")
    if all_passed:
        print("   1. 配置 config.yaml 使用真实数据")
        print("   2. 运行: feedback-collector collect --platform wechat")
    else:
        print("   1. 检查错误输出")
        print("   2. 确保所有依赖已安装: pip install -e .")


def main():
    parser = argparse.ArgumentParser(
        description="全流程测试：串联三个环节",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
测试模式:
  1. 全流程测试 (--pipeline): 串联三个环节，模拟真实流程
  2. 单独环节测试 (--stage N): 只测试指定环节
  3. 全部环节测试 (默认): 分别测试所有环节

示例:
  # 全流程测试
  python test_all_stages.py --pipeline
  
  # 只测试环节1
  python test_all_stages.py --stage 1 --platform wechat --mock
  
  # 测试环节2和3
  python test_all_stages.py --stage 2 --stage 3
        """
    )
    parser.add_argument("--pipeline", action="store_true", help="运行全流程管道测试")
    parser.add_argument("--stage", type=int, action="append", choices=[1, 2, 3],
                        help="指定要测试的环节（可多次使用）")
    parser.add_argument("--platform", "-p", choices=["wechat", "qq"], default="wechat",
                        help="测试平台")
    parser.add_argument("--group", "-g", help="指定群聊名称")
    parser.add_argument("--mock", action="store_true", help="使用模拟数据（不连接真实数据库）")
    parser.add_argument("--output", "-o", default="./test_output", help="输出目录")
    parser.add_argument("--skip-feishu", action="store_true", help="跳过飞书导出")
    parser.add_argument("--skip-notion", action="store_true", help="跳过Notion导出")
    args = parser.parse_args()
    
    print_header("Feedback Collector 全流程测试")
    print(f"\n测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"测试平台: {args.platform}")
    print(f"使用模拟数据: {'是' if args.mock else '否'}")
    
    # 加载配置
    config = Config()
    set_config(config)
    
    # 确定测试模式
    if args.pipeline:
        # 全流程管道测试
        success = asyncio.run(run_pipeline_test(args))
        sys.exit(0 if success else 1)
    else:
        # 单独环节测试
        if not args.stage:
            # 默认测试所有环节
            args.stage = [0]  # 0 表示所有环节
        
        results = asyncio.run(run_individual_tests(args))
        print_summary(results)
        
        sys.exit(0 if all(results.values()) else 1)


if __name__ == "__main__":
    main()
