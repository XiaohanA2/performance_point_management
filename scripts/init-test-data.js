/**
 * 测试数据初始化脚本
 *
 * 用途: 在测试环境中初始化测试数据
 * 使用方法:
 *   在uniCloud云函数本地调试中运行，或作为云函数的一部分运行
 */

// 默认测试用户数据
const TEST_USERS = [
  {
    _id: 'test_admin_001',
    name: '测试管理员',
    phone: '13800000001',
    password: '123456',
    branch: '测试支行A',
    role: 'admin',
    status: 'active',
    createdAt: Date.now()
  },
  {
    _id: 'test_manager_001',
    name: '张三（测试）',
    phone: '13800000002',
    password: '123456',
    branch: '测试支行A',
    role: 'manager',
    status: 'active',
    createdAt: Date.now()
  },
  {
    _id: 'test_manager_002',
    name: '李四（测试）',
    phone: '13800000003',
    password: '123456',
    branch: '测试支行B',
    role: 'manager',
    status: 'active',
    createdAt: Date.now()
  },
  {
    _id: 'test_manager_003',
    name: '王五（测试）',
    phone: '13800000004',
    password: '123456',
    branch: '测试支行C',
    role: 'manager',
    status: 'active',
    createdAt: Date.now()
  }
];

// 默认测试支行数据
const TEST_BRANCHES = [
  {
    id: 'TEST001',
    name: '测试支行A',
    createdAt: Date.now()
  },
  {
    id: 'TEST002',
    name: '测试支行B',
    createdAt: Date.now()
  },
  {
    id: 'TEST003',
    name: '测试支行C',
    createdAt: Date.now()
  }
];

// 测试提报记录
const TEST_SUBMISSIONS = [
  {
    _id: 'test_sub_001',
    userId: 'test_manager_002',
    userName: '李四（测试）',
    userBranch: '测试支行B',
    quarter: '2025-Q1',
    businessType: 'personal',
    data: {
      personalLoan: 5,
      microLoan: 3,
      creditCard: 10
    },
    score: 85,
    status: 'verified',
    submittedAt: Date.now() - 86400000 * 7 // 7天前
  },
  {
    _id: 'test_sub_002',
    userId: 'test_manager_003',
    userName: '王五（测试）',
    userBranch: '测试支行C',
    quarter: '2025-Q1',
    businessType: 'personal',
    data: {
      personalLoan: 8,
      microLoan: 5,
      creditCard: 15
    },
    score: 92,
    status: 'verified',
    submittedAt: Date.now() - 86400000 * 3 // 3天前
  }
];

// 测试系统设置
const TEST_SETTINGS = {
  _id: 'test_settings',
  currentQuarter: '2025-Q1',
  allowEditSubmission: true,
  scoringEnabled: true,
  updatedAt: Date.now()
};

/**
 * 初始化测试数据
 * @param {Object} db - uniCloud数据库实例
 */
