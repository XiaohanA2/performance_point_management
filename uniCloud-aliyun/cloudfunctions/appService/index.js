'use strict';

const db = uniCloud.database();
const {
  CURRENT_QUARTER,
  getCurrentQuarter,
  SCORING_RULES,
  DEFAULT_SETTINGS,
  DEFAULT_KNOWLEDGE_BASE,
  DEFAULT_ROLES,
  DEFAULT_QUESTIONNAIRES
} = require('./default-data.js');

// 兼容 role（字符串）和 roles（数组）两种结构
const hasRole = (user, ...roleList) => {
  if (!user) return false;
  const roles = user.roles || (user.role ? [user.role] : []);
  return roleList.some(r => roles.includes(r));
};

// 导入个金业务默认配置
const { DEFAULT_PF_TASKS } = require('./constants/pf-default-tasks.js');

// 导入action模块
const permissionActions = require('./actions/permission.js');
const roleActions = require('./actions/role-actions.js');
const knowledgeActions = require('./actions/knowledge-actions.js');
const questionnaireActions = require('./actions/questionnaire-actions.js');
const pfActions = require('./actions/pf-actions.js');

const collections = {
  users: db.collection('users'),
  branches: db.collection('branches'),
  rules: db.collection('rules'),
  submissions: db.collection('submissions'),
  settings: db.collection('settings'),
  smsCodes: db.collection('sms_codes'),
  knowledgeBase: db.collection('knowledge_base'),
  roles: db.collection('roles'),
  questionnaires: db.collection('questionnaires'),
  questionnaireResponses: db.collection('questionnaire_responses'),
  notifications: db.collection('notifications'),
  // 个金业务集合
  pfTasks: db.collection('pf_tasks'),
  pfSubmissions: db.collection('pf_submissions'),
  pfMonthlyStats: db.collection('pf_monthly_stats')
};

const sanitizeUser = user => {
  if (!user) return null;
  const clone = { ...user };
  delete clone.password;
  return clone;
};

const genId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

async function ensureDefaults() {
  const [rulesCount, settingsCount, knowledgeBaseCount, rolesCount, questionnairesCount, pfTasksCount] = await Promise.all([
    collections.rules.count(),
    collections.settings.count(),
    collections.knowledgeBase.count(),
    collections.roles.count(),
    collections.questionnaires.count(),
    collections.pfTasks.count()
  ]);

  if (rulesCount.total === 0) {
    await collections.rules.add(
      SCORING_RULES.map(rule => ({
        ...rule,
        createdAt: Date.now()
      }))
    );
  }

  if (settingsCount.total === 0) {
    // 确保使用动态计算的当前季度作为默认值
    await collections.settings.add({
      _id: 'global',
      ...DEFAULT_SETTINGS,
      currentQuarter: getCurrentQuarter(),
      updatedAt: Date.now()
    });
  }

  if (knowledgeBaseCount.total === 0) {
    await collections.knowledgeBase.add(DEFAULT_KNOWLEDGE_BASE);
  }

  if (rolesCount.total === 0) {
    await collections.roles.add(DEFAULT_ROLES);
  } else {
    // 增量同步：确保 DEFAULT_ROLES 中的每个角色都存在
    const existingRoles = await getAllData(collections.roles);
    const existingCodes = new Set(existingRoles.map(r => r.roleCode));
    const missing = DEFAULT_ROLES.filter(r => !existingCodes.has(r.roleCode));
    if (missing.length > 0) {
      await collections.roles.add(missing);
    }
  }

  // 初始化问卷数据
  if (questionnairesCount.total === 0) {
    await collections.questionnaires.add(DEFAULT_QUESTIONNAIRES);
  }

  // 初始化个金业务配置
  if (pfTasksCount.total === 0) {
    await collections.pfTasks.add(DEFAULT_PF_TASKS);
  }
}

// 分页获取所有数据的辅助函数
async function getAllData(collection, query = {}) {
  let allData = [];
  let lastId = null;
  let hasMore = true;

  while (hasMore) {
    let q = collection;
    const whereCondition = {};

    // 合并查询条件
    if (Object.keys(query).length > 0) {
      Object.assign(whereCondition, query);
    }
    if (lastId) {
      whereCondition._id = db.command.gt(lastId);
    }

    if (Object.keys(whereCondition).length > 0) {
      q = q.where(whereCondition);
    }
    
    const res = await q.limit(1000).get();
    if (res.data.length === 0) {
      hasMore = false;
    } else {
      allData = allData.concat(res.data);
      lastId = res.data[res.data.length - 1]._id;
      if (res.data.length < 1000) {
        hasMore = false;
      }
    }
  }
  
  return allData;
}

