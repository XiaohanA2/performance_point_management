/**
 * 权限管理常量定义
 */

// 角色代码
export const ROLES = {
  SUPER_ADMIN: 'super_admin',           // 超级管理员
  CREDIT_ADMIN: 'credit_admin',         // 信贷管理员
  QUESTIONNAIRE_ADMIN: 'questionnaire_admin', // 问卷管理员
  KNOWLEDGE_ADMIN: 'knowledge_admin',   // 知识库管理员
  ADMIN: 'admin',                       // 普通管理员
  MANAGER: 'manager',                   // 客户经理
  LOBBY_MANAGER: 'lobby_manager',       // 大堂经理
  ELASTIC_COUNTER: 'elastic_counter',   // 弹性柜面
  COUNTER_MANAGER: 'counter_manager'    // 柜面经理
};

// 角色显示名称
export const ROLE_NAMES = {
  [ROLES.SUPER_ADMIN]: '超级管理员',
  [ROLES.CREDIT_ADMIN]: '信贷管理员',
  [ROLES.QUESTIONNAIRE_ADMIN]: '问卷管理员',
  [ROLES.KNOWLEDGE_ADMIN]: '知识库管理员',
  [ROLES.ADMIN]: '普通管理员',
  [ROLES.MANAGER]: '客户经理',
  [ROLES.LOBBY_MANAGER]: '大堂经理',
  [ROLES.ELASTIC_COUNTER]: '弹性柜面',
  [ROLES.COUNTER_MANAGER]: '柜面经理'
};

// 知识库分类
export const KNOWLEDGE_CATEGORIES = [
  '错题本',
  '个贷业务',
  '信贷业务',
  '系统操作',
  '政策法规',
  '常见问题',
  '产品介绍',
  '流程指南',
  '其他'
];

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
  [ROLES.CREDIT_ADMIN]: {
    roleName: ROLE_NAMES[ROLES.CREDIT_ADMIN],
    description: '管理拓展信贷业务',
    permissions: {
      menus: ['overview', 'users', 'credit-config', 'credit-verify', 'credit-tasks', 'credit-export'],
      operations: ['view', 'create', 'update', 'delete', 'export'],
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
    description: '管理知识库',
    permissions: {
      menus: ['knowledge'],
      operations: ['view', 'create', 'update', 'delete'],
      dataScope: 'all'
    }
  },
  [ROLES.ADMIN]: {
    roleName: ROLE_NAMES[ROLES.ADMIN],
    description: '管理用户、支行、规则',
    permissions: {
      menus: ['overview', 'users', 'branches', 'rules'],
      operations: ['view', 'create', 'update', 'delete'],
      dataScope: 'all'
    }
  },
  [ROLES.MANAGER]: {
    roleName: ROLE_NAMES[ROLES.MANAGER],
    description: '客户经理 - 个贷业务',
    permissions: {
      menus: ['dashboard', 'history', 'leaderboard', 'profile'],
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
