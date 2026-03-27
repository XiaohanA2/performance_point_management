/**
 * 数据库迁移：扩展users集合支持多角色
 *
 * 变更内容：
 * 1. users.roles - 新增，角色数组（支持多角色）
 * 2. users.accessibleModules - 新增，模块访问权限
 * 3. users.department - 新增，部门
 * 4. users.position - 新增，职位
 *
 * 向后兼容：
 * - 保留原有的 role 字段，自动迁移到 roles 数组
 */

const { ROLES } = require('../../cloudfunctions/appService/constants/permission-constants.js');

/**
 * 迁移单个用户记录
 */
function migrateUser(user) {
  const migrated = { ...user };

  // 1. 迁移 role -> roles
  if (user.role && !user.roles) {
    migrated.roles = [user.role];
  } else if (!user.roles) {
    migrated.roles = [];
  }

  // 2. 设置 accessibleModules（基于角色）
  if (!migrated.accessibleModules) {
    if (user.role === 'manager' || migrated.roles.includes('manager')) {
      // 客户经理：只能访问个贷业务
      migrated.accessibleModules = {
        legacyBusiness: true,
        creditBusiness: false
      };
    } else if (['lobby_manager', 'elastic_counter', 'counter_manager'].some(r => migrated.roles.includes(r))) {
      // 新角色：只能访问拓展业务
      migrated.accessibleModules = {
        legacyBusiness: false,
        creditBusiness: true
      };
    } else {
      // 管理员：两者都可访问
      migrated.accessibleModules = {
        legacyBusiness: true,
        creditBusiness: true
      };
    }
  }

  // 3. 添加默认部门和职位（如果不存在）
  if (!migrated.department) {
    migrated.department = migrated.branch || ''; // 使用branch作为默认部门
  }
  if (!migrated.position) {
    migrated.position = migrated.role === 'admin' ? '管理员' : '客户经理';
  }

  // 4. 确保时间戳存在
  if (!migrated.createdAt) {
    migrated.createdAt = Date.now();
  }

  migrated.updatedAt = Date.now();

  return migrated;
}

/**
 * 执行迁移
 */
async function migrateUsers(db) {
  console.log('🔄 开始迁移users集合...\n');

  try {
    // 1. 获取所有用户
    const { data: users } = await db.collection('users').get();
    console.log(`📋 找到 ${users.length} 个用户`);

    if (users.length === 0) {
      console.log('✅ 没有需要迁移的用户\n');
      return { success: true, migrated: 0 };
    }

    // 2. 逐个迁移并更新
    let migratedCount = 0;
    for (const user of users) {
      const migrated = migrateUser(user);

      await db.collection('users').doc(user._id).update(migrated);
      migratedCount++;

      console.log(`✅ 已迁移: ${user.name} (${user.phone})`);
    }

    console.log(`\n✅ 迁移完成！共迁移 ${migratedCount} 个用户\n`);

    return {
      success: true,
      migrated: migratedCount,
      total: users.length
    };

  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 回滚迁移（谨慎使用！）
 */
async function rollbackMigration(db) {
  console.log('⚠️  开始回滚迁移...\n');

  try {
    const { data: users } = await db.collection('users').get();

    for (const user of users) {
      const rollback = {
        ...user,
        // 恢复role字段
        role: user.roles && user.roles.length > 0 ? user.roles[0] : 'manager',
        // 删除新增字段
        roles: db.command.remove(),
        accessibleModules: db.command.remove(),
        department: db.command.remove(),
        position: db.command.remove()
      };

      await db.collection('users').doc(user._id).update(rollback);
      console.log(`✅ 已回滚: ${user.name}`);
    }

    console.log('\n✅ 回滚完成\n');
    return { success: true };

  } catch (error) {
    console.error('❌ 回滚失败:', error.message);
    return { success: false, error: error.message };
  }
}

// 导出（用于云函数或脚本）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    migrateUser,
    migrateUsers,
    rollbackMigration
  };
}

// 使用示例
/*
// 在云函数中使用
'use strict';
const db = uniCloud.database();
const { migrateUsers } = require('../database/migrations/add_roles_to_users.js');

exports.main = async (event, context) => {
  const { action } = event;

  if (action === 'migrate') {
    return await migrateUsers(db);
  } else if (action === 'rollback') {
    return await rollbackMigration(db);
  }

  return { error: '未知操作' };
};

// 在uniCloud Web控制台使用
// 1. 创建临时云函数
// 2. 复制上述代码
// 3. 运行云函数，传入 { action: 'migrate' }
*/
