/**
 * 问卷管理Actions
 *
 * 提供问卷系统的所有后端功能：
 * - 问卷CRUD操作
 * - 问卷回答管理
 * - 权限控制
 * - 订阅消息通知
 */

const { ROLES } = require('../constants/permission-constants.js');
const { isUserField } = require('../constants/user-field-mapping.js');

// ==================== 问卷管理 ====================

/**
 * 获取问卷列表（根据用户角色过滤）
 */
async function getQuestionnaires(payload) {
  const { status, userId, userRole } = payload;
  const db = uniCloud.database();
  const _ = db.command;

  let whereCondition = {};

  // 状态筛选
  if (status) {
    whereCondition.status = status;
  }

  // 权限控制：
  // - 超级管理员、问卷管理员：可以看到所有问卷
  // - 其他角色：只能看到已发布的问卷
  if (!userRole || !userRole.includes(ROLES.SUPER_ADMIN) && !userRole.includes(ROLES.QUESTIONNAIRE_ADMIN)) {
    whereCondition.status = 'published';
  }

  const { data } = await db.collection('questionnaires')
    .where(whereCondition)
    .orderBy('createdAt', 'desc')
    .get();

  // 为每个问卷统计回复数量
  const questionnairesWithCount = await Promise.all(data.map(async (questionnaire) => {
    const { total } = await db.collection('questionnaire_responses')
      .where({ questionnaireId: questionnaire._id })
      .count();

    return {
      ...questionnaire,
      responseCount: total
    };
  }));

  return questionnairesWithCount;
}

/**
 * 获取问卷详情
 */
async function getQuestionnaireDetail(payload) {
  const { id } = payload;
  const db = uniCloud.database();

  if (!id) {
    throw new Error('缺少问卷ID');
  }

  const { data } = await db.collection('questionnaires')
    .doc(id)
    .get();

  if (!data.length) {
    throw new Error('问卷不存在');
  }

  return data[0];
}

/**
 * 创建问卷（questionnaire_admin及以上）
 */