async function bootstrap() {
  await ensureDefaults();
  const settingsRes = await collections.settings.doc('global').get();
  // 每次调用时动态计算当前季度，确保获取最新季度
  const dynamicCurrentQuarter = getCurrentQuarter();
  const settingsDoc = settingsRes.data[0] || { 
    ...DEFAULT_SETTINGS,
    currentQuarter: dynamicCurrentQuarter
  };
  
  // 优先使用动态计算的季度，确保数据是最新的，不受settings表中可能过时的季度影响
  const currentQuarter = dynamicCurrentQuarter;
  
  // 使用分页查询获取所有数据，避免默认100条限制
  // submissions 加载所有季度的数据，以支持历史季度查看
  const [usersData, branchesData, rulesData, submissionsData, rolesData] = await Promise.all([
    getAllData(collections.users),
    getAllData(collections.branches),
    getAllData(collections.rules),
    getAllData(collections.submissions), // 移除 quarter 筛选，加载所有数据
    getAllData(collections.roles)
  ]);
  
  // 更新settings中的currentQuarter为最新季度，确保下次使用正确
  if (settingsDoc.currentQuarter !== currentQuarter) {
    await collections.settings.doc('global').update({
      currentQuarter: currentQuarter,
      updatedAt: Date.now()
    });
    // 更新返回的settingsDoc
    settingsDoc.currentQuarter = currentQuarter;
  }
  
  // 构建 branchId -> branchName 映射，join 到用户对象
  const branchMap = {};
  branchesData.forEach(b => { branchMap[b.id] = b.name; });
  const usersWithBranch = usersData.map(user => {
    const sanitized = sanitizeUser(user);
    if (sanitized.branchId) {
      sanitized.branchName = branchMap[sanitized.branchId] || sanitized.branch || '';
    } else {
      // 兼容旧数据：没有 branchId 时直接用 branch 字段
      sanitized.branchName = sanitized.branch || '';
    }
    return sanitized;
  });

  return {
    users: usersWithBranch,
    branches: branchesData,
    rules: rulesData,
    settings: settingsDoc,
    currentQuarter,
    submissions: submissionsData,
    roles: rolesData
  };
}

async function loginWithPassword(payload) {
  const { phone, password } = payload;
  const userRes = await collections.users.where({ phone, password, status: 'active' }).get();
  if (!userRes.data.length) throw new Error('账号或密码错误');
  return sanitizeUser(userRes.data[0]);
}

async function loginWithCode(payload) {
  const { phone, code } = payload;
  await verifySmsCode(phone, code);
  const userRes = await collections.users.where({ phone, status: 'active' }).get();
  if (!userRes.data.length) throw new Error('用户不存在或已停用');
  return sanitizeUser(userRes.data[0]);
}

async function generateSmsCode(payload) {
  const { phone } = payload;
  if (!phone) throw new Error('手机号不能为空');
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  await collections.smsCodes.doc(phone).set({
    code,
    expiresAt: Date.now() + 5 * 60 * 1000
  });
  return { code };
}

async function verifySmsCode(phone, code) {
  const res = await collections.smsCodes.doc(phone).get();
  const record = res.data[0];
  if (!record) throw new Error('验证码已过期，请重新获取');
  if (record.code !== code) throw new Error('验证码错误');
  if (record.expiresAt < Date.now()) {
    await collections.smsCodes.doc(phone).remove();
    throw new Error('验证码已过期，请重新获取');
  }
  await collections.smsCodes.doc(phone).remove();
}

async function addUser(payload) {
  const { phone } = payload;
  const exists = await collections.users.where({ phone }).count();
  if (exists.total > 0) throw new Error('手机号已存在');
  const doc = {
    _id: genId(),
    name: payload.name,
    branch: payload.branch,
    branchId: payload.branchId || '',
    phone: payload.phone,
    password: payload.password || '123456',
    role: payload.role || 'manager',
    status: payload.status || 'active',
    createdAt: Date.now()
  };
  await collections.users.add(doc);
  return sanitizeUser(doc);
}

