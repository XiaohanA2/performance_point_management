/**
 * 个金业务系统 - 云函数Actions
 */

const { calculateMonthlyStats, updateRankings } = require('../utils/pf-score-calculator.js');

// 兼容 role（字符串）和 roles（数组）两种结构
function hasAdminRole(user) {
  if (!user) return false;
  const roles = user.roles || (user.role ? [user.role] : []);
  return roles.some(r => ['super_admin', 'personal_finance_admin', 'branch_leader'].includes(r));
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

  const period = date.substring(0, 7);
  const uid = user._id || user.id;

  console.log('[submitPFRecord] 开始提报:', { uid, taskId, value, period });

  const submission = {
    userId: uid,
    userName: user.name,
    branchId: user.branchId,
    branch: user.branch,
    branchName: user.branchName || user.branch,
    taskId,
    period,
    date,
    value,
    score: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const addRes = await submissionsCollection.add(submission);
  console.log('[submitPFRecord] 提报记录已写入:', addRes.id);

  // 增量更新聚合表
  const totalsCollection = db.collection('pf_user_task_totals');
  const existing = await totalsCollection.where({ userId: uid, taskId, period }).get();

  let totalValue;
  if (existing.data && existing.data.length > 0) {
    await totalsCollection.doc(existing.data[0]._id).update({
      totalValue: db.command.inc(value),
      updatedAt: Date.now()
    });
    totalValue = existing.data[0].totalValue + value;
  } else {
    await totalsCollection.add({
      userId: uid,
      taskId,
      period,
      totalValue: value,
      updatedAt: Date.now()
    });
    totalValue = value;
  }

  console.log('[submitPFRecord] 立即返回成功，累计完成数:', totalValue);
  return { success: true, submissionId: addRes.id, totalValue };
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
  const { submissionId, value, userId } = payload;

  if (!submissionId) throw new Error('缺少提报ID');
  if (!userId) throw new Error('未登录');

  const db = uniCloud.database();

  // 获取当前用户信息（userId 可能是 id 或 _id）
  let user = null;
  try {
    const { data: userData } = await db.collection('users').where({ _id: userId }).get();
    if (userData && userData.length > 0) {
      user = userData[0];
    }
  } catch (e) {
    // 如果按 _id 查询失败，尝试按 id 字段查询
    const { data: userData } = await db.collection('users').where({ id: userId }).get();
    if (userData && userData.length > 0) {
      user = userData[0];
    }
  }

  if (!user) throw new Error('用户不存在');

  const collection = db.collection('pf_submissions');

  // 获取原记录
  const original = await collection.doc(submissionId).get();
  if (!original.data || original.data.length === 0) throw new Error('记录不存在');
  const record = original.data[0];

  // 管理员可以编辑所有记录
  const isAdmin = hasAdminRole(user);

  if (!isAdmin) {
    // 非管理员需要检查权限
    if (record.userId !== user._id) throw new Error('无权限编辑此记录');

    // 检查24小时限制
    const hoursPassed = (Date.now() - (record.createdAt || 0)) / (1000 * 60 * 60);
    if (hoursPassed > 24) throw new Error('提报记录超过24小时，无法修改');
  }

  // 更新记录
  const oldValue = record.value;
  const delta = value - oldValue;

  await collection.doc(submissionId).update({
    value,
    updatedAt: Date.now()
  });

  // 增量更新聚合表
  await db.collection('pf_user_task_totals')
    .where({
      userId: record.userId,
      taskId: record.taskId,
      period: record.period
    })
    .update({
      totalValue: db.command.inc(delta),
      updatedAt: Date.now()
    });

  console.log('[updatePFSubmission] 记录已更新，不触发积分计算');
  return { success: true, affectedUserId: record.userId };
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
    // 非管理员需要检查权限
    if (record.userId !== (user._id || user.id)) throw new Error('无权限删除此记录');

    // 检查24小时限制
    const hoursPassed = (Date.now() - (record.createdAt || 0)) / (1000 * 60 * 60);
    if (hoursPassed > 24) throw new Error('提报记录超过24小时，无法删除');
  }

  // 删除记录
  await collection.doc(submissionId).remove();

  // 增量更新聚合表
  await db.collection('pf_user_task_totals')
    .where({
      userId: record.userId,
      taskId: record.taskId,
      period: record.period
    })
    .update({
      totalValue: db.command.inc(-record.value),
      updatedAt: Date.now()
    });

  console.log('[deletePFSubmission] 记录已删除，不触发积分计算');
  return { success: true, affectedUserId: record.userId };
}

