/**
 * 个金业务系统 - 积分计算引擎
 *
 * 必选业务使用贡献度公式（组内相对排名）：
 *   完成数 >= 组内平均：得分 = 权重分 + (完成数 - avg) / (max - avg) * 权重分 * 0.4
 *   完成数 <  组内平均：得分 = 权重分 - (avg - 完成数) / (avg - min) * 权重分 * 0.4
 *   完成数 == 0：得分 = 0
 *   封顶 maxScore
 *
 * 加分业务：仅记录完成量，不计算积分
 */

/**
 * 贡献度公式计算单项必选得分
 */
function calculateBenchmarkScore(userTotal, allTotals, weightScore, maxScore) {
  if (userTotal === 0) return 0;

  const validTotals = allTotals.filter(v => v > 0);
  if (validTotals.length === 0) return 0;

  const avg = allTotals.reduce((s, v) => s + v, 0) / allTotals.length;
  const max = Math.max(...allTotals);
  const min = Math.min(...allTotals); // 含0

  let score;
  if (userTotal >= avg) {
    score = max === avg
      ? weightScore
      : weightScore + (userTotal - avg) / (max - avg) * weightScore * 0.4;
  } else {
    score = avg === min
      ? weightScore
      : weightScore - (avg - userTotal) / (avg - min) * weightScore * 0.4;
  }

  return Math.min(Math.round(score * 10000) / 10000, maxScore);
}

/**
 * 加分业务不再计算积分，仅记录完成量
 */

/**
 * 获取同组所有用户某业务的月度完成数
 * 返回 { userId -> totalValue } map 和所有人的完成数数组
 */
async function getGroupTotals(db, taskId, period, groupUserIds) {
  if (!groupUserIds || groupUserIds.length === 0) return { map: {}, totals: [] };

  const $ = db.command.aggregate;
  const result = await db.collection('pf_submissions').aggregate()
    .match({ taskId, period, userId: db.command.in(groupUserIds) })
    .group({ _id: '$userId', totalValue: $.sum('$value') })
    .end();

  const map = {};
  result.data.forEach(r => { map[r._id] = r.totalValue; });

  // 所有组员都要有值（没提报的为0）
  const totals = groupUserIds.map(uid => map[uid] || 0);
  return { map, totals };
}

/**
 * 获取同组用户ID列表（同角色）
 */
async function getGroupUserIds(db, userId) {
  if (!userId) return [];
  // 先获取当前用户的角色
  const userRes = await db.collection('users').doc(userId).get();
  if (!userRes.data || userRes.data.length === 0) return [userId];
  const role = userRes.data[0].role;

  // 获取同角色所有在职用户
  const groupRes = await db.collection('users')
    .where({ role, status: 'active' })
    .field({ _id: true })
    .get();

  return groupRes.data.map(u => u._id);
}

/**
 * 获取用户单项月度完成总数
 */
async function getUserMonthlyTotal(db, userId, taskId, period) {
  const $ = db.command.aggregate;
  const result = await db.collection('pf_submissions').aggregate()
    .match({ userId, taskId, period })
    .group({ _id: null, totalValue: $.sum('$value') })
    .end();

  return result.data && result.data.length > 0 ? result.data[0].totalValue : 0;
}

/**
 * 计算用户月度统计（主入口）
 * 必选业务需要同组数据，加分业务独立计算
 */
async function calculateMonthlyStats(db, userId, period, requiredTaskIds, bonusTaskIds, tasksMap, groupUserIds, userTaskTotals) {
  // 如果没有传入预查询数据，则使用原逻辑
  if (!groupUserIds) {
    groupUserIds = await getGroupUserIds(db, userId);
  }

  // 必选业务
  const requiredTasks = [];
  const taskScores = {};
  let requiredScore = 0;

  for (const taskId of requiredTaskIds) {
    const task = tasksMap[taskId];
    if (!task) continue;

    let map, totals;
    if (userTaskTotals) {
      // 使用预查询数据
      map = {};
      totals = [];
      groupUserIds.forEach(uid => {
        const key = `${uid}_${taskId}`;
        const total = userTaskTotals[key] || 0;
        map[uid] = total;
        totals.push(total);
      });
    } else {
      // 原逻辑：查询数据库
      const result = await getGroupTotals(db, taskId, period, groupUserIds);
      map = result.map;
      totals = result.totals;
    }

    const userTotal = map[userId] || 0;
    const { weightScore, maxScore } = task.scoreConfig;
    const score = calculateBenchmarkScore(userTotal, totals, weightScore, maxScore);
    const groupAvg = totals.length > 0 ? Math.round((totals.reduce((s, v) => s + v, 0) / totals.length) * 100) / 100 : 0;

    const roundedScore = Math.round(score * 100) / 100;
    requiredTasks.push({
      taskId,
      taskName: task.taskName,
      totalValue: userTotal,
      score: roundedScore,
      groupAvg
    });
    taskScores[taskId] = roundedScore;
    requiredScore += score;
  }

  // 加分业务：仅记录完成量，不计分
  const bonusTasks = [];
  for (const taskId of bonusTaskIds) {
    const task = tasksMap[taskId];
    if (!task) continue;

    const key = `${userId}_${taskId}`;
    const userTotal = userTaskTotals ? (userTaskTotals[key] || 0) : (await getUserMonthlyTotal(db, userId, taskId, period));

    bonusTasks.push({
      taskId,
      taskName: task.taskName,
      totalValue: userTotal
    });
  }

  const totalScore = requiredScore;

  return {
    requiredTasks,
    bonusTasks,
    requiredScore: Math.round(requiredScore * 100) / 100,
    totalScore: Math.round(totalScore * 100) / 100,
    taskScores
  };
}

/**
 * 更新同组所有人的月度排名（按角色分组排名）
 */
async function updateRankings(db, period) {
  const collection = db.collection('pf_monthly_stats');
  const result = await collection.where({ period }).orderBy('totalScore', 'desc').limit(1000).get();
  if (!result.data || result.data.length === 0) return;

  // 批量获取用户信息（分批处理，每批20个）
  const userIds = result.data.map(s => s.userId).filter(Boolean);
  const userRoleMap = {};
  for (let i = 0; i < userIds.length; i += 20) {
    const batch = userIds.slice(i, i + 20);
    const usersRes = await db.collection('users').where({ _id: db.command.in(batch) }).field({ _id: true, role: true }).get();
    usersRes.data.forEach(u => { userRoleMap[u._id] = u.role; });
  }

  // 按角色分组排名
  const byRole = {};
  for (const stat of result.data) {
    if (!stat.userId) continue;
    const role = userRoleMap[stat.userId] || 'unknown';
    if (!byRole[role]) byRole[role] = [];
    byRole[role].push(stat);
  }

  const updates = [];
  for (const role of Object.keys(byRole)) {
    byRole[role].sort((a, b) => b.totalScore - a.totalScore);
    const groupSize = byRole[role].length;
    byRole[role].forEach((stat, index) => {
      updates.push(collection.doc(stat._id).update({ rank: index + 1, groupSize, role }));
    });
  }

  await Promise.all(updates);
}

module.exports = {
  calculateBenchmarkScore,
  getGroupTotals,
  getGroupUserIds,
  getUserMonthlyTotal,
  calculateMonthlyStats,
  updateRankings
};
