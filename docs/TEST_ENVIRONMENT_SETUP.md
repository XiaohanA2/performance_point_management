# 测试环境隔离设置指南

## 📋 概述

本文档描述如何为"银行绩效积分管理系统"设置独立的测试环境，确保测试数据与生产数据完全隔离。

## 🎯 目标

1. **数据隔离**: 测试环境独立于生产环境，测试操作不影响生产数据
2. **环境切换**: 提供简单的方法在开发和生产环境之间切换
3. **数据安全**: 防止误操作导致生产数据丢失或损坏
4. **并行开发**: 支持多人并行开发不同功能，互不干扰

## 🏗️ 架构设计

### 环境划分

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  项目根目录                                              │
│  ├── .env (环境配置，不提交到git)                        │
│  ├── .env.example (配置示例，提交到git)                  │
│  ├── scripts/                                           │
│  │   ├── switch-env.js          # 环境切换脚本           │
│  │   └── init-test-data.js      # 测试数据初始化脚本     │
│  ├── uniCloud-aliyun/                                   │
│  │   ├── cloudfunctions/        # 云函数                │
│  │   └── database/              # 数据库初始化           │
│  └── manifest.json              # uniCloud配置           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 环境配置

#### 生产环境（Production）
- **用途**: 正式线上环境，真实业务数据
- **空间ID**: `mp-5dcdd8dc-dc18-4559-9b2f-3c5e006c35b1`
- **数据**: 真实用户数据、提报记录、积分等
- **访问**: 正式发布的小程序

#### 测试环境（Test）
- **用途**: 功能测试、集成测试
- **空间ID**: 需要创建新的uniCloud空间
- **数据**: 模拟数据、测试用例
- **访问**: 开发版小程序或H5

#### 开发环境（Development，可选）
- **用途**: 本地开发、调试新功能
- **空间ID**: 可以复用测试环境或独立创建
- **数据**: 开发测试数据
- **访问**: 本地运行

## 📝 设置步骤

### Step 1: 创建测试环境uniCloud空间

1. **登录uniCloud控制台**
   - 访问 https://unicloud.dcloud.net.cn/
   - 使用阿里云账号登录

2. **创建新空间**
   - 点击"创建云空间"
   - 选择"阿里云"
   - 空间名称: `绩效积分-测试环境`
   - 选择套餐: 免费版或开发版即可
   - 点击创建

3. **记录空间信息**
   - 创建成功后，记录空间ID（格式: `mp-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`）
   - 记录 `clientSecret`（在空间设置中查看）

4. **配置安全域名**
   - 在测试空间配置中，添加你的小程序域名
   - 如果使用本地开发，配置 `localhost` 和本地IP

### Step 2: 初始化测试环境数据库

#### 方案A: 使用云函数初始化（推荐）

1. **上传云函数到测试空间**
   ```bash
   # 在HBuilderX中
   # 1. 右键点击 uniCloud-aliyun 目录
   # 2. 选择"关联云空间或项目"
   # 3. 选择刚创建的测试空间
   # 4. 上传部署云函数 appService
   ```

2. **运行初始化脚本**
   ```javascript
   // 在HBuilderX控制台或云函数本地调试中运行
   const db = uniCloud.database();
   const { DEFAULT_USERS, DEFAULT_BRANCHES, SCORING_RULES, DEFAULT_SETTINGS } = require('./default-data.js');

   // 初始化默认数据
   await db.collection('users').add(DEFAULT_USERS);
   await db.collection('branches').add(DEFAULT_BRANCHES);
   await db.collection('rules').add(SCORING_RULES);
   await db.collection('settings').add(DEFAULT_SETTINGS);
   ```

#### 方案B: 手动在uniCloud Web控制台创建

1. **打开测试空间的数据库管理**
2. **创建集合**（Collections）:
   - `users` - 用户表
   - `branches` - 支行表
   - `rules` - 业务规则表
   - `submissions` - 提报记录表
   - `settings` - 系统设置表
   - `sms_codes` - 验证码表

3. **插入测试数据**
   - 参考 `uniCloud-aliyun/cloudfunctions/appService/default-data.js` 中的数据结构
   - 手动插入几条测试用户和支行数据

### Step 3: 配置环境切换

#### 创建环境配置文件

1. **复制配置示例**
   ```bash
   cp .env.example .env
   ```

2. **填写测试环境配置**
   ```env
   NODE_ENV=development
   UNICLOUD_TEST_SPACE_ID=your-actual-test-space-id
   UNICLOUD_TEST_CLIENT_SECRET=your-actual-test-client-secret
   API_ENV=development
   ```

#### 修改 manifest.json

**方案1: 使用多个manifest文件（推荐）**

```bash
# 创建测试环境的manifest
cp manifest.json manifest.test.json
```

编辑 `manifest.test.json`:
```json
{
  "uniCloud": {
    "provider": "aliyun",
    "spaceId": "your-test-space-id",
    "clientSecret": "your-test-client-secret"
  }
}
```

**方案2: 使用条件编译**

