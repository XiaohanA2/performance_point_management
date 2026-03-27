/**
 * 个金业务系统 - 云函数Actions
 */

const { calculateMonthlyStats, updateRankings } = require('../utils/pf-score-calculator.js');

// 兼容 role（字符串）和 roles（数组）两种结构
function hasAdminRole(user) {
  if (!user) return false;
  const roles = user.roles || (user.role ? [user.role] : []);
  return roles.some(r => ['super_admin', 'personal_finance_admin'].includes(r));
}

/**
 * 获取业务配置列表
 * 按用户角色注入对应的 target 目标数
 */
async function getPFTasks(payload, context) {
  const { category, isActive } = payload;
  const user = context?.user;
  const db = uniCloud.database();
  const collection = db.collection('pf_tasks');

  let query = collection;
  if (category) query = query.where({ category });
  if (typeof isActive === 'boolean') query = query.where({ isActive });

  const result = await query.orderBy('sortOrder', 'asc').get();
  const tasks = result.data;

  // 按用户角色注入 target，前端直接用 task.target 显示任务目标数
  const role = user?.role || null;
  return tasks.map(task => ({
    ...task,
    target: (task.targetByRole && role && task.targetByRole[role]) || null
  }));
}

/**
 * 获取用户月度统计
 */
async function getPFMonthlyStats(payload, context) {
  const { userId, period } = payload;
  const db = uniCloud.database();
  const collection = db.collection('pf_monthly_stats');

  const result = await collection
    .where({ userId, period })
    .get();

  if (result.data && result.data.length > 0) {
    return result.data[0];
  }

  // 如果没有统计数据，返回空结构
  return {
    userId,
    period,
    requiredTasks: [],
    bonusTasks: [],
    requiredScore: 0,
    bonusScore: 0,
    totalScore: 0,
    rank: 0
  };
}

/**
 * 提报业务数据
 */