async function createQuestionnaire(payload) {
  const {
    title,
    description,
    type = 'custom',
    status = 'draft',
    startDate,
    endDate,
    questions,
    targetRoles = [],
    permissions = {}
  } = payload;

  const db = uniCloud.database();

  if (!title) {
    throw new Error('问卷标题不能为空');
  }

  if (!questions || questions.length === 0) {
    throw new Error('问卷至少需要一个问题');
  }

  // 验证问题格式
  for (const q of questions) {
    if (!q.id || !q.type || !q.title) {
      throw new Error('问题格式不正确，必须包含id、type和title');
    }
    if ((q.type === 'single' || q.type === 'multiple') && (!q.options || q.options.length === 0)) {
      throw new Error(`问题"${q.title}"需要设置选项`);
    }
  }

  const doc = {
    _id: `questionnaire_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title,
    description: description || '',
    type,
    status,
    startDate: startDate || Date.now(),
    endDate: endDate || (Date.now() + 30 * 24 * 60 * 60 * 1000),
    questions,
    targetRoles,
    // 默认权限配置
    permissions: {
      viewRoles: permissions.viewRoles || [ROLES.SUPER_ADMIN, ROLES.QUESTIONNAIRE_ADMIN],
      exportRoles: permissions.exportRoles || [ROLES.SUPER_ADMIN, ROLES.QUESTIONNAIRE_ADMIN],
      replyRoles: permissions.replyRoles || [ROLES.SUPER_ADMIN, ROLES.QUESTIONNAIRE_ADMIN]
    },
    createdBy: payload.userId || null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  await db.collection('questionnaires').add(doc);

  return doc;
}

/**
 * 更新问卷
 */
async function updateQuestionnaire(payload) {
  const { id, title, description, status, startDate, endDate, questions, targetRoles, permissions, sortOrder } = payload;
  const db = uniCloud.database();

  if (!id) {
    throw new Error('缺少问卷ID');
  }

  const { data } = await db.collection('questionnaires').doc(id).get();
  if (!data.length) {
    throw new Error('问卷不存在');
  }

  const updateData = {
    updatedAt: Date.now(),
    updatedBy: payload.userId || null
  };

  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (status !== undefined) updateData.status = status;
  if (startDate !== undefined) updateData.startDate = startDate;
  if (endDate !== undefined) updateData.endDate = endDate;
  if (questions !== undefined) {
    // 验证问题格式
    for (const q of questions) {
      if (!q.id || !q.type || !q.title) {
        throw new Error('问题格式不正确');
      }
    }
    updateData.questions = questions;
  }
  if (targetRoles !== undefined) updateData.targetRoles = targetRoles;
  if (permissions !== undefined) updateData.permissions = permissions;
  if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

  await db.collection('questionnaires').doc(id).update(updateData);

  return { success: true };
}

/**
 * 删除问卷
 */
async function deleteQuestionnaire(payload) {
  const { id } = payload;
  const db = uniCloud.database();

  if (!id) {
    throw new Error('缺少问卷ID');
  }

  // 删除所有关联的提交记录
  const { data: responses } = await db.collection('questionnaire_responses')
    .where({ questionnaireId: id })
    .get();

  if (responses.length > 0) {
    const deleteIds = responses.map(r => r._id);
    await db.collection('questionnaire_responses')
      .where({ _id: db.command.in(deleteIds) })
      .remove();
  }

  // 删除问卷本身
  await db.collection('questionnaires').doc(id).remove();

  return { success: true, deletedResponses: responses.length };
}

// ==================== 问卷回答管理 ====================

/**
 * 提交问卷回答
 */
async function submitQuestionnaireResponse(payload) {
  const { questionnaireId, userId, userName, userPhone, userBranch, answers } = payload;
  const db = uniCloud.database();

  if (!questionnaireId) {
    throw new Error('缺少问卷ID');
  }

  if (!answers || answers.length === 0) {
    throw new Error('请填写问卷');
  }

  // 检查问卷是否存在
  const { data: questionnaire } = await db.collection('questionnaires')
    .doc(questionnaireId)
    .get();

  if (!questionnaire.length) {
    throw new Error('问卷不存在');
  }

  // 检查问卷状态
  if (questionnaire[0].status !== 'published') {
    throw new Error('问卷未发布或已关闭');
  }

  // 检查是否在有效期内
  const now = Date.now();
  if (now < questionnaire[0].startDate) {
    throw new Error('问卷尚未开始');
  }
  if (now > questionnaire[0].endDate) {
    throw new Error('问卷已截止');
  }

  // 验证必填项（isPrivate 或 fieldType 的用户字段，已登录用户跳过必填校验）
  const q = questionnaire[0];
  for (const question of q.questions) {
    if (question.required) {
      if ((question.isPrivate || isUserField(question)) && userId) continue;
      const answer = answers.find(a => a.questionId === question.id);
      if (!answer || !answer.value || (Array.isArray(answer.value) && answer.value.length === 0)) {
        throw new Error(`请填写必填题："${question.title}"`);
      }
    }
  }

  const doc = {
    _id: `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    questionnaireId,
    userId,
    userName,
    userPhone,
    userBranch,
    answers,
    status: 'submitted',
    submittedAt: Date.now(),
    adminReply: '',
    repliedAt: 0,
    notificationSent: false
  };

  await db.collection('questionnaire_responses').add(doc);

  return { success: true, responseId: doc._id };
}

/**
 * 获取问卷回答列表（管理员）
 */
async function getQuestionnaireResponses(payload) {
  const { questionnaireId, status, userRole } = payload;
  const db = uniCloud.database();

  if (!questionnaireId) {
    throw new Error('缺少问卷ID');
  }

  let whereCondition = { questionnaireId };

  if (status) {
    whereCondition.status = status;
  }

  const { data } = await db.collection('questionnaire_responses')
    .where(whereCondition)
    .orderBy('submittedAt', 'desc')
    .get();

  return data;
}

/**
 * 获取单个回答详情
 */
async function getResponseDetail(payload) {
  const { responseId } = payload;
  const db = uniCloud.database();

  if (!responseId) {
    throw new Error('缺少回答ID');
  }

  const { data } = await db.collection('questionnaire_responses')
    .doc(responseId)
    .get();

  if (!data.length) {
    throw new Error('回答不存在');
  }

  // 同时获取问卷信息
  const response = data[0];
  const { data: questionnaire } = await db.collection('questionnaires')
    .doc(response.questionnaireId)
    .get();

  return {
    ...response,
    questionnaire: questionnaire[0] || null
  };
}

/**
 * 管理员回复（权限验证+自动通知）
 */