/**
 * 获取月度排名
 */
async function getPFRankings(payload, context) {
  const { period } = payload;
  const db = uniCloud.database();

  // 分页查询所有用户
  let allUsers = [];
  let skip = 0;
  const pageSize = 100;
  while (true) {
    const result = await db.collection('users')
      .where({ role: db.command.in(['manager', 'lobby_manager', 'elastic_counter', 'counter_manager']), status: 'active' })
      .field({ _id: true, name: true, branch: true, branchId: true, role: true })
      .skip(skip)
      .limit(pageSize)
      .get();
    allUsers = allUsers.concat(result.data);
    if (result.data.length < pageSize) break;
    skip += pageSize;
  }

  // 分页查询所有统计数据
  let allStats = [];
  skip = 0;
  while (true) {
    const result = await db.collection('pf_monthly_stats')
      .where({ period })
      .skip(skip)
      .limit(pageSize)
      .get();
    allStats = allStats.concat(result.data);
    if (result.data.length < pageSize) break;
    skip += pageSize;
  }

  const statsMap = {};
  allStats.forEach(stat => { statsMap[stat.userId] = stat; });

  const rankings = allUsers.map(user => {
    const stat = statsMap[user._id];
    return {
      userId: user._id,
      userName: user.name,
      branch: user.branch,
      branchId: user.branchId,
      role: user.role,
      requiredScore: stat ? stat.requiredScore : 0,
      totalScore: stat ? stat.totalScore : 0,
      requiredTasks: stat ? stat.requiredTasks : []
    };
  });

  rankings.sort((a, b) => b.totalScore - a.totalScore);
  return rankings;
}

// 全组重算防抖：记录正在重算的用户
const recalcQueue = new Set();
const MAX_CONCURRENT_RECALC = 3; // 最多同时3个重算任务

/**
 * 快速更新单个用户统计（不重算整组）
 */
async function updateSingleUserStats(db, userId, period) {
  if (!userId) return;

  const { calculateMonthlyStats } = require('../utils/pf-score-calculator.js');

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

  const userRes = await db.collection('users').doc(userId).get();
  if (!userRes.data || userRes.data.length === 0) return;
  const user = userRes.data[0];

  const stats = await calculateMonthlyStats(db, userId, period, requiredTaskIds, bonusTaskIds, tasksMap);

  const statsData = {
    userId,
    userName: user.name,
    branchId: user.branchId,
    period,
    ...stats,
    updatedAt: Date.now()
  };

  const statsCollection = db.collection('pf_monthly_stats');
  const existing = await statsCollection.where({ userId, period }).get();
  if (existing.data && existing.data.length > 0) {
    await statsCollection.doc(existing.data[0]._id).update(statsData);
  } else {
    await statsCollection.add({ ...statsData, createdAt: Date.now() });
  }
}

/**
 * 异步触发全组重算（带防抖和并发控制）
 */
async function triggerGroupRecalc(db, userId, period) {
  const key = `${userId}_${period}`;

  // 如果该用户正在重算，跳过
  if (recalcQueue.has(key)) {
    console.log(`用户 ${userId} 正在重算中，跳过`);
    return;
  }

  // 如果并发数已满，跳过（定时任务会兜底）
  if (recalcQueue.size >= MAX_CONCURRENT_RECALC) {
    console.log(`并发重算已满(${recalcQueue.size}/${MAX_CONCURRENT_RECALC})，跳过 ${userId}`);
    return;
  }

  recalcQueue.add(key);
  console.log(`开始重算 ${userId}，当前队列: ${recalcQueue.size}`);

  updateUserMonthlyStats(db, userId, period)
    .then(() => {
      console.log(`用户 ${userId} 重算完成`);
    })
    .catch(err => {
      console.error(`用户 ${userId} 重算失败:`, err);
    })
    .finally(() => {
      recalcQueue.delete(key);
      console.log(`移除 ${userId}，剩余队列: ${recalcQueue.size}`);
    });
}

