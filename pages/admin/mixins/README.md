# admin.vue Mixins 重构指南

## 概述

将 [admin.vue](../admin.vue) (3578行) 的各个tab逻辑拆分为独立的Vue 2 mixins，提升代码可维护性。

## Mixins 文件结构

```
pages/admin/mixins/
├── index.js                      # 统一导出
├── settings-tab-mixin.js         # 系统设置 tab
├── branches-tab-mixin.js         # 支行管理 tab
├── overview-tab-mixin.js         # 业绩汇总 tab
├── users-tab-mixin.js            # 用户管理 tab
└── rules-tab-mixin.js            # 业务规则 tab
```

## 使用方法

### 方式1: 在admin.vue中引入所有mixins

```javascript
// admin.vue
import { StoreService } from '../../services/store.js';
import IconHelper from '../../components/IconHelper.vue';
import {
  settingsTabMixin,
  branchesTabMixin,
  overviewTabMixin,
  usersTabMixin,
  rulesTabMixin
} from './mixins';

export default {
  components: { IconHelper },

  // 引入所有tab的mixins
  mixins: [
    settingsTabMixin,
    branchesTabMixin,
    overviewTabMixin,
    usersTabMixin,
    rulesTabMixin
  ],

  data() {
    return {
      // 全局共享的数据
      currentUser: StoreService.getCurrentUser(),
      activeTab: 'overview',
      tabs: [
        { key: 'overview', label: '业绩汇总' },
        { key: 'users', label: '用户管理' },
        { key: 'rules', label: '业务规则' },
        { key: 'branches', label: '支行管理' },
        { key: 'settings', label: '系统设置' }
      ],
      currentQuarter: StoreService.getCurrentQuarter(),
      // ... 其他全局数据
    };
  },

  async mounted() {
    // 初始化各个tab的数据
    await this.refreshOverviewData();
    await this.refreshUsers();
    await this.refreshRules();
    this.refreshBranches();
    this.refreshSettings();
  }
};
```

### 方式2: 按需引入（推荐）

如果某个tab暂时不需要修改，可以只引入需要的mixins：

```javascript
import { overviewTabMixin, usersTabMixin } from './mixins';

export default {
  mixins: [overviewTabMixin, usersTabMixin],
  // 其他tab的逻辑保留在原文件中
};
```

## Mixin 内容说明

### 1. settings-tab-mixin.js

**提供的数据:**
- `settings`: 系统设置对象

**提供的方法:**
- `updateSetting(key, value)`: 更新系统设置
- `refreshSettings()`: 刷新设置数据

**Template使用:**
```vue
<switch :checked="settings.allowEditSubmission"
        @change="updateSetting('allowEditSubmission', $event.detail.value)" />
```

### 2. branches-tab-mixin.js

**提供的数据:**
- `branches`: 支行列表
- `showBranchModal`: 控制弹窗显示
- `editingBranch`: 当前编辑的支行
- `branchForm`: 支行表单数据

**提供的方法:**
- `openBranchModal(branch)`: 打开编辑/新增弹窗
- `closeBranchModal()`: 关闭弹窗
- `saveBranch()`: 保存支行
- `deleteBranch(branch)`: 删除支行
- `refreshBranches()`: 刷新支行列表

### 3. overview-tab-mixin.js

**提供的数据:**
- `overviewData`: 业绩汇总数据
- `leaderboard`: 排行榜
- `searchKeyword`: 搜索关键词
- `selectedQuarter`: 选中的季度
- `quarterOptions`: 季度选项

**提供的计算属性:**
- `filteredOverviewData`: 过滤后的业绩数据

**提供的方法:**
- `refreshOverviewData()`: 刷新业绩数据
- `handleOverviewQuarterChange(e)`: 季度切换
- `getRank(employeeId)`: 获取排名
- `formatBranchName(name)`: 格式化支行名称
- `gotoUserDetails(employee)`: 跳转到用户详情

### 4. users-tab-mixin.js

**提供的数据:**
- `users`: 用户列表
- `showUserModal`: 控制弹窗显示
- `editingUser`: 当前编辑的用户
- `userForm`: 用户表单数据
- `userSearch`: 搜索关键词
- `branchIndex`: 支行选择器索引
- `roleIndex`: 角色选择器索引

**提供的计算属性:**
- `branchNameOptions`: 支行名称选项
- `roleOptions`: 角色选项
- `filteredUsers`: 过滤后的用户列表