async function updateUser(payload) {
  const { id, updates } = payload;
  if (!id) throw new Error('缺少用户ID');
  if (updates?.phone) {
    const exists = await collections.users
      .where({ phone: updates.phone, _id: db.command.neq(id) })
      .count();
    if (exists.total > 0) throw new Error('手机号已存在');
  }
  await collections.users.doc(id).update({
    ...updates,
    updatedAt: Date.now()
  });
  const { data } = await collections.users.doc(id).get();
  return sanitizeUser(data[0]);
}

async function toggleUserStatus({ id }) {
  if (!id) throw new Error('缺少用户ID');
  const { data } = await collections.users.doc(id).get();
  if (!data.length) throw new Error('用户不存在');
  const nextStatus = data[0].status === 'active' ? 'disabled' : 'active';
  await collections.users.doc(id).update({ status: nextStatus, updatedAt: Date.now() });
  return sanitizeUser({ ...data[0], status: nextStatus });
}

async function resetPassword({ id, password = '123456' }) {
  if (!id) throw new Error('缺少用户ID');
  await collections.users.doc(id).update({ password, updatedAt: Date.now() });
  return true;
}

async function changePassword({ id, oldPassword, newPassword }) {
  if (!id || !newPassword) throw new Error('信息不完整');
  const { data } = await collections.users.doc(id).get();
  if (!data.length) throw new Error('用户不存在');
  if (data[0].password !== oldPassword) throw new Error('原密码错误');
  await collections.users.doc(id).update({ password: newPassword, updatedAt: Date.now() });
  return true;
}

async function checkDefaultPassword({ userId }) {
  if (!userId) throw new Error('缺少用户ID');
  const { data } = await collections.users.doc(userId).get();
  if (!data.length) throw new Error('用户不存在');
  return { isDefaultPassword: data[0].password === '123456' };
}

async function addBranch(payload) {
  const { id, name } = payload;
  if (!id || !name) throw new Error('支行编号和名称不能为空');
  const exists = await collections.branches.where(db.command.or([{ id }, { name }])).count();
  if (exists.total > 0) throw new Error('支行编号或名称已存在');
  await collections.branches.add({ id, name, createdAt: Date.now() });
  return { id, name };
}

async function updateBranch(payload) {
  const { id, updates } = payload;
  if (!id) throw new Error('缺少支行编号');
  const { data } = await collections.branches.where({ id }).get();
  if (!data.length) throw new Error('支行不存在');
  const nextId = updates?.id || id;
  const nextName = updates?.name || data[0].name;
  if (nextId !== id || nextName !== data[0].name) {
    const exists = await collections.branches
      .where(db.command.or([{ id: nextId }, { name: nextName }]))
      .where({ id: db.command.neq(id) })
      .count();
    if (exists.total > 0) throw new Error('支行编号或名称已存在');
  }
  await collections.branches.where({ id }).update({ id: nextId, name: nextName });
  return { id: nextId, name: nextName };
}

async function deleteBranch({ id }) {
  if (!id) throw new Error('缺少支行编号');
  const branchRes = await collections.branches.where({ id }).get();
  if (!branchRes.data.length) throw new Error('支行不存在');
  const usersRes = await collections.users.where({ branch: branchRes.data[0].name }).count();
  if (usersRes.total > 0) throw new Error('该支行仍有关联用户，请先调整所属支行');
  await collections.branches.where({ id }).remove();
  return true;
}

async function addRule(payload) {
  const doc = {
    ...payload,
    id: payload.id || genId(),
    createdAt: Date.now()
  };
  await collections.rules.add(doc);
  return doc;
}

async function updateRule(payload) {
  const { id, updates } = payload;
  if (!id) throw new Error('缺少规则ID');
  await collections.rules.where({ id }).update({ ...updates, updatedAt: Date.now() });
  const { data } = await collections.rules.where({ id }).get();
  return data[0];
}

async function deleteRule({ id }) {
  if (!id) throw new Error('缺少规则ID');
  const submissions = await collections.submissions.where({ ruleId: id }).count();
  if (submissions.total > 0) throw new Error('已有提报引用该规则，暂无法删除');
  await collections.rules.where({ id }).remove();
  return true;
}

async function addSubmission(payload) {
  const doc = {
    ...payload,
    _id: genId(),
    timestamp: Date.now()
  };
  await collections.submissions.add(doc);
  return doc;
}

