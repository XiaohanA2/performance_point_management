/**
 * 个金积分计算器 - 消息队列触发
 * 接收提报/编辑/删除消息，异步计算积分
 */

const { updateUserMonthlyStats } = require('../appService/utils/pf-score-calculator.js');

exports.main = async (event, context) => {
  const { userId, period, category, role } = event.data || event;

  console.log('收到积分计算消息:', { userId, period, category, role });

  const db = uniCloud.database();

  try {
    // 必选业务：需要全组重算（因为依赖组内平均值）
    if (category === 'required') {
      await updateUserMonthlyStats(db, userId, period);
      console.log('必选业务全组重算完成:', { userId, period });
    } else {
      // 加分业务：只算当前用户
      const { calculateMonthlyStats } = require('../appService/utils/pf-score-calculator.js');
      const stats = await calculateMonthlyStats(db, userId, period);

      const statsCollection = db.collection('pf_monthly_stats');
      await statsCollection.where({ userId, period }).update(stats);
      console.log('加分业务单用户计算完成:', { userId, period });
    }

    return { success: true };
  } catch (err) {
    console.error('积分计算失败:', err);
    return { error: err.message };
  }
};