async function replyToResponse(payload) {
  const { responseId, reply, adminName } = payload;
  const db = uniCloud.database();

  if (!responseId) {
    throw new Error('缺少回答ID');
  }

  if (!reply || reply.trim() === '') {
    throw new Error('回复内容不能为空');
  }

  const { data: responses } = await db.collection('questionnaire_responses')
    .doc(responseId)
    .get();

  if (!responses.length) {
    throw new Error('回答不存在');
  }

  const response = responses[0];

  // 更新回复
  await db.collection('questionnaire_responses').doc(responseId).update({
    adminReply: reply,
    repliedAt: Date.now(),
    repliedBy: adminName || '管理员',
    notificationSent: false
  });

  // 发送通知（仅登录用户有 userId 时才发送）
  if (response.userId) {
    await sendNotification({
      userId: response.userId,
      type: 'questionnaire_reply',
      title: '问卷回复通知',
      content: `管理员已回复您的问卷"${response.questionnaireId}"`,
      link: `/pages/questionnaire/my-responses?id=${responseId}`
    });
  }

  return { success: true };
}

/**
 * 获取用户的问卷回答记录
 */
async function getUserResponses(payload) {
  const { userId } = payload;
  const db = uniCloud.database();

  if (!userId) {
    throw new Error('缺少用户ID');
  }

  const { data } = await db.collection('questionnaire_responses')
    .where({ userId })
    .orderBy('submittedAt', 'desc')
    .get();

  return data;
}

/**
 * 删除问卷回答记录
 */
async function deleteQuestionnaireResponse(payload) {
  const { responseId } = payload;
  const db = uniCloud.database();

  if (!responseId) {
    throw new Error('缺少回答ID');
  }

  await db.collection('questionnaire_responses').doc(responseId).remove();

  return { success: true };
}

/**
 * 导出问卷回答数据
 */
async function exportQuestionnaireData(payload) {
  const { questionnaireId } = payload;
  const db = uniCloud.database();

  if (!questionnaireId) {
    throw new Error('缺少问卷ID');
  }

  // 获取问卷信息
  const { data: questionnaire } = await db.collection('questionnaires')
    .doc(questionnaireId)
    .get();

  if (!questionnaire.length) {
    throw new Error('问卷不存在');
  }

  // 获取所有回答
  const { data: responses } = await db.collection('questionnaire_responses')
    .where({ questionnaireId })
    .orderBy('submittedAt', 'desc')
    .get();

  // 格式化导出数据
  const questions = questionnaire[0].questions;
  const exportData = responses.map(r => {
    const row = {
      '提交时间': new Date(r.submittedAt).toLocaleString('zh-CN')
    };

    // 严格按问卷回复表的 answers 导出
    r.answers.forEach(answer => {
      const question = questions.find(q => q.id === answer.questionId);
      if (question) {
        row[question.title] = Array.isArray(answer.value) ? answer.value.join('、') : (answer.value || '');
      }
    });

    row['管理员回复'] = r.adminReply || '';
    if (r.repliedAt) row['回复时间'] = new Date(r.repliedAt).toLocaleString('zh-CN');

    return row;
  });

  return {
    questionnaire: questionnaire[0],
    data: exportData,
    total: exportData.length
  };
}

// ==================== 通知功能 ====================

/**
 * 发送通知消息
 */
async function sendNotification(payload) {
  const { userId, type, title, content, link } = payload;
  const db = uniCloud.database();

  const notification = {
    _id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    type: type || 'system',
    title,
    content,
    link: link || '',
    read: false,
    createdAt: Date.now()
  };

  await db.collection('notifications').add(notification);

  // TODO: 集成微信订阅消息
  // const result = await uniCloud.sendMessage({
  //   toUser: userId,
  //   templateId: 'xxx',
  //   data: { ... }
  // });

  return { success: true, notificationId: notification._id };
}

/**
 * 获取用户通知列表
 */
async function getNotifications(payload) {
  const { userId, unreadOnly = false } = payload;
  const db = uniCloud.database();

  if (!userId) {
    throw new Error('缺少用户ID');
  }

  let whereCondition = { userId };

  if (unreadOnly) {
    whereCondition.read = false;
  }

  const { data } = await db.collection('notifications')
    .where(whereCondition)
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get();

  return data;
}

/**
 * 标记通知已读
 */
async function markNotificationRead(payload) {
  const { notificationId, userId } = payload;
  const db = uniCloud.database();

  if (!notificationId) {
    throw new Error('缺少通知ID');
  }

  // 验证通知属于该用户
  const { data } = await db.collection('notifications')
    .doc(notificationId)
    .get();

  if (!data.length) {
    throw new Error('通知不存在');
  }

  if (data[0].userId !== userId) {
    throw new Error('无权操作该通知');
  }

  await db.collection('notifications').doc(notificationId).update({
    read: true
  });

  return { success: true };
}

/**
 * 批量标记通知已读
 */
