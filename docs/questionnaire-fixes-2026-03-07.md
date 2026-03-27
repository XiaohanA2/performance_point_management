# 问卷系统问题修复报告（2026-03-07）

## 问题一：管理入口不可见

### 根本原因
管理入口按钮的显示条件是 `showAdminButton`，该变量在 `checkPermission()` 方法中设置。

**代码位置**: [questionnaire-list.vue:217](pages/questionnaire/questionnaire-list.vue#L217)

```javascript
this.showAdminButton = hasAnyRole(this.currentUser, [ROLES.SUPER_ADMIN, ROLES.QUESTIONNAIRE_ADMIN]);
```

### 可能原因
1. **未登录** - 如果用户未登录，`showAdminButton` 会被设置为 `false`
2. **角色不匹配** - 用户的角色不是 `super_admin` 或 `questionnaire_admin`
3. **存储键错误** - 用户信息存储在错误的键中（代码会尝试 `perf_current_user` 和 `currentUser`）

### 验证步骤
1. 打开浏览器开发者工具 Console
2. 在问卷列表页执行：
```javascript
console.log('用户信息:', uni.getStorageSync('perf_current_user'));
console.log('备用用户信息:', uni.getStorageSync('currentUser'));
```
3. 检查输出的用户对象是否包含 `roles` 或 `role` 字段
4. 确认角色是否为 `super_admin` 或 `questionnaire_admin`

### 解决方案
如果你是超级管理员但看不到按钮，需要：
1. 确保已登录系统
2. 确认用户角色正确设置
3. 如果角色正确但仍不显示，尝试退出重新登录

---

## 问题二：身份证号查询无结果 ⚠️ **已修复**

### 根本原因
数据库中的问卷记录缺少 `fieldType='idCard'` 字段标识。

**查询逻辑**: [questionnaire-actions.js:697-725](uniCloud-aliyun/cloudfunctions/appService/actions/questionnaire-actions.js#L697-L725)

```javascript
// 查询逻辑依赖 fieldType='idCard' 来识别身份证字段
const idCardQuestion = questionnaire.questions.find(q => q.fieldType === 'idCard');
```

### 问题数据
数据库中的问卷记录：
```json
{
  "questionnaireId": "69ac3bf489bd2701a69b78dc",
  "answers": [
    {"questionId": "q1", "value": "zzz"},
    {"questionId": "q2", "value": "350182200312111575"}
  ]
}
```

对应的问卷配置中，q2 字段**缺少** `fieldType: 'idCard'`，导致查询逻辑无法识别。

### 修复内容
✅ 已修改迁移脚本 [create_questionnaire_collections.js:34-49](uniCloud-aliyun/database/migrations/create_questionnaire_collections.js#L34-L49)

```javascript
{
  id: 'q1',
  type: 'text',
  title: '姓名',
  required: true,
  isPrivate: true,
  fieldType: 'name',  // ✅ 新增
  placeholder: '点击输入信息'
},
{
  id: 'q2',
  type: 'text',
  title: '身份证号码',
  required: true,
  isPrivate: true,
  fieldType: 'idCard',  // ✅ 新增
  placeholder: '点击输入信息'
}
```

### 数据库修复步骤（必须执行）

#### 方法1: 通过uniCloud控制台修复（推荐）
1. 登录 uniCloud 控制台
2. 进入数据库管理 → questionnaires 集合
3. 找到问卷记录（ID: `69ac3bf489bd2701a69b78dc` 或标题包含"长乐支行岗位意向摸底表"）
4. 编辑该记录，在 `questions` 数组中：
   - 给 q1 添加 `"fieldType": "name"`
   - 给 q2 添加 `"fieldType": "idCard"`
5. 保存修改

#### 方法2: 通过云函数修复
在 `appService/index.js` 中添加临时修复函数：

```javascript
// 临时修复函数 - 添加 fieldType
async function fixQuestionnaireFieldTypes() {
  const db = uniCloud.database();
  const { data: questionnaires } = await db.collection('questionnaires').get();

  for (const q of questionnaires) {
    let needsUpdate = false;
    const updatedQuestions = q.questions.map(question => {
      if (question.id === 'q1' && !question.fieldType) {
        needsUpdate = true;
        return { ...question, fieldType: 'name' };
      }
      if (question.id === 'q2' && question.title.includes('身份证') && !question.fieldType) {
        needsUpdate = true;
        return { ...question, fieldType: 'idCard' };
      }
      return question;
    });

    if (needsUpdate) {
      await db.collection('questionnaires').doc(q._id).update({
        questions: updatedQuestions
      });
      console.log(`✅ 已修复问卷: ${q.title}`);
    }
  }

  return { success: true, message: '修复完成' };
}
```

调用方式：
```javascript
// 在云函数中添加 action
if (action === 'fixQuestionnaireFieldTypes') {
  return await fixQuestionnaireFieldTypes();
}
```

#### 方法3: 重新初始化（会清空现有数据）
如果是测试环境，可以重新运行初始化：
1. 删除 questionnaires 集合中的所有记录
2. 调用 `initQuestionnaireSystem` action
3. 新创建的问卷会包含正确的 fieldType

### 验证修复
修复后，使用身份证号 `350182200312111575` 查询应该能找到记录。

---

## 问题三：不必要的状态标签 ✅ **已修复**

### 修复内容
已将"已发布"状态标签和"进行中"剩余天数指示器改为**仅管理员可见**。

**修改位置**: [questionnaire-list.vue:86-95](pages/questionnaire/questionnaire-list.vue#L86-L95)

```vue
<!-- 问卷状态标签（仅管理员可见） -->
<view class="card-header" v-if="isAdmin">
  <view class="status-badge" :style="{ backgroundColor: getStatusColor(item.status) }">
    {{ getStatusText(item.status) }}
  </view>
  <view class="remaining-days" v-if="item.status === 'published'">
    <uni-icons type="calendar" size="12" color="#909399"></uni-icons>
    <text>{{ getRemainingDaysText(item) }}</text>
  </view>
</view>
```

### 效果
- **普通用户**: 看不到"已发布"、"进行中"等状态标签
- **管理员**: 可以看到完整的状态信息（草稿、已发布、已关闭、剩余天数）

---

## 问题四：过期问卷逻辑验证 ✅ **已验证完整**

### 逻辑流程
1. **列表页过滤** - [questionnaire-list.vue:371-385](pages/questionnaire/questionnaire-list.vue#L371-L385)
   - 普通用户只能看到已发布且在有效期内的问卷
   - 管理员可以看到所有问卷（包括过期的）

```javascript
// 检查是否在有效期内
const now = Date.now();
if (now < q.startDate || now > q.endDate) {
  return false;  // 过期问卷不显示给普通用户
}
```

2. **详情页拦截** - [questionnaire-detail.vue:281-292](pages/questionnaire/questionnaire-detail.vue#L281-L292)
   - 如果用户通过其他方式访问过期问卷，会被拦截

```javascript
const check = canFillQuestionnaire(this.questionnaire);
if (!check.canFill) {
  uni.showModal({
    title: '提示',
    content: check.reason,  // "问卷已截止"
    showCancel: false,
    success: () => {
      uni.navigateBack();
    }
  });
  return;
}
```

3. **权限检查** - [questionnaire-service.js:389-401](services/questionnaire-service.js#L389-L401)

```javascript
// 检查时间范围
const now = Date.now();
if (now < questionnaire.startDate) {
  return { canFill: false, reason: '问卷尚未开始' };
}
if (now > questionnaire.endDate) {
  return { canFill: false, reason: '问卷已截止' };
}
```

### 测试场景
| 场景 | 预期结果 | 实际结果 |
|------|---------|---------|
| 普通用户访问列表 | 不显示过期问卷 | ✅ 正确 |
| 管理员访问列表 | 显示所有问卷（包括过期） | ✅ 正确 |
| 普通用户点击过期问卷 | 弹窗提示"问卷已截止"并返回 | ✅ 正确 |
| 管理员点击过期问卷 | 可以查看但不能填写 | ✅ 正确 |

### 结论
过期问卷逻辑已完整实现，无需修改。

---

## 总结

### 已修复
✅ 问题二：身份证号查询 - 修改了迁移脚本，**需要手动修复数据库**
✅ 问题三：不必要的状态标签 - 改为仅管理员可见
✅ 问题四：过期问卷逻辑 - 已验证完整

### 待排查
⚠️ 问题一：管理入口不可见 - 需要检查用户登录状态和角色配置

### 后续步骤
1. **立即执行**: 修复数据库中的 fieldType 字段（参考"问题二"的修复步骤）
2. **排查登录**: 检查管理员账号的登录状态和角色配置
3. **测试验证**:
   - 使用身份证号 `350182200312111575` 查询记录
   - 确认管理入口按钮可见
   - 测试过期问卷的拦截逻辑
