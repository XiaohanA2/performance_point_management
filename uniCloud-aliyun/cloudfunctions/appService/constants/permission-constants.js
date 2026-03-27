/**
 * 权限管理常量定义 (CommonJS版本 - 云函数专用)
 */

// 角色代码
const ROLES = {
  SUPER_ADMIN: 'super_admin',              // 超级管理员
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
const ROLE_NAMES = {
  [ROLES.SUPER_ADMIN]: '超级管理员',
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
const DEFAULT_ROLE_CONFIGS = {
  [ROLES.SUPER_ADMIN]: {
    roleName: ROLE_NAMES[ROLES.SUPER_ADMIN],
    description: '拥有所有权限',
    permissions: {
      menus: ['all'],
      operations: ['all'],
      dataScope: 'all' // all/branch/self
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

module.exports = {
  ROLES,
  ROLE_NAMES,
  DEFAULT_ROLE_CONFIGS
};