**提供的方法:**
- `refreshUsers()`: 刷新用户列表
- `openUserModal(user)`: 打开编辑/新增弹窗
- `closeUserModal()`: 关闭弹窗
- `submitUserForm()`: 提交用户表单
- `toggleUserStatus(user)`: 切换用户状态
- `handleResetPassword(user)`: 重置密码
- `handleBranchPicker(event)`: 支行选择器变化
- `handleRolePicker(event)`: 角色选择器变化

**注意事项:**
- 依赖 `this.branches` (从branches-tab-mixin或data中获取)
- 需要在mounted中调用 `refreshUsers()`

### 5. rules-tab-mixin.js

**提供的数据:**
- `rules`: 规则列表
- `ruleDescriptionSections`: 规则说明分组
- `showRuleModal`: 控制规则弹窗显示
- `showRuleDescriptionModal`: 控制说明弹窗显示
- `editingRule`: 当前编辑的规则
- `ruleForm`: 规则表单数据
- `ruleDescriptionForm`: 规则说明表单
- `ruleTabType`: 规则标签类型
- UI选项：`iconOptions`, `colorOptions`, `ruleCategoryOptions`, `ruleGroupOptions`

**提供的计算属性:**
- `currentRuleGroups`: 当前业务分类的分组选项
- `RULE_SECTIONS`: 规则分组常量

**提供的方法:**
- `refreshRules()`: 刷新规则列表
- `openRuleModal(rule)`: 打开编辑/新增弹窗
- `closeRuleModal()`: 关闭弹窗
- `submitRuleForm()`: 提交规则表单
- `toggleRuleHidden(rule)`: 切换规则显示/隐藏
- `deleteRule(rule)`: 删除规则
- `selectRuleCategory(value)`: 选择业务分类
- `selectRuleGroup(value)`: 选择业务类型
- `selectRuleIcon(icon)`: 选择图标
- `selectRuleColor(color)`: 选择颜色

## 迁移步骤

### Step 1: 引入mixins

在 [admin.vue](../admin.vue) 的script部分引入mixins：

```javascript
import * as tabMixins from './mixins';

export default {
  mixins: [
    tabMixins.settingsTabMixin,
    tabMixins.branchesTabMixin,
    tabMixins.overviewTabMixin,
    tabMixins.usersTabMixin,
    tabMixins.rulesTabMixin
  ],
  // ...
};
```

### Step 2: 清理重复的data和methods

删除mixins中已经提供的data和methods，例如：

**删除这些data定义：**
```javascript
// 删除
settings: StoreService.getSettings(),
branches: StoreService.getBranches(),
rules: StoreService.getRules(),
overviewData: [],
users: [],
// ...
```

**删除这些methods：**
```javascript
// 删除
updateSetting(key, value) { ... },
openBranchModal(branch) { ... },
refreshOverviewData() { ... },
submitUserForm() { ... },
// ...
```

### Step 3: 在mounted中初始化

```javascript
async mounted() {
  // 确保用户已登录
  if (!this.isAdmin) return;

  // 初始化各tab数据
  await this.refreshOverviewData();
  await this.refreshUsers();
  await this.refreshRules();
  this.refreshBranches();
  this.refreshSettings();
}
```

### Step 4: 测试验证

1. 启动小程序
2. 进入admin页面
3. 逐个测试每个tab的功能
4. 确认所有功能正常工作

## 注意事项

1. **Mixin合并顺序**: Vue会按顺序合并mixins，后面的mixin会覆盖前面的同名属性
2. **依赖关系**: `users-tab-mixin` 依赖 `branches` 数据，确保同时引入 `branches-tab-mixin` 或在data中定义
3. **响应式数据**: mixins中的data函数会在每个组件实例中独立调用，互不影响
4. **方法上下文**: mixin中的methods中的this指向组件实例

## 优势

1. **代码复用**: 可以在其他组件中复用这些mixins
2. **关注点分离**: 每个tab的逻辑独立，便于维护
3. **降低风险**: 不改变template结构，只重构script部分
4. **渐进式迁移**: 可以逐个引入mixins，不需要一次性完成

## 后续优化建议

1. **提取共享逻辑**: 将多个mixins中重复的逻辑抽取为公共函数
2. **添加单元测试**: 为每个mixin添加独立的单元测试
3. **类型定义**: 如果使用TypeScript，可以为mixins添加类型定义
4. **文档完善**: 为复杂的methods添加详细注释