/**
 * 只重算某个业务的积分（全组用户）
 */
async function updateSingleTaskScore(db, userId, taskId, period) {
  console.log('[updateSingleTaskScore] 开始, taskId:', taskId);

  const taskRes = await db.collection('pf_tasks').where({ taskId }).get();
  if (!taskRes.data || taskRes.data.length === 0) return;
  const task = taskRes.data[0];

  const { getGroupUserIds, calculateBenchmarkScore } = require('../utils/pf-score-calculator.js');
  const groupUserIds = await getGroupUserIds(db, userId);

  const submissionsRes = await db.collection('pf_submissions')
    .where({ userId: db.command.in(groupUserIds), taskId, period })
    .get();

  const userTotals = {};
  const totals = [];
  submissionsRes.data.forEach(sub => {
    userTotals[sub.userId] = (userTotals[sub.userId] || 0) + (sub.value || 0);
  });
  groupUserIds.forEach(uid => totals.push(userTotals[uid] || 0));

  const statsCollection = db.collection('pf_monthly_stats');
  const { weightScore, maxScore } = task.scoreConfig;
  const groupAvg = totals.length > 0 ? Math.round((totals.reduce((s, v) => s + v, 0) / totals.length) * 100) / 100 : 0;

  for (const uid of groupUserIds) {
    const existing = await statsCollection.where({ userId: uid, period }).get();
    if (!existing.data || existing.data.length === 0) continue;

    const stats = existing.data[0];
    const userTotal = userTotals[uid] || 0;
    const score = calculateBenchmarkScore(userTotal, totals, weightScore, maxScore);

    const requiredTasks = stats.requiredTasks || [];
    const taskIndex = requiredTasks.findIndex(t => t.taskId === taskId);
    if (taskIndex >= 0) {
      requiredTasks[taskIndex] = { ...requiredTasks[taskIndex], totalValue: userTotal, score: Math.round(score * 100) / 100, groupAvg };
    }

    const requiredScore = requiredTasks.reduce((sum, t) => sum + (t.score || 0), 0);
    await statsCollection.doc(stats._id).update({
      requiredTasks,
      requiredScore: Math.round(requiredScore * 100) / 100,
      totalScore: Math.round(requiredScore * 100) / 100,
      updatedAt: Date.now()
    });
  }

  console.log('[updateSingleTaskScore] 完成');
}

/**
 * 更新用户月度统计（内部函数）
 * 因为必选业务使用贡献度公式（组内相对排名），
 * 某人提报后会影响同组所有人的得分，需要重算整组
 */