async function submitPFRecord(payload, context) {
  const { taskId, date, value, user: payloadUser } = payload;
  const user = payloadUser || context.user;

  if (!user) throw new Error('未登录');

  const db = uniCloud.database();
  const submissionsCollection = db.collection('pf_submissions');

  // 提取月度周期（如"2026-03-15" -> "2026-03"）
  const period = date.substring(0, 7);

  // 创建提报记录
  const uid = user._id || user.id;
  const submission = {
    userId: uid,
    userName: user.name,
    branchId: user.branchId,
    branchName: user.branchName,
    taskId,
    period,
    date,
    value,
    score: 0,  // 初始得分为0，后续统计时计算
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  await submissionsCollection.add(submission);

  // 更新月度统计
  await updateUserMonthlyStats(db, uid, period);

  return { success: true };
}

/**
 * 获取提报记录
 */
async function getPFSubmissions(payload, context) {
  const { userId, period, taskId, startDate, endDate } = payload;
  const db = uniCloud.database();
  const collection = db.collection('pf_submissions');

  let query = collection.where({});

  // 构建查询条件
  const conditions = [];
  if (userId) conditions.push({ userId });
  if (period) conditions.push({ period });
  if (taskId) conditions.push({ taskId });
  if (startDate) conditions.push({ date: db.command.gte(startDate) });
  if (endDate) conditions.push({ date: db.command.lte(endDate) });

  if (conditions.length > 0) {
    query = collection.where(db.command.and(conditions));
  }

  const result = await query.orderBy('date', 'desc').get();
  return result.data;
}

/**
 * 编辑提报记录
 */
async function updatePFSubmission(payload, context) {
  const { submissionId, value, user: payloadUser } = payload;
  const user = payloadUser || context.user;

  if (!user) throw new Error('未登录');

  const db = uniCloud.database();
  const collection = db.collection('pf_submissions');

  // 获取原记录
  const original = await collection.doc(submissionId).get();
  if (!original.data || original.data.length === 0) throw new Error('记录不存在');
  const record = original.data[0];

  // 管理员可以编辑所有记录
  const isAdmin = hasAdminRole(user);

  if (!isAdmin) {
    // 非管理员需要检查系统设置和时间限制
    const settingsCollection = db.collection('settings');
    const settingsRes = await settingsCollection.doc('global').get();
    const settings = settingsRes.data[0] || { allowEditSubmission: true };

    if (!settings.allowEditSubmission) throw new Error('系统已禁止修改提报记录');
    if (record.userId !== (user._id || user.id)) throw new Error('无权限编辑此记录');

    // 检查24小时限制
    const hoursPassed = (Date.now() - (record.createdAt || 0)) / (1000 * 60 * 60);
    if (hoursPassed > 24) throw new Error('提报记录超过24小时，无法修改');
  }

  // 更新记录
  await collection.doc(submissionId).update({
    value,
    updatedAt: Date.now()
  });

  // 更新月度统计
  await updateUserMonthlyStats(db, record.userId, record.period);

  return { success: true };
}

/**
 * 删除提报记录
 */
async function deletePFSubmission(payload, context) {
  const { submissionId, user: payloadUser } = payload;
  const user = payloadUser || context.user;

  if (!user) throw new Error('未登录');

  const db = uniCloud.database();
  const collection = db.collection('pf_submissions');

  // 获取原记录
  const original = await collection.doc(submissionId).get();
  if (!original.data || original.data.length === 0) throw new Error('记录不存在');
  const record = original.data[0];

  // 管理员可以删除所有记录
  const isAdmin = hasAdminRole(user);

  if (!isAdmin) {
    // 非管理员需要检查系统设置和时间限制
    const settingsCollection = db.collection('settings');
    const settingsRes = await settingsCollection.doc('global').get();
    const settings = settingsRes.data[0] || { allowEditSubmission: true };

    if (!settings.allowEditSubmission) throw new Error('系统已禁止删除提报记录');
    if (record.userId !== (user._id || user.id)) throw new Error('无权限删除此记录');

    // 检查24小时限制
    const hoursPassed = (Date.now() - (record.createdAt || 0)) / (1000 * 60 * 60);
    if (hoursPassed > 24) throw new Error('提报记录超过24小时，无法删除');
  }

  // 删除记录
  await collection.doc(submissionId).remove();

  // 更新月度统计
  await updateUserMonthlyStats(db, record.userId, record.period);

  return { success: true };
}

/**
 * 获取月度排名
 */
async function getPFRankings(payload, context) {
  const { period, limit = 100 } = payload;
  const db = uniCloud.database();

  // 并行查询用户和统计数据
  const [usersResult, statsResult] = await Promise.all([
    db.collection('users')
      .where({ role: db.command.in(['manager', 'lobby_manager', 'elastic_counter', 'counter_manager']), status: 'active' })
      .field({ _id: true, name: true, branch: true, branchId: true, role: true })
      .limit(500)
      .get(),
    db.collection('pf_monthly_stats')
      .where({ period })
      .limit(500)
      .get()
  ]);

  const statsMap = {};
  statsResult.data.forEach(stat => { statsMap[stat.userId] = stat; });

  const rankings = usersResult.data.map(user => {
    const stat = statsMap[user._id];
    return {
      userId: user._id,
      userName: user.name,
      branch: user.branch,
      branchId: user.branchId,
      role: user.role,
      requiredScore: stat ? stat.requiredScore : 0,
      bonusScore: stat ? stat.bonusScore : 0,
      totalScore: stat ? stat.totalScore : 0,
      requiredTasks: stat ? stat.requiredTasks : [],
      bonusTasks: stat ? stat.bonusTasks : []
    };
  });

  rankings.sort((a, b) => b.totalScore - a.totalScore);
  return rankings.slice(0, limit);
}

/**
 * 更新用户月度统计（内部函数）
 * 因为必选业务使用贡献度公式（组内相对排名），
 * 某人提报后会影响同组所有人的得分，需要重算整组
 */
async function updateUserMonthlyStats(db, userId, period) {
  if (!userId) return;
  const tasksResult = await db.collection('pf_tasks').where({ isActive: true }).get();
  if (!tasksResult.data || tasksResult.data.length === 0) return;

  const tasksMap = {};
  const requiredTaskIds = [];
  const bonusTaskIds = [];
  tasksResult.data.forEach(task => {
    tasksMap[task.taskId] = task;
    if (task.category === 'required') requiredTaskIds.push(task.taskId);
    else if (task.category === 'bonus') bonusTaskIds.push(task.taskId);
  });

  // 获取当前用户角色，找出同组所有人
  const { getGroupUserIds } = require('../utils/pf-score-calculator.js');
  const groupUserIds = await getGroupUserIds(db, userId);

  // 批量查询同组所有用户信息
  const usersResult = await db.collection('users')
    .where({ _id: db.command.in(groupUserIds) })
    .field({ _id: true, name: true, branchId: true })
    .get();
  const usersMap = {};
  usersResult.data.forEach(u => { usersMap[u._id] = u; });

  // 重算同组所有人的月度统计
  const statsCollection = db.collection('pf_monthly_stats');
  await Promise.all(groupUserIds.map(async uid => {
    const user = usersMap[uid];
    if (!user) return;
    const stats = await calculateMonthlyStats(db, uid, period, requiredTaskIds, bonusTaskIds, tasksMap);

    const statsData = {
      userId: uid,
      userName: user.name,
      branchId: user.branchId,
      period,
      ...stats,
      updatedAt: Date.now()
    };

    const existing = await statsCollection.where({ userId: uid, period }).get();
    if (existing.data && existing.data.length > 0) {
      await statsCollection.doc(existing.data[0]._id).update(statsData);
    } else {
      await statsCollection.add({ ...statsData, createdAt: Date.now() });
    }
  }));

  // 更新排名
  await updateRankings(db, period);
}

/**
 * 管理员：获取所有业务配置
 */
async function getAllPFTasks(payload, context) {
  const user = context.user;

  // 权限检查
  if (!hasAdminRole(user)) {
    throw new Error('权限不足');
  }

  const db = uniCloud.database();
  const result = await db.collection('pf_tasks')
    .orderBy('category', 'asc')
    .orderBy('sortOrder', 'asc')
    .get();

  return result.data;
}

/**
 * 管理员：创建业务配置
 */
async function createPFTask(payload, context) {
  const user = payload.user || context.user;

  // 权限检查
  if (!hasAdminRole(user)) {
    throw new Error('权限不足');
  }

  const db = uniCloud.database();
  const collection = db.collection('pf_tasks');

  const { user: _u, ...taskData } = payload;
  const task = {
    ...taskData,
    taskId: taskData.taskId || ('task_' + Date.now()),
    createdBy: user._id || user.id,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  await collection.add(task);
  return { success: true };
}

/**
 * 管理员：更新业务配置
 */
async function updatePFTask(payload, context) {
  const { taskId, user: payloadUser, ...updates } = payload;
  const user = payloadUser || context.user;

  // 权限检查
  if (!hasAdminRole(user)) {
    throw new Error('权限不足');
  }

  const db = uniCloud.database();
  const collection = db.collection('pf_tasks');

  await collection.where({ taskId }).update({
    ...updates,
    updatedAt: Date.now()
  });

  return { success: true };
}

/**
 * 管理员：删除业务配置
 */
async function deletePFTask(payload, context) {
  const { taskId } = payload;
  const user = payload.user || context.user;

  // 权限检查
  if (!hasAdminRole(user)) {
    throw new Error('权限不足');
  }

  const db = uniCloud.database();
  const collection = db.collection('pf_tasks');

  await collection.where({ taskId }).remove();

  return { success: true };
}

/**
 * 管理员：启用/禁用业务
 */
async function togglePFTask(payload, context) {
  const { taskId, isActive } = payload;
  const user = payload.user || context.user;

  // 权限检查
  if (!hasAdminRole(user)) {
    throw new Error('权限不足');
  }

  const db = uniCloud.database();
  const collection = db.collection('pf_tasks');

  await collection.where({ taskId }).update({
    isActive,
    updatedAt: Date.now()
  });

  return { success: true };
}

/**
 * 获取个金系统设置
 */
async function getPFSettings(payload, context) {
  const db = uniCloud.database();
  const res = await db.collection('settings').doc('pf_global').get();
  if (res.data && res.data.length > 0) return res.data[0];
  // 默认设置
  return { _id: 'pf_global', allowEditSubmission: true, allowDeleteSubmission: true };
}

/**
 * 更新个金系统设置
 */
async function updatePFSettings(payload, context) {
  const user = payload.user || (context && context.user);
  if (!hasAdminRole(user)) {
    throw new Error('权限不足');
  }
  const { settings } = payload;
  const db = uniCloud.database();
  const existing = await db.collection('settings').doc('pf_global').get();
  if (existing.data && existing.data.length > 0) {
    await db.collection('settings').doc('pf_global').update({ ...settings, updatedAt: Date.now() });
  } else {
    await db.collection('settings').add({ _id: 'pf_global', ...settings, createdAt: Date.now(), updatedAt: Date.now() });
  }
  return { success: true };
}

/**
 * 管理员获取所有提报记录（提报流）
 */
async function getAllPFSubmissions(payload, context) {
  const { period, limit = 500 } = payload;
  const db = uniCloud.database();
  const conditions = {};
  if (period) conditions.period = period;

  const result = await db.collection('pf_submissions')
    .where(conditions)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return result.data;
}

/**
 * 手动重算月度统计（用于数据修复）
 */
async function recalculatePFStats(payload, context) {
  const { userId, period } = payload;
  const db = uniCloud.database();

  await updateUserMonthlyStats(db, userId, period);

  return { success: true };
}

/**
 * 测试：批量插入提报数据
 */
async function seedPFTestData(payload, context) {
  const { records, period = '2026-03' } = payload;
  if (!records || !Array.isArray(records)) throw new Error('缺少records数组');

  const db = uniCloud.database();
  const collection = db.collection('pf_submissions');

  const submissions = records.map(r => ({
    userId: r.userId,
    userName: r.userName,
    taskId: r.taskId,
    period,
    date: `${period}-15`,
    value: r.value,
    score: 0,
    isTest: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }));

  // 分批插入（每批100条）
  for (let i = 0; i < submissions.length; i += 100) {
    await collection.add(submissions.slice(i, i + 100));
  }

  // 触发所有大堂经理的重算
  const userIds = [...new Set(records.map(r => r.userId))];
  for (const uid of userIds) {
    await updateUserMonthlyStats(db, uid, period);
  }

  return { success: true, count: submissions.length };
}

/**
 * 测试：清除测试数据
 */
async function cleanupPFTestData(payload, context) {
  const { period = '2026-03' } = payload;
  const db = uniCloud.database();

  // 删除所有 isTest 的提报
  await db.collection('pf_submissions').where({ isTest: true }).remove();

  // 删除所有大堂经理的月度统计
  const users = await db.collection('users').where({ role: 'lobby_manager', status: 'active' }).field({ _id: true }).get();
  const userIds = users.data.map(u => u._id);

  if (userIds.length > 0) {
    await db.collection('pf_monthly_stats').where({ userId: db.command.in(userIds), period }).remove();
  }

  return { success: true };
}

module.exports = {
  getPFTasks,
  getPFMonthlyStats,
  submitPFRecord,
  getPFSubmissions,
  updatePFSubmission,
  deletePFSubmission,
  getPFRankings,
  getAllPFTasks,
  createPFTask,
  updatePFTask,
  deletePFTask,
  togglePFTask,
  getPFSettings,
  updatePFSettings,
  getAllPFSubmissions,
  recalculatePFStats,
  seedPFTestData,
  cleanupPFTestData
};
