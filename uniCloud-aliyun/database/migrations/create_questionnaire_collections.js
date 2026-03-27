/**
 * 数据库迁移：创建问卷系统相关集合
 *
 * 变更内容：
 * 1. questionnaires - 问卷配置集合
 * 2. questionnaire_responses - 问卷回答集合
 * 3. notifications - 通知消息集合
 *
 * 索引优化：
 * - questionnaires: status, createdBy, startDate, endDate
 * - questionnaire_responses: questionnaireId, userId, status
 * - notifications: userId, read, createdAt
 */

const { ROLES } = require('../../cloudfunctions/appService/constants/permission-constants.js');

/**
 * 创建questionnaires集合的初始数据
 */
async function initQuestionnaires(db) {
  console.log('📋 创建questionnaires集合索引...\n');

  // uniCloud会在首次插入数据时自动创建集合和索引
  // 创建"岗位意向摸底表"作为示例（基于真实业务需求）
  const sampleQuestionnaire = {
    _id: 'questionnaire_job_intention_001',
    title: '长乐支行岗位意向摸底表',
    description: '亲爱的员工，感谢您参与岗位意向摸底！为帮助支行更好地调配人力资源，请您如实填写以下信息。本份摸底表长期执行，如岗位意向变更可随时进行提交，提交后将由综合部后台统计分析，您的个人信息将严格保密。',
    type: 'job_intention',
    status: 'published',
    startDate: Date.now(),
    endDate: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1年后（长期执行）
    questions: [
      {
        id: 'q1',
        type: 'text',
        title: '姓名',
        required: true,
        isPrivate: true,
        fieldType: 'name',
        placeholder: '点击输入信息'
      },
      {
        id: 'q2',
        type: 'text',
        title: '身份证号码',
        required: true,
        isPrivate: true,
        fieldType: 'idCard',
        placeholder: '点击输入信息'
      },
      {
        id: 'q3',
        type: 'text',
        title: '所在网点/部门',
        required: true,
        isPrivate: true,
        placeholder: '点击输入信息'
      },
      {
        id: 'q4',
        type: 'single',
        title: '政治面貌',
        required: true,
        isPrivate: true,
        options: ['中共党员', '预备党员', '共青团员', '群众']
      },
      {
        id: 'q5',
        type: 'single',
        title: '当前岗位',
        required: true,
        isPrivate: true,
        options: ['网点主任', '内勤行长', '客户经理', '大堂经理', '柜面经理', '部门经理', '部门专干', '其他'],
        hasOtherOption: true
      },
      {
        id: 'q6',
        type: 'single',
        title: '意向岗位',
        required: true,
        isPrivate: true,
        options: ['网点主任', '内勤行长', '客户经理', '大堂经理', '柜面经理', '维持现岗位', '其他'],
        hasOtherOption: true
      },
      {
        id: 'q7',
        type: 'text',
        title: '意向网点',
        required: false,
        isPrivate: true,
        placeholder: '点击输入信息'
      },
      {
        id: 'q8',
        type: 'text',
        title: '意向部门及岗位',
        required: false,
        isPrivate: true,
        placeholder: '点击输入信息'
      },
      {
        id: 'q9',
        type: 'single',
        title: '是否持证上岗',
        required: true,
        isPrivate: true,
        options: ['已持证', '正在考证', '未考证']
      },
      {
        id: 'q10',
        type: 'text',
        title: '持有资格证书名称',
        required: false,
        isPrivate: true,
        placeholder: '点击输入信息'
      },
      {
        id: 'q11',
        type: 'single',
        title: '是否有车辆',
        required: false,
        isPrivate: true,
        options: ['有', '无']
      },
      {
        id: 'q12',
        type: 'text',
        title: '其他诉求',
        required: false,
        isPrivate: true,
        placeholder: '点击输入信息'
      }
    ],
    targetRoles: [ROLES.MANAGER, ROLES.LOBBY_MANAGER, ROLES.ELASTIC_COUNTER, ROLES.COUNTER_MANAGER],
    permissions: {
      viewRoles: [ROLES.SUPER_ADMIN, ROLES.QUESTIONNAIRE_ADMIN],
      exportRoles: [ROLES.SUPER_ADMIN, ROLES.QUESTIONNAIRE_ADMIN],
      replyRoles: [ROLES.SUPER_ADMIN, ROLES.QUESTIONNAIRE_ADMIN]
    },
    createdBy: 'system',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  try {
    await db.collection('questionnaires').add(sampleQuestionnaire);
    console.log('✅ questionnaires集合初始化完成（示例问卷已创建）\n');
    return { success: true };
  } catch (error) {
    if (error.message.includes('duplicate')) {
      console.log('✅ questionnaires集合已存在，跳过初始化\n');
      return { success: true, exists: true };
    }
    throw error;
  }
}

/**
 * 创建questionnaire_responses集合
 */
async function initQuestionnaireResponses(db) {
  console.log('📋 创建questionnaire_responses集合索引...\n');

  // 创建一个空文档来初始化集合（实际会被删除）
  const sampleResponse = {
    _id: 'response_sample_init',
    questionnaireId: 'questionnaire_sample_001',
    userId: 'system_init',
    userName: '系统初始化',
    userBranch: '总行',
    answers: [],
    status: 'submitted',
    submittedAt: Date.now(),
    adminReply: '',
    repliedAt: 0,
    notificationSent: false
  };

  try {
    await db.collection('questionnaire_responses').add(sampleResponse);
    // 删除初始化文档
    await db.collection('questionnaire_responses').doc('response_sample_init').remove();
    console.log('✅ questionnaire_responses集合初始化完成\n');
    return { success: true };
  } catch (error) {
    if (error.message.includes('duplicate')) {
      console.log('✅ questionnaire_responses集合已存在，跳过初始化\n');
      return { success: true, exists: true };
    }
    throw error;
  }
}

/**
 * 创建notifications集合
 */
async function initNotifications(db) {
  console.log('📋 创建notifications集合索引...\n');

  const sampleNotification = {
    _id: 'notification_sample_init',
    userId: 'system_init',
    type: 'questionnaire_reply',
    title: '问卷回复通知',
    content: '您的问卷已收到回复',
    link: '/pages/questionnaire/questionnaire-responses',
    read: false,
    createdAt: Date.now()
  };

  try {
    await db.collection('notifications').add(sampleNotification);
    // 删除初始化文档
    await db.collection('notifications').doc('notification_sample_init').remove();
    console.log('✅ notifications集合初始化完成\n');
    return { success: true };
  } catch (error) {
    if (error.message.includes('duplicate')) {
      console.log('✅ notifications集合已存在，跳过初始化\n');
      return { success: true, exists: true };
    }
    throw error;
  }
}

/**
 * 执行迁移
 */
async function migrate(db) {
  console.log('🔄 开始问卷系统数据库迁移...\n');
  console.log('='.repeat(50) + '\n');

  try {
    // 1. 初始化questionnaires集合
    await initQuestionnaires(db);

    // 2. 初始化questionnaire_responses集合
    await initQuestionnaireResponses(db);

    // 3. 初始化notifications集合
    await initNotifications(db);

    console.log('='.repeat(50));
    console.log('\n✅ 问卷系统数据库迁移完成！\n');
    console.log('📊 迁移摘要:');
    console.log('  - questionnaires集合: ✅');
    console.log('  - questionnaire_responses集合: ✅');
    console.log('  - notifications集合: ✅');
    console.log('\n💡 后续步骤:');
    console.log('  1. 在uniCloud控制台验证集合已创建');
    console.log('  2. 检查索引是否正确设置');
    console.log('  3. 运行问卷功能测试\n');

    return {
      success: true,
      collections: ['questionnaires', 'questionnaire_responses', 'notifications']
    };

  } catch (error) {
    console.error('\n❌ 迁移失败:', error.message);
    console.error('详细错误:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 回滚迁移（谨慎使用！会删除所有问卷数据）
 */
async function rollback(db) {
  console.log('⚠️  开始回滚问卷系统迁移...\n');
  console.log('⚠️  警告：此操作将删除所有问卷数据！\n');

  try {
    // 注意：uniCloud不支持删除集合，只能清空数据
    const { data: questionnaires } = await db.collection('questionnaires').get();
    for (const doc of questionnaires) {
      if (doc._id !== 'questionnaire_sample_001') {
        await db.collection('questionnaires').doc(doc._id).remove();
      }
    }

    const { data: responses } = await db.collection('questionnaire_responses').get();
    for (const doc of responses) {
      await db.collection('questionnaire_responses').doc(doc._id).remove();
    }

    const { data: notifications } = await db.collection('notifications').get();
    for (const doc of notifications) {
      await db.collection('notifications').doc(doc._id).remove();
    }

    console.log('✅ 回滚完成（数据已清空）\n');
    return { success: true };

  } catch (error) {
    console.error('❌ 回滚失败:', error.message);
    return { success: false, error: error.message };
  }
}

// 导出（用于云函数或脚本）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initQuestionnaires,
    initQuestionnaireResponses,
    initNotifications,
    migrate,
    rollback
  };
}

// 使用示例
/*
// 在云函数中使用
'use strict';
const db = uniCloud.database();
const { migrate, rollback } = require('../database/migrations/create_questionnaire_collections.js');

exports.main = async (event, context) => {
  const { action } = event;

  if (action === 'migrate') {
    return await migrate(db);
  } else if (action === 'rollback') {
    return await rollback(db);
  }

  return { error: '未知操作，请使用 action=migrate 或 action=rollback' };
};
*/
