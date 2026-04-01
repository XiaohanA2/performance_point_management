/**
 * 个金积分定时重算任务
 * 每天12:00和24:00执行，重算当前月份所有角色的积分
 */

exports.main = async (event, context) => {
  console.log('开始定时重算任务...');

  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  try {
    // 初始化 uniCloud
    const uniCloudInstance = uniCloud.init({
      provider: 'aliyun',
      spaceId: context.SPACEINFO.spaceId,
      clientSecret: context.SPACEINFO.clientSecret
    });

    // 通过 callFunction 调用 appService
    const result = await uniCloudInstance.callFunction({
      name: 'appService',
      data: {
        action: 'recalcAll',
        payload: { period }
      }
    });

    if (result.result.error) {
      throw new Error(result.result.error);
    }

    console.log('定时重算任务完成:', result.result.data);
    return { success: true, period, ...result.result.data };
  } catch (err) {
    console.error('定时重算任务失败:', err);
    return { success: false, error: err.message };
  }
};
