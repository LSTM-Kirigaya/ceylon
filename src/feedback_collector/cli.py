"""命令行界面"""

import asyncio
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional

import click
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

from .analyzer.analyzer import FeedbackAnalyzer
from .collectors import BaseCollector, QQCollector, WeChatCollector
from .config import Config, get_config, set_config
from .exporters import FeishuExporter, LocalExporter, NotionExporter
from .models import Feedback, FeedbackType
from .utils.logger import get_logger, setup_logging

console = Console()
logger = get_logger(__name__)


def print_banner():
    """打印程序横幅"""
    banner = """
    ███████╗███████╗███████╗██████╗ ██████╗  █████╗  ██████╗██╗  ██╗
    ██╔════╝██╔════╝██╔════╝██╔══██╗██╔══██╗██╔══██╗██╔════╝██║ ██╔╝
    █████╗  █████╗  █████╗  ██████╔╝██████╔╝███████║██║     █████╔╝ 
    ██╔══╝  ██╔══╝  ██╔══╝  ██╔══██╗██╔══██╗██╔══██║██║     ██╔═██╗ 
    ██║     ███████╗███████╗██████╔╝██║  ██║██║  ██║╚██████╗██║  ██╗
    ╚═╝     ╚══════╝╚══════╝╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
                                                                   
         [bold blue]智能软件用户群反馈收集和自动化需求分析工具[/bold blue]
    """
    console.print(banner)


def validate_date(ctx, param, value):
    """验证日期格式"""
    if value is None:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d")
    except ValueError:
        raise click.BadParameter("日期格式应为 YYYY-MM-DD")


@click.group(invoke_without_command=True)
@click.option(
    "--config",
    "-c",
    type=click.Path(exists=True),
    help="配置文件路径",
)
@click.option("--verbose", "-v", is_flag=True, help="显示详细日志")
@click.pass_context
def cli(ctx, config, verbose):
    """Feedback Collector - 智能软件用户群反馈收集和自动化需求分析工具"""
    # 初始化配置
    if config:
        set_config(Config.from_yaml(config))
    
    # 设置日志
    setup_logging()
    
    if ctx.invoked_subcommand is None:
        print_banner()
        console.print("\n[bold]使用 [cyan]feedback-collector --help[/cyan] 查看帮助信息[/bold]\n")


@cli.command()
@click.option(
    "--platform",
    "-p",
    type=click.Choice(["wechat", "qq", "all"], case_sensitive=False),
    required=True,
    help="选择平台：wechat(微信), qq(QQ), all(全部)",
)
@click.option(
    "--group",
    "-g",
    help="指定群聊名称或ID（多个用逗号分隔）",
)
@click.option(
    "--date",
    "-d",
    callback=validate_date,
    help="收集日期（格式：YYYY-MM-DD，默认为今天）",
)
@click.option(
    "--output",
    "-o",
    type=click.Choice(["local", "feishu", "notion", "all"], case_sensitive=False),
    default="local",
    help="导出目标",
)
@click.option(
    "--format",
    "-f",
    type=click.Choice(["markdown", "json", "csv"], case_sensitive=False),
    help="本地导出格式（仅当 --output=local 时有效）",
)
@click.option(
    "--history",
    "-h",
    type=click.Path(exists=True),
    help="历史反馈文件路径（用于去重）",
)
@click.option(
    "--dry-run",
    is_flag=True,
    help="试运行模式（不实际导出）",
)
@click.pass_context
def collect(
    ctx,
    platform: str,
    group: Optional[str],
    date: Optional[datetime],
    output: str,
    format: Optional[str],
    history: Optional[str],
    dry_run: bool,
):
    """收集并分析群聊反馈"""
    print_banner()
    
    config = get_config()
    
    # 确定收集日期
    if date is None:
        date = datetime.now()
    
    start_time = datetime(date.year, date.month, date.day, 0, 0, 0)
    end_time = datetime(date.year, date.month, date.day, 23, 59, 59)
    
    console.print(f"\n[bold]收集日期:[/bold] {date.strftime('%Y-%m-%d')}")
    console.print(f"[bold]导出目标:[/bold] {output}")
    console.print()
    
    # 运行收集流程
    asyncio.run(
        _run_collection(
            platform=platform,
            group=group,
            start_time=start_time,
            end_time=end_time,
            output=output,
            format=format,
            history_path=history,
            dry_run=dry_run,
        )
    )


