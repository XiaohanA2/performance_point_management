/**
 * 问卷管理服务
 *
 * 提供问卷系统的前端API封装，包括：
 * - 问卷CRUD操作
 * - 问卷回答管理
 * - 权限控制
 * - 通知功能
 */

import { hasPermission, hasAnyRole, ROLES } from '../services/permission-service.js';

const ACTION_PREFIX = 'questionnaire';

/**
 * 获取当前登录用户
 * 兼容多个存储键：perf_current_user, currentUser
 */
function getCurrentUser() {
  // store.js 用 JSON.stringify 存储，需要 JSON.parse 读取
  const parseStorage = (key) => {
    try {
      const raw = uni.getStorageSync(key);
      if (!raw) return null;
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
      return null;
    }
  };

  return parseStorage('perf_current_user') || parseStorage('currentUser');
}

/**
 * 调用云函数
 */
async function callCloudFunction(action, payload = {}) {
  try {
    const res = await uniCloud.callFunction({
      name: 'appService',
      data: { action, payload }
    });

    if (res.result.error) {
      throw new Error(res.result.error);
    }

    return res.result.data;
  } catch (error) {
    console.error(`[问卷服务] ${action} 调用失败:`, error);
    throw error;
  }
}

// ==================== 问卷管理 ====================

/**
 * 获取问卷列表
 * @param {Object} options - 查询选项
 * @param {String} options.status - 问卷状态筛选
 * @returns {Promise<Array>}
 */
export async function getQuestionnaires(options = {}) {
  // 不再要求必须登录
  const user = getCurrentUser();

  const payload = {
    status: options.status,
    userId: user?.id,
    userRole: user?.roles || (user?.role ? [user.role] : [])
  };

  return await callCloudFunction('getQuestionnaires', payload);
}

/**
 * 获取问卷详情
 * @param {String} id - 问卷ID
 * @returns {Promise<Object>}
 */
export async function getQuestionnaireDetail(id) {
  if (!id) {
    throw new Error('缺少问卷ID');
  }

  return await callCloudFunction('getQuestionnaireDetail', { id });
}

/**
 * 创建问卷（需要权限）
 * @param {Object} data - 问卷数据
 * @returns {Promise<Object>}
 */
export async function createQuestionnaire(data) {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('请先登录');
  }

  // 权限验证：问卷管理员及以上
  if (!hasAnyRole(user, [ROLES.SUPER_ADMIN, ROLES.QUESTIONNAIRE_ADMIN])) {
    throw new Error('您没有创建问卷的权限');
  }

  const payload = {
    ...data,
    userId: user.id
  };

  return await callCloudFunction('createQuestionnaire', payload);
}

/**
 * 更新问卷（需要权限）
 * @param {String} id - 问卷ID
 * @param {Object} updates - 更新数据
 * @returns {Promise<Object>}
 */
export async function updateQuestionnaire(id, updates) {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('请先登录');
  }

  // 权限验证
  if (!hasAnyRole(user, [ROLES.SUPER_ADMIN, ROLES.QUESTIONNAIRE_ADMIN])) {
    throw new Error('您没有编辑问卷的权限');
  }

  const payload = {
    id,
    ...updates,
    userId: user.id
  };

  return await callCloudFunction('updateQuestionnaire', payload);
}

/**
 * 删除问卷（需要权限）
 * @param {String} id - 问卷ID
 * @returns {Promise<Object>}
 */
export async function deleteQuestionnaire(id) {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('请先登录');
  }

  // 权限验证
  if (!hasAnyRole(user, [ROLES.SUPER_ADMIN, ROLES.QUESTIONNAIRE_ADMIN])) {
    throw new Error('您没有删除问卷的权限');
  }

  return await callCloudFunction('deleteQuestionnaire', { id });
}

// ==================== 问卷回答 ====================

/**
 * 提交问卷回答
 * @param {String} questionnaireId - 问卷ID
 * @param {Array} answers - 回答数组
 * @returns {Promise<Object>}
 */
export async function submitQuestionnaireResponse(questionnaireId, answers, userInfo = {}) {
  if (!answers || answers.length === 0) {
    throw new Error('请填写问卷');
  }

  // userInfo 可由调用方传入（登录用户从账号提取，游客从答案提取）
  const user = getCurrentUser();
  const payload = {
    questionnaireId,
    answers,
    userId: userInfo.userId || (user && user.role !== 'guest' ? user.id : null),
    userName: userInfo.userName || (user && user.role !== 'guest' ? user.name : ''),
    userPhone: userInfo.userPhone || (user && user.role !== 'guest' ? user.phone : ''),
    userBranch: userInfo.userBranch || (user && user.role !== 'guest' ? user.branch : '')
  };

  return await callCloudFunction('submitQuestionnaireResponse', payload);
}