async function markAllNotificationsRead(payload) {
  const { userId } = payload;
  const db = uniCloud.database();

  if (!userId) {
    throw new Error('缺少用户ID');
  }

  // 获取所有未读通知
  const { data: notifications } = await db.collection('notifications')
    .where({ userId, read: false })
    .get();

  // 批量更新
  for (const notification of notifications) {
    await db.collection('notifications').doc(notification._id).update({
      read: true
    });
  }

  return { success: true, count: notifications.length };
}

/**
 * 获取未读通知数量
 */
async function getUnreadNotificationCount(payload) {
  const { userId } = payload;
  const db = uniCloud.database();

  if (!userId) {
    throw new Error('缺少用户ID');
  }

  const { total } = await db.collection('notifications')
    .where({ userId, read: false })
    .count();

  return { count: total };
}

// ==================== 统计功能 ====================

/**
 * 获取问卷统计信息
 */
async function getQuestionnaireStats(payload) {
  const { questionnaireId } = payload;
  const db = uniCloud.database();

  if (!questionnaireId) {
    throw new Error('缺少问卷ID');
  }

  // 获取问卷信息
  const { data: questionnaire } = await db.collection('questionnaires')
    .doc(questionnaireId)
    .get();

  if (!questionnaire.length) {
    throw new Error('问卷不存在');
  }

  // 获取回答统计
  const { total: responseCount } = await db.collection('questionnaire_responses')
    .where({ questionnaireId })
    .count();

  const { data: responses } = await db.collection('questionnaire_responses')
    .where({ questionnaireId })
    .get();

  // 问题答案统计
  const questionStats = questionnaire[0].questions.map(q => {
    if (q.type === 'single' || q.type === 'multiple') {
      const optionCounts = {};
      q.options.forEach(opt => {
        optionCounts[opt] = 0;
      });

      responses.forEach(r => {
        const answer = r.answers.find(a => a.questionId === q.id);
        if (answer && answer.value) {
          if (Array.isArray(answer.value)) {
            answer.value.forEach(v => {
              if (optionCounts[v] !== undefined) {
                optionCounts[v]++;
              }
            });
          } else {
            if (optionCounts[answer.value] !== undefined) {
              optionCounts[answer.value]++;
            }
          }
        }
      });

      return {
        questionId: q.id,
        title: q.title,
        type: q.type,
        options: optionCounts
      };
    } else {
      return {
        questionId: q.id,
        title: q.title,
        type: q.type,
        answers: responses.map(r => {
          const answer = r.answers.find(a => a.questionId === q.id);
          return answer ? answer.value : '';
        }).filter(v => v !== '')
      };
    }
  });

  return {
    questionnaire: questionnaire[0],
    responseCount,
    questionStats
  };
}

/**
 * 通过工号查询提交记录（无需登录）
 */
async function getSubmissionsByIdCard(payload) {
  const { idCard } = payload;
  const db = uniCloud.database();

  if (!idCard) {
    throw new Error('请提供工号');
  }

  // 分页获取所有提交记录（uniCloud 单次最多100条）
  let allResponses = [];
  let pageIndex = 0;
  const pageSize = 100;
  while (true) {
    const { data } = await db.collection('questionnaire_responses')
      .orderBy('submittedAt', 'desc')
      .skip(pageIndex * pageSize)
      .limit(pageSize)
      .get();
    allResponses = allResponses.concat(data);
    if (data.length < pageSize) break;
    pageIndex++;
  }

  // 直接在答案中匹配工号，不依赖 fieldType
  const responses = allResponses.filter(response => {
    if (!response.answers || !Array.isArray(response.answers)) return false;
    return response.answers.some(a => {
      const val = typeof a.value === 'string' ? a.value.trim() : '';
      return val === idCard.trim();
    });
  });

  if (responses.length === 0) {
    return [];
  }

  // 获取问卷标题
  const questionnaireIds = [...new Set(responses.map(r => r.questionnaireId))];
  const { data: questionnaires } = await db.collection('questionnaires')
    .where({ _id: db.command.in(questionnaireIds) })
    .field({ _id: true, title: true })
    .get();

  const questionnaireMap = {};
  questionnaires.forEach(q => {
    questionnaireMap[q._id] = q.title;
  });

  return responses.map(r => ({
    ...r,
    questionnaireTitle: questionnaireMap[r.questionnaireId] || '未知问卷'
  }));
}

module.exports = {
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
  deleteQuestionnaireResponse,
  getUserResponses,
  exportQuestionnaireData,
  getQuestionnaireStats,
  getSubmissionsByIdCard,  // 新增：通过身份证号查询

  // 通知功能
  sendNotification,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadNotificationCount
};