async function updateUserMonthlyStats(db, userId, period) {
  console.log('[updateUserMonthlyStats] 开始计算, userId:', userId, 'period:', period);
  if (!userId) return;
  const tasksResult = await db.collection('pf_tasks').where({ isActive: true }).get();
  if (!tasksResult.data || tasksResult.data.length === 0) {
    console.log('[updateUserMonthlyStats] 没有启用的任务');
    return;
  }

  const tasksMap = {};
  const requiredTaskIds = [];
  const bonusTaskIds = [];
  tasksResult.data.forEach(task => {
    tasksMap[task.taskId] = task;
    if (task.category === 'required') requiredTaskIds.push(task.taskId);
    else if (task.category === 'bonus') bonusTaskIds.push(task.taskId);
  });

  console.log('[updateUserMonthlyStats] 必选任务:', requiredTaskIds.length, '加分任务:', bonusTaskIds.length);

  // 获取当前用户角色，找出同组所有人
  const { getGroupUserIds } = require('../utils/pf-score-calculator.js');
  const groupUserIds = await getGroupUserIds(db, userId);

  console.log('[updateUserMonthlyStats] 同组用户数:', groupUserIds.length);

  // 批量查询同组所有用户信息（分批处理，每批20个）
  const usersMap = {};
  for (let i = 0; i < groupUserIds.length; i += 20) {
    const batch = groupUserIds.slice(i, i + 20);
    const usersResult = await db.collection('users')
      .where({ _id: db.command.in(batch) })
      .field({ _id: true, name: true, branchId: true })
      .get();
    usersResult.data.forEach(u => { usersMap[u._id] = u; });
  }

  console.log('[updateUserMonthlyStats] 开始批量计算统计数据');

  // 直接查询聚合表（一次性获取全组所有任务的累计数）
  const totalsRes = await db.collection('pf_user_task_totals')
    .where({
      userId: db.command.in(groupUserIds),
      period
    })
    .limit(2000)
    .get();

  console.log('[updateUserMonthlyStats] 查询聚合表记录:', totalsRes.data.length);

  // 构建 userTaskTotals map（无需内存聚合）
  const userTaskTotals = {};
  totalsRes.data.forEach(item => {
    const key = `${item.userId}_${item.taskId}`;
    userTaskTotals[key] = item.totalValue;
  });

  console.log('[updateUserMonthlyStats] userTaskTotals 样本:', Object.keys(userTaskTotals).slice(0, 5));

  // 批量查询现有统计记录
  const existingStatsMap = {};
  for (let i = 0; i < groupUserIds.length; i += 20) {
    const batch = groupUserIds.slice(i, i + 20);
    const statsRes = await db.collection('pf_monthly_stats')
      .where({ userId: db.command.in(batch), period })
      .get();
    statsRes.data.forEach(s => { existingStatsMap[s.userId] = s; });
  }

  // 重算同组所有人的月度统计（分批处理）
  const statsCollection = db.collection('pf_monthly_stats');
  const batchSize = 10;

  for (let i = 0; i < groupUserIds.length; i += batchSize) {
    const batch = groupUserIds.slice(i, i + batchSize);
    await Promise.all(batch.map(async uid => {
      const user = usersMap[uid];
      if (!user) return;

      const stats = await calculateMonthlyStats(db, uid, period, requiredTaskIds, bonusTaskIds, tasksMap, groupUserIds, userTaskTotals);

      const statsData = {
        userId: uid,
        userName: user.name,
        branchId: user.branchId,
        period,
        ...stats,
        updatedAt: Date.now()
      };

      const existing = existingStatsMap[uid];
      if (existing) {
        await statsCollection.doc(existing._id).update(statsData);
      } else {
        await statsCollection.add({ ...statsData, createdAt: Date.now() });
      }
    }));
    console.log(`[updateUserMonthlyStats] 已完成 ${Math.min(i + batchSize, groupUserIds.length)}/${groupUserIds.length}`);
  }

  console.log('[updateUserMonthlyStats] 统计数据已更新，开始更新排名');

  // 更新排名
  await updateRankings(db, period);

  console.log('[updateUserMonthlyStats] 计算完成');
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

  let sortOrder = taskData.sortOrder;
  if (sortOrder === undefined || sortOrder === null) {
    const category = taskData.category || 'required';
    const maxRes = await collection.where({ category }).orderBy('sortOrder', 'desc').limit(1).get();
    const maxTask = maxRes.data && maxRes.data[0];
    sortOrder = maxTask && maxTask.sortOrder != null ? maxTask.sortOrder + 1 : 1;
  }

  const task = {
    ...taskData,
    sortOrder,
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

  // 检查是否有提报记录
  const submissionCount = await db.collection('pf_submissions').where({ taskId }).count();
  if (submissionCount.total > 0) {
    throw new Error('该业务已有提报记录，无法删除。请使用停用功能暂停新的提报。');
  }

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

  // 获取所有用户信息，添加 role 字段
  const userIds = [...new Set(result.data.map(s => s.userId))];
  const usersRes = await db.collection('users')
    .where({ _id: db.command.in(userIds) })
    .field({ _id: true, role: true })
    .get();

  const userRoleMap = {};
  usersRes.data.forEach(u => { userRoleMap[u._id] = u.role; });

  // 注入 role 字段
  return result.data.map(sub => ({
    ...sub,
    role: userRoleMap[sub.userId] || ''
  }));
}

/**
 * 导出个金业绩数据（优化版，使用聚合表）
 */
async function exportPFData(payload, context) {
  const { period } = payload;
  const db = uniCloud.database();

  // 1. 获取月度统计数据（包含得分）- 分页查询突破100条限制
  let allStats = [];
  let hasMore = true;
  let offset = 0;
  const pageSize = 100;

  while (hasMore) {
    const statsRes = await db.collection('pf_monthly_stats')
      .where({ period })
      .skip(offset)
      .limit(pageSize)
      .get();

    allStats = allStats.concat(statsRes.data);
    hasMore = statsRes.data.length === pageSize;
    offset += pageSize;
  }

  if (allStats.length === 0) {
    return { data: [] };
  }

  // 2. 获取用户任务完成数 - 分页查询
  let allTotals = [];
  hasMore = true;
  offset = 0;

  while (hasMore) {
    const totalsRes = await db.collection('pf_user_task_totals')
      .where({ period })
      .skip(offset)
      .limit(pageSize)
      .get();

    allTotals = allTotals.concat(totalsRes.data);
    hasMore = totalsRes.data.length === pageSize;
    offset += pageSize;
  }

  const userTaskTotals = {};
  allTotals.forEach(item => {
    if (!userTaskTotals[item.userId]) userTaskTotals[item.userId] = {};
    userTaskTotals[item.userId][item.taskId] = item.totalValue;
  });

  // 3. 获取员工任务配置 - 分页查询
  let allEmployeeTasks = [];
  hasMore = true;
  offset = 0;

  while (hasMore) {
    const empTasksRes = await db.collection('pf_employee_tasks')
      .where({ period })
      .skip(offset)
      .limit(pageSize)
      .get();

    allEmployeeTasks = allEmployeeTasks.concat(empTasksRes.data);
    hasMore = empTasksRes.data.length === pageSize;
    offset += pageSize;
  }

  const employeeTaskTargets = {};
  allEmployeeTasks.forEach(item => {
    if (!employeeTaskTargets[item.employeeId]) employeeTaskTargets[item.employeeId] = {};
    employeeTaskTargets[item.employeeId][item.taskId] = item.target;
  });

  // 4. 获取用户信息 - 分批查询（in 限制20个）
  const userIds = allStats.map(s => s.userId);
  const userMap = {};

  for (let i = 0; i < userIds.length; i += 20) {
    const batch = userIds.slice(i, i + 20);
    const usersRes = await db.collection('users')
      .where({ _id: db.command.in(batch) })
      .field({ _id: true, name: true, role: true, branch: true, status: true })
      .get();
    usersRes.data.forEach(u => { userMap[u._id] = u; });
  }

  // 5. 组装导出数据
  const data = allStats.map(stat => {
    const user = userMap[stat.userId] || {};
    const taskTotals = userTaskTotals[stat.userId] || {};
    const taskTargets = employeeTaskTargets[stat.userId] || {};

    // 从 requiredTasks 数组构建 taskScores 对象
    const taskScores = {};
    if (stat.requiredTasks && Array.isArray(stat.requiredTasks)) {
      stat.requiredTasks.forEach(t => {
        taskScores[t.taskId] = t.score;
      });
    }

    return {
      userId: stat.userId,
      userName: stat.userName,
      role: user.role,
      branch: user.branch,
      status: user.status,
      requiredScore: stat.requiredScore,
      bonusScore: stat.bonusScore || 0,
      totalScore: stat.totalScore,
      taskScores,
      taskTotals,
      taskTargets
    };
  });

  return { data };
}

async function getEmployeeTasks(payload, context) {
  const { employeeId, period } = payload;
  const db = uniCloud.database();
  const result = await db.collection('pf_employee_tasks')
    .where({ employeeId, period })
    .get();
  return result.data;
}

/**
 * 手动重算月度统计（用于数据修复）
 */
async function recalculatePFStats(payload, context) {
  const { userId, role, period } = payload;
  const db = uniCloud.database();

  console.log('[recalculatePFStats] 开始重算:', { userId, role, period });

  // 如果指定了 role，批量重算该角色所有用户
  if (role) {
    const usersRes = await db.collection('users')
      .where({ role, status: 'active' })
      .field({ _id: true })
      .limit(1000)
      .get();

    console.log(`[recalculatePFStats] 找到 ${usersRes.data.length} 个 ${role} 用户`);

    if (usersRes.data.length === 0) {
      return { success: true, count: 0 };
    }

    // 只需调用一次 updateUserMonthlyStats，它会自动重算整个组
    console.log(`[recalculatePFStats] 调用 updateUserMonthlyStats 重算整个组`);
    await updateUserMonthlyStats(db, usersRes.data[0]._id, period);

    console.log(`[recalculatePFStats] 完成重算 ${usersRes.data.length} 个用户`);
    return { success: true, count: usersRes.data.length };
  }

  // 否则重算单个用户（会重算整个组）
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

/**
 * 获取员工列表（支持按支行、角色筛选）
 */
async function getEmployees(payload, context) {
  const { branchId, role } = payload;
  const user = payload.user || context?.user;

  if (!hasAdminRole(user)) throw new Error('权限不足');

  const db = uniCloud.database();
  const conditions = { status: 'active', role: db.command.in(['manager', 'lobby_manager', 'elastic_counter', 'counter_manager']) };
  if (branchId) conditions.branchId = branchId;
  if (role) conditions.role = role;

  // 分页获取所有员工
  let allEmployees = [];
  let skip = 0;
  const limit = 100;

  while (true) {
    const result = await db.collection('users')
      .where(conditions)
      .field({ _id: true, name: true, branch: true, branchId: true, role: true })
      .orderBy('branch', 'asc')
      .orderBy('name', 'asc')
      .skip(skip)
      .limit(limit)
      .get();

    allEmployees = allEmployees.concat(result.data);

    if (result.data.length < limit) break;
    skip += limit;
  }

  return allEmployees;
}

/**
 * 保存员工任务配置
 */
async function saveEmployeeTask(payload, context) {
  const { employeeId, taskId, target, period } = payload;
  const user = payload.user || context?.user;

  if (!hasAdminRole(user)) throw new Error('权限不足');

  const db = uniCloud.database();
  const collection = db.collection('pf_employee_tasks');

  const existing = await collection.where({ employeeId, taskId, period }).get();

  if (existing.data && existing.data.length > 0) {
    await collection.doc(existing.data[0]._id).update({ target, updatedAt: Date.now() });
  } else {
    await collection.add({ employeeId, taskId, target, period, createdAt: Date.now(), updatedAt: Date.now() });
  }

  return { success: true };
}

/**
 * 获取员工任务配置
 */
async function getEmployeeTasks(payload, context) {
  const { period, employeeId, taskId } = payload;

  const db = uniCloud.database();
  const conditions = { period };
  if (employeeId) conditions.employeeId = employeeId;
  if (taskId) conditions.taskId = taskId;

  // 分页获取全部记录，避免超过 uniCloud 默认 100 条限制
  const collection = db.collection('pf_employee_tasks');
  let allData = [];
  let skip = 0;
  const limit = 500;
  while (true) {
    const result = await collection.where(conditions).skip(skip).limit(limit).get();
    allData = allData.concat(result.data);
    if (result.data.length < limit) break;
    skip += limit;
  }

  // 如果当前月份没有数据，尝试从上个月复制
  if (allData.length === 0 && period && !employeeId && !taskId) {
    const [year, month] = period.split('-').map(Number);
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevPeriod = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

    const prevData = [];
    skip = 0;
    while (true) {
      const result = await collection.where({ period: prevPeriod }).skip(skip).limit(limit).get();
      prevData.push(...result.data);
      if (result.data.length < limit) break;
      skip += limit;
    }

    if (prevData.length > 0) {
      const now = Date.now();
      for (const item of prevData) {
        await collection.add({
          employeeId: item.employeeId,
          taskId: item.taskId,
          target: item.target,
          period,
          createdAt: now,
          updatedAt: now
        });
      }
      // 重新查询新插入的数据
      allData = await collection.where({ period }).get().then(res => res.data);
    }
  }

  return allData;
}

/**
 * 批量保存员工任务配置
 */
async function batchSaveEmployeeTasks(payload, context) {
  const { tasks } = payload;
  const user = payload.user || context?.user;

  if (!hasAdminRole(user)) throw new Error('权限不足');
  if (!tasks || !Array.isArray(tasks)) throw new Error('tasks必须是数组');

  const db = uniCloud.database();
  const collection = db.collection('pf_employee_tasks');

  for (const task of tasks) {
    const { employeeId, taskId, target, period } = task;
    const existing = await collection.where({ employeeId, taskId, period }).get();

    if (existing.data && existing.data.length > 0) {
      await collection.doc(existing.data[0]._id).update({ target, updatedAt: Date.now() });
    } else {
      await collection.add({ employeeId, taskId, target, period, createdAt: Date.now(), updatedAt: Date.now() });
    }
  }

  return { success: true, count: tasks.length };
}

/**
 * 清除指定期间的所有员工任务配置
 */
async function clearEmployeeTasks(payload, context) {
  const { period } = payload;
  const user = payload.user || context?.user;

  if (user && !hasAdminRole(user)) throw new Error('权限不足');
  if (!period) throw new Error('period必填');

  const db = uniCloud.database();
  const collection = db.collection('pf_employee_tasks');

  // 分批删除
  let totalDeleted = 0;
  while (true) {
    const res = await collection.where({ period }).limit(100).get();
    if (!res.data || res.data.length === 0) break;
    for (const doc of res.data) {
      await collection.doc(doc._id).remove();
    }
    totalDeleted += res.data.length;
  }

  return { success: true, deleted: totalDeleted };
}

/**
 * 复制上月任务配置到新月份
 */
async function copyPreviousMonthTasks(payload, context) {
  const { period } = payload;
  const user = payload.user || context?.user;

  if (!hasAdminRole(user)) throw new Error('权限不足');
  if (!period) throw new Error('period必填');

  const db = uniCloud.database();
  const collection = db.collection('pf_employee_tasks');

  // 检查当前月份是否已有数据
  const existing = await collection.where({ period }).limit(1).get();
  if (existing.data && existing.data.length > 0) {
    return { success: true, copied: 0, message: '当前月份已有配置' };
  }

  // 计算上个月
  const [year, month] = period.split('-').map(Number);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevPeriod = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

  // 获取上月所有配置
  const prevData = [];
  let skip = 0;
  const limit = 500;
  while (true) {
    const result = await collection.where({ period: prevPeriod }).skip(skip).limit(limit).get();
    prevData.push(...result.data);
    if (result.data.length < limit) break;
    skip += limit;
  }

  if (prevData.length === 0) {
    return { success: true, copied: 0, message: '上月无配置数据' };
  }

  // 批量插入新月份
  const now = Date.now();
  for (const item of prevData) {
    await collection.add({
      employeeId: item.employeeId,
      taskId: item.taskId,
      target: item.target,
      period,
      createdAt: now,
      updatedAt: now
    });
  }

  return { success: true, copied: prevData.length };
}

/**
 * 按角色重算积分
 */
async function recalcByRole(payload, context) {
  const { role, period } = payload;
  // 权限检查已移除，由前端页面控制访问
  if (!role || !period) throw new Error('缺少参数');

  console.log('[recalcByRole] 开始重算:', { role, period });

  try {
    // 调用现有的重算函数
    const result = await recalculatePFStats({ role, period }, context);
    console.log('[recalcByRole] recalculatePFStats 返回:', result);

    // 写入重算标记
    const db = uniCloud.database();
    await db.collection('pf_monthly_stats').doc('_recalc_marker').set({
      lastRecalcTime: Date.now(),
      period,
      role
    });

    console.log('[recalcByRole] 重算完成:', result);
    return { success: true, role, userCount: result.count };
  } catch (error) {
    console.error('[recalcByRole] 重算失败:', error);
    throw error;
  }
}

/**
 * 全部重算
 */
async function recalcAll(payload, context) {
  const { period } = payload;
  // 权限检查已移除，由前端页面控制访问
  if (!period) throw new Error('缺少参数');

  console.log('[recalcAll] 开始全部重算:', { period });

  const roles = ['manager', 'lobby_manager', 'elastic_counter', 'counter_manager'];

  // 并行执行所有角色的重算（不传递 user，让 recalcByRole 自己判断）
  const results = await Promise.all(
    roles.map(role => recalcByRole({ role, period }, context))
  );

  console.log('[recalcAll] 全部重算完成:', results);
  return { success: true, results };
}

/**
 * 清理指定月份的所有数据
 */
async function cleanPeriodData(payload, context) {
  const { period } = payload;
  if (!period) throw new Error('缺少 period 参数');

  const db = uniCloud.database();

  console.log('[cleanPeriodData] 开始清理:', period);

  // 1. 删除提报记录
  const submissionsRes = await db.collection('pf_submissions').where({ period }).remove();
  console.log('[cleanPeriodData] 删除提报记录:', submissionsRes.deleted);

  // 2. 删除月度统计
  const statsRes = await db.collection('pf_monthly_stats').where({ period }).remove();
  console.log('[cleanPeriodData] 删除月度统计:', statsRes.deleted);

  // 3. 删除聚合表数据
  const totalsRes = await db.collection('pf_user_task_totals').where({ period }).remove();
  console.log('[cleanPeriodData] 删除聚合数据:', totalsRes.deleted);

  return {
    success: true,
    deleted: {
      submissions: submissionsRes.deleted || 0,
      stats: statsRes.deleted || 0,
      totals: totalsRes.deleted || 0
    }
  };
}

/**
 * 重建聚合表（从 submissions 重建）
 */
async function rebuildUserTaskTotals(payload, context) {
  const { period } = payload;
  const user = payload.user || context?.user;

  // 临时注释权限检查，用于初始化数据
  // if (!hasAdminRole(user)) throw new Error('权限不足');
  if (!period) throw new Error('缺少 period 参数');

  const db = uniCloud.database();
  const totalsCollection = db.collection('pf_user_task_totals');

  console.log('[rebuildUserTaskTotals] 开始重建, period:', period);

  // 1. 清空指定期间数据
  await totalsCollection.where({ period }).remove();

  // 2. 使用聚合管道从 submissions 重建
  const $ = db.command.aggregate;
  const result = await db.collection('pf_submissions').aggregate()
    .match({ period })
    .group({
      _id: {
        userId: '$userId',
        taskId: '$taskId',
        period: '$period'
      },
      totalValue: $.sum('$value')
    })
    .end();

  console.log('[rebuildUserTaskTotals] 聚合完成，记录数:', result.data.length);

  // 3. 批量写入（每批100条）
  const records = result.data.map(item => ({
    userId: item._id.userId,
    taskId: item._id.taskId,
    period: item._id.period,
    totalValue: item.totalValue,
    updatedAt: Date.now()
  }));

  for (let i = 0; i < records.length; i += 100) {
    await totalsCollection.add(records.slice(i, i + 100));
  }

  console.log('[rebuildUserTaskTotals] 重建完成');
  return { success: true, count: records.length };
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
  exportPFData,
  getEmployeeTasks,
  recalculatePFStats,
  recalcByRole,
  recalcAll,
  rebuildUserTaskTotals,
  cleanPeriodData,
  seedPFTestData,
  cleanupPFTestData,
  getEmployees,
  saveEmployeeTask,
  getEmployeeTasks,
  batchSaveEmployeeTasks,
  clearEmployeeTasks,
  copyPreviousMonthTasks
};
