import { getCurrentQuarter, CURRENT_QUARTER, DEFAULT_BRANCHES, SCORING_RULES } from '../constants.js';
import * as PermissionService from './permission-service.js';

const API_NAME = 'appService';
const STORAGE_KEYS = {
  CURRENT_USER: 'perf_current_user'
};

const DEFAULT_RULE_DESCRIPTION_SECTIONS = [
  {
    id: 'personal',
    title: '个贷条线',
    items: [
      '抵押类：新增3分/笔，每100万1分；存量1.5分/笔',
      '信用类：1分/笔，每100万1分'
    ]
  },
  {
    id: 'micro',
    title: '小微条线',
    items: [
      '抵押类：新增3分/笔，每100万1分；转贷1.5分/笔',
      '信用类：新增1分/笔，每100万1分；转贷0.5分/笔',
      '线下业务：新增9分/笔，每100万1分；转贷4.5分/笔'
    ]
  }
];

const cloneRuleDescriptionSections = (sections = DEFAULT_RULE_DESCRIPTION_SECTIONS) =>
  (Array.isArray(sections) ? sections : DEFAULT_RULE_DESCRIPTION_SECTIONS).map(section => ({
    id: section.id,
    title: section.title,
    items: Array.isArray(section.items) ? [...section.items] : []
  }));

const normalizeRuleDescriptionSections = sections => {
  const list = Array.isArray(sections) ? sections : [];
  const normalized = list
    .map((section, index) => {
      const items = Array.isArray(section.items)
        ? section.items
        : typeof section.items === 'string'
          ? section.items.split('\n')
          : [];
      const cleanItems = items.map(item => (item || '').toString().trim()).filter(Boolean);
      return {
        id: section.id || `rule_desc_${Date.now()}_${index}`,
        title: (section.title || '').toString().trim() || `说明${index + 1}`,
        items: cleanItems
      };
    })
    .filter(section => section.items.length);
  return normalized.length ? normalized : cloneRuleDescriptionSections();
};

const createDefaultSettings = () => ({
  allowEditSubmission: true,
  ruleDescriptionSections: cloneRuleDescriptionSections(),
  currentQuarter: getCurrentQuarter()
});

const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存有效期

const createInitialState = () => ({
  initialized: false,
  currentQuarter: getCurrentQuarter(),
  users: [],
  branches: [...DEFAULT_BRANCHES],
  rules: [...SCORING_RULES],
  submissions: [],
  roles: [],
  settings: createDefaultSettings(),
  cacheTimestamp: 0 // 缓存时间戳
});

const state = createInitialState();

// 缓存计算结果
const calculateCache = new Map();

// 全局标志，用于标记是否需要刷新数据
let needRefresh = false;

