/**
 * 动态TabBar配置
 *
 * 根据用户角色动态配置底部TabBar
 */

import { StoreService } from '../services/store.js';

/**
 * 个贷业务TabBar（客户经理）
 */
const LEGACY_TABBAR = [
  {
    pagePath: 'pages/dashboard/dashboard',
    text: '工作台',
    iconPath: 'static/tabbar/dashboard.png',
    selectedIconPath: 'static/tabbar/dashboard-active.png'
  },
  {
    pagePath: 'pages/history/history',
    text: '提报记录',
    iconPath: 'static/tabbar/history.png',
    selectedIconPath: 'static/tabbar/history-active.png'
  },
  {
    pagePath: 'pages/leaderboard/leaderboard',
    text: '龙虎榜',
    iconPath: 'static/tabbar/ranking.png',
    selectedIconPath: 'static/tabbar/ranking-active.png'
  },
  {
    pagePath: 'pages/profile/profile',
    text: '我的',
    iconPath: 'static/tabbar/profile.png',
    selectedIconPath: 'static/tabbar/profile-active.png'
  }
];

/**
 * 拓展业务TabBar（大堂经理、弹性柜面、柜面经理）
 */
const CREDIT_TABBAR = [
  {
    pagePath: 'pages/credit-business/credit-dashboard',
    text: '工作台',
    iconPath: 'static/tabbar/dashboard.png',
    selectedIconPath: 'static/tabbar/dashboard-active.png'
  },
  {
    pagePath: 'pages/credit-business/credit-submit',
    text: '业务提报',
    iconPath: 'static/tabbar/submit.png',
    selectedIconPath: 'static/tabbar/submit-active.png'
  },
  {
    pagePath: 'pages/credit-business/credit-ranking',
    text: '排名',
    iconPath: 'static/tabbar/ranking.png',
    selectedIconPath: 'static/tabbar/ranking-active.png'
  },
  {
    pagePath: 'pages/profile/profile',
    text: '我的',
    iconPath: 'static/tabbar/profile.png',
    selectedIconPath: 'static/tabbar/profile-active.png'
  }
];

/**
 * 管理员TabBar（包含admin页面）
 */
const ADMIN_TABBAR = [
  {
    pagePath: 'pages/dashboard/dashboard',
    text: '工作台',
    iconPath: 'static/tabbar/dashboard.png',
    selectedIconPath: 'static/tabbar/dashboard-active.png'
  },
  {
    pagePath: 'pages/admin/admin',
    text: '管理',
    iconPath: 'static/tabbar/admin.png',
    selectedIconPath: 'static/tabbar/admin-active.png'
  },
  {
    pagePath: 'pages/leaderboard/leaderboard',
    text: '龙虎榜',
    iconPath: 'static/tabbar/ranking.png',
    selectedIconPath: 'static/tabbar/ranking-active.png'
  },
  {
    pagePath: 'pages/profile/profile',
    text: '我的',
    iconPath: 'static/tabbar/profile.png',
    selectedIconPath: 'static/tabbar/profile-active.png'
  }
];

/**
 * 获取用户的TabBar配置
 * @returns {Array} TabBar配置数组
 */
export function getUserTabBar() {
  const user = StoreService.getCurrentUser();

  if (!user) {
    return LEGACY_TABBAR; // 默认返回个贷业务TabBar
  }

  const roles = user.roles || [];

  // 超级管理员、普通管理员
  if (roles.includes('super_admin') || roles.includes('admin')) {
    return ADMIN_TABBAR;
  }

  // 客户经理且可以访问个贷业务
  if (roles.includes('manager') && user.accessibleModules?.legacyBusiness) {
    return LEGACY_TABBAR;
  }

  // 大堂经理、弹性柜面、柜面经理
  if (roles.includes('lobby_manager') ||
      roles.includes('elastic_counter') ||
      roles.includes('counter_manager')) {
    return CREDIT_TABBAR;
  }

  // 默认返回个贷业务TabBar
  return LEGACY_TABBAR;
}

/**
 * 获取用户的默认页面
 * @returns {String} 页面路径
 */
export function getUserDefaultPage() {
  const tabBar = getUserTabBar();
  return tabBar[0]?.pagePath || '/pages/dashboard/dashboard';
}

/**
 * 检查用户是否有模块访问权限
 * @param {String} module - 模块标识 ('legacy' | 'credit')
 * @returns {Boolean}
 */
export function canAccessModule(module) {
  const user = StoreService.getCurrentUser();
  if (!user || !user.accessibleModules) {
    return false;
  }

  if (module === 'legacy') {
    return user.accessibleModules.legacyBusiness || false;
  }

  if (module === 'credit') {
    return user.accessibleModules.creditBusiness || false;
  }

  return false;
}

/**
 * 页面跳转（带权限检查）
 * @param {String} url - 目标页面路径
 */
export function navigateToPage(url) {
  // 检查页面访问权限
  const { permissionGuard } = require('./permission-guard.js');

  if (!permissionGuard(url)) {
    return;
  }

  uni.navigateTo({ url });
}

/**
 * 模块切换（在profile页面使用）
 * 允许客户经理在个贷和拓展业务之间切换
 * @param {String} module - 目标模块 ('legacy' | 'credit')
 */
export function switchModule(module) {
  const user = StoreService.getCurrentUser();

  if (!user) {
    uni.showToast({ title: '请先登录', icon: 'none' });
    return;
  }

  // 检查是否有权限访问目标模块
  if (!canAccessModule(module)) {
    uni.showToast({ title: '无权访问该模块', icon: 'none' });
    return;
  }

  // 跳转到对应模块的工作台
  if (module === 'legacy') {
    uni.switchTab({
      url: '/pages/dashboard/dashboard'
    });
  } else if (module === 'credit') {
    uni.navigateTo({
      url: '/pages/credit-business/credit-dashboard'
    });
  }
}

/**
 * 动态设置TabBar（仅在App中可用）
 * 注意：小程序不支持动态修改TabBar
 */
export function setDynamicTabBar() {
  // #ifdef APP-PLUS
  const tabBar = getUserTabBar();

  tabBar.forEach((tab, index) => {
    uni.setTabBarItem({
      index,
      text: tab.text,
      iconPath: tab.iconPath,
      selectedIconPath: tab.selectedIconPath
    });
  });
  // #endif

  // #ifdef MP-WEIXIN
  // 小程序需要在pages.json中配置所有可能的TabBar
  // 通过页面级判断来显示/隐藏
  // #endif
}
