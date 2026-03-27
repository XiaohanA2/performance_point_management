# 问卷系统全链路检查报告

## 一、发现的问题

### 🔴 严重问题

#### 1. 身份证号硬编码为 q2 - 灵活性不足
**位置**:
- `questionnaire-actions.js:239` - submitQuestionnaireResponse
- `questionnaire-actions.js:408` - getSubmissionsByIdCard

**问题**:
```javascript
const idCardAnswer = answers.find(a => a.questionId === 'q2');
```
硬编码假设身份证号永远在 q2 位置，但问卷是自定义的，管理员可能：
- 不设置身份证号字段
- 将身份证号放在其他位置（q1, q3, q4...）
- 使用不同的 questionId

**影响**:
- 如果管理员创建的问卷没有 q2 字段，防重复功能失效
- 如果 q2 不是身份证号，会用错误的字段去重
- 查询记录功能会失败

**建议修复**:
```javascript
// 方案1: 在问卷配置中指定身份证字段
const questionnaire = await db.collection('questionnaires').doc(questionnaireId).get();
const idCardQuestionId = questionnaire[0].idCardQuestionId; // 新增字段
const idCardAnswer = answers.find(a => a.questionId === idCardQuestionId);

// 方案2: 通过问题类型标识
const idCardQuestion = questionnaire[0].questions.find(q => q.fieldType === 'idCard');
const idCardAnswer = answers.find(a => a.questionId === idCardQuestion?.id);
```

---

#### 2. 缺少 pages.json 路由配置
**位置**: `pages.json`

**问题**:
新创建的页面未在 pages.json 中注册：
- `pages/questionnaire/my-submissions.vue` ❌
- `pages/questionnaire/submission-success.vue` ❌

**影响**:
- 用户点击"查询我的记录"会报错：页面不存在
- 提交成功后跳转失败

**修复**:
```json
{
  "path": "pages/questionnaire/my-submissions",
  "style": {
    "navigationBarTitleText": "我的提交记录",
    "navigationBarBackgroundColor": "#ffffff",
    "navigationBarTextStyle": "black"
  }
},
{
  "path": "pages/questionnaire/submission-success",
  "style": {
    "navigationBarTitleText": "提交成功",
    "navigationBarBackgroundColor": "#ffffff",
    "navigationBarTextStyle": "black"
  }
}
```

---

### 🟡 中等问题

#### 3. 管理后台提取个人信息也硬编码了字段
**位置**: `questionnaire-responses.vue:71-75`

**问题**:
```javascript
getAnswerValue(response.answers, 'q1') // 姓名
getAnswerValue(response.answers, 'q2') // 身份证
getAnswerValue(response.answers, 'q3') // 网点
```

同样假设了固定的字段位置，不够灵活。

**建议**:
- 在问卷配置中标记哪些字段是"个人信息字段"
- 或者在管理后台动态识别前3个字段作为预览

---

#### 4. 缺少提交后的重复提交拦截（前端）
**位置**: `questionnaire-detail.vue:390-417`

**问题**:
用户提交成功后跳转到成功页，但如果用户返回问卷详情页，可以再次提交（虽然后端会拦截，但体验不好）。

**建议**:
```javascript
// 在 data 中添加
hasSubmitted: false

// 提交成功后设置
this.hasSubmitted = true;

// 在提交按钮上禁用
<button :disabled="!canSubmit || hasSubmitted" @click="submitQuestionnaire">
```

---

#### 5. 查询记录页面缺少详情查看功能
**位置**: `my-submissions.vue:163-167`

**问题**:
```javascript
viewDetail(item) {
  uni.navigateTo({
    url: `/pages/questionnaire/submission-detail?id=${item._id}`
  });
}
```

跳转到 `submission-detail` 页面，但这个页面不存在！

**修复方案**:
1. 创建 `submission-detail.vue` 页面显示完整答案
2. 或者改为弹窗显示（临时方案）

---

#### 6. 问卷列表缺少"已提交"标识
**位置**: `questionnaire-list.vue`

**问题**:
用户看不到自己已经提交过哪些问卷，可能重复填写。

**建议**:
```javascript
// 在加载问卷列表时，同时查询用户的提交记录
async loadQuestionnaires() {
  const questionnaires = await getQuestionnaires();

  // 如果有身份证号（从localStorage或用户输入），查询已提交的问卷
  const idCard = uni.getStorageSync('temp_id_card');
  if (idCard) {
    const submissions = await getSubmissionsByIdCard(idCard);
    const submittedIds = submissions.map(s => s.questionnaireId);

    questionnaires.forEach(q => {
      q.hasSubmitted = submittedIds.includes(q._id);
    });
  }

  this.questionnaires = questionnaires;
}
```

