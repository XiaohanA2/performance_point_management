/**
 * 权限管理相关Actions
 */

// 为用户分配角色
async function assignUserRoles(payload) {
  const { userId, roles } = payload;
  const db = uniCloud.database();

  if (!userId) throw new Error('缺少用户ID');
  if (!Array.isArray(roles)) throw new Error('角色必须是数组');

  // 验证角色是否有效
  const { ROLES } = require('../../constants/permission-constants.js');
  const validRoles = Object.values(ROLES);
  for (const role of roles) {
    if (!validRoles.includes(role)) {
      throw new Error(`无效的角色: ${role}`);
    }
  }

  // 更新用户角色
  await db.collection('users').doc(userId).update({
    roles,
    updatedAt: Date.now()
  });

  // 清除缓存
  const { clearCache } = require('./index.js');
  if (typeof clearCache === 'function') {
    clearCache();
  }

  return { success: true };
}

// 批量分配角色
async function batchAssignRoles(payload) {
  const { userIds, role } = payload;
  const db = uniCloud.database();
  const _ = db.command;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new Error('用户ID列表不能为空');
  }
  if (!role) throw new Error('角色不能为空');

  // 验证角色是否有效
  const { ROLES } = require('../../constants/permission-constants.js');
  const validRoles = Object.values(ROLES);
  if (!validRoles.includes(role)) {
    throw new Error(`无效的角色: ${role}`);
  }

  // 批量更新用户角色
  const promises = userIds.map(userId =>
    db.collection('users').doc(userId).update({
      roles: [role],
      updatedAt: Date.now()
    })
  );

  await Promise.all(promises);

  // 清除缓存
  const { clearCache } = require('./index.js');
  if (typeof clearCache === 'function') {
    clearCache();
  }

  return { success: true, count: userIds.length };
}

// 获取所有角色定义
async function getRoles() {
  const db = uniCloud.database();
  const { ROLES, DEFAULT_ROLE_CONFIGS } = require('../../constants/permission-constants.js');

  // 从数据库获取自定义角色（如果有）
  const { data } = await db.collection('roles').get();

  if (data && data.length > 0) {
    return data;
  }

  // 如果数据库中没有角色，返回默认角色配置
  return Object.entries(DEFAULT_ROLE_CONFIGS).map(([roleCode, config]) => ({
    roleCode,
    ...config
  }));
}