/**
 * 获取问卷回答列表（管理员）
 * @param {String} questionnaireId - 问卷ID
 * @param {String} status - 状态筛选（可选）
 * @returns {Promise<Array>}
 */
export async function getQuestionnaireResponses(questionnaireId, status) {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('请先登录');
  }

  // 权限验证
  if (!hasAnyRole(user, [ROLES.SUPER_ADMIN, ROLES.QUESTIONNAIRE_ADMIN])) {
    throw new Error('您没有查看回答的权限');
  }

  return await callCloudFunction('getQuestionnaireResponses', {
    questionnaireId,
    status,
    userRole: user.roles || user.role ? [user.role] : []
  });
}

/**
 * 获取单个回答详情
 * @param {String} responseId - 回答ID
 * @returns {Promise<Object>}
 */
export async function getResponseDetail(responseId) {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('请先登录');
  }

  // 权限验证
  if (!hasAnyRole(user, [ROLES.SUPER_ADMIN, ROLES.QUESTIONNAIRE_ADMIN])) {
    throw new Error('您没有查看回答的权限');
  }

  return await callCloudFunction('getResponseDetail', { responseId });
}

/**
 * 管理员回复
 * @param {String} responseId - 回答ID
 * @param {String} reply - 回复内容
 * @returns {Promise<Object>}
 */
export async function replyToResponse(responseId, reply) {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('请先登录');
  }

  // 权限验证
  if (!hasAnyRole(user, [ROLES.SUPER_ADMIN, ROLES.QUESTIONNAIRE_ADMIN])) {
    throw new Error('您没有回复的权限');
  }

  if (!reply || reply.trim() === '') {
    throw new Error('回复内容不能为空');
  }

  return await callCloudFunction('replyToResponse', {
    responseId,
    reply,
    adminName: user.name
  });
}

/**
 * 删除问卷回答
 * @param {String} responseId - 回答ID
 * @returns {Promise<Object>}
 */
export async function deleteResponse(responseId) {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('请先登录');
  }

  if (!hasAnyRole(user, [ROLES.SUPER_ADMIN, ROLES.QUESTIONNAIRE_ADMIN])) {
    throw new Error('您没有删除的权限');
  }

  return await callCloudFunction('deleteQuestionnaireResponse', { responseId });
}

/**
 * 获取用户的问卷回答记录
 * @returns {Promise<Array>}
 */
export async function getSubmissionsByIdCard(idCard) {
  return await callCloudFunction('getSubmissionsByIdCard', { idCard });
}

export async function getUserResponses() {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('请先登录');
  }

  return await callCloudFunction('getUserResponses', { userId: user.id });
}

/**
 * 导出问卷数据（需要权限）
 * @param {String} questionnaireId - 问卷ID
 * @returns {Promise<Object>}
 */
export async function exportQuestionnaireData(questionnaireId) {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('请先登录');
  }

  // 权限验证
  if (!hasAnyRole(user, [ROLES.SUPER_ADMIN, ROLES.QUESTIONNAIRE_ADMIN])) {
    throw new Error('您没有导出数据的权限');
  }

  return await callCloudFunction('exportQuestionnaireData', { questionnaireId });
}

/**
 * 获取问卷统计信息（需要权限）
 * @param {String} questionnaireId - 问卷ID
 * @returns {Promise<Object>}
 */
export async function getQuestionnaireStats(questionnaireId) {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('请先登录');
  }

  // 权限验证
  if (!hasAnyRole(user, [ROLES.SUPER_ADMIN, ROLES.QUESTIONNAIRE_ADMIN])) {
    throw new Error('您没有查看统计的权限');
  }

  return await callCloudFunction('getQuestionnaireStats', { questionnaireId });
}

// ==================== 通知功能 ====================

/**
 * 获取用户通知列表
 * @param {Boolean} unreadOnly - 是否只获取未读通知
 * @returns {Promise<Array>}
 */
export async function getNotifications(unreadOnly = false) {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('请先登录');
  }

  return await callCloudFunction('getNotifications', {
    userId: user.id,
    unreadOnly
  });
}

/**
 * 标记通知已读
 * @param {String} notificationId - 通知ID
 * @returns {Promise<Object>}
 */