async def _run_collection(
    platform: str,
    group: Optional[str],
    start_time: datetime,
    end_time: datetime,
    output: str,
    format: Optional[str],
    history_path: Optional[str],
    dry_run: bool,
):
    """执行收集流程"""
    config = get_config()
    
    # 1. 初始化收集器
    collectors = _init_collectors(platform)
    if not collectors:
        console.print("[red]没有可用的收集器，请检查配置[/red]")
        return
    
    # 2. 加载历史反馈
    history_feedbacks: List[Feedback] = []
    if history_path:
        history_feedbacks = _load_history_feedbacks(history_path)
        console.print(f"[blue]已加载 {len(history_feedbacks)} 条历史反馈[/blue]\n")
    
    # 3. 收集和分析
    all_feedbacks: List[Feedback] = []
    
    for collector in collectors:
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            # 连接
            task = progress.add_task(f"连接 {collector.platform}...", total=None)
            if not await collector.connect():
                console.print(f"[red]连接 {collector.platform} 失败[/red]")
                continue
            
            # 获取群聊列表
            progress.update(task, description=f"获取 {collector.platform} 群聊列表...")
            groups = await collector.get_groups()
            
            # 过滤指定群聊
            if group:
                group_names = [g.strip() for g in group.split(",")]
                groups = [
                    g for g in groups
                    if g["name"] in group_names or g["id"] in group_names
                ]
            
            if not groups:
                console.print(f"[yellow]未找到匹配的群聊[/yellow]")
                await collector.disconnect()
                continue
            
            # 收集每个群聊的消息
            for grp in groups:
                progress.update(
                    task,
                    description=f"收集 [{grp['name']}] 的消息..."
                )
                
                messages = await collector.collect_messages(
                    grp["id"],
                    start_time,
                    end_time,
                )
                
                if not messages:
                    console.print(f"  [dim]{grp['name']}: 无消息[/dim]")
                    continue
                
                console.print(f"  [green]{grp['name']}: 收集到 {len(messages)} 条消息[/green]")
                
                # 分析消息
                progress.update(task, description=f"分析 [{grp['name']}] 的反馈...")
                
                analyzer = FeedbackAnalyzer()
                result = await analyzer.analyze(
                    messages,
                    platform=collector.platform,
                    group=grp["name"],
                    history_feedbacks=history_feedbacks + all_feedbacks,
                )
                
                all_feedbacks.extend(result.feedbacks)
                
                if result.feedbacks:
                    console.print(f"    发现 {len(result.feedbacks)} 条反馈")
            
            await collector.disconnect()
    
    # 4. 显示结果摘要
    console.print("\n" + "=" * 60)
    console.print(f"[bold]分析完成，共发现 {len(all_feedbacks)} 条反馈[/bold]")
    console.print("=" * 60 + "\n")
    
    if not all_feedbacks:
        console.print("[yellow]未发现新的反馈[/yellow]")
        return
    
    # 显示反馈列表
    _display_feedbacks(all_feedbacks)
    
    # 5. 导出
    if dry_run:
        console.print("\n[yellow]试运行模式，跳过导出[/yellow]")
        return
    
    console.print("\n[bold]开始导出...[/bold]\n")
    
    # 本地导出
    if output in ("local", "all"):
        exporter = LocalExporter()
        if format:
            exporter.format = format
        
        from ..models import AnalysisResult
        result = AnalysisResult(
            platform=platform,
            group=group or "all",
            total_messages=0,  # 可以统计
            relevant_messages=0,
            feedbacks=all_feedbacks,
        )
        
        success = await exporter.export(result)
        if success:
            console.print("[green]✓ 本地导出成功[/green]")
        else:
            console.print("[red]✗ 本地导出失败[/red]")
    
    # 飞书导出
    if output in ("feishu", "all"):
        exporter = FeishuExporter()
        success = await exporter.export_feedbacks(all_feedbacks)
        if success:
            console.print("[green]✓ 飞书导出成功[/green]")
        else:
            console.print("[red]✗ 飞书导出失败[/red]")
    
    # Notion 导出
    if output in ("notion", "all"):
        exporter = NotionExporter()
        success = await exporter.export_feedbacks(all_feedbacks)
        if success:
            console.print("[green]✓ Notion 导出成功[/green]")
        else:
            console.print("[red]✗ Notion 导出失败[/red]")
    
    console.print("\n[bold green]完成！[/bold green]\n")


def _init_collectors(platform: str) -> List[BaseCollector]:
    """初始化收集器"""
    config = get_config()
    collectors = []
    
    if platform in ("wechat", "all"):
        if config.platforms.wechat.enabled:
            collectors.append(WeChatCollector())
    
    if platform in ("qq", "all"):
        if config.platforms.qq.enabled:
            collectors.append(QQCollector())
    
    return collectors