在 `manifest.json` 中使用条件编译：
```json
{
  "uniCloud": {
    "provider": "aliyun",
    "spaceId": "#ifdef TEST_ENV",
    "clientSecret": "#ifdef TEST_ENV"
  }
}
```

### Step 4: 创建测试数据

运行测试数据初始化脚本（见下方 `scripts/init-test-data.js`）

### Step 5: 验证环境隔离

**检查清单**:
- [ ] 生产环境的用户、支行、提报数据不在测试环境中出现
- [ ] 测试环境的操作不影响生产数据
- [ ] 可以成功切换环境
- [ ] 小程序能正常连接到测试空间

## 🔄 环境切换方法

### 方法1: 使用HBuilderX（推荐）

1. **切换关联的云空间**
   - 右键点击 `uniCloud-aliyun` 目录
   - 选择"关联云空间或项目"
   - 选择目标环境的空间（生产/测试）

2. **重新上传云函数**
   - 右键点击 `cloudfunctions/appService`
   - 选择"上传部署"

### 方法2: 使用manifest文件

```bash
# 开发时使用测试环境
mv manifest.test.json manifest.json

# 发布时使用生产环境
mv manifest.prod.json manifest.json
```

### 方法3: 使用环境变量（需要配置构建脚本）

创建 `scripts/switch-env.js`（见下方实现）

## 📂 文件结构

### 需要创建的文件

```
performance_point_management/
├── .env                          # 环境配置（不提交）
├── .env.example                  # 环境配置示例（提交）
├── .gitignore                    # 添加 .env
├── manifest.json                 # 生产环境配置
├── manifest.test.json            # 测试环境配置
├── scripts/
│   ├── switch-env.js            # 环境切换工具
│   └── init-test-data.js        # 测试数据初始化
└── docs/
    └── TEST_ENVIRONMENT_SETUP.md # 本文档
```

## ⚠️ 注意事项

### 安全事项

1. **不要提交敏感信息**
   - `.env` 文件必须加入 `.gitignore`
   - 不要在代码中硬编码 spaceId 和 clientSecret

2. **生产环境保护**
   - 生产环境的 spaceId 只存储在 `manifest.json` 中
   - 定期备份生产数据库
   - 生产数据库操作前先在测试环境验证

3. **权限管理**
   - 测试环境可以设置较宽松的权限
   - 生产环境严格限制数据库操作权限

### 开发流程

1. **日常开发**
   - 使用测试环境
   - 在测试环境验证功能
   - 不影响生产数据

2. **功能测试**
   - 在测试环境进行完整测试
   - 验证数据库操作
   - 测试边界情况

3. **上线发布**
   - 切换到生产环境
   - 上传云函数到生产空间
   - 验证生产环境功能
   - 提交小程序审核

## 🧪 测试环境数据管理

### 数据初始化

使用 `scripts/init-test-data.js` 初始化测试数据（见下方）

### 数据清理

定期清理测试数据，保持环境干净：

```javascript
// 在uniCloud Web控制台运行
db.collection('submissions').where({ _id: db.command.exists(true) }).remove();
db.collection('users').where({ phone: /^1[3-9]\\d{9}$/ }).remove();
```

### 数据导入/导出

```bash
# 导出测试数据
# 在uniCloud控制台 -> 云数据库 -> 数据导出

# 导入数据
# 在uniCloud控制台 -> 云数据库 -> 数据导入
```

## 📊 常见问题

### Q1: 如何确认当前连接的是哪个环境？

**A**: 在小程序中查看当前环境标识：
```javascript
// 在 main.js 中
const accountInfo = uni.getAccountInfoSync();
console.log('当前环境空间ID:', accountInfo.miniProgram.envVersion);
```

### Q2: 测试环境空间不够用怎么办？

**A**:
1. 清理不用的测试数据
2. 删除测试日志
3. 升级空间套餐（如需要）

### Q3: 如何在本地同时开发多个功能？

**A**:
1. 为每个功能创建独立的开发分支
2. 使用同一个测试空间
3. 通过功能开关（feature flags）控制功能启用

### Q4: 测试环境的数据结构和生产环境不一致怎么办？

**A**:
1. 生产环境数据库结构变更后
2. 同步更新测试环境数据库结构
3. 运行数据库迁移脚本
4. 重新初始化测试数据

## ✅ 验证清单

完成测试环境设置后，使用此清单验证：

### 基础验证
- [ ] 测试空间创建成功
- [ ] 能成功上传云函数到测试空间
- [ ] 测试数据初始化成功
- [ ] 小程序能连接到测试空间

### 功能验证
- [ ] 能在测试环境登录
- [ ] 能在测试环境提交数据
- [ ] 测试数据不污染生产环境
- [ ] 能成功切换回生产环境

### 安全验证
- [ ] `.env` 文件已加入 `.gitignore`
- [ ] 生产环境配置不会误提交
- [ ] 测试环境操作不影响生产数据

## 📞 支持

如有问题，参考：
- [uniCloud官方文档](https://doc.dcloud.net.cn/uniCloud/)
- [阿里云uniCloud文档](https://help.aliyun.com/product/116870.html)

---

**创建日期**: 2025-02-17
**最后更新**: 2025-02-17
**维护者**: Claude Code Assistant
