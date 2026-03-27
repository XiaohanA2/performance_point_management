/**
 * 权限管理服务
 *
 * 提供角色和权限相关的功能，包括：
 * - 角色定义和管理
 * - 权限验证
 * - 菜单权限控制
 * - 数据权限控制
 */

// 角色定义
export const ROLES = {
  SUPER_ADMIN: 'super_admin',              // 超级管理员
  BRANCH_LEADER: 'branch_leader',          // 支行领导（个金+个贷双后台，可编辑除超管外所有人，管理知识库，无问卷管理）
  CREDIT_ADMIN: 'credit_admin',            // 个贷管理员（个贷业务 + 知识库管理）
  PERSONAL_FINANCE_ADMIN: 'personal_finance_admin', // 个金管理员（个人金融业务，无知识库权限）
  QUESTIONNAIRE_ADMIN: 'questionnaire_admin', // 问卷管理员
  KNOWLEDGE_ADMIN: 'knowledge_admin',      // 知识库管理员（独立知识库管理员）
  ADMIN: 'admin',                          // 普通管理员（兼容旧角色）
  MANAGER: 'manager',                      // 客户经理
  LOBBY_MANAGER: 'lobby_manager',          // 大堂经理
  ELASTIC_COUNTER: 'elastic_counter',      // 弹性柜面
  COUNTER_MANAGER: 'counter_manager'       // 柜面经理
};

// 角色显示名称
export const ROLE_NAMES = {
  [ROLES.SUPER_ADMIN]: '超级管理员',
  [ROLES.BRANCH_LEADER]: '支行领导',
  [ROLES.CREDIT_ADMIN]: '个贷管理员',
  [ROLES.PERSONAL_FINANCE_ADMIN]: '个金管理员',
  [ROLES.QUESTIONNAIRE_ADMIN]: '问卷管理员',
  [ROLES.KNOWLEDGE_ADMIN]: '知识库管理员',
  [ROLES.ADMIN]: '普通管理员',
  [ROLES.MANAGER]: '客户经理',
  [ROLES.LOBBY_MANAGER]: '大堂经理',
  [ROLES.ELASTIC_COUNTER]: '弹性柜面',
  [ROLES.COUNTER_MANAGER]: '柜面经理'
};

