# 贡献指南

感谢您对 Feedback Collector 项目的关注！我们欢迎各种形式的贡献。

## 如何贡献

### 报告问题

如果您发现了 bug 或有新功能建议，请通过 GitHub Issues 提交：

1. 检查是否已有相关 issue
2. 使用对应的 issue 模板
3. 提供尽可能详细的信息

### 提交代码

1. **Fork 仓库**
   ```bash
   git clone https://github.com/your-username/feedback-collector.git
   cd feedback-collector
   ```

2. **创建特性分支**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **安装开发依赖**
   ```bash
   pip install -e ".[dev]"
   ```

4. **编写代码**
   - 遵循 PEP 8 规范
   - 添加必要的注释和文档
   - 编写单元测试

5. **运行测试**
   ```bash
   pytest tests/
   black src/ tests/
   flake8 src/
   ```

6. **提交更改**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

7. **推送到远程**
   ```bash
   git push origin feature/your-feature-name
   ```

8. **创建 Pull Request**

### 代码规范

- **命名规范**：
  - 模块名：小写 + 下划线（`snake_case`）
  - 类名：首字母大写（`PascalCase`）
  - 函数/变量名：小写 + 下划线（`snake_case`）
  - 常量：全大写 + 下划线（`UPPER_SNAKE_CASE`）

- **类型注解**：
  - 函数参数和返回值都应添加类型注解
  - 使用 `Optional` 标记可选参数

- **文档字符串**：
  - 所有公共函数和类都需要文档字符串
  - 使用 Google 风格

- **提交信息**：
  - 使用语义化提交信息
  - 格式：`<type>: <subject>`
  - 类型：feat, fix, docs, style, refactor, test, chore

### 项目结构

```
feedback-collector/
├── src/feedback_collector/    # 主代码
│   ├── collectors/            # 收集器模块
│   ├── analyzer/              # 分析器模块
│   ├── exporters/             # 导出器模块
│   └── utils/                 # 工具函数
├── tests/                     # 测试代码
├── config/                    # 配置文件
├── docs/                      # 文档
└── third_party/               # 第三方依赖
```

### 测试规范

- 所有新功能都需要有单元测试
- 测试覆盖率应保持在 80% 以上
- 使用 pytest 框架
- 测试文件命名：`test_<module>.py`

### 文档规范

- 更新 README.md 以反映重要变更
- 为新功能添加使用示例
- 保持 CHANGELOG.md 的更新

## 行为准则

- 尊重所有参与者
- 接受建设性的批评
- 关注对社区最有利的事情
- 对其他社区成员表示同理心

## 获得帮助

如果您在贡献过程中遇到问题：

1. 查看现有文档
2. 搜索已解决的 issues
3. 在 GitHub Discussions 提问

感谢您的贡献！
