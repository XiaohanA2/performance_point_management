/**
 * 权限验证路由守卫
 *
 * 用于在页面跳转前验证用户权限
 */

import { StoreService } from '../services/store.js';

/**
 * 权限验证配置
 * 定义每个页面需要的权限
 */
const PAGE_PERMISSIONS = {
  // 管理页面
  'pages/admin/admin': {
    requiredRoles: ['admin', 'super_admin', 'credit_admin', 'branch_leader'],
    requiredPermissions: []
  },

  // 知识库管理
  'pages/knowledge/knowledge-admin': {
    requiredRoles: ['knowledge_admin', 'super_admin', 'credit_admin', 'branch_leader'],
    requiredPermissions: ['knowledge_manage']
  },

  // 问卷管理
  'pages/questionnaire/questionnaire-admin': {
    requiredRoles: ['questionnaire_admin', 'super_admin'],
    requiredPermissions: ['questionnaire_manage']
  },

  // 拓展业务管理
  'pages/credit-business/credit-admin': {
    requiredRoles: ['credit_admin', 'super_admin'],
    requiredPermissions: ['credit_manage']
  }
};

/**
 * 检查用户是否有权限访问页面
 * @param {String} url - 页面路径
 * @returns {Object} { hasPermission: Boolean, redirectUrl: String }
 */
export function checkPagePermission(url) {
  const user = StoreService.getCurrentUser();

  // 未登录，跳转到登录页
  if (!user) {
    return {
      hasPermission: false,
      redirectUrl: '/pages/login/login'
    };
  }

  // 页面不需要权限
  const pageConfig = PAGE_PERMISSIONS[url];
  if (!pageConfig) {
    return { hasPermission: true };
  }

  // 检查角色
  if (pageConfig.requiredRoles && pageConfig.requiredRoles.length > 0) {
    const hasRole = StoreService.hasAnyRole(pageConfig.requiredRoles);
    if (!hasRole) {
      return {
        hasPermission: false,
        redirectUrl: '/pages/profile/profile'
      };
    }
  }

  // 检查操作权限
  if (pageConfig.requiredPermissions && pageConfig.requiredPermissions.length > 0) {
    const hasPermission = pageConfig.requiredPermissions.every(
      perm => StoreService.hasPermission(perm)
    );
    if (!hasPermission) {
      return {
        hasPermission: false,
        redirectUrl: '/pages/profile/profile'
      };
    }
  }

  return { hasPermission: true };
}

/**
 * 权限守卫 - 在uni-app的onShow生命周期中使用
 * @param {String} url - 当前页面路径
 * @returns {Boolean} 是否有权限
 */
export function permissionGuard(url) {
  const result = checkPagePermission(url);

  if (!result.hasPermission) {
    uni.showToast({
      title: '无权访问',
      icon: 'none',
      duration: 1500
    });

    setTimeout(() => {
      if (result.redirectUrl) {
        uni.redirectTo({
          url: result.redirectUrl,
          fail: () => {
            // 如果redirectTo失败，尝试switchTab
            uni.switchTab({
              url: result.redirectUrl
            });
          }
        });
      }
    }, 1500);

    return false;
  }

  return true;
}

/**
 * 操作权限检查
 * 用于按钮级别的权限控制
 * @param {String} permission - 权限标识
 * @returns {Boolean}
 */
export function checkOperationPermission(permission) {
  return StoreService.hasPermission(permission);
}

/**
 * 动态获取用户可访问的Tab列表
 * 用于admin页面的Tab过滤
 * @returns {Array} Tab配置数组
 */
export function getAccessibleTabs() {
  const user = StoreService.getCurrentUser();
  if (!user) return [];

  const allTabs = [
    { key: 'overview', label: '业绩汇总', requiredRoles: ['admin', 'manager', 'super_admin'] },
    { key: 'users', label: '用户管理', requiredRoles: ['admin', 'super_admin'] },
    { key: 'roles', label: '角色管理', requiredRoles: ['super_admin'] },
    { key: 'branches', label: '支行管理', requiredRoles: ['admin', 'super_admin'] },
    { key: 'rules', label: '业务规则', requiredRoles: ['admin', 'super_admin'] },
    { key: 'settings', label: '系统设置', requiredRoles: ['admin', 'super_admin'] }
  ];

  return allTabs.filter(tab => {
    if (!tab.requiredRoles) return true;
    return StoreService.hasAnyRole(tab.requiredRoles);
  });
}

/**
 * 获取用户可访问的菜单列表
 * @returns {Array} 菜单数组
 */
export async function getUserMenus() {
  const user = StoreService.getCurrentUser();
  if (!user) return [];

  try {
    const res = await uniCloud.callFunction({
      name: 'appService',
      data: {
        action: 'getUserMenus',
        payload: { userId: user._id }
      }
    });

    const menus = res.result.data?.menus || [];
    return menus;
  } catch (error) {
    console.error('Failed to get user menus:', error);
    return [];
  }
}

/**
 * 组合式API风格的权限检查（供Vue 3使用）
 */
export function usePermission() {
  return {
    checkPagePermission,
    permissionGuard,
    checkOperationPermission,
    getAccessibleTabs,
    getUserMenus,
    // 便捷方法
    can: (permission) => checkOperationPermission(permission),
    hasRole: (role) => StoreService.hasRole(role),
    isSuperAdmin: () => StoreService.isSuperAdmin()
  };
}