async function initTestData(db) {
  console.log('🔄 开始初始化测试数据...\n');

  try {
    // 1. 清理现有测试数据（可选）
    console.log('📋 步骤1: 检查现有数据');
    const existingUsers = await db.collection('users').where({
      name: db.command RegExp('（测试）')
    }).count();

    if (existingUsers.total > 0) {
      console.log(`⚠️  发现 ${existingUsers.total} 条测试数据`);
      console.log('如需清理，请在uniCloud控制台手动删除\n');
    } else {
      console.log('✅ 无现有测试数据\n');
    }

    // 2. 插入测试支行
    console.log('📋 步骤2: 插入测试支行');
    const branchesResult = await db.collection('branches').add(TEST_BRANCHES);
    console.log(`✅ 成功插入 ${branchesResult.ids.length} 个测试支行\n`);

    // 3. 插入测试用户
    console.log('📋 步骤3: 插入测试用户');
    const usersResult = await db.collection('users').add(TEST_USERS);
    console.log(`✅ 成功插入 ${usersResult.ids.length} 个测试用户`);
    console.log('   测试管理员: 13800000001 / 123456');
    console.log('   测试用户1: 13800000002 / 123456');
    console.log('   测试用户2: 13800000003 / 123456');
    console.log('   测试用户3: 13800000004 / 123456\n');

    // 4. 插入测试提报记录
    console.log('📋 步骤4: 插入测试提报记录');
    const submissionsResult = await db.collection('submissions').add(TEST_SUBMISSIONS);
    console.log(`✅ 成功插入 ${submissionsResult.ids.length} 条测试提报记录\n`);

    // 5. 插入测试系统设置
    console.log('📋 步骤5: 插入测试系统设置');
    await db.collection('settings').add(TEST_SETTINGS);
    console.log('✅ 成功插入测试系统设置\n');

    // 6. 验证数据
    console.log('📋 步骤6: 验证测试数据');
    const [usersCount, branchesCount, submissionsCount, settingsCount] = await Promise.all([
      db.collection('users').count(),
      db.collection('branches').count(),
      db.collection('submissions').count(),
      db.collection('settings').count()
    ]);

    console.log('   用户数:', usersCount.total);
    console.log('   支行数:', branchesCount.total);
    console.log('   提报记录数:', submissionsCount.total);
    console.log('   系统设置数:', settingsCount.total);
    console.log('');

    console.log('✅ 测试数据初始化完成！\n');
    console.log('📋 测试账号信息:');
    console.log('   管理员账号: 13800000001');
    console.log('   密码: 123456');
    console.log('');
    console.log('📋 后续步骤:');
    console.log('   1. 使用测试账号登录小程序');
    console.log('   2. 验证数据展示正常');
    console.log('   3. 测试各项功能\n');

    return {
      success: true,
      stats: {
        users: usersCount.total,
        branches: branchesCount.total,
        submissions: submissionsCount.total,
        settings: settingsCount.total
      }
    };

  } catch (error) {
    console.error('❌ 初始化测试数据失败:', error.message);
    console.error(error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 清理测试数据
 * @param {Object} db - uniCloud数据库实例
 */
async function cleanTestData(db) {
  console.log('🔄 开始清理测试数据...\n');

  try {
    // 删除测试用户
    const testUsers = await db.collection('users').where({
      name: db.command RegExp('（测试）')
    }).get();

    if (testUsers.data.length > 0) {
      const userIds = testUsers.data.map(u => u._id);
      await db.collection('users').where({
        _id: db.command.in(userIds)
      }).remove();
      console.log(`✅ 已删除 ${testUsers.data.length} 个测试用户`);
    }

    // 删除测试支行
    const testBranches = await db.collection('branches').where({
      id: db.command RegExp('^TEST')
    }).get();

    if (testBranches.data.length > 0) {
      const branchIds = testBranches.data.map(b => b._id);
      await db.collection('branches').where({
        _id: db.command.in(branchIds)
      }).remove();
      console.log(`✅ 已删除 ${testBranches.data.length} 个测试支行`);
    }

    // 删除测试提报记录
    const testSubmissions = await db.collection('submissions').where({
      _id: db.command RegExp('^test_sub_')
    }).remove();
    console.log('✅ 已删除测试提报记录');

    // 删除测试设置
    await db.collection('settings').where({
      _id: 'test_settings'
    }).remove();
    console.log('✅ 已删除测试系统设置');

    console.log('\n✅ 测试数据清理完成！\n');

    return { success: true };

  } catch (error) {
    console.error('❌ 清理测试数据失败:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// 导出函数（用于云函数）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initTestData,
    cleanTestData,
    TEST_USERS,
    TEST_BRANCHES,
    TEST_SUBMISSIONS,
    TEST_SETTINGS
  };
}

// 使用示例
/*
// 在uniCloud云函数中使用
'use strict';
const db = uniCloud.database();
const { initTestData } = require('../../scripts/init-test-data.js');

exports.main = async (event, context) => {
  const { action } = event;

  if (action === 'init') {
    return await initTestData(db);
  } else if (action === 'clean') {
    return await cleanTestData(db);
  }

  return { error: '未知操作' };
};

// 在本地调试中运行
const db = uniCloud.database();
await initTestData(db);
*/