async function updateSubmission(payload, context) {
  const { id, updates } = payload;
  const user = context?.user;

  if (!id) throw new Error('缺少提报ID');
  if (!user) throw new Error('未登录');

  // 获取原记录
  const { data } = await collections.submissions.doc(id).get();
  if (!data || data.length === 0) throw new Error('记录不存在');
  const record = data[0];

  // 管理员可以修改所有提报记录
  const isAdmin = hasRole(user, 'super_admin', 'credit_admin', 'admin');

  if (!isAdmin) {
    // 非管理员需要检查系统设置和时间限制
    const settingsRes = await collections.settings.doc('global').get();
    const settings = settingsRes.data[0] || { ...DEFAULT_SETTINGS };

    if (!settings.allowEditSubmission) throw new Error('系统已禁止修改提报记录');
    if (record.userId !== user._id) throw new Error('无权限修改此记录');

    // 检查24小时限制
    const hoursPassed = (Date.now() - (record.timestamp || 0)) / (1000 * 60 * 60);
    if (hoursPassed > 24) throw new Error('提报记录超过24小时，无法修改');
  }

  await collections.submissions.doc(id).update({ ...updates, updatedAt: Date.now() });
  const { data: updatedData } = await collections.submissions.doc(id).get();
  return updatedData[0];
}

async function deleteSubmission(payload, context) {
  const { id } = payload;
  const user = context?.user;

  if (!id) throw new Error('缺少提报ID');
  if (!user) throw new Error('未登录');

  // 获取原记录
  const { data } = await collections.submissions.doc(id).get();
  if (!data || data.length === 0) throw new Error('记录不存在');
  const record = data[0];

  // 管理员可以删除所有提报记录
  const isAdmin = hasRole(user, 'super_admin', 'credit_admin', 'admin');

  if (!isAdmin) {
    // 非管理员需要检查系统设置和时间限制
    const settingsRes = await collections.settings.doc('global').get();
    const settings = settingsRes.data[0] || { ...DEFAULT_SETTINGS };

    if (!settings.allowEditSubmission) throw new Error('系统已禁止删除提报记录');
    if (record.userId !== user._id) throw new Error('无权限删除此记录');

    // 检查24小时限制
    const hoursPassed = (Date.now() - (record.timestamp || 0)) / (1000 * 60 * 60);
    if (hoursPassed > 24) throw new Error('提报记录超过24小时，无法删除');
  }

  await collections.submissions.doc(id).remove();
  return true;
}

async function switchQuarter(payload) {
  const { nextQuarter, resetCurrent } = payload;
  if (!nextQuarter) throw new Error('缺少季度信息');
  const settingsRes = await collections.settings.doc('global').get();
  const settings = settingsRes.data[0] || { ...DEFAULT_SETTINGS };
  if (resetCurrent) {
    await collections.submissions.where({ quarter: settings.currentQuarter }).remove();
  }
  await collections.settings.doc('global').update({
    currentQuarter: nextQuarter,
    updatedAt: Date.now()
  });
  return { currentQuarter: nextQuarter };
}

async function clearQuarter({ archiveOnly }) {
  const settingsRes = await collections.settings.doc('global').get();
  const settings = settingsRes.data[0] || { ...DEFAULT_SETTINGS };
  if (archiveOnly) {
    await collections.submissions.where({ quarter: settings.currentQuarter }).update({
      archived: true
    });
  } else {
    await collections.submissions.where({ quarter: settings.currentQuarter }).remove();
  }
  return true;
}

async function updateSettings(payload) {
  await collections.settings.doc('global').update({
    ...payload,
    updatedAt: Date.now()
  });
  const { data } = await collections.settings.doc('global').get();
  return data[0];
}

async function cleanKnowledgeKeywords() {
  const { data: list } = await collections.knowledgeBase.limit(1000).get();
  let updated = 0;

  await Promise.all(list.map(async (item) => {
    if (!item.keywords || !item.keywords.length) return;

    const cleaned = item.keywords.filter(k => {
      // 删除"错误案例"和"错误X"（错误+数字/中文数字）
      if (k === '错误案例') return false;
      if (/^错误\d+$/.test(k)) return false;
      if (/^错误[一二三四五六七八九十百]+$/.test(k)) return false;
      return true;
    });

    if (cleaned.length !== item.keywords.length) {
      await collections.knowledgeBase.doc(item._id).update({ keywords: cleaned });
      updated++;
    }
  }));

  return { total: list.length, updated };
}