// 默认角色配置
export const DEFAULT_ROLE_CONFIGS = {
  [ROLES.SUPER_ADMIN]: {
    roleName: ROLE_NAMES[ROLES.SUPER_ADMIN],
    description: '拥有所有权限',
    permissions: {
      menus: ['all'],
      operations: ['all'],
      dataScope: 'all' // all/branch/self
    }
  },
  [ROLES.BRANCH_LEADER]: {
    roleName: ROLE_NAMES[ROLES.BRANCH_LEADER],
    description: '支行领导（双后台查看+管理知识库，可编辑除超管外所有用户）',
    permissions: {
      menus: ['overview', 'users', 'branches', 'rules', 'roles', 'settings', 'knowledge'],
      operations: ['view', 'create', 'update', 'delete', 'knowledge_manage'],
      dataScope: 'all'
    }
  },
  [ROLES.CREDIT_ADMIN]: {
    roleName: ROLE_NAMES[ROLES.CREDIT_ADMIN],
    description: '个贷业务管理员（用户、支行、规则、知识库）',
    permissions: {
      menus: ['overview', 'users', 'branches', 'rules', 'roles', 'settings', 'knowledge'],
      operations: ['view', 'create', 'update', 'delete', 'knowledge_manage'],
      dataScope: 'all'
    }
  },
  [ROLES.PERSONAL_FINANCE_ADMIN]: {
    roleName: ROLE_NAMES[ROLES.PERSONAL_FINANCE_ADMIN],
    description: '个人金融业务管理员（无知识库权限）',
    permissions: {
      menus: ['overview', 'users', 'branches', 'rules', 'roles', 'settings'],
      operations: ['view', 'create', 'update', 'delete'],
      dataScope: 'all'
    }
  },
  [ROLES.QUESTIONNAIRE_ADMIN]: {
    roleName: ROLE_NAMES[ROLES.QUESTIONNAIRE_ADMIN],
    description: '管理问卷和查看回复',
    permissions: {
      menus: ['questionnaire', 'questionnaire-responses'],
      operations: ['view', 'create', 'update', 'delete', 'reply', 'export'],
      dataScope: 'all'
    }
  },
  [ROLES.KNOWLEDGE_ADMIN]: {
    roleName: ROLE_NAMES[ROLES.KNOWLEDGE_ADMIN],
    description: '知识库管理员（仅知识库管理权限）',
    permissions: {
      menus: ['knowledge'],
      operations: ['view', 'create', 'update', 'delete', 'knowledge_manage'],
      dataScope: 'all'
    }
  },
  [ROLES.ADMIN]: {
    roleName: ROLE_NAMES[ROLES.ADMIN],
    description: '普通管理员（兼容旧角色，推荐使用个贷管理员）',
    permissions: {
      menus: ['overview', 'users', 'branches', 'rules', 'roles', 'settings', 'knowledge'],
      operations: ['view', 'create', 'update', 'delete', 'knowledge_manage'],
      dataScope: 'all'
    }
  },
  [ROLES.MANAGER]: {
    roleName: ROLE_NAMES[ROLES.MANAGER],
    description: '客户经理 - 个贷业务',
    permissions: {
      menus: ['dashboard', 'history', 'leaderboard', 'profile', 'knowledge'],
      operations: ['view', 'create'],
      dataScope: 'self'
    }
  },
  [ROLES.LOBBY_MANAGER]: {
    roleName: ROLE_NAMES[ROLES.LOBBY_MANAGER],
    description: '大堂经理 - 拓展业务',
    permissions: {
      menus: ['credit-dashboard', 'credit-submit', 'credit-ranking'],
      operations: ['view', 'create'],
      dataScope: 'self'
    }
  },
  [ROLES.ELASTIC_COUNTER]: {
    roleName: ROLE_NAMES[ROLES.ELASTIC_COUNTER],
    description: '弹性柜面 - 拓展业务',
    permissions: {
      menus: ['credit-dashboard', 'credit-submit', 'credit-ranking'],
      operations: ['view', 'create'],
      dataScope: 'self'
    }
  },
  [ROLES.COUNTER_MANAGER]: {
    roleName: ROLE_NAMES[ROLES.COUNTER_MANAGER],
    description: '柜面经理 - 拓展业务',
    permissions: {
      menus: ['credit-dashboard', 'credit-submit', 'credit-ranking'],
      operations: ['view', 'create'],
      dataScope: 'self'
    }
  }
};

/**
 * 检查用户是否有指定权限
 * @param {Object} user - 用户对象
 * @param {String} permission - 权限标识
 * @param {String} resourceId - 资源ID（可选）
 * @returns {Boolean}
 */
export function hasPermission(user, permission, resourceId = null) {
  if (!user) return false;

  // 兼容 role 字符串和 roles 数组两种格式
  const userRoles = user.roles || (user.role ? [user.role] : []);
  if (userRoles.length === 0) return false;

  // 超级管理员拥有所有权限
  if (userRoles.includes(ROLES.SUPER_ADMIN)) return true;

  // 检查用户的所有角色
  for (const role of userRoles) {
    const roleConfig = DEFAULT_ROLE_CONFIGS[role];
    if (!roleConfig) continue;

    // 检查操作权限
    if (roleConfig.permissions.operations.includes('all')) return true;
    if (roleConfig.permissions.operations.includes(permission)) return true;
  }

  return false;
}

/**
 * 检查用户是否可以访问指定菜单
 * @param {Object} user - 用户对象
 * @param {String} menuId - 菜单ID
 * @returns {Boolean}
 */
