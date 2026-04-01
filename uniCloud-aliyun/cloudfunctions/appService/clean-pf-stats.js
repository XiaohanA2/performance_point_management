/**
 * 清理个金月度统计数据并重新计算
 */

async function cleanAndRecalculatePFStats({ period = '2026-03' } = {}) {
  const db = uniCloud.database();

  console.log(`开始清理 ${period} 的月度统计数据...`);

  // 清空指定月份的统计数据
  let cleared = 0;
  while (true) {
    const res = await db.collection('pf_monthly_stats')
      .where({ period })
      .limit(100)
      .get();

    if (!res.data || res.data.length === 0) break;

    for (const doc of res.data) {
      await db.collection('pf_monthly_stats').doc(doc._id).remove();
    }
    cleared += res.data.length;
  }

  console.log(`已清除 ${cleared} 条旧数据`);

  // 触发重算
  console.log(`开始重新计算积分...`);
  const pfActions = require('./actions/pf-actions.js');

  const roles = ['manager', 'lobby_manager', 'elastic_counter', 'counter_manager'];
  const results = {};

  for (const role of roles) {
    try {
      console.log(`开始重算 ${role}...`);
      const result = await pfActions.recalculatePFStats({ period, role }, {});
      results[role] = result;
      console.log(`${role} 重算完成: ${JSON.stringify(result)}`);
    } catch (err) {
      results[role] = { error: err.message, stack: err.stack };
      console.log(`${role} 重算失败: ${err.message}`);
      console.log(`错误堆栈: ${err.stack}`);
    }
  }

  return {
    cleared,
    period,
    recalcResults: results
  };
}

module.exports = { cleanAndRecalculatePFStats };
