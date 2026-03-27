/**
 * 个金业务系统 - 默认业务配置
 *
 * scoreConfig (必选业务 benchmark):
 *   weightScore: 权重分（基准分）
 *   maxScore: 封顶分
 *
 * scoreConfig (加分业务 linear):
 *   unitPrice: 每单位得分
 *   maxScore: 封顶分（null = 无上限）
 *
 * targetByRole: 各角色月度任务目标数
 *   manager: 客户经理
 *   lobby_manager: 大堂经理
 *   elastic_counter: 弹性柜面
 *   counter_manager: 柜面经理
 */

const REQUIRED_TASKS = [
  {
    _id: 'pf_task_fund_valid',
    taskId: 'fund_valid',
    taskName: '基金有效户',
    category: 'required',
    unit: '户',
    description: '基金有效客户数',
    scoreConfig: { type: 'benchmark', weightScore: 10, maxScore: 20 },
    targetByRole: {
      manager: 12,
      lobby_manager: 15,
      elastic_counter: 15,
      counter_manager: 10
    },
    applicableRoles: ['manager', 'lobby_manager', 'elastic_counter', 'counter_manager'],
    isActive: true,
    sortOrder: 1,
    createdBy: 'system',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    _id: 'pf_task_bind_card',
    taskId: 'bind_card',
    taskName: '借记卡绑卡',
    category: 'required',
    unit: '万',
    description: '借记卡绑卡金额',
    scoreConfig: { type: 'benchmark', weightScore: 10, maxScore: 20 },
    targetByRole: {
      manager: 85,
      lobby_manager: 100,
      elastic_counter: 75,
      counter_manager: 55
    },
    applicableRoles: ['manager', 'lobby_manager', 'elastic_counter', 'counter_manager'],
    isActive: true,
    sortOrder: 2,
    createdBy: 'system',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    _id: 'pf_task_insurance',
    taskId: 'insurance',
    taskName: '期交保险',
    category: 'required',
    unit: '万',
    description: '期交保险销量',
    scoreConfig: { type: 'benchmark', weightScore: 20, maxScore: 40 },
    targetByRole: {
      manager: 13,
      lobby_manager: 18,
      elastic_counter: 11,
      counter_manager: 11
    },
    applicableRoles: ['manager', 'lobby_manager', 'elastic_counter', 'counter_manager'],
    isActive: true,
    sortOrder: 3,
    createdBy: 'system',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    _id: 'pf_task_pension_account',
    taskId: 'pension_account',
    taskName: '个人养老金开户',
    category: 'required',
    unit: '户',
    description: '个人养老金账户开立',
    scoreConfig: { type: 'benchmark', weightScore: 10, maxScore: 20 },
    targetByRole: {
      manager: 20,
      lobby_manager: 35,
      elastic_counter: 20,
      counter_manager: 10
    },
    applicableRoles: ['manager', 'lobby_manager', 'elastic_counter', 'counter_manager'],
    isActive: true,
    sortOrder: 4,
    createdBy: 'system',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    _id: 'pf_task_merchant',
    taskId: 'merchant',
    taskName: '折效收单商户',
    category: 'required',
    unit: '户',
    description: '折效收单商户数',
    scoreConfig: { type: 'benchmark', weightScore: 10, maxScore: 20 },
    targetByRole: {
      manager: 4,
      lobby_manager: 4,
      elastic_counter: 2,
      counter_manager: 1
    },
    applicableRoles: ['manager', 'lobby_manager', 'elastic_counter', 'counter_manager'],
    isActive: true,
    sortOrder: 5,
    createdBy: 'system',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    _id: 'pf_task_credit_installment',
    taskId: 'credit_installment',
    taskName: '信用卡分期',
    category: 'required',
    unit: '元',
    description: '信用卡分期（家装、乐分易1:2折算）',
    scoreConfig: { type: 'benchmark', weightScore: 15, maxScore: 20 },
    targetByRole: {
      manager: 33,
      lobby_manager: 50,
      elastic_counter: 40,
      counter_manager: 20
    },
    applicableRoles: ['manager', 'lobby_manager', 'elastic_counter', 'counter_manager'],
    isActive: true,
    sortOrder: 6,
    createdBy: 'system',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    _id: 'pf_task_credit_new_active',
    taskId: 'credit_new_active',
    taskName: '信用卡新增激活',
    category: 'required',
    unit: '户',
    description: '信用卡新增激活有效客户数（系统数据）',
    scoreConfig: { type: 'benchmark', weightScore: 10, maxScore: 15 },
    targetByRole: {
      manager: 8,
      lobby_manager: 10,
      elastic_counter: 8,
      counter_manager: 5
    },
    applicableRoles: ['manager', 'lobby_manager', 'elastic_counter', 'counter_manager'],
    isActive: true,
    sortOrder: 7,
    createdBy: 'system',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    _id: 'pf_task_wechat_welfare',
    taskId: 'wechat_welfare',
    taskName: '企微福利官',
    category: 'required',
    unit: '户',
    description: '企微福利官开通',
    scoreConfig: { type: 'benchmark', weightScore: 5, maxScore: 7.5 },
    targetByRole: {
      manager: 25,
      lobby_manager: 35,
      elastic_counter: 30,
      counter_manager: 20
    },
    applicableRoles: ['manager', 'lobby_manager', 'elastic_counter', 'counter_manager'],
    isActive: true,
    sortOrder: 8,
    createdBy: 'system',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

// 加分业务 - 四个组设置相同，封顶40分
const BONUS_TASKS = [
  {
    _id: 'pf_task_payroll',
    taskId: 'payroll',
    taskName: '代发工资拓户',
    category: 'bonus',
    unit: '户',
    description: '每代发10户得5分',
    scoreConfig: { type: 'linear', unitPrice: 0.5, maxScore: null },
    applicableRoles: ['manager', 'lobby_manager', 'elastic_counter', 'counter_manager'],
    isActive: true,
    sortOrder: 1,
    createdBy: 'system',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    _id: 'pf_task_new_fund',
    taskId: 'new_fund',
    taskName: '新发基金',
    category: 'bonus',
    unit: '万',
    description: '按单支基金下达任务，单支封顶5分，新发未破零扣2分',
    scoreConfig: { type: 'linear', unitPrice: 1.0, maxScore: 5 },
    applicableRoles: ['manager', 'lobby_manager', 'elastic_counter', 'counter_manager'],
    isActive: true,
    sortOrder: 2,
    createdBy: 'system',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    _id: 'pf_task_precious_metal',
    taskId: 'precious_metal',
    taskName: '贵金属',
    category: 'bonus',
    unit: '克',
    description: '0.1分/10克',
    scoreConfig: { type: 'linear', unitPrice: 0.01, maxScore: null },
    applicableRoles: ['manager', 'lobby_manager', 'elastic_counter', 'counter_manager'],
    isActive: true,
    sortOrder: 3,
    createdBy: 'system',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    _id: 'pf_task_smart_customer',
    taskId: 'smart_customer',
    taskName: '智慧客',
    category: 'bonus',
    unit: '户',
    description: '0.5分/户，封顶2分',
    scoreConfig: { type: 'linear', unitPrice: 0.5, maxScore: 2 },
    applicableRoles: ['manager', 'lobby_manager', 'elastic_counter', 'counter_manager'],
    isActive: true,
    sortOrder: 4,
    createdBy: 'system',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    _id: 'pf_task_internet_merchant',
    taskId: 'internet_merchant',
    taskName: '互联网场景商户',
    category: 'bonus',
    unit: '户',
    description: '含薪资管家，1分/户，封顶2分',
    scoreConfig: { type: 'linear', unitPrice: 1.0, maxScore: 2 },
    applicableRoles: ['manager', 'lobby_manager', 'elastic_counter', 'counter_manager'],
    isActive: true,
    sortOrder: 5,
    createdBy: 'system',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    _id: 'pf_task_credit_screen',
    taskId: 'credit_screen',
    taskName: '信用卡弹屏率',
    category: 'bonus',
    unit: '%',
    description: '2分/10%，系统提取',
    scoreConfig: { type: 'linear', unitPrice: 0.2, maxScore: null },
    applicableRoles: ['manager', 'lobby_manager', 'elastic_counter', 'counter_manager'],
    isActive: true,
    sortOrder: 6,
    createdBy: 'system',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    _id: 'pf_task_insurance_dual_record',
    taskId: 'insurance_dual_record',
    taskName: '保险双录',
    category: 'bonus',
    unit: '笔',
    description: '非本网点保险双录，配合双录1笔加1分，封顶5分',
    scoreConfig: { type: 'linear', unitPrice: 1.0, maxScore: 5 },
    applicableRoles: ['manager', 'lobby_manager', 'elastic_counter', 'counter_manager'],
    isActive: true,
    sortOrder: 7,
    createdBy: 'system',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    _id: 'pf_task_new_customer',
    taskId: 'new_customer',
    taskName: '拉新',
    category: 'bonus',
    unit: '户',
    description: '拉新客户，封顶3分',
    scoreConfig: { type: 'linear', unitPrice: 1.0, maxScore: 3 },
    applicableRoles: ['manager', 'lobby_manager', 'elastic_counter', 'counter_manager'],
    isActive: true,
    sortOrder: 8,
    createdBy: 'system',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    _id: 'pf_task_active_customer',
    taskId: 'active_customer',
    taskName: '促活',
    category: 'bonus',
    unit: '户',
    description: '客户促活，封顶3分',
    scoreConfig: { type: 'linear', unitPrice: 1.0, maxScore: 3 },
    applicableRoles: ['manager', 'lobby_manager', 'elastic_counter', 'counter_manager'],
    isActive: true,
    sortOrder: 9,
    createdBy: 'system',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    _id: 'pf_task_certificate',
    taskId: 'certificate',
    taskName: '基金/保险持证',
    category: 'bonus',
    unit: '个',
    description: '基金、保险持证，5分',
    scoreConfig: { type: 'fixed', fixedScore: 5, maxScore: 5 },
    applicableRoles: ['manager', 'lobby_manager', 'elastic_counter', 'counter_manager'],
    isActive: true,
    sortOrder: 10,
    createdBy: 'system',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    _id: 'pf_task_execution',
    taskId: 'execution',
    taskName: '执行力',
    category: 'bonus',
    unit: '分',
    description: '执行力得分，封顶6分',
    scoreConfig: { type: 'linear', unitPrice: 1.0, maxScore: 6 },
    applicableRoles: ['manager', 'lobby_manager', 'elastic_counter', 'counter_manager'],
    isActive: true,
    sortOrder: 11,
    createdBy: 'system',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

const DEFAULT_PF_TASKS = [...REQUIRED_TASKS, ...BONUS_TASKS];

module.exports = {
  REQUIRED_TASKS,
  BONUS_TASKS,
  DEFAULT_PF_TASKS
};
