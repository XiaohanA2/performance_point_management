/**
 * 个金积分定时重算任务
 * 每天12:00和24:00执行，重算当前月份所有角色的积分
 */

exports.main = async (event, context) => {
  console.log('开始定时重算任务...');

  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  try {
    const db = uniCloud.database();

    // 获取所有角色
    const roles = ['manager', 'lobby_manager', 'elastic_counter', 'counter_manager'];

    // 获取所有用户
    const usersRes = await db.collection('users').get();
    const users = usersRes.data;

    // 获取所有任务
    const tasksRes = await db.collection('pf_tasks').where({ isActive: true }).get();
    const tasks = tasksRes.data;

    let totalUpdated = 0;

    // 按角色重算
    for (const role of roles) {
      const roleUsers = users.filter(u => u.role === role);
      if (roleUsers.length === 0) continue;

      // 获取该角色的必选任务
      const requiredTasks = tasks.filter(t =>
        t.scoreConfig?.type === 'benchmark' &&
        t.targetByRole?.[role] !== undefined
      );

      // 为每个用户重算积分
      for (const user of roleUsers) {
        let totalScore = 0;
        const taskScores = {};

        // 获取用户的提报记录
        const submissionsRes = await db.collection('pf_submissions')
          .where({
            userId: user._id,
            period: period
          })
          .get();

        const userSubmissions = submissionsRes.data;

        // 计算每个必选任务的得分
        for (const task of requiredTasks) {
          const userTotal = userSubmissions
            .filter(s => s.taskId === task._id)
            .reduce((sum, s) => sum + (s.value || 0), 0);

          // 获取同组所有用户的完成数
          const groupUserIds = roleUsers.map(u => u._id);
          const groupSubmissionsRes = await db.collection('pf_submissions')
            .where({
              taskId: task._id,
              period: period,
              userId: db.command.in(groupUserIds)
            })
            .get();

          const totalsMap = {};
          groupSubmissionsRes.data.forEach(s => {
            totalsMap[s.userId] = (totalsMap[s.userId] || 0) + (s.value || 0);
          });

          const allTotals = groupUserIds.map(uid => totalsMap[uid] || 0);

          // 计算贡献度得分
          let score = 0;
          if (userTotal > 0 && allTotals.length > 0) {
            const avg = allTotals.reduce((s, v) => s + v, 0) / allTotals.length;
            const max = Math.max(...allTotals);
            const min = Math.min(...allTotals);
            const { weightScore, maxScore } = task.scoreConfig;

            if (userTotal >= avg) {
              score = max === avg ? weightScore : weightScore + (userTotal - avg) / (max - avg) * weightScore * 0.4;
            } else {
              score = avg === min ? weightScore : weightScore - (avg - userTotal) / (avg - min) * weightScore * 0.4;
            }
            score = Math.min(Math.round(score * 10000) / 10000, maxScore);
          }

          taskScores[task._id] = score;
          totalScore += score;
        }

        // 更新或创建月度统计
        await db.collection('pf_monthly_stats').where({
          userId: user._id,
          period: period
        }).update({
          totalScore: Math.round(totalScore * 10000) / 10000,
          taskScores: taskScores,
          updatedAt: new Date()
        });

        totalUpdated++;
      }
    }

    console.log('定时重算任务完成:', { period, totalUpdated });
    return { success: true, period, totalUpdated };
  } catch (err) {
    console.error('定时重算任务失败:', err);
    return { success: false, error: err.message };
  }
};