export async function markNotificationRead(notificationId) {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('请先登录');
  }

  return await callCloudFunction('markNotificationRead', {
    notificationId,
    userId: user.id
  });
}

/**
 * 批量标记通知已读
 * @returns {Promise<Object>}
 */
export async function markAllNotificationsRead() {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('请先登录');
  }

  return await callCloudFunction('markAllNotificationsRead', { userId: user.id });
}

/**
 * 获取未读通知数量
 * @returns {Promise<Number>}
 */
export async function getUnreadNotificationCount() {
  const user = getCurrentUser();
  if (!user) {
    return 0;
  }

  try {
    const result = await callCloudFunction('getUnreadNotificationCount', {
      userId: user.id
    });
    return result.count || 0;
  } catch (error) {
    console.error('获取未读通知数量失败:', error);
    return 0;
  }
}

// ==================== 辅助函数 ====================

/**
 * 检查用户是否可以填写问卷
 * @param {Object} questionnaire - 问卷对象
 * @returns {Object} { canFill: Boolean, reason: String }
 */
export function canFillQuestionnaire(questionnaire) {
  // 不再要求登录 - 完全开放访问

  // 检查问卷状态
  if (questionnaire.status !== 'published') {
    return { canFill: false, reason: '问卷未发布或已关闭' };
  }

  // 检查时间范围
  const now = Date.now();
  if (now < questionnaire.startDate) {
    return { canFill: false, reason: '问卷尚未开始' };
  }
  if (now > questionnaire.endDate) {
    return { canFill: false, reason: '问卷已截止' };
  }

  // 不再检查目标角色 - 完全开放

  return { canFill: true };
}

/**
 * 格式化问卷状态文本
 * @param {String} status - 问卷状态
 * @returns {String}
 */
export function formatQuestionnaireStatus(status) {
  const statusMap = {
    draft: '草稿',
    published: '已发布',
    closed: '已关闭'
  };
  return statusMap[status] || status;
}

/**
 * 格式化问卷状态颜色
 * @param {String} status - 问卷状态
 * @returns {String}
 */
export function getQuestionnaireStatusColor(status) {
  const colorMap = {
    draft: '#909399',
    published: '#67C23A',
    closed: '#F56C6C'
  };
  return colorMap[status] || '#909399';
}

/**
 * 检查问卷是否已过期
 * @param {Object} questionnaire - 问卷对象
 * @returns {Boolean}
 */
export function isQuestionnaireExpired(questionnaire) {
  return Date.now() > questionnaire.endDate;
}

/**
 * 获取问卷剩余天数
 * @param {Object} questionnaire - 问卷对象
 * @returns {Number} 剩余天数，负数表示已过期
 */
export function getQuestionnaireRemainingDays(questionnaire) {
  const remaining = questionnaire.endDate - Date.now();
  return Math.ceil(remaining / (24 * 60 * 60 * 1000));
}

/**
 * 验证问卷回答是否完整
 * @param {Array} questions - 问题列表
 * @param {Array} answers - 回答列表
 * @returns {Object} { valid: Boolean, error: String }
 */
export function validateQuestionnaireAnswers(questions, answers) {
  for (const question of questions) {
    if (!question.required) continue;

    const answer = answers.find(a => a.questionId === question.id);

    if (!answer) {
      return {
        valid: false,
        error: `请填写必填题："${question.title}"`
      };
    }

    // 检查答案是否为空
    if (!answer.value || (Array.isArray(answer.value) && answer.value.length === 0)) {
      return {
        valid: false,
        error: `请填写必填题："${question.title}"`
      };
    }

    // 文本题检查长度
    if (question.type === 'text' && answer.value.trim().length === 0) {
      return {
        valid: false,
        error: `"${question.title}"不能为空`
      };
    }
  }

  return { valid: true };
}

export default {
  // 问卷管理
  getQuestionnaires,
  getQuestionnaireDetail,
  createQuestionnaire,
  updateQuestionnaire,
  deleteQuestionnaire,

  // 问卷回答
  submitQuestionnaireResponse,
  getQuestionnaireResponses,
  getResponseDetail,
  replyToResponse,
  deleteResponse,
  getUserResponses,
  exportQuestionnaireData,
  getQuestionnaireStats,

  // 通知功能
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadNotificationCount,

  // 辅助函数
  canFillQuestionnaire,
  formatQuestionnaireStatus,
  getQuestionnaireStatusColor,
  isQuestionnaireExpired,
  getQuestionnaireRemainingDays,
  validateQuestionnaireAnswers
};