def _load_history_feedbacks(path: str) -> List[Feedback]:
    """加载历史反馈"""
    import json
    
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        # 支持两种格式：直接列表或 AnalysisResult
        if isinstance(data, dict) and "feedbacks" in data:
            data = data["feedbacks"]
        
        feedbacks = []
        for item in data:
            if isinstance(item, dict):
                feedbacks.append(Feedback.model_validate(item))
        
        return feedbacks
    except Exception as e:
        console.print(f"[yellow]加载历史反馈失败: {e}[/yellow]")
        return []


def _display_feedbacks(feedbacks: List[Feedback]):
    """显示反馈列表"""
    # 按类型分组
    by_type = {}
    for fb in feedbacks:
        fb_type = fb.feedback_type.value
        if fb_type not in by_type:
            by_type[fb_type] = []
        by_type[fb_type].append(fb)
    
    # 显示表格
    for fb_type, items in sorted(by_type.items()):
        table = Table(title=f"[bold]{fb_type.upper()} ({len(items)})[/bold]")
        table.add_column("优先级", style="cyan", width=8)
        table.add_column("标题", style="green")
        table.add_column("报告者", style="yellow", width=15)
        table.add_column("置信度", style="magenta", width=8)
        
        for fb in sorted(items, key=lambda x: x.priority, reverse=True):
            priority_color = {
                "critical": "red",
                "high": "orange3",
                "medium": "yellow",
                "low": "green",
            }.get(fb.priority, "white")
            
            table.add_row(
                f"[{priority_color}]{fb.priority}[/{priority_color}]",
                fb.title[:50] + "..." if len(fb.title) > 50 else fb.title,
                ", ".join(fb.reported_by[:2])[:13] + "..." if len(fb.reported_by) > 2 else ", ".join(fb.reported_by),
                f"{fb.confidence:.0%}",
            )
        
        console.print(table)
        console.print()


@cli.command()
@click.option(
    "--platform",
    "-p",
    type=click.Choice(["wechat", "qq"], case_sensitive=False),
    required=True,
    help="选择平台",
)
def list_groups(platform: str):
    """列出可访问的群聊"""
    print_banner()
    
    async def _list():
        config = get_config()
        collector = None
        
        if platform == "wechat":
            if not config.platforms.wechat.enabled:
                console.print("[red]微信收集器未启用[/red]")
                return
            collector = WeChatCollector()
        elif platform == "qq":
            if not config.platforms.qq.enabled:
                console.print("[red]QQ 收集器未启用[/red]")
                return
            collector = QQCollector()
        
        if not collector:
            return
        
        with console.status(f"连接 {platform}..."):
            if not await collector.connect():
                console.print(f"[red]连接 {platform} 失败[/red]")
                return
            
            groups = await collector.get_groups()
            await collector.disconnect()
        
        if not groups:
            console.print("[yellow]未找到群聊[/yellow]")
            return
        
        table = Table(title=f"[bold]{platform.upper()} 群聊列表[/bold]")
        table.add_column("序号", style="cyan", width=6)
        table.add_column("ID", style="dim")
        table.add_column("名称", style="green")
        
        for i, grp in enumerate(groups, 1):
            table.add_row(
                str(i),
                grp["id"][:30] + "..." if len(grp["id"]) > 30 else grp["id"],
                grp["name"],
            )
        
        console.print(table)
        console.print(f"\n共 {len(groups)} 个群聊")
    
    asyncio.run(_list())


@cli.command()
def init():
    """初始化配置文件"""
    print_banner()
    
    config_path = Path("./config/config.yaml")
    
    if config_path.exists():
        overwrite = click.confirm("配置文件已存在，是否覆盖？", default=False)
        if not overwrite:
            console.print("[yellow]已取消[/yellow]")
            return
    
    # 创建配置目录
    config_path.parent.mkdir(parents=True, exist_ok=True)
    
    # 复制示例配置
    example_path = Path(__file__).parent.parent / "config" / "config.example.yaml"
    if example_path.exists():
        import shutil
        shutil.copy(example_path, config_path)
    else:
        # 使用内置默认配置
        config = Config()
        config.to_yaml(str(config_path))
    
    console.print(f"[green]✓ 配置文件已创建: {config_path.absolute()}[/green]")
    console.print("\n[bold]请编辑配置文件后运行:[/bold]")
    console.print("  feedback-collector collect --platform wechat --group \"你的群聊\"\n")


def main():
    """程序入口"""
    cli()


if __name__ == "__main__":
    main()