在卡片上显示"已提交"标签。

---

### 🟢 轻微问题

#### 7. 错误提示不够友好
**位置**: `questionnaire-actions.js:255`

**问题**:
```javascript
throw new Error('该身份证号已提交过此问卷');
```

用户可能不记得自己提交过，应该提供查询入口。

**建议**:
```javascript
throw new Error('该身份证号已提交过此问卷。您可以在"查询我的记录"中查看提交详情。');
```

---

#### 8. 缺少加载状态和空状态优化
**位置**: `my-submissions.vue`

**问题**:
- 搜索时没有防抖，频繁输入会触发多次请求
- 空状态提示可以更友好

**建议**:
```javascript
// 添加防抖
searchSubmissions: debounce(async function() {
  // ... 搜索逻辑
}, 500)
```

---

#### 9. 管理后台搜索功能是前端过滤
**位置**: `questionnaire-responses.vue:169-177`

**问题**:
```javascript
filteredResponses() {
  if (!this.searchKeyword.trim()) {
    return this.responses;
  }
  const keyword = this.searchKeyword.trim().toLowerCase();
  return this.responses.filter(response => {
    const name = this.getAnswerValue(response.answers, 'q1') || '';
    const idCard = this.getAnswerValue(response.answers, 'q2') || '';
    return name.toLowerCase().includes(keyword) || idCard.toLowerCase().includes(keyword);
  });
}
```

如果回复数量很多（>1000条），前端过滤会卡顿。

**建议**: 改为后端搜索
```javascript
// 云函数添加搜索参数
async function getQuestionnaireResponses(payload) {
  const { questionnaireId, searchKeyword } = payload;

  if (searchKeyword) {
    // 使用正则搜索
    whereCondition['answers'] = db.command.elemMatch({
      value: new RegExp(searchKeyword, 'i')
    });
  }

  // ...
}
```

---

## 二、功能完整性检查

### ✅ 已实现的功能

1. **问卷列表** - 支持未登录访问 ✓
2. **问卷填写** - 支持未登录填写 ✓
3. **身份证去重** - 防止重复提交 ✓
4. **提交成功页** - 友好的成功提示 ✓
5. **查询记录** - 通过身份证查询 ✓
6. **管理后台** - 查看回复、搜索、回复用户 ✓
7. **浮动按钮** - 快速入口 ✓

### ❌ 缺失的功能

1. **提交详情页** - `submission-detail.vue` 不存在
2. **Excel导出** - 只有占位代码
3. **订阅消息推送** - 未实现
4. **问卷统计分析** - 未实现
5. **问卷模板** - 未实现

---

## 三、数据库设计检查

### questionnaires 集合
```javascript
{
  _id: String,
  title: String,
  description: String,
  type: String,
  status: 'draft' | 'published' | 'closed',
  startDate: Number,
  endDate: Number,
  questions: Array,
  targetRoles: Array,  // ⚠️ 已废弃，但仍在数据中
  permissions: Object,
  createdBy: String,
  createdAt: Number,
  updatedAt: Number
}
```

**问题**: `targetRoles` 字段已废弃（改为完全开放），但：
1. 默认数据中仍然设置了这个字段
2. 代码中仍然显示这个字段（questionnaire-list.vue:97-100）

**建议**:
- 从默认数据中移除 `targetRoles`
- 从前端显示中移除相关代码

---

### questionnaire_responses 集合
```javascript
{
  _id: String,
  questionnaireId: String,
  userId: String,        // ⚠️ 可能为空（未登录用户）
  userName: String,      // ⚠️ 可能为空
  userBranch: String,    // ⚠️ 可能为空
  answers: Array,
  status: 'submitted' | 'replied',
  submittedAt: Number,
  adminReply: String,
  repliedAt: Number,
  notificationSent: Boolean
}
```

**问题**:
- `userId`, `userName`, `userBranch` 可能为空，但代码中没有处理空值情况
- 管理后台显示时会显示"未填写"，但应该从 answers 中提取

**建议**: 已在 questionnaire-responses.vue 中修复

---

## 四、安全性检查

### ✅ 已做好的安全措施

