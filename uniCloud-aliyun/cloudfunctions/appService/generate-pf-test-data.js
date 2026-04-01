/**
 * 生成弹性柜面个金测试数据
 * 为所有弹性柜面用户生成 2026-03 的 8 项必选业务提报记录
 */

async function generatePfTestData({ autoRecalculate = true } = {}) {
  const db = uniCloud.database();
  const period = '2026-03';
  const date = '2026-03-15';

  // 8项必选业务ID
  const requiredTaskIds = [
    'fund_valid',
    'bind_card',
    'insurance',
    'pension_account',
    'merchant',
    'credit_installment',
    'credit_new_active',
    'wechat_welfare'
  ];

  // 查询所有弹性柜面用户
  const usersRes = await db.collection('users')
    .where({ role: 'elastic_counter', status: 'active' })
    .limit(20)
    .get();

  if (!usersRes.data || usersRes.data.length === 0) {
    console.log('未找到弹性柜面用户');
    return { success: 0, error: 0 };
  }

  console.log(`找到 ${usersRes.data.length} 个弹性柜面用户`);

  // 弹性柜面目标值（从 pf-default-tasks.js）
  const targets = {
    fund_valid: 15,
    bind_card: 75,
    insurance: 11,
    pension_account: 20,
    merchant: 2,
    credit_installment: 40,
    credit_new_active: 8,
    wechat_welfare: 30
  };

  let successCount = 0;
  let errorCount = 0;

  for (const user of usersRes.data) {
    console.log(`处理用户: ${user.name} (${user.branch})`);

    for (const taskId of requiredTaskIds) {
      try {
        // 生成合理的完成数：目标值的 60%-140% 随机
        const target = targets[taskId];
        const ratio = 0.6 + Math.random() * 0.8; // 60%-140%
        const value = Math.round(target * ratio);

        // 检查是否已存在
        const existing = await db.collection('pf_submissions')
          .where({
            userId: user._id,
            taskId,
            period
          })
          .get();

        if (existing.data && existing.data.length > 0) {
          console.log(`  跳过已存在: ${taskId}`);
          continue;
        }

        // 插入提报记录
        await db.collection('pf_submissions').add({
          userId: user._id,
          userName: user.name,
          branchId: user.branch,
          branchName: user.branch,
          taskId,
          period,
          date,
          value,
          score: 0, // 初始为0，后续触发重算
          createdAt: Date.now(),
          updatedAt: Date.now()
        });

        successCount++;
      } catch (error) {
        console.log(`  错误 ${taskId}: ${error.message}`);
        errorCount++;
      }
    }
  }

  console.log(`\n生成完成: 成功 ${successCount} 条, 失败 ${errorCount} 条`);

  // 自动触发积分重算
  if (autoRecalculate && successCount > 0) {
    console.log(`\n开始触发积分重算...`);
    const pfActions = require('./actions/pf-actions.js');
    try {
      const recalcResult = await pfActions.recalculatePFStats({ period, role: 'elastic_counter' }, {});
      console.log(`积分重算完成: ${JSON.stringify(recalcResult)}`);
      return {
        success: successCount,
        error: errorCount,
        userCount: usersRes.data.length,
        recalculated: true,
        recalcResult
      };
    } catch (err) {
      console.log(`积分重算失败: ${err.message}`);
      return {
        success: successCount,
        error: errorCount,
        userCount: usersRes.data.length,
        recalculated: false,
        recalcError: err.message
      };
    }
  }

  return {
    success: successCount,
    error: errorCount,
    userCount: usersRes.data.length,
    recalculated: false
  };
}

module.exports = { generatePfTestData };