export function canAccessMenu(user, menuId) {
  if (!user) return false;

  // 兼容 role 字符串和 roles 数组两种格式
  const userRoles = user.roles || (user.role ? [user.role] : []);
  if (userRoles.length === 0) return false;

  // 超级管理员可以访问所有菜单
  if (userRoles.includes(ROLES.SUPER_ADMIN)) return true;

  // 检查用户的所有角色
  for (const role of userRoles) {
    const roleConfig = DEFAULT_ROLE_CONFIGS[role];
    if (!roleConfig) continue;

    // 检查菜单权限
    if (roleConfig.permissions.menus.includes('all')) return true;
    if (roleConfig.permissions.menus.includes(menuId)) return true;
  }

  return false;
}

/**
 * 获取用户可访问的菜单列表
 * @param {Object} user - 用户对象
 * @returns {Array} 菜单ID数组
 */
export function getUserMenus(user) {
  if (!user) return [];

  // 兼容 role 字符串和 roles 数组两种格式
  const userRoles = user.roles || (user.role ? [user.role] : []);
  if (userRoles.length === 0) return [];

  // 超级管理员返回所有菜单
  if (userRoles.includes(ROLES.SUPER_ADMIN)) {
    return ['all'];
  }

  const menus = new Set();

  // 收集所有角色可访问的菜单
  for (const role of userRoles) {
    const roleConfig = DEFAULT_ROLE_CONFIGS[role];
    if (!roleConfig) continue;

    if (roleConfig.permissions.menus.includes('all')) {
      return ['all'];
    }

    roleConfig.permissions.menus.forEach(menu => menus.add(menu));
  }

  return Array.from(menus);
}

/**
 * 检查用户是否有指定角色的权限
 * @param {Object} user - 用户对象
 * @param {String} roleCode - 角色代码
 * @returns {Boolean}
 */