1. **权限控制** - 管理功能需要登录 ✓
2. **数据验证** - 后端验证必填项 ✓
3. **防重复提交** - 身份证去重 ✓
4. **时间校验** - 检查问卷有效期 ✓

### ⚠️ 潜在安全问题

1. **身份证号未加密存储** - 明文存储在数据库
   - 建议: 使用哈希或加密存储
   - 或者: 在云函数中脱敏后再返回前端

2. **缺少频率限制** - 同一IP可以无限次查询
   - 建议: 添加查询频率限制（如每分钟最多5次）

3. **缺少验证码** - 查询记录时没有验证码
   - 建议: 添加图形验证码或短信验证码

---

## 五、性能优化建议

### 1. 数据库索引
```javascript
// questionnaire_responses 集合需要添加索引
db.collection('questionnaire_responses').createIndex({
  questionnaireId: 1,
  submittedAt: -1
});

// 身份证查询索引（如果频繁使用）
db.collection('questionnaire_responses').createIndex({
  'answers.questionId': 1,
  'answers.value': 1
});
```

### 2. 分页加载
管理后台如果回复数量很多，应该分页加载：
```javascript
async function getQuestionnaireResponses(payload) {
  const { questionnaireId, page = 1, pageSize = 20 } = payload;

  const { data } = await db.collection('questionnaire_responses')
    .where({ questionnaireId })
    .orderBy('submittedAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get();

  return data;
}
```

### 3. 缓存问卷列表
问卷列表变化不频繁，可以缓存：
```javascript
// 前端缓存5分钟
const CACHE_KEY = 'questionnaire_list_cache';
const CACHE_DURATION = 5 * 60 * 1000;

async loadQuestionnaires() {
  const cache = uni.getStorageSync(CACHE_KEY);
  if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
    this.questionnaires = cache.data;
    return;
  }

  const data = await getQuestionnaires();
  uni.setStorageSync(CACHE_KEY, {
    data,
    timestamp: Date.now()
  });
  this.questionnaires = data;
}
```

---

## 六、用户体验优化

### 1. 进度保存
用户填写到一半退出，下次进入时恢复：
```javascript
// 在 questionnaire-detail.vue 中
watch: {
  answers: {
    handler(newVal) {
      // 保存到本地
      uni.setStorageSync(`questionnaire_draft_${this.questionnaireId}`, newVal);
    },
    deep: true
  }
},

onLoad() {
  // 恢复草稿
  const draft = uni.getStorageSync(`questionnaire_draft_${this.questionnaireId}`);
  if (draft) {
    this.answers = draft;
  }
}
```

### 2. 提交确认
提交前显示预览：
```javascript
submitQuestionnaire() {
  uni.showModal({
    title: '确认提交',
    content: '提交后将无法修改，确认提交吗？',
    success: (res) => {
      if (res.confirm) {
        this.doSubmit();
      }
    }
  });
}
```

### 3. 网络错误重试
```javascript
async doSubmit() {
  const maxRetries = 3;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await submitQuestionnaireResponse(this.questionnaireId, answersArray);
      break;
    } catch (error) {
      retries++;
      if (retries >= maxRetries) {
        uni.showToast({
          title: '提交失败，请检查网络后重试',
          icon: 'none'
        });
      }
    }
  }
}
```

---

## 七、优先级修复清单

### P0 - 必须立即修复（阻塞功能）
1. ✅ 添加 pages.json 路由配置
2. ✅ 创建 submission-detail.vue 或修改跳转逻辑

### P1 - 高优先级（影响体验）
3. 🔧 修复身份证号硬编码问题
4. 🔧 添加"已提交"标识
5. 🔧 优化错误提示

### P2 - 中优先级（优化体验）
6. 添加提交后拦截
7. 添加进度保存
8. 添加提交确认

### P3 - 低优先级（锦上添花）
9. 添加数据库索引
10. 添加缓存机制
11. 添加频率限制

---

## 八、总结

### 核心问题
1. **身份证号硬编码** - 最严重的设计缺陷
2. **缺少路由配置** - 导致功能无法使用
3. **缺少详情页** - 用户体验不完整

### 优势
1. 完全开放访问设计合理
2. 防重复提交机制有效
3. 管理后台功能完善
4. UI设计美观统一

### 建议
1. 立即修复 P0 问题
2. 重构身份证字段识别逻辑
3. 完善详情查看功能
4. 添加数据库索引
5. 考虑安全性增强（加密、验证码）