exports.main = async (event, context) => {
  const { action, payload = {} } = event;
  try {
    let data;
    switch (action) {
      case 'bootstrap':
        data = await bootstrap();
        break;
      case 'loginWithPassword':
        data = await loginWithPassword(payload);
        break;
      case 'loginWithCode':
        data = await loginWithCode(payload);
        break;
      case 'generateSmsCode':
        data = await generateSmsCode(payload);
        break;
      case 'addUser':
        data = await addUser(payload);
        break;
      case 'updateUser':
        data = await updateUser(payload);
        break;
      case 'toggleUserStatus':
        data = await toggleUserStatus(payload);
        break;
      case 'resetPassword':
        data = await resetPassword(payload);
        break;
      case 'changePassword':
        data = await changePassword(payload);
        break;
      case 'checkDefaultPassword':
        data = await checkDefaultPassword(payload);
        break;
      case 'addBranch':
        data = await addBranch(payload);
        break;
      case 'updateBranch':
        data = await updateBranch(payload);
        break;
      case 'deleteBranch':
        data = await deleteBranch(payload);
        break;
      case 'addRule':
        data = await addRule(payload);
        break;
      case 'updateRule':
        data = await updateRule(payload);
        break;
      case 'deleteRule':
        data = await deleteRule(payload);
        break;
      case 'addSubmission':
        data = await addSubmission(payload);
        break;
      case 'updateSubmission':
        data = await updateSubmission(payload, context);
        break;
      case 'deleteSubmission':
        data = await deleteSubmission(payload, context);
        break;
      case 'switchQuarter':
        data = await switchQuarter(payload);
        break;
      case 'clearQuarter':
        data = await clearQuarter(payload);
        break;
      case 'updateSettings':
        data = await updateSettings(payload);
        break;

      // 权限管理相关actions
      case 'assignUserRoles':
        data = await permissionActions.assignUserRoles(payload);
        break;
      case 'batchAssignRoles':
        data = await permissionActions.batchAssignRoles(payload);
        break;
      case 'getRoles':
        data = await roleActions.getRoles();
        break;
      case 'createRole':
        data = await roleActions.createRole(payload);
        break;
      case 'updateRolePermissions':
        data = await permissionActions.updateRolePermissions(payload);
        break;
      case 'deleteRole':
        data = await roleActions.deleteRole(payload);
        break;
      case 'getUsersWithRoles':
        data = await permissionActions.getUsersWithRoles(payload);
        break;
      case 'checkUserPermission':
        data = await permissionActions.checkUserPermission(payload);
        break;
      case 'getUserMenus':
        data = await permissionActions.getUserMenus(payload);
        break;
      case 'initDefaultRoles':
        data = await roleActions.initDefaultRoles();
        break;
      case 'syncDefaultRoles':
        data = await roleActions.syncDefaultRoles();
        break;
      case 'migrateUsers':
        const { migrateUsers } = require('../database/migrations/add_roles_to_users.js');
        data = await migrateUsers(db);
        break;

      // 知识库管理相关actions
      case 'searchKnowledge':
        data = await knowledgeActions.searchKnowledge(payload);
        break;
      case 'getKnowledgeDetail':
        data = await knowledgeActions.getKnowledgeDetail(payload);
        break;
      case 'createKnowledge':
        data = await knowledgeActions.createKnowledge(payload);
        break;
      case 'updateKnowledge':
        data = await knowledgeActions.updateKnowledge(payload);
        break;
      case 'deleteKnowledge':
        data = await knowledgeActions.deleteKnowledge(payload);
        break;
      case 'getKnowledgeList':
        data = await knowledgeActions.getKnowledgeList(payload);
        break;
      case 'getKnowledgeCategories':
        data = await knowledgeActions.getKnowledgeCategories();
        break;
      case 'importKnowledge':
        data = await knowledgeActions.importKnowledge(payload);
        break;
      case 'incrementKnowledgeViews':
        data = await knowledgeActions.incrementKnowledgeViews(payload);
        break;

      // 问卷管理相关actions
      case 'getQuestionnaires':
        data = await questionnaireActions.getQuestionnaires(payload);
        break;
      case 'getQuestionnaireDetail':
        data = await questionnaireActions.getQuestionnaireDetail(payload);
        break;
      case 'createQuestionnaire':
        data = await questionnaireActions.createQuestionnaire(payload);
        break;
      case 'updateQuestionnaire':
        data = await questionnaireActions.updateQuestionnaire(payload);
        break;
      case 'deleteQuestionnaire':
        data = await questionnaireActions.deleteQuestionnaire(payload);
        break;
      case 'submitQuestionnaireResponse':
        data = await questionnaireActions.submitQuestionnaireResponse(payload);
        break;
      case 'getQuestionnaireResponses':
        data = await questionnaireActions.getQuestionnaireResponses(payload);
        break;
      case 'getResponseDetail':
        data = await questionnaireActions.getResponseDetail(payload);
        break;
      case 'replyToResponse':
        data = await questionnaireActions.replyToResponse(payload);
        break;
      case 'deleteQuestionnaireResponse':
        data = await questionnaireActions.deleteQuestionnaireResponse(payload);
        break;
      case 'getUserResponses':
        data = await questionnaireActions.getUserResponses(payload);
        break;
      case 'exportQuestionnaireData':
        data = await questionnaireActions.exportQuestionnaireData(payload);
        break;
      case 'getQuestionnaireStats':
        data = await questionnaireActions.getQuestionnaireStats(payload);
        break;
      case 'getSubmissionsByIdCard':
        data = await questionnaireActions.getSubmissionsByIdCard(payload);
        break;
      case 'getNotifications':
        data = await questionnaireActions.getNotifications(payload);
        break;
      case 'markNotificationRead':
        data = await questionnaireActions.markNotificationRead(payload);
        break;
      case 'markAllNotificationsRead':
        data = await questionnaireActions.markAllNotificationsRead(payload);
        break;
      case 'getUnreadNotificationCount':
        data = await questionnaireActions.getUnreadNotificationCount(payload);
        break;

      // 个金业务系统actions
      case 'getPFTasks':
        data = await pfActions.getPFTasks(payload, context);
        break;
      case 'getPFMonthlyStats':
        data = await pfActions.getPFMonthlyStats(payload, context);
        break;
      case 'submitPFRecord':
        data = await pfActions.submitPFRecord(payload, context);
        break;
      case 'getPFSubmissions':
        data = await pfActions.getPFSubmissions(payload, context);
        break;
      case 'updatePFSubmission':
        data = await pfActions.updatePFSubmission(payload, context);
        break;
      case 'deletePFSubmission':
        data = await pfActions.deletePFSubmission(payload, context);
        break;
      case 'getPFRankings':
        data = await pfActions.getPFRankings(payload, context);
        break;
      case 'getAllPFTasks':
        data = await pfActions.getAllPFTasks(payload, context);
        break;
      case 'createPFTask':
        data = await pfActions.createPFTask(payload, context);
        break;
      case 'updatePFTask':
        data = await pfActions.updatePFTask(payload, context);
        break;
      case 'deletePFTask':
        data = await pfActions.deletePFTask(payload, context);
        break;
      case 'togglePFTask':
        data = await pfActions.togglePFTask(payload, context);
        break;
      case 'getPFSettings':
        data = await pfActions.getPFSettings(payload, context);
        break;
      case 'updatePFSettings':
        data = await pfActions.updatePFSettings(payload, context);
        break;
      case 'getAllPFSubmissions':
        data = await pfActions.getAllPFSubmissions(payload, context);
        break;
      case 'recalculatePFStats':
        data = await pfActions.recalculatePFStats(payload, context);
        break;
      case 'getLobbyManagers':
        data = await db.collection('users').where({ role: 'lobby_manager', status: 'active' }).field({ _id: true, name: true, branch: true }).get().then(r => r.data);
        break;
      case 'seedPFTestData':
        data = await pfActions.seedPFTestData(payload, context);
        break;
      case 'cleanupPFTestData':
        data = await pfActions.cleanupPFTestData(payload, context);
        break;
      case 'migratePFTasks': {
        const { migratePFTasks } = require('./fix-pf-tasks.js');
        data = await migratePFTasks();
        break;
      }

      // 问卷系统初始化
      case 'initQuestionnaireSystem':
        const { migrate } = require('../../database/migrations/create_questionnaire_collections.js');
        data = await migrate(db);
        break;

      case 'fixQuestionnaireFieldType':
        const { fixQuestionnaireFieldType } = require('./fix-questionnaire-fieldtype.js');
        data = await fixQuestionnaireFieldType();
        break;

      case 'cleanKnowledgeKeywords':
        data = await cleanKnowledgeKeywords();
        break;

      default:
        throw new Error(`未支持的action：${action}`);
    }
    return { data };
  } catch (error) {
    return { error: error.message || '服务异常' };
  }
};

