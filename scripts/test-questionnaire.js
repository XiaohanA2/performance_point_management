/**
 * 问卷系统测试脚本
 *
 * 在uniCloud云函数控制台运行此脚本来测试问卷系统功能
 */

'use strict';

const db = uniCloud.database();
const { ROLES } = require('../uniCloud-aliyun/cloudfunctions/appService/constants/permission-constants.js');

/**
 * 测试1：验证数据库集合
 */
async function testDatabaseCollections() {
  console.log('\n=== 测试1：验证数据库集合 ===\n');

  const collections = ['questionnaires', 'questionnaire_responses', 'notifications'];

  for (const collectionName of collections) {
    try {
      const result = await db.collection(collectionName).count();
      console.log(`✅ ${collectionName}: ${result.total} 条记录`);
    } catch (error) {
      console.log(`❌ ${collectionName}: ${error.message}`);
    }
  }

  // 检查示例问卷
  try {
    const { data } = await db.collection('questionnaires').where({
      _id: 'questionnaire_job_intention_001'
    }).get();

    if (data.length > 0) {
      console.log('\n✅ 示例问卷存在:');
      console.log(`   标题: ${data[0].title}`);
      console.log(`   状态: ${data[0].status}`);
      console.log(`   问题数: ${data[0].questions.length}`);
    } else {
      console.log('\n⚠️  示例问卷不存在，请先运行迁移脚本');
    }
  } catch (error) {
    console.log(`\n❌ 查询问卷失败: ${error.message}`);
  }
}

/**
 * 测试2：验证权限系统
 */
async function testPermissions() {
  console.log('\n=== 测试2：验证权限系统 ===\n');

  try {
    // 检查roles集合
    const { data: roles } = await db.collection('roles').get();
    console.log(`✅ roles集合: ${roles.length} 个角色`);

    // 检查问卷管理员角色
    const questionnaireAdmin = roles.find(r => r.roleCode === 'questionnaire_admin');
    if (questionnaireAdmin) {
      console.log(`✅ 问卷管理员角色存在: ${questionnaireAdmin.roleName}`);
      console.log(`   权限菜单: ${questionnaireAdmin.permissions.menus.join(', ')}`);
    } else {
      console.log('⚠️  问卷管理员角色不存在');
    }

    // 检查用户权限
    const { data: users } = await db.collection('users').limit(5).get();
    console.log(`\n用户权限检查（前5个用户）:`);

    for (const user of users) {
      const hasRoles = user.roles || [user.role];
      const hasQuestionnaireAdmin = hasRoles.includes('questionnaire_admin');
      console.log(`   ${user.name}: ${hasRoles.join(', ')} ${hasQuestionnaireAdmin ? '✅' : ''}`);
    }
  } catch (error) {
    console.log(`❌ 权限测试失败: ${error.message}`);
  }
}

/**
 * 测试3：验证问卷API
 */
async function testQuestionnaireAPI() {
  console.log('\n=== 测试3：验证问卷API ===\n');

  try {
    // 测试获取问卷列表
    console.log('测试 getQuestionnaires...');
    const questionnaires = await db.collection('questionnaires')
      .where({ status: 'published' })
      .get();

    console.log(`✅ 已发布问卷: ${questionnaires.data.length} 个`);

    if (questionnaires.data.length > 0) {
      const q = questionnaires.data[0];
      console.log(`\n示例: ${q.title}`);
      console.log(`   目标角色: ${q.targetRoles.join(', ')}`);
      console.log(`   权限配置: viewRoles=${q.permissions.viewRoles.join(', ')}`);
    }
  } catch (error) {
    console.log(`❌ API测试失败: ${error.message}`);
  }
}

/**
 * 测试4：生成测试数据
 */
async function generateTestData() {
  console.log('\n=== 测试4：生成测试数据 ===\n');

  try {
    // 创建一个简单的测试问卷
    const testQuestionnaire = {
      _id: 'test_questionnaire_001',
      title: '测试问卷',
      description: '这是一个测试问卷，用于验证功能',
      type: 'test',
      status: 'published',
      startDate: Date.now(),
      endDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
      questions: [
        {
          id: 'test_q1',
          type: 'single',
          title: '您最喜欢的颜色是？',
          options: ['红色', '蓝色', '绿色'],
          required: true
        },
        {
          id: 'test_q2',
          type: 'multiple',
          title: '您的兴趣爱好（多选）',
          options: ['阅读', '运动', '音乐', '旅行'],
          required: false
        },
        {
          id: 'test_q3',
          type: 'text',
          title: '请留下您的建议',
          required: false,
          placeholder: '请输入内容'
        }
      ],
      targetRoles: [ROLES.MANAGER, ROLES.ADMIN],
      permissions: {
        viewRoles: [ROLES.SUPER_ADMIN, ROLES.QUESTIONNAIRE_ADMIN],
        exportRoles: [ROLES.SUPER_ADMIN, ROLES.QUESTIONNAIRE_ADMIN],
        replyRoles: [ROLES.SUPER_ADMIN, ROLES.QUESTIONNAIRE_ADMIN]
      },
      createdBy: 'test_script',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await db.collection('questionnaires').add(testQuestionnaire);

    console.log('✅ 测试问卷已创建');
    console.log(`   ID: ${testQuestionnaire._id}`);
    console.log(`   标题: ${testQuestionnaire.title}`);
    console.log(`   问题数: ${testQuestionnaire.questions.length}`);

    return testQuestionnaire;
  } catch (error) {
    console.log(`❌ 创建测试问卷失败: ${error.message}`);
    return null;
  }
}

/**
 * 清理测试数据
 */
async function cleanupTestData() {
  console.log('\n=== 清理测试数据 ===\n');

  try {
    await db.collection('questionnaires').doc('test_questionnaire_001').remove();
    console.log('✅ 测试问卷已删除');
  } catch (error) {
    console.log(`ℹ️  测试问卷不存在或已删除`);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('\n========================================');
  console.log('问卷系统测试脚本');
  console.log('========================================\n');

  const testType = process.env.TEST_TYPE || 'all';

  switch (testType) {
    case 'database':
      await testDatabaseCollections();
      break;

    case 'permissions':
      await testPermissions();
      break;

    case 'api':
      await testQuestionnaireAPI();
      break;

    case 'generate':
      await generateTestData();
      break;

    case 'cleanup':
      await cleanupTestData();
      break;

    case 'all':
    default:
      await testDatabaseCollections();
      await testPermissions();
      await testQuestionnaireAPI();

      console.log('\n========================================');
      console.log('✅ 所有测试完成');
      console.log('========================================\n');

      console.log('\n💡 提示:');
      console.log('1. 在小程序端测试悬浮球显示');
      console.log('2. 测试问卷填写流程');
      console.log('3. 测试管理员权限');
      console.log('4. 测试回复功能');

      console.log('\n📝 测试步骤:');
      console.log('1. 登录系统（确保有问卷管理员角色）');
      console.log('2. 点击工作台右下角的蓝色悬浮球');
      console.log('3. 查看"长乐支行岗位意向摸底表"');
      console.log('4. 尝试填写问卷');
      console.log('5. 进入管理后台创建新问卷');
      console.log('6. 查看回复并进行回复');
      break;
  }
}

// 导出函数（用于云函数调用）
module.exports = {
  main,
  testDatabaseCollections,
  testPermissions,
  testQuestionnaireAPI,
  generateTestData,
  cleanupTestData
};

// 如果直接运行此脚本
if (typeof module !== 'undefined' && require.main === module) {
  main();
}
