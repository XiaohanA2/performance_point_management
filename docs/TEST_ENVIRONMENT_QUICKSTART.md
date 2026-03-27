# 测试环境隔离 - 快速参考

## 🚀 快速开始

### 1️⃣ 创建测试空间

在 [uniCloud控制台](https://unicloud.dcloud.net.cn/) 创建新空间：
- 名称: `绩效积分-测试环境`
- 提供商: 阿里云
- 套餐: 免费版/开发版

记录: `spaceId` 和 `clientSecret`

### 2️⃣ 配置测试环境

```bash
# 创建测试环境配置文件
cp manifest.json manifest.test.json

# 编辑 manifest.test.json，修改 uniCloud 配置
# "spaceId": "你的测试空间ID"
# "clientSecret": "你的测试空间密钥"
```

### 3️⃣ 切换到测试环境

```bash
# 查看当前环境
node scripts/switch-env.js status

# 切换到测试环境
node scripts/switch-env.js test

# 在HBuilderX中重新上传云函数
```

### 4️⃣ 初始化测试数据

在uniCloud云函数本地调试中运行：

```javascript
const db = uniCloud.database();
const { initTestData } = require('../../scripts/init-test-data.js');
await initTestData(db);
```

或在云函数中创建临时函数调用 `initTestData`

### 5️⃣ 使用测试账号

- 管理员: `13800000001` / `123456`
- 测试用户1: `13800000002` / `123456`
- 测试用户2: `13800000003` / `123456`
- 测试用户3: `13800000004` / `123456`

### 6️⃣ 切换回生产环境

```bash
# 确认所有测试完成
node scripts/switch-env.js prod

# 在HBuilderX中重新上传云函数到生产空间
```

## 📋 常用命令

```bash
# 查看环境状态
node scripts/switch-env.js status

# 切换到测试环境
node scripts/switch-env.js test

# 切换到生产环境
node scripts/switch-env.js prod
```

## ⚠️ 注意事项

1. **生产环境保护**
   - 切换到生产环境前确保代码已测试完成
   - 生产数据不要随意删除或修改
   - 定期备份生产数据库

2. **测试环境维护**
   - 定期清理测试数据，保持环境干净
   - 测试完成后及时切换回生产环境
   - 不要在测试环境使用真实用户数据

3. **代码提交**
   - `.env` 文件已加入 `.gitignore`，不会提交
   - `manifest.test.json` 不会提交（包含敏感信息）
   - 只提交 `.env.example` 作为配置模板

## 🔍 验证清单

切换环境后验证：

- [ ] 在小程序中能正常登录
- [ ] 数据显示正确（测试环境只有测试数据）
- [ ] 能正常提交数据
- [ ] 云函数执行正常
- [ ] 不会影响另一个环境的数据

## 📚 详细文档

完整设置指南: [TEST_ENVIRONMENT_SETUP.md](./TEST_ENVIRONMENT_SETUP.md)

## 🆘 故障排查

### 问题: 小程序连接不到测试空间

**解决方案**:
1. 检查 `manifest.json` 中的 `spaceId` 是否正确
2. 在HBuilderX中重新上传云函数
3. 检查测试空间是否已创建并激活

### 问题: 测试数据初始化失败

**解决方案**:
1. 确认已切换到测试环境
2. 检查云函数是否正确上传到测试空间
3. 在uniCloud控制台查看云函数日志

### 问题: 切换环境后数据不对

**解决方案**:
1. 运行 `node scripts/switch-env.js status` 查看当前环境
2. 确认云函数上传到了正确的空间
3. 清除小程序缓存后重新运行

---

**最后更新**: 2025-02-17
