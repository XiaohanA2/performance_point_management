/**
 * 权限验证中间件
 *
 * 提供统一的权限验证函数，用于云函数中的权限控制
 */

const { ROLES } = require('../constants/permission-constants.js');

/**
 * 检查用户是否有指定权限
 * @param {Object} user - 用户对象
 * @param {String} permission - 权限标识
 * @returns {Boolean}
 */
function hasPermission(user, permission) {
  if (!user) return false;

  // 兼容 role 字符串和 roles 数组两种格式
  const userRoles = user.roles || (user.role ? [user.role] : []);
  if (userRoles.length === 0) return false;

  // 超级管理员拥有所有权限
  if (userRoles.includes(ROLES.SUPER_ADMIN)) return true;

  // 这里可以根据需要扩展权限检查逻辑
  // 目前简化为基于角色的权限检查
  return false;
}

/**
 * 检查用户是否有指定角色
 * @param {Object} user - 用户对象
 * @param {String} roleCode - 角色代码
 * @returns {Boolean}
 */
function hasRole(user, roleCode) {
  if (!user) return false;
  // 兼容 role 字符串和 roles 数组两种格式
  const userRoles = user.roles || (user.role ? [user.role] : []);
  return userRoles.includes(roleCode);
}

/**
 * 检查用户是否有任一指定角色
 * @param {Object} user - 用户对象
 * @param {Array<String>} roleCodes - 角色代码数组
 * @returns {Boolean}
 */
function hasAnyRole(user, roleCodes) {
  if (!user) return false;
  // 兼容 role 字符串和 roles 数组两种格式
  const userRoles = user.roles || (user.role ? [user.role] : []);
  return roleCodes.some(role => userRoles.includes(role));
}

/**
 * 权限验证中间件 - 要求指定权限
 * @param {String} permission - 权限标识
 * @returns {Function} 验证函数
 */
function requirePermission(permission) {
  return (user) => {
    if (!user) {
      throw new Error('未登录');
    }
    if (!hasPermission(user, permission)) {
      throw new Error('权限不足');
    }
  };
}

/**
 * 权限验证中间件 - 要求指定角色
 * @param {String} roleCode - 角色代码
 * @returns {Function} 验证函数
 */
function requireRole(roleCode) {
  return (user) => {
    if (!user) {
      throw new Error('未登录');
    }
    if (!hasRole(user, roleCode)) {
      throw new Error('权限不足：需要角色 ' + roleCode);
    }
  };
}

/**
 * 权限验证中间件 - 要求任一指定角色
 * @param {Array<String>} roleCodes - 角色代码数组
 * @returns {Function} 验证函数
 */
function requireAnyRole(roleCodes) {
  return (user) => {
    if (!user) {
      throw new Error('未登录');
    }
    if (!hasAnyRole(user, roleCodes)) {
      throw new Error('权限不足：需要以下角色之一 ' + roleCodes.join(', '));
    }
  };
}

/**
 * 权限验证中间件 - 仅超级管理员
 * @returns {Function} 验证函数
 */
function requireSuperAdmin() {
  return requireRole(ROLES.SUPER_ADMIN);
}

module.exports = {
  hasPermission,
  hasRole,
  hasAnyRole,
  requirePermission,
  requireRole,
  requireAnyRole,
  requireSuperAdmin
};