// 创建角色（仅超级管理员）
async function createRole(payload) {
  const db = uniCloud.database();

  const { roleCode, roleName, description, permissions } = payload;

  if (!roleCode || !roleName) {
    throw new Error('角色代码和名称不能为空');
  }

  // 检查角色是否已存在
  const exists = await db.collection('roles').where({ roleCode }).count();
  if (exists.total > 0) {
    throw new Error('角色已存在');
  }

  // 创建角色
  await db.collection('roles').add({
    roleCode,
    roleName,
    description: description || '',
    permissions: permissions || {
      menus: [],
      operations: [],
      dataScope: 'self'
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  // 清除缓存
  const { clearCache } = require('./index.js');
  if (typeof clearCache === 'function') {
    clearCache();
  }

  return { success: true };
}

// 更新角色权限（仅超级管理员）
async function updateRolePermissions(payload) {
  const { roleCode, permissions } = payload;
  const db = uniCloud.database();

  if (!roleCode) throw new Error('缺少角色代码');
  if (!permissions) throw new Error('权限配置不能为空');

  // 更新角色权限
  await db.collection('roles').where({ roleCode }).update({
    permissions,
    updatedAt: Date.now()
  });

  // 清除缓存
  const { clearCache } = require('./index.js');
  if (typeof clearCache === 'function') {
    clearCache();
  }

  return { success: true };
}

// 获取用户列表（支持角色筛选）
async function getUsersWithRoles(payload) {
  const { role, branch, keyword, page = 1, pageSize = 20 } = payload;
  const db = uniCloud.database();
  const _ = db.command;

  // 构建查询条件
  let whereCondition = {};

  if (role) {
    whereCondition.roles = _.elemMatch(role);
  }

  if (branch) {
    whereCondition.branch = branch;
  }

  if (keyword) {
    whereCondition = _.and([
      whereCondition,
      _.or([
        { name: new RegExp(`${keyword}.*`, 'i') },
        { phone: new RegExp(`${keyword}.*`, 'i') }
      ])
    ]);
  }

  // 查询总数
  const { total } = await db.collection('users').where(whereCondition).count();

  // 分页查询
  const { data } = await db.collection('users')
    .where(whereCondition)
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .orderBy('createdAt', 'desc')
    .get();

  return {
    list: data,
    total,
    page,
    pageSize
  };
}

// 验证用户权限
async function checkUserPermission(payload) {
  const { userId, permission, resourceId = null } = payload;
  const db = uniCloud.database();

  // 获取用户信息
  const { data: users } = await db.collection('users').doc(userId).get();
  if (!users.length) {
    return { hasPermission: false, error: '用户不存在' };
  }

  const user = users[0];

  // 获取用户角色
  const userRoles = user.roles || [];
  if (userRoles.length === 0) {
    return { hasPermission: false, error: '用户没有角色' };
  }

  // 获取角色定义
  const { data: roles } = await db.collection('roles')
    .where({
      roleCode: db.command.in(userRoles)
    })
    .get();

  if (!roles.length) {
    return { hasPermission: false, error: '角色定义不存在' };
  }

  // 检查是否有超级管理员角色
  if (userRoles.includes('super_admin')) {
    return { hasPermission: true };
  }

  // 合并所有角色的权限
  const allMenus = new Set();
  const allOperations = new Set();
  let dataScope = 'self';

  for (const role of roles) {
    if (role.permissions.menus.includes('all')) {
      return { hasPermission: true };
    }

    role.permissions.menus.forEach(m => allMenus.add(m));
    role.permissions.operations.forEach(o => allOperations.add(o));

    // 取最大的数据范围
    const scopeOrder = ['all', 'branch', 'self'];
    if (scopeOrder.indexOf(role.permissions.dataScope) > scopeOrder.indexOf(dataScope)) {
      dataScope = role.permissions.dataScope;
    }
  }

  // 检查菜单权限
  if (permission.type === 'menu') {
    return {
      hasPermission: allMenus.has(permission.value) || allMenus.has('all')
    };
  }

  // 检查操作权限
  if (permission.type === 'operation') {
    return {
      hasPermission: allOperations.has(permission.value) || allOperations.has('all')
    };
  }

  return { hasPermission: false };
}

// 获取用户可访问的菜单
async function getUserMenus(payload) {
  const { userId } = payload;
  const db = uniCloud.database();

  // 获取用户信息
  const { data: users } = await db.collection('users').doc(userId).get();
  if (!users.length) {
    return { error: '用户不存在' };
  }

  const user = users[0];

  // 超级管理员返回所有菜单
  if (user.roles && user.roles.includes('super_admin')) {
    return { menus: ['all'] };
  }

  // 获取用户角色
  const userRoles = user.roles || [];
  if (userRoles.length === 0) {
    return { menus: [] };
  }

  // 获取角色定义
  const { data: roles } = await db.collection('roles')
    .where({
      roleCode: db.command.in(userRoles)
    })
    .get();

  // 合并所有角色的菜单权限
  const allMenus = new Set();
  for (const role of roles) {
    if (role.permissions.menus.includes('all')) {
      return { menus: ['all'] };
    }
    role.permissions.menus.forEach(m => allMenus.add(m));
  }

  return { menus: Array.from(allMenus) };
}

// 导出所有权限管理actions
module.exports = {
  assignUserRoles,
  batchAssignRoles,
  getRoles,
  createRole,
  updateRolePermissions,
  getUsersWithRoles,
  checkUserPermission,
  getUserMenus
};
