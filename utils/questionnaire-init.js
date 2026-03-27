/**
 * 问卷系统初始化工具
 *
 * 使用方法：
 * 1. 在小程序任意页面的控制台中调用：
 *    initQuestionnaireSystem()
 *
 * 2. 或者在其他脚本中引入：
 *    import { initQuestionnaireSystem } from '@/utils/questionnaire-init.js'
 *    await initQuestionnaireSystem()
 */

/**
 * 初始化问卷系统（创建数据库集合和示例数据）
 */
async function initQuestionnaireSystem() {
  uni.showLoading({
    title: '正在初始化问卷系统...',
    mask: true
  });

  try {
    const result = await uniCloud.callFunction({
      name: 'appService',
      data: {
        action: 'initQuestionnaireSystem'
      }
    });

    uni.hideLoading();

    if (result.result.error) {
      throw new Error(result.result.error);
    }

    const data = result.result.data;

    if (data.success) {
      uni.showModal({
        title: '✅ 初始化成功',
        content: `问卷系统已成功初始化！\n\n已创建集合：\n- questionnaires (问卷)\n- questionnaire_responses (回答)\n- notifications (通知)\n\n已创建示例问卷：长乐支行岗位意向摸底表`,
        showCancel: false,
        success: () => {
          console.log('问卷系统初始化成功:', data);
        }
      });
    } else {
      throw new Error(data.error || '初始化失败');
    }
  } catch (error) {
    uni.hideLoading();
    uni.showModal({
      title: '❌ 初始化失败',
      content: error.message || '未知错误',
      showCancel: false
    });
    console.error('问卷系统初始化失败:', error);
  }
}

/**
 * 检查问卷系统是否已初始化
 */
async function checkQuestionnaireSystem() {
  try {
    // 尝试获取示例问卷
    const result = await uniCloud.callFunction({
      name: 'appService',
      data: {
        action: 'getQuestionnaireDetail',
        payload: {
          id: 'questionnaire_job_intention_001'
        }
      }
    });

    if (result.result.data) {
      console.log('✅ 问卷系统已初始化');
      return true;
    }
  } catch (error) {
    console.log('❌ 问卷系统未初始化');
    return false;
  }
}

// 导出函数
export {
  initQuestionnaireSystem,
  checkQuestionnaireSystem
};

// 同时挂载到全局，方便控制台调用
if (typeof window !== 'undefined') {
  window.initQuestionnaireSystem = initQuestionnaireSystem;
  window.checkQuestionnaireSystem = checkQuestionnaireSystem;
}

// 小程序环境挂载到 uni
if (typeof uni !== 'undefined') {
  uni.initQuestionnaireSystem = initQuestionnaireSystem;
  uni.checkQuestionnaireSystem = checkQuestionnaireSystem;
}
