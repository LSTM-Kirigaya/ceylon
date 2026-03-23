# Scripts 文件夹

此文件夹包含项目开发、测试和数据处理相关的脚本工具。

## 分类说明

### 数据库相关
| 脚本 | 说明 |
|------|------|
| `check-db.ts` | 检查数据库连接和表结构 |
| `init-db.js` / `init-db.mjs` | 数据库初始化脚本 |
| `init-db-pg.js` | PostgreSQL 专用初始化 |
| `init-db-rest.mjs` | 通过 REST API 初始化数据库 |
| `init-db-final.mjs` | 最终版数据库初始化 |
| `init-db-fetch.js` | 带数据获取的初始化 |

### 测试相关
| 脚本 | 说明 |
|------|------|
| `test-auth.py` | 认证功能测试 (Python) |
| `test-auth-*.mjs` | 各种认证流程测试 |
| `test-login-*.mjs` | 登录相关测试 |
| `e2e-*.mjs` | 端到端测试脚本 |
| `complete-e2e-test.mjs` | 完整 E2E 测试 |

### i18n 国际化
| 脚本 | 说明 |
|------|------|
| `extract_messages.py` | 从代码中提取翻译字符串到 messages 文件 |

### 飞书数据获取
| 脚本 | 说明 |
|------|------|
| `fetch_feishu_*.py` | 飞书文档数据获取脚本 |
| `view_feishu_data.py` | 查看飞书数据结构 |

### 分析工具
| 脚本 | 说明 |
|------|------|
| `analyze_with_context.py` | 带上下文的代码分析工具 |

## 使用方式

```bash
# 运行 TypeScript 脚本
npx ts-node scripts/check-db.ts

# 运行 Python 脚本
python scripts/extract_messages.py

# 运行 Node 脚本
node scripts/init-db.mjs
```