export function hasRole(user, roleCode) {
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
export function hasAnyRole(user, roleCodes) {
  if (!user) return false;
  // 兼容 role 字符串和 roles 数组两种格式
  const userRoles = user.roles || (user.role ? [user.role] : []);
  return roleCodes.some(role => userRoles.includes(role));
}

/**
 * 过滤用户数据范围（数据权限）
 * @param {Object} user - 用户对象
 * @param {Array} dataList - 数据列表
 * @param {String} userField - 用户字段名（默认为'userId'）
 * @returns {Array} 过滤后的数据
 */
export function filterDataByScope(user, dataList, userField = 'userId') {
  if (!user) return [];

  // 兼容 role 字符串和 roles 数组两种格式
  const userRoles = user.roles || (user.role ? [user.role] : []);
  if (userRoles.length === 0) return [];

  // 超级管理员可以看到所有数据
  if (userRoles.includes(ROLES.SUPER_ADMIN)) return dataList;

  // 获取用户的数据范围
  const dataScopes = new Set();
  for (const role of userRoles) {
    const roleConfig = DEFAULT_ROLE_CONFIGS[role];
    if (!roleConfig) continue;

    const scope = roleConfig.permissions.dataScope;
    if (scope === 'all') {
      // 如果任一角色可以访问所有数据，直接返回全部
      return dataList;
    }
    dataScopes.add(scope);
  }

  // 数据范围：self 只能看到自己的数据
  if (dataScopes.has('self')) {
    return dataList.filter(item => item[userField] === user.id);
  }

  // 默认返回所有数据
  return dataList;
}

/**
 * 获取用户的角色显示名称
 * @param {Object} user - 用户对象
 * @returns {String} 角色显示名称
 */
export function getUserRoleNames(user) {
  if (!user) return '';

  // 兼容 role 字符串和 roles 数组两种格式
  const userRoles = user.roles || (user.role ? [user.role] : []);
  if (userRoles.length === 0) return '';

  return userRoles.map(role => ROLE_NAMES[role] || role).join('、');
}

/**
 * 验证用户是否可以访问拓展业务模块
 * @param {Object} user - 用户对象
 * @returns {Boolean}
 */
export function canAccessCreditBusiness(user) {
  if (!user || !user.accessibleModules) return false;
  return user.accessibleModules.creditBusiness === true;
}

/**
 * 验证用户是否可以访问个贷业务模块
 * @param {Object} user - 用户对象
 * @returns {Boolean}
 */
export function canAccessLegacyBusiness(user) {
  if (!user || !user.accessibleModules) return false;
  return user.accessibleModules.legacyBusiness === true;
}

/**
 * 获取用户的默认页面（根据角色）
 * @param {Object} user - 用户对象
 * @returns {String} 页面路径
 */
export function getUserDefaultPage(user) {
  if (!user || !user.roles) return '/pages/login/login';

  // 如果可以访问个贷业务，返回工作台
  if (canAccessLegacyBusiness(user)) {
    return '/pages/dashboard/dashboard';
  }

  // 如果可以访问拓展业务，返回拓展业务工作台
  if (canAccessCreditBusiness(user)) {
    return '/pages/credit-business/credit-dashboard';
  }

  // 默认返回登录页
  return '/pages/login/login';
}

// ==================== 系统访问控制 ====================

/**
 * 系统访问权限配置
 * 定义不同角色对个贷系统和个金系统的访问权限
 */
export const SYSTEM_ACCESS = {
  [ROLES.SUPER_ADMIN]: {
    canAccessCreditSystem: true,   // 可访问个贷系统
    canAccessPFSystem: true,        // 可访问个金系统
    canSwitchSystem: true           // 可切换系统
  },
  [ROLES.BRANCH_LEADER]: {
    canAccessCreditSystem: true,
    canAccessPFSystem: true,
    canSwitchSystem: true
  },
  [ROLES.CREDIT_ADMIN]: {
    canAccessCreditSystem: true,
    canAccessPFSystem: true,
    canSwitchSystem: true
  },
  [ROLES.PERSONAL_FINANCE_ADMIN]: {
    canAccessCreditSystem: true,
    canAccessPFSystem: true,
    canSwitchSystem: true
  },
  [ROLES.QUESTIONNAIRE_ADMIN]: {
    canAccessCreditSystem: true,
    canAccessPFSystem: true,
    canSwitchSystem: true
  },
  [ROLES.KNOWLEDGE_ADMIN]: {
    canAccessCreditSystem: true,
    canAccessPFSystem: true,
    canSwitchSystem: true
  },
  [ROLES.ADMIN]: {
    canAccessCreditSystem: true,
    canAccessPFSystem: true,
    canSwitchSystem: true
  },
  [ROLES.MANAGER]: {
    canAccessCreditSystem: true,
    canAccessPFSystem: true,
    canSwitchSystem: true
  },
  [ROLES.LOBBY_MANAGER]: {
    canAccessCreditSystem: false,
    canAccessPFSystem: true,
    canSwitchSystem: false
  },
  [ROLES.ELASTIC_COUNTER]: {
    canAccessCreditSystem: false,
    canAccessPFSystem: true,
    canSwitchSystem: false
  },
  [ROLES.COUNTER_MANAGER]: {
    canAccessCreditSystem: false,
    canAccessPFSystem: true,
    canSwitchSystem: false
  },
  guest: {
    canAccessCreditSystem: true,
    canAccessPFSystem: true,
    canSwitchSystem: true
  }
};

/**
 * 检查用户是否可以访问个贷系统
 * @param {Object} user - 用户对象
 * @returns {Boolean}
 */
export function canAccessCreditSystem(user) {
  if (!user) return false;

  const userRoles = user.roles || (user.role ? [user.role] : []);
  if (userRoles.length === 0) return false;

  // 检查用户的所有角色
  for (const role of userRoles) {
    const access = SYSTEM_ACCESS[role];
    if (access && access.canAccessCreditSystem) {
      return true;
    }
  }

  return false;
}

/**
 * 检查用户是否可以访问个金系统
 * @param {Object} user - 用户对象
 * @returns {Boolean}
 */
export function canAccessPFSystem(user) {
  if (!user) return false;

  const userRoles = user.roles || (user.role ? [user.role] : []);
  if (userRoles.length === 0) return false;

  // 检查用户的所有角色
  for (const role of userRoles) {
    const access = SYSTEM_ACCESS[role];
    if (access && access.canAccessPFSystem) {
      return true;
    }
  }

  return false;
}

/**
 * 检查用户是否可以切换系统
 * @param {Object} user - 用户对象
 * @returns {Boolean}
 */
export function canSwitchSystem(user) {
  if (!user) return false;

  const userRoles = user.roles || (user.role ? [user.role] : []);
  if (userRoles.length === 0) return false;

  // 检查用户的所有角色
  for (const role of userRoles) {
    const access = SYSTEM_ACCESS[role];
    if (access && access.canSwitchSystem) {
      return true;
    }
  }

  return false;
}

/**
 * 获取用户的默认系统（首次登录进入的系统）
 * @param {Object} user - 用户对象
 * @returns {String} 'credit' | 'pf' | null
 */
export function getUserDefaultSystem(user) {
  if (!user) return null;

  const userRoles = user.roles || (user.role ? [user.role] : []);
  if (userRoles.length === 0) return null;

  // 优先级：个金系统角色 > 个贷系统角色
  const pfRoles = [ROLES.LOBBY_MANAGER, ROLES.ELASTIC_COUNTER, ROLES.COUNTER_MANAGER, ROLES.PERSONAL_FINANCE_ADMIN];
  const creditRoles = [ROLES.MANAGER, ROLES.CREDIT_ADMIN, ROLES.ADMIN];

  // 检查是否有个金系统专属角色
  for (const role of userRoles) {
    if (pfRoles.includes(role)) {
      return 'pf';
    }
  }

  // 检查是否有个贷系统角色
  for (const role of userRoles) {
    if (creditRoles.includes(role)) {
      return 'credit';
    }
  }

  // 超级管理员默认进入个贷系统
  if (userRoles.includes(ROLES.SUPER_ADMIN)) {
    return 'credit';
  }

  return null;
}

// ==================== 用户管理权限控制 ====================

/**
 * 角色分组定义
 */
export const ROLE_GROUPS = {
  // 个贷业务线角色
  CREDIT_ROLES: [
    ROLES.CREDIT_ADMIN,  // 个贷管理员
    ROLES.ADMIN,         // 普通管理员（兼容）
    ROLES.MANAGER        // 客户经理
  ],
  // 个金业务线角色
  PF_ROLES: [
    ROLES.PERSONAL_FINANCE_ADMIN,  // 个金管理员
    ROLES.MANAGER,                 // 客户经理（个金也有）
    ROLES.LOBBY_MANAGER,           // 大堂经理
    ROLES.ELASTIC_COUNTER,         // 弹性柜面
    ROLES.COUNTER_MANAGER          // 柜面经理
  ],
  // 独立管理员角色（不属于业务线）
  INDEPENDENT_ADMIN_ROLES: [
    ROLES.QUESTIONNAIRE_ADMIN,  // 问卷管理员
    ROLES.KNOWLEDGE_ADMIN       // 知识库管理员
  ]
};

/**
 * 检查用户是否可以管理指定角色的用户
 * @param {Object} currentUser - 当前用户对象
 * @param {String} targetRole - 目标用户的角色
 * @returns {Boolean}
 */
export function canManageUserRole(currentUser, targetRole) {
  if (!currentUser) return false;

  const userRoles = currentUser.roles || (currentUser.role ? [currentUser.role] : []);
  if (userRoles.length === 0) return false;

  // 超级管理员可以管理所有角色
  if (userRoles.includes(ROLES.SUPER_ADMIN)) {
    return true;
  }

  // 支行领导可以管理除超级管理员外的所有角色
  if (userRoles.includes(ROLES.BRANCH_LEADER)) {
    return targetRole !== ROLES.SUPER_ADMIN;
  }

  // 个贷管理员可以管理个贷业务线的所有角色
  if (userRoles.includes(ROLES.CREDIT_ADMIN) || userRoles.includes(ROLES.ADMIN)) {
    return ROLE_GROUPS.CREDIT_ROLES.includes(targetRole);
  }

  // 个金管理员可以管理个金业务线的所有角色
  if (userRoles.includes(ROLES.PERSONAL_FINANCE_ADMIN)) {
    return ROLE_GROUPS.PF_ROLES.includes(targetRole);
  }

  // 其他管理员无用户管理权限
  return false;
}

/**
 * 获取用户可以管理的角色列表
 * @param {Object} currentUser - 当前用户对象
 * @returns {Array<String>} 角色代码数组
 */
export function getManageableRoles(currentUser, allRoles = []) {
  if (!currentUser) return [];

  const allRoleCodes = allRoles.length > 0
    ? allRoles.map(r => r.roleCode)
    : Object.values(ROLES);

  const userRoles = currentUser.roles || (currentUser.role ? [currentUser.role] : []);
  if (userRoles.length === 0) return [];

  // 超级管理员可以管理所有角色
  if (userRoles.includes(ROLES.SUPER_ADMIN)) {
    return allRoleCodes;
  }

  // 支行领导可以管理除超管外所有角色
  if (userRoles.includes(ROLES.BRANCH_LEADER)) {
    return allRoleCodes.filter(r => r !== ROLES.SUPER_ADMIN);
  }

  // 个贷管理员可以管理个贷业务线角色
  if (userRoles.includes(ROLES.CREDIT_ADMIN) || userRoles.includes(ROLES.ADMIN)) {
    return ROLE_GROUPS.CREDIT_ROLES;
  }

  // 个金管理员可以管理个金业务线角色
  if (userRoles.includes(ROLES.PERSONAL_FINANCE_ADMIN)) {
    return ROLE_GROUPS.PF_ROLES;
  }

  // 其他管理员无用户管理权限
  return [];
}

/**
 * 检查用户是否可以执行用户管理操作
 * @param {Object} currentUser - 当前用户对象
 * @param {String} operation - 操作类型：'create' | 'update' | 'delete' | 'view'
 * @param {Object} targetUser - 目标用户对象（可选，用于update/delete）
 * @returns {Boolean}
 */
export function canPerformUserOperation(currentUser, operation, targetUser = null) {
  if (!currentUser) return false;

  const userRoles = currentUser.roles || (currentUser.role ? [currentUser.role] : []);
  if (userRoles.length === 0) return false;

  // 超级管理员拥有所有操作权限
  if (userRoles.includes(ROLES.SUPER_ADMIN)) {
    return true;
  }

  // 个贷管理员和个金管理员的权限
  const isCreditAdmin = userRoles.includes(ROLES.CREDIT_ADMIN) || userRoles.includes(ROLES.ADMIN);
  const isPFAdmin = userRoles.includes(ROLES.PERSONAL_FINANCE_ADMIN);
  const isBranchLeader = userRoles.includes(ROLES.BRANCH_LEADER);

  if (!isCreditAdmin && !isPFAdmin && !isBranchLeader) {
    // 其他管理员只有查看权限
    return operation === 'view';
  }

  // 对于update和delete操作，需要检查目标用户的角色
  if ((operation === 'update' || operation === 'delete') && targetUser) {
    const targetRole = targetUser.role;
    return canManageUserRole(currentUser, targetRole);
  }

  // create和view操作允许
  return true;
}

/**
 * 过滤用户列表（根据管理权限）
 * @param {Object} currentUser - 当前用户对象
 * @param {Array} userList - 用户列表
 * @returns {Array} 过滤后的用户列表
 */
export function filterManageableUsers(currentUser, userList) {
  if (!currentUser) return [];

  const userRoles = currentUser.roles || (currentUser.role ? [currentUser.role] : []);
  if (userRoles.length === 0) return [];

  // 超级管理员可以看到所有用户
  if (userRoles.includes(ROLES.SUPER_ADMIN)) {
    return userList;
  }

  // 获取可管理的角色列表
  const manageableRoles = getManageableRoles(currentUser);
  if (manageableRoles.length === 0) {
    // 无管理权限，返回所有用户（只读）
    return userList;
  }

  // 过滤出可管理的用户
  return userList.filter(user => manageableRoles.includes(user.role));
}

