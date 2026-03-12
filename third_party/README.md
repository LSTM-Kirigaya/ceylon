# Third Party Dependencies

本目录用于存放第三方依赖项目，主要包含以下项目：

## CipherTalk

[CipherTalk](https://github.com/ILoveBingLu/CipherTalk) 是一个现代化的微信聊天记录查看与分析工具。

### 用途

本项目使用 CipherTalk 的数据库读取能力来收集微信群聊消息。

### 集成方式

本项目采用 **Git Submodule** 方式集成 CipherTalk：

```bash
# 初始化子模块
git submodule add https://github.com/ILoveBingLu/CipherTalk.git third_party/CipherTalk
git submodule update --init --recursive
```

### 升级方法

当需要升级 CipherTalk 时，执行以下命令：

```bash
cd third_party/CipherTalk

# 拉取最新代码
git pull origin main

# 返回项目根目录
cd ../..

# 提交子模块更新
git add third_party/CipherTalk
git commit -m "chore: upgrade CipherTalk to latest version"
```

### 使用说明

1. **首次使用**：
   ```bash
   git clone --recursive <本项目仓库地址>
   ```

2. **已克隆项目，初始化子模块**：
   ```bash
   git submodule update --init --recursive
   ```

3. **更新所有子模块**：
   ```bash
   git submodule update --remote
   ```

### 项目依赖关系

```
feedback-collector/
├── src/
│   └── feedback_collector/
│       └── collectors/
│           └── wechat.py      # 引用 CipherTalk 的数据库读取逻辑
└── third_party/
    └── CipherTalk/            # Git 子模块
        ├── electron/
        │   └── services/
        │       ├── chatService.ts
        │       └── database.ts
        └── ...
```

### 注意事项

1. CipherTalk 是独立项目，本项目的微信收集器参考其实现，但进行了简化适配
2. 如需使用 CipherTalk 的完整功能，需要单独安装并运行该应用
3. 本项目的微信收集器要求微信数据库已解密，可使用 CipherTalk 的解密功能

## 其他依赖

如有其他第三方项目依赖，请在此目录下添加，并在本文件中说明。