const getStorage = key => {
  try {
    const raw = uni.getStorageSync(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('读取本地缓存失败', error);
    return null;
  }
};

const setStorage = (key, value) => {
  try {
    if (value === null || value === undefined) {
      uni.removeStorageSync(key);
      return;
    }
    uni.setStorageSync(key, JSON.stringify(value));
  } catch (error) {
    console.warn('写入本地缓存失败', error);
  }
};

const normalizeUser = user => {
  if (!user) return null;
  const id = user.id || user._id || '';
  const clone = { ...user, id };
  delete clone._id;
  delete clone.password;
  return clone;
};

const normalizeBranch = branch => ({
  id: branch.id || branch._id || '',
  name: branch.name || ''
});

const normalizeRule = rule => {
  if (!rule) return null;
  const id = rule.id || rule._id || '';
  const normalized = { 
    ...rule, 
    id,
    hidden: !!rule.hidden
  };
  delete normalized._id;
  return normalized;
};

const normalizeSubmission = submission => {
  if (!submission) return null;
  const id = submission.id || submission._id || '';
  const count = Number(submission.count) || 0;
  const amount = Number(submission.amount) || 0;
  const type = submission.type === 'stock' ? 'stock' : 'new';
  
  // 计算季度：优先使用submission.quarter，否则从timestamp计算，最后使用当前季度
  let quarter = submission.quarter;
  if (!quarter && submission.timestamp) {
    const date = new Date(submission.timestamp);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    quarter = `${year}Q${Math.ceil(month / 3)}`;
  }
  if (!quarter) {
    quarter = state.currentQuarter;
  }
  
  const normalized = {
    ...submission,
    id,
    count,
    amount,
    type,
    quarter
  };
  delete normalized._id;
  return normalized;
};

const mergeSettings = settings => ({
  ...createDefaultSettings(),
  ...(settings || {}),
  ruleDescriptionSections: cloneRuleDescriptionSections(
    settings?.ruleDescriptionSections || DEFAULT_RULE_DESCRIPTION_SECTIONS
  )
});

const callApi = async (action, payload = {}) => {
  if (!uniCloud) throw new Error('uniCloud 未初始化');
  const { result } = await uniCloud.callFunction({
    name: API_NAME,
    data: { action, payload }
  });
  if (!result) throw new Error('云函数无响应');
  if (result.error) throw new Error(result.error);
  return result.data;
};

const applyBootstrap = data => {
  state.users = (data?.users || []).map(normalizeUser).filter(Boolean);
  state.branches = (data?.branches || DEFAULT_BRANCHES).map(normalizeBranch);
  state.rules = (data?.rules || SCORING_RULES).map(normalizeRule).filter(Boolean);
  state.submissions = (data?.submissions || []).map(normalizeSubmission).filter(Boolean);
  state.roles = data?.roles || [];
  state.settings = mergeSettings(data?.settings);
  // 总是使用动态计算的当前季度，确保季度会随时间自动变化
  const dynamicQuarter = getCurrentQuarter();
  state.currentQuarter = dynamicQuarter;
  // 更新settings中的currentQuarter，确保数据一致
  state.settings.currentQuarter = dynamicQuarter;

  // Update current user cache from fresh data
  const currentUser = getStorage(STORAGE_KEYS.CURRENT_USER);
  if (currentUser && currentUser.id) {
    const updatedUser = state.users.find(u => u.id === currentUser.id);
    if (updatedUser) {
      setStorage(STORAGE_KEYS.CURRENT_USER, updatedUser);
      console.log('[StoreService] Current user updated:', updatedUser.role);
    }
  }

  state.initialized = true;
};

const sumSubmissionScore = (submission, rules) => {
  const rule = rules.find(item => item.id === submission.ruleId);
  if (!rule) return 0;
  const config = submission.type === 'stock' ? rule.pointsStock : rule.pointsNew;
  const itemPoints = (config?.item || 0) * submission.count;
  const amountPoints = (config?.million || 0) * (submission.amount / 100);
  return Number((itemPoints + amountPoints).toFixed(2));
};

export const StoreService = {
  state,
  _bootstrapPromise: null,

  async bootstrap(options = { force: false }) {
    const force = !!options?.force;
    // 检查缓存是否有效（5分钟内）
    const isCacheValid = state.initialized && !force && Date.now() - state.cacheTimestamp < CACHE_DURATION;
    if (isCacheValid) return state;
    if (this._bootstrapPromise && !force) return this._bootstrapPromise;
    
    const task = (async () => {
      const data = await callApi('bootstrap');
      applyBootstrap(data);
      state.cacheTimestamp = Date.now(); // 更新缓存时间戳
      return state;
    })();
    
    if (force) {
      await task;
      return state;
    }
    
    this._bootstrapPromise = task
      .catch(error => {
        console.error('Bootstrap failed', error);
        throw error;
      })
      .finally(() => {
        this._bootstrapPromise = null;
      });
    
    return this._bootstrapPromise;
  },

  async ensureReady() {
    if (state.initialized) {
      await this.ensureFreshData(); // 检查并获取最新数据
      return state;
    }
    return this.bootstrap();
  },

  getCurrentUser() {
    const user = getStorage(STORAGE_KEYS.CURRENT_USER);
    // 游客模式：未登录时返回游客对象
    if (!user) {
      return { id: 'guest', name: '游客', role: 'guest', status: 'active' };
    }
    return user;
  },

  /**
   * 强制刷新当前用户信息（从数据库获取最新数据）
   * 用于用户角色被修改后立即更新本地缓存
   */
  async refreshCurrentUser() {
    const currentUser = this.getCurrentUser();
    if (!currentUser || !currentUser.id) {
      return currentUser;
    }

    // 从数据库重新获取所有用户数据
    await this.bootstrap({ force: true });

    // 返回更新后的当前用户
    return this.getCurrentUser();
  },

  setCurrentUser(user) {
    const normalized = normalizeUser(user);
    setStorage(STORAGE_KEYS.CURRENT_USER, normalized);
    return normalized;
  },

  logout() {
    setStorage(STORAGE_KEYS.CURRENT_USER, null);
  },

  /**
   * 重新加载当前用户信息
   * 相当于 refreshCurrentUser 的同步版本
   */
  reloadCurrentUser() {
    const currentUser = this.getCurrentUser();
    if (!currentUser || !currentUser.id) {
      return currentUser;
    }

    // 从本地 state 中查找最新用户数据
    const updatedUser = state.users.find(u => u.id === currentUser.id);
    if (updatedUser) {
      setStorage(STORAGE_KEYS.CURRENT_USER, updatedUser);
      console.log('[StoreService] Current user reloaded:', updatedUser.role);
      return updatedUser;
    }

    return currentUser;
  },

  isLoggedIn() {
    const user = getStorage(STORAGE_KEYS.CURRENT_USER);
    return !!user && user.id !== 'guest';
  },

  getCurrentQuarter() {
    // 总是返回动态计算的当前季度，确保季度会随时间自动变化
    const dynamicQuarter = getCurrentQuarter();
    // 更新state中的currentQuarter，确保内部状态一致
    state.currentQuarter = dynamicQuarter;
    // 如果settings中没有设置currentQuarter或设置的季度已过期，也更新settings
    if (!state.settings.currentQuarter || state.settings.currentQuarter !== dynamicQuarter) {
      state.settings.currentQuarter = dynamicQuarter;
    }
    return dynamicQuarter;
  },

  getUsers() {
    return state.users;
  },

  getBranches() {
    return state.branches;
  },

  getRules() {
    return state.rules;
  },

  getSubmissions() {
    return state.submissions;
  },

  getRoles() {
    return state.roles;
  },

  getRoleName(roleCode) {
    if (!roleCode) return '';
    const role = state.roles.find(r => r.roleCode === roleCode);
    return role ? role.roleName : roleCode;
  },

  getSettings() {
    return state.settings;
  },

  getRuleDescriptionSections() {
    return cloneRuleDescriptionSections(state.settings.ruleDescriptionSections);
  },

  async loginWithPassword(phone, password) {
    if (!phone || !password) throw new Error('请输入账号和密码');
    const result = await callApi('loginWithPassword', { phone, password });
    console.log('callApi 返回:', result);

    // 兼容两种返回格式：{ user, isDefaultPassword } 或直接返回 user 对象
    const user = result.user || result;
    const isDefaultPassword = result.isDefaultPassword || password === '123456';

    const normalized = this.setCurrentUser(user);
    await this.bootstrap({ force: true });
    return { user: normalized, isDefaultPassword };
  },

  async loginWithCode(phone, code) {
    if (!phone || !code) throw new Error('请输入手机号和验证码');
    const user = await callApi('loginWithCode', { phone, code });
    const normalized = this.setCurrentUser(user);
    await this.bootstrap({ force: true });
    return normalized;
  },

  async generateSmsCode(phone) {
    if (!phone) throw new Error('请输入手机号');
    const data = await callApi('generateSmsCode', { phone });
    return data?.code;
  },

  async addUser(payload) {
    await this.ensureReady();
    const user = await callApi('addUser', payload);
    const normalized = normalizeUser(user);
    state.users.push(normalized);
    this.clearCache(); // 清除缓存
    return normalized;
  },

  async updateUser(id, updates) {
    await this.ensureReady();
    const user = await callApi('updateUser', { id, updates });
    const normalized = normalizeUser(user);
    const index = state.users.findIndex(item => item.id === normalized.id);
    if (index >= 0) {
      state.users.splice(index, 1, normalized);
    } else {
      state.users.push(normalized);
    }
    this.clearCache(); // 清除缓存
    return normalized;
  },

  async toggleUserStatus(id) {
    await this.ensureReady();
    const user = await callApi('toggleUserStatus', { id });
    const normalized = normalizeUser(user);
    const index = state.users.findIndex(item => item.id === normalized.id);
    if (index >= 0) {
      state.users.splice(index, 1, normalized);
    }
    this.clearCache(); // 清除缓存
    return normalized;
  },

  async resetPassword(id) {
    await callApi('resetPassword', { id });
    return true;
  },

  async changePassword(id, oldPassword, newPassword) {
    await callApi('changePassword', { id, oldPassword, newPassword });
    return true;
  },

  async addBranch(payload) {
    await this.ensureReady();
    const branch = await callApi('addBranch', payload);
    state.branches.push(normalizeBranch(branch));
    this.clearCache(); // 清除缓存
    return branch;
  },

  async updateBranch(id, updates) {
    await this.ensureReady();
    const branch = await callApi('updateBranch', { id, updates });
    const normalized = normalizeBranch(branch);
    const index = state.branches.findIndex(item => item.id === id || item.id === normalized.id);
    if (index >= 0) {
      state.branches.splice(index, 1, normalized);
    }
    this.clearCache();
    return normalized;
  },

  async deleteBranch(id) {
    await this.ensureReady();
    await callApi('deleteBranch', { id });
    state.branches = state.branches.filter(branch => branch.id !== id);
    this.clearCache(); // 清除缓存
    return true;
  },

  async addRule(payload) {
    await this.ensureReady();
    const rule = await callApi('addRule', payload);
    const normalized = normalizeRule(rule);
    state.rules.push(normalized);
    this.clearCache(); // 清除缓存
    return normalized;
  },

  async updateRule(id, updates) {
    await this.ensureReady();
    const rule = await callApi('updateRule', { id, updates });
    const normalized = normalizeRule(rule);
    const index = state.rules.findIndex(item => item.id === id);
    if (index >= 0) {
      state.rules.splice(index, 1, normalized);
    } else {
      state.rules.push(normalized);
    }
    this.clearCache(); // 清除缓存
    return normalized;
  },

  async deleteRule(id) {
    await this.ensureReady();
    await callApi('deleteRule', { id });
    state.rules = state.rules.filter(rule => rule.id !== id);
    this.clearCache(); // 清除缓存
    return true;
  },

  async addSubmission(payload) {
    await this.ensureReady();
    const submission = await callApi('addSubmission', {
      ...payload,
      quarter: this.getCurrentQuarter()
    });
    const normalized = normalizeSubmission(submission);
    state.submissions.push(normalized);
    this.clearCache(); // 清除缓存
    return normalized;
  },

  async updateSubmission(id, updates) {
    await this.ensureReady();
    const submission = await callApi('updateSubmission', { id, updates });
    const normalized = normalizeSubmission(submission);
    const index = state.submissions.findIndex(item => item.id === id);
    if (index >= 0) {
      state.submissions.splice(index, 1, normalized);
    }
    this.clearCache(); // 清除缓存
    return normalized;
  },

  async deleteSubmission(id) {
    await this.ensureReady();
    await callApi('deleteSubmission', { id });
    state.submissions = state.submissions.filter(sub => sub.id !== id);
    this.clearCache(); // 清除缓存
    return true;
  },

  async clearQuarterData(options = { archiveOnly: true }) {
    await callApi('clearQuarter', options);
    this.clearCache(); // 清除缓存
    await this.bootstrap({ force: true });
  },

  async switchQuarter(nextQuarter, { resetCurrent = false } = {}) {
    if (!nextQuarter) throw new Error('请选择季度');
    await callApi('switchQuarter', { nextQuarter, resetCurrent });
    this.clearCache(); // 清除缓存
    await this.bootstrap({ force: true });
  },

  async updateSettings(payload) {
    const settings = await callApi('updateSettings', payload);
    state.settings = mergeSettings(settings);
    state.currentQuarter = state.settings.currentQuarter;
    this.clearCache(); // 清除缓存
    return state.settings;
  },

  async updateRuleDescriptionSections(sections) {
    const normalized = normalizeRuleDescriptionSections(sections);
    const settings = await this.updateSettings({ ruleDescriptionSections: normalized });
    return cloneRuleDescriptionSections(settings.ruleDescriptionSections);
  },

  // 计算奖励金额
  calculateBonus(score, quarter = this.getCurrentQuarter()) {
    // 从settings中获取奖励规则配置，如果没有则使用默认值
    const allBonusRules = state.settings.bonusRules || {};
    // 获取当前季度的奖励规则，如果没有则使用默认值
    const bonusRules = allBonusRules[quarter] || {
      threshold: 30,
      baseRate: 35,
      highScoreThreshold: 100,
      highScoreRate: 45,
      penaltyType: 'rate', // 默认按扣钱率
      penaltyRate: 0, // 扣钱率，默认0
      fixedPenalty: 2000 // 固定扣钱金额，默认2000
    };
    
    let bonusAmount;
    
    if (score < bonusRules.threshold) {
      // 低于门槛，计算扣钱金额
      if (bonusRules.penaltyType === 'rate') {
        // 按扣钱率计算
        const gap = bonusRules.threshold - score;
        bonusAmount = -gap * bonusRules.penaltyRate;
      } else {
        // 按固定金额扣钱
        bonusAmount = -bonusRules.fixedPenalty;
      }
    } else if (score <= bonusRules.highScoreThreshold) {
      // 门槛到高分阈值之间，基础奖励率
      bonusAmount = score * bonusRules.baseRate;
    } else {
      // 超过高分阈值，分级奖励
      bonusAmount = bonusRules.highScoreThreshold * bonusRules.baseRate + (score - bonusRules.highScoreThreshold) * bonusRules.highScoreRate;
    }
    
    // 保留两位小数
    return Number(bonusAmount.toFixed(2));
  },

  calculateScoreForEmployee(employeeId, filterType = 'quarter', dateRange = {}) {
    let currentPeriod = this.getCurrentQuarter();
    let cacheKey = `score_${employeeId}_${currentPeriod}`;
    let submissions = [];
    let targetQuarter = currentPeriod;

    // 根据筛选类型构建缓存键和筛选条件
    if (filterType === 'month' && dateRange.start) {
      const month = dateRange.start;
      cacheKey = `score_${employeeId}_${month}`;
      // 筛选该月份的提报记录（使用本地时区）
      submissions = state.submissions.filter(sub => {
        const date = new Date(sub.timestamp);
        const year = date.getFullYear();
        const mon = String(date.getMonth() + 1).padStart(2, '0');
        const subMonth = `${year}-${mon}`;
        return sub.employeeId === employeeId && subMonth === month;
      });
      // 对于月度数据，使用当前季度的奖励规则
      targetQuarter = currentPeriod;
    } else {
      // 按季度筛选：优先使用 quarter 属性，其次使用 start 属性计算季度
      if (dateRange.quarter) {
        targetQuarter = dateRange.quarter;
      } else if (dateRange.start) {
        targetQuarter = this.getQuarterFromDateRange(dateRange);
      } else {
        targetQuarter = currentPeriod;
      }
      cacheKey = `score_${employeeId}_${targetQuarter}`;
      submissions = state.submissions.filter(
        sub => sub.employeeId === employeeId && sub.quarter === targetQuarter
      );
    }
    
    // 检查缓存
    if (calculateCache.has(cacheKey)) {
      return calculateCache.get(cacheKey);
    }
    
    const result = {
      totalScore: 0,
      personalScore: 0,
      microScore: 0,
      bonusAmount: 0,
      count: 0,
      amount: 0
    };
    submissions.forEach(sub => {
      const score = sumSubmissionScore(sub, state.rules);
      result.totalScore += score;
      result.count += Number(sub.count) || 0;
      result.amount += Number(sub.amount) || 0;
      const rule = state.rules.find(item => item.id === sub.ruleId);
      if (rule?.category === 'personal') result.personalScore += score;
      if (rule?.category === 'micro') result.microScore += score;
    });
    result.totalScore = Number(result.totalScore.toFixed(2));
    result.personalScore = Number(result.personalScore.toFixed(2));
    result.microScore = Number(result.microScore.toFixed(2));
    // 计算奖励金额，传入当前周期作为季度参数
    result.bonusAmount = this.calculateBonus(result.totalScore, targetQuarter);
    
    // 保存缓存
    calculateCache.set(cacheKey, result);
    return result;
  },

  getEmployeeBreakdown(employeeId, selectedQuarter = this.getCurrentQuarter()) {
    const quarter = selectedQuarter;
    const cacheKey = `breakdown_${employeeId}_${quarter}`;
    
    // 检查缓存
    if (calculateCache.has(cacheKey)) {
      return calculateCache.get(cacheKey);
    }
    
    const result = {};
    state.rules.forEach(rule => {
      result[rule.id] = {
        new: { count: 0, amount: 0 },
        stock: { count: 0, amount: 0 },
        total: { count: 0, amount: 0 }
      };
    });
    state.submissions
      .filter(sub => sub.employeeId === employeeId && sub.quarter === quarter)
      .forEach(sub => {
        const bucket = result[sub.ruleId];
        if (!bucket) return;
        const typeKey = sub.type === 'stock' ? 'stock' : 'new';
        bucket[typeKey].count += Number(sub.count) || 0;
        bucket[typeKey].amount += Number(sub.amount) || 0;
        bucket.total.count += Number(sub.count) || 0;
        bucket.total.amount += Number(sub.amount) || 0;
      });
    
    // 保存缓存
    calculateCache.set(cacheKey, result);
    return result;
  },

  getLeaderboard(filterType = 'quarter', dateRange = {}) {
    let quarter = this.getCurrentQuarter();
    let cacheKey = `leaderboard_${quarter}`;

    // 根据筛选类型构建缓存键
    if (filterType === 'month' && dateRange.start) {
      const month = dateRange.start;
      cacheKey = `leaderboard_${month}`;
    } else if (filterType === 'quarter') {
      // 按季度筛选：优先使用 quarter 属性，其次使用 start 属性计算季度
      if (dateRange.quarter) {
        quarter = dateRange.quarter;
      } else if (dateRange.start) {
        quarter = this.getQuarterFromDateRange(dateRange);
      }
      cacheKey = `leaderboard_${quarter}`;
    }
    
    // 检查缓存
    if (calculateCache.has(cacheKey)) {
      return calculateCache.get(cacheKey);
    }
    
    // 业务统计只包含活跃的客户经理
    const users = state.users.filter(user => user.role === 'manager' && user.status === 'active');
    const result = users
      .map(user => {
        const stats = this.calculateScoreForEmployee(user.id, filterType, dateRange);
        return {
          employeeId: user.id,
          name: user.name,
          branch: user.branchName || user.branch,
          totalScore: stats.totalScore,
          personalScore: stats.personalScore,
          microScore: stats.microScore,
          bonusAmount: stats.bonusAmount
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore || a.name.localeCompare(b.name))
      .map((item, index) => ({ ...item, rank: index + 1 }));
    
    // 保存缓存
    calculateCache.set(cacheKey, result);
    return result;
  },

  getOverviewTable(selectedQuarter = this.getCurrentQuarter()) {
    const quarter = selectedQuarter;
    const cacheKey = `overview_${quarter}`;

    // 检查缓存
    if (calculateCache.has(cacheKey)) {
      return calculateCache.get(cacheKey);
    }

    // 业务统计只包含活跃的客户经理
    const users = state.users.filter(user => user.role === 'manager' && user.status === 'active');
    const result = users.map(user => ({
      employee: user,
      stats: this.calculateScoreForEmployee(user.id, 'quarter', { quarter: quarter }),
      breakdown: this.getEmployeeBreakdown(user.id, quarter)
    }));

    // 保存缓存
    calculateCache.set(cacheKey, result);
    return result;
  },
  
  // 清除缓存方法
  clearCache() {
    calculateCache.clear();
    state.cacheTimestamp = 0;
    needRefresh = true; // 标记需要刷新数据
  },
  
  // 根据日期范围或季度字符串计算季度
  getQuarterFromDateRange(dateRange) {
    if (!dateRange) return this.getCurrentQuarter();

    // 优先使用 quarter 属性
    if (dateRange.quarter) {
      return dateRange.quarter;
    }

    // 其次使用 start 属性
    if (!dateRange.start) return this.getCurrentQuarter();

    // 如果dateRange.start已经是季度格式（如2025Q4），直接返回
    if (dateRange.start.includes('Q')) {
      return dateRange.start;
    }
    
    // 否则从日期字符串计算季度
    const [year, month] = dateRange.start.split('-').map(Number);
    const quarter = Math.ceil(month / 3);
    return `${year}Q${quarter}`;
  },
  
  // 确保获取最新数据
  async ensureFreshData() {
    if (needRefresh || Date.now() - state.cacheTimestamp > 30000) { // 30秒自动刷新
      await this.bootstrap({ force: true });
      needRefresh = false;
    }
  },

  // ========== 权限管理方法 ==========

  /**
   * 检查当前用户是否有指定权限
   * @param {String} permission - 权限标识
   * @param {String} resourceId - 资源ID（可选）
   * @returns {Boolean}
   */
  hasPermission(permission, resourceId = null) {
    const user = this.getCurrentUser();
    return PermissionService.hasPermission(user, permission, resourceId);
  },

  /**
   * 检查当前用户是否可以访问指定菜单
   * @param {String} menuId - 菜单ID
   * @returns {Boolean}
   */
  canAccessMenu(menuId) {
    const user = this.getCurrentUser();
    return PermissionService.canAccessMenu(user, menuId);
  },

  /**
   * 获取当前用户可访问的菜单列表
   * @returns {Array} 菜单ID数组
   */
  getUserMenus() {
    const user = this.getCurrentUser();
    return PermissionService.getUserMenus(user);
  },

  /**
   * 检查当前用户是否有指定角色
   * @param {String} roleCode - 角色代码
   * @returns {Boolean}
   */
  hasRole(roleCode) {
    const user = this.getCurrentUser();
    return PermissionService.hasRole(user, roleCode);
  },

  /**
   * 检查当前用户是否有任一指定角色
   * @param {Array<String>} roleCodes - 角色代码数组
   * @returns {Boolean}
   */
  hasAnyRole(roleCodes) {
    const user = this.getCurrentUser();
    return PermissionService.hasAnyRole(user, roleCodes);
  },

  /**
   * 根据数据权限过滤数据
   * @param {Array} dataList - 数据列表
   * @param {String} userField - 用户字段名
   * @returns {Array} 过滤后的数据
   */
  filterDataByScope(dataList, userField = 'userId') {
    const user = this.getCurrentUser();
    return PermissionService.filterDataByScope(user, dataList, userField);
  },

  /**
   * 获取当前用户的角色显示名称
   * @returns {String} 角色显示名称
   */
  getUserRoleNames() {
    const user = this.getCurrentUser();
    return PermissionService.getUserRoleNames(user);
  },

  /**
   * 验证当前用户是否可以访问拓展业务模块
   * @returns {Boolean}
   */
  canAccessCreditBusiness() {
    const user = this.getCurrentUser();
    return PermissionService.canAccessCreditBusiness(user);
  },

  /**
   * 验证当前用户是否可以访问个贷业务模块
   * @returns {Boolean}
   */
  canAccessLegacyBusiness() {
    const user = this.getCurrentUser();
    return PermissionService.canAccessLegacyBusiness(user);
  },

  /**
   * 获取用户的默认页面
   * @returns {String} 页面路径
   */
  getUserDefaultPage() {
    const user = this.getCurrentUser();
    return PermissionService.getUserDefaultPage(user);
  },

  /**
   * 为用户分配角色
   * @param {String} userId - 用户ID
   * @param {Array<String>} roles - 角色数组
   * @returns {Promise}
   */
  async assignUserRoles(userId, roles) {
    if (!this.isAdmin()) {
      throw new Error('只有管理员可以分配角色');
    }

    const { result } = await uniCloud.callFunction({
      name: API_NAME,
      data: {
        action: 'assignUserRoles',
        payload: { userId, roles }
      }
    });

    if (result.error) throw new Error(result.error);

    // 更新本地状态
    await this.bootstrap({ force: true });
    return result.data;
  },

  /**
   * 批量分配角色
   * @param {Array<String>} userIds - 用户ID数组
   * @param {String} role - 角色代码
   * @returns {Promise}
   */
  async batchAssignRoles(userIds, role) {
    if (!this.isAdmin()) {
      throw new Error('只有管理员可以批量分配角色');
    }

    const { result } = await uniCloud.callFunction({
      name: API_NAME,
      data: {
        action: 'batchAssignRoles',
        payload: { userIds, role }
      }
    });

    if (result.error) throw new Error(result.error);

    // 更新本地状态
    await this.bootstrap({ force: true });
    return result.data;
  },

  /**
   * 从云端拉取所有角色定义（用于角色管理页面）
   * @returns {Array} 角色定义数组
   */
  async fetchRoles() {
    const { result } = await uniCloud.callFunction({
      name: API_NAME,
      data: {
        action: 'getRoles'
      }
    });

    if (result.error) throw new Error(result.error);
    return result.data;
  },

  /**
   * 创建角色（仅超级管理员）
   * @param {Object} payload - 角色数据
   * @returns {Promise}
   */
  async createRole(payload) {
    if (!this.isSuperAdmin()) {
      throw new Error('只有超级管理员可以创建角色');
    }

    const { result } = await uniCloud.callFunction({
      name: API_NAME,
      data: {
        action: 'createRole',
        payload
      }
    });

    if (result.error) throw new Error(result.error);
    return result.data;
  },

  /**
   * 更新角色权限（仅超级管理员）
   * @param {String} roleCode - 角色代码
   * @param {Object} permissions - 权限配置
   * @returns {Promise}
   */
  async updateRolePermissions(roleCode, permissions) {
    if (!this.isSuperAdmin()) {
      throw new Error('只有超级管理员可以更新角色权限');
    }

    const { result } = await uniCloud.callFunction({
      name: API_NAME,
      data: {
        action: 'updateRolePermissions',
        payload: { roleCode, permissions }
      }
    });

    if (result.error) throw new Error(result.error);
    return result.data;
  },

  /**
   * 检查当前用户是否为超级管理员
   * @returns {Boolean}
   */
  isSuperAdmin() {
    return this.hasRole('super_admin');
  },

  /**
   * 检查当前用户是否为管理员（包括所有类型的admin）
   * @returns {Boolean}
   */
  isAdmin() {
    return this.hasAnyRole(['super_admin', 'admin', 'credit_admin', 'questionnaire_admin', 'knowledge_admin']);
  }
};

StoreService.bootstrap().catch(() => {});

