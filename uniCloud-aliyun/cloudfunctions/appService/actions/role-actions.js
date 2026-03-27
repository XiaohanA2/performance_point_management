/**
 * 角色权限管理Actions
 */

const { ROLES, DEFAULT_ROLE_CONFIGS } = require('../constants/permission-constants.js');

// 创建角色（仅超级管理员）
async function createRole(payload) {
  const { roleCode, roleName, description, permissions } = payload;
  const db = uniCloud.database();

  // 验证权限（需要在调用前验证，这里假设已验证）
  if (!roleCode || !roleName || !permissions) {
    throw new Error('角色代码、名称和权限不能为空');
  }

  // 检查角色代码是否已存在
  const exists = await db.collection('roles').where({ roleCode }).count();
  if (exists.total > 0) {
    throw new Error('角色代码已存在');
  }

  const role = {
    _id: `role_${Date.now()}`,
    roleCode,
    roleName,
    description: description || '',
    permissions: {
      menus: permissions.menus || [],
      operations: permissions.operations || [],
      dataScope: permissions.dataScope || 'self'
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  await db.collection('roles').add(role);

  // 清除缓存
  const { clearCache } = require('./index.js');
  if (typeof clearCache === 'function') {
    clearCache();
  }

  return role;
}

// 获取所有角色
async function getRoles() {
  const db = uniCloud.database();
  const { data } = await db.collection('roles').orderBy('createdAt', 'asc').get();

  // 如果数据库为空，返回默认角色配置
  if (data.length === 0) {
    return Object.entries(DEFAULT_ROLE_CONFIGS).map(([roleCode, config]) => ({
      roleCode,
      ...config
    }));
  }

  return data;
}

// 更新角色权限（仅超级管理员）
async function updateRolePermissions(payload) {
  const { roleCode, roleName, description, permissions } = payload;
  const db = uniCloud.database();

  if (!roleCode) {
    throw new Error('角色代码不能为空');
  }

  const { data } = await db.collection('roles').where({ roleCode }).get();
  if (!data.length) {
    throw new Error('角色不存在');
  }

  const updateData = {
    updatedAt: Date.now()
  };

  // 只更新提供的字段
  if (roleName !== undefined) {
    updateData.roleName = roleName;
  }
  if (description !== undefined) {
    updateData.description = description;
  }
  if (permissions !== undefined) {
    updateData.permissions = {
      menus: permissions.menus || [],
      operations: permissions.operations || [],
      dataScope: permissions.dataScope || 'self'
    };
  }

  await db.collection('roles').where({ roleCode }).update(updateData);

  // 清除缓存
  const { clearCache } = require('./index.js');
  if (typeof clearCache === 'function') {
    clearCache();
  }

  return { success: true };
}

// 删除角色（仅超级管理员，不能删除系统默认角色）
async function deleteRole({ roleCode }) {
  const db = uniCloud.database();

  if (!roleCode) {
    throw new Error('缺少角色代码');
  }

  // 不能删除系统默认角色
  const systemRoles = Object.values(ROLES);
  if (systemRoles.includes(roleCode)) {
    throw new Error('不能删除系统默认角色');
  }

  // 检查是否有用户使用该角色
  const { data: users } = await db.collection('users')
    .where({ role: roleCode })
    .get();

  if (users.length > 0) {
    throw new Error('该角色仍有用户使用，无法删除');
  }

  await db.collection('roles').where({ roleCode }).remove();

  // 清除缓存
  const { clearCache } = require('./index.js');
  if (typeof clearCache === 'function') {
    clearCache();
  }

  return { success: true };
}

// 初始化默认角色（系统首次运行时调用）
async function initDefaultRoles() {
  const db = uniCloud.database();

  // 检查是否已初始化
  const { total } = await db.collection('roles').count();
  if (total > 0) {
    return { initialized: true, count: total };
  }

  // 插入默认角色
  const roles = Object.entries(DEFAULT_ROLE_CONFIGS).map(([roleCode, config]) => ({
    _id: `role_${roleCode}`,
    roleCode,
    ...config,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }));

  await db.collection('roles').add(roles);

  return { initialized: true, count: roles.length };
}

// 同步默认角色（更新现有角色配置）
async function syncDefaultRoles() {
  const db = uniCloud.database();

  const { data: existingRoles } = await db.collection('roles').get();
  const existingRoleCodes = new Set(existingRoles.map(r => r.roleCode));

  let updated = 0;
  let added = 0;
  const results = [];

  // 遍历默认角色配置
  for (const [roleCode, config] of Object.entries(DEFAULT_ROLE_CONFIGS)) {
    const existingRole = existingRoles.find(r => r.roleCode === roleCode);

    if (existingRole) {
      // 更新现有角色
      await db.collection('roles').doc(existingRole._id).update({
        roleName: config.roleName,
        description: config.description,
        permissions: config.permissions,
        updatedAt: Date.now()
      });
      updated++;
      results.push({ roleCode, action: 'updated', roleName: config.roleName });
    } else {
      // 添加新角色
      await db.collection('roles').add({
        _id: `role_${roleCode}`,
        roleCode,
        roleName: config.roleName,
        description: config.description,
        permissions: config.permissions,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      added++;
      results.push({ roleCode, action: 'added', roleName: config.roleName });
    }
  }

  return {
    success: true,
    updated,
    added,
    results
  };
}

module.exports = {
  createRole,
  getRoles,
  updateRolePermissions,
  deleteRole,
  initDefaultRoles,
  syncDefaultRoles
};
