import { CURRENT_QUARTER, DEFAULT_BRANCHES, SCORING_RULES } from '../constants.js';

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
  currentQuarter: CURRENT_QUARTER
});

const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存有效期

const createInitialState = () => ({
  initialized: false,
  currentQuarter: CURRENT_QUARTER,
  users: [],
  branches: [...DEFAULT_BRANCHES],
  rules: [...SCORING_RULES],
  submissions: [],
  settings: createDefaultSettings(),
  cacheTimestamp: 0 // 缓存时间戳
});

const state = createInitialState();

// 缓存计算结果
const calculateCache = new Map();

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
  const normalized = { ...rule, id };
  delete normalized._id;
  return normalized;
};

const normalizeSubmission = submission => {
  if (!submission) return null;
  const id = submission.id || submission._id || '';
  const count = Number(submission.count) || 0;
  const amount = Number(submission.amount) || 0;
  const type = submission.type === 'stock' ? 'stock' : 'new';
  const normalized = {
    ...submission,
    id,
    count,
    amount,
    type,
    quarter: submission.quarter || state.currentQuarter
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
  state.settings = mergeSettings(data?.settings);
  state.currentQuarter =
    state.settings.currentQuarter || data?.currentQuarter || CURRENT_QUARTER;
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
    if (state.initialized) return state;
    return this.bootstrap();
  },

  getCurrentUser() {
    return getStorage(STORAGE_KEYS.CURRENT_USER);
  },

  setCurrentUser(user) {
    const normalized = normalizeUser(user);
    setStorage(STORAGE_KEYS.CURRENT_USER, normalized);
    return normalized;
  },

  logout() {
    setStorage(STORAGE_KEYS.CURRENT_USER, null);
  },

  getCurrentQuarter() {
    return state.settings.currentQuarter || state.currentQuarter || CURRENT_QUARTER;
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

  getSettings() {
    return state.settings;
  },

  getRuleDescriptionSections() {
    return cloneRuleDescriptionSections(state.settings.ruleDescriptionSections);
  },

  async loginWithPassword(phone, password) {
    if (!phone || !password) throw new Error('请输入账号和密码');
    const user = await callApi('loginWithPassword', { phone, password });
    const normalized = this.setCurrentUser(user);
    await this.bootstrap({ force: true });
    return normalized;
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
    const original = state.branches.find(branch => branch.id === id);
    const branch = await callApi('updateBranch', { id, updates });
    const normalized = normalizeBranch(branch);
    const index = state.branches.findIndex(item => item.id === id || item.id === normalized.id);
    if (index >= 0) {
      state.branches.splice(index, 1, normalized);
    }
    if (original && original.name !== normalized.name) {
      state.users = state.users.map(user =>
        user.branch === original.name ? { ...user, branch: normalized.name } : user
      );
    }
    this.clearCache(); // 清除缓存
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

  calculateScoreForEmployee(employeeId) {
    const quarter = this.getCurrentQuarter();
    const cacheKey = `score_${employeeId}_${quarter}`;
    
    // 检查缓存
    if (calculateCache.has(cacheKey)) {
      return calculateCache.get(cacheKey);
    }
    
    const submissions = state.submissions.filter(
      sub => sub.employeeId === employeeId && sub.quarter === quarter
    );
    const result = {
      totalScore: 0,
      personalScore: 0,
      microScore: 0,
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
    
    // 保存缓存
    calculateCache.set(cacheKey, result);
    return result;
  },

  getEmployeeBreakdown(employeeId) {
    const quarter = this.getCurrentQuarter();
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

  getLeaderboard() {
    const quarter = this.getCurrentQuarter();
    const cacheKey = `leaderboard_${quarter}`;
    
    // 检查缓存
    if (calculateCache.has(cacheKey)) {
      return calculateCache.get(cacheKey);
    }
    
    const users = state.users.filter(user => user.role !== 'admin');
    const result = users
      .map(user => {
        const stats = this.calculateScoreForEmployee(user.id);
        return {
          employeeId: user.id,
          name: user.name,
          branch: user.branch,
          totalScore: stats.totalScore,
          personalScore: stats.personalScore,
          microScore: stats.microScore
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore || a.name.localeCompare(b.name))
      .map((item, index) => ({ ...item, rank: index + 1 }));
    
    // 保存缓存
    calculateCache.set(cacheKey, result);
    return result;
  },

  getOverviewTable() {
    const quarter = this.getCurrentQuarter();
    const cacheKey = `overview_${quarter}`;
    
    // 检查缓存
    if (calculateCache.has(cacheKey)) {
      return calculateCache.get(cacheKey);
    }
    
    const users = state.users.filter(user => user.role !== 'admin');
    const result = users.map(user => ({
      employee: user,
      stats: this.calculateScoreForEmployee(user.id),
      breakdown: this.getEmployeeBreakdown(user.id)
    }));
    
    // 保存缓存
    calculateCache.set(cacheKey, result);
    return result;
  },
  
  // 清除缓存方法
  clearCache() {
    calculateCache.clear();
    state.cacheTimestamp = 0;
  }
};

StoreService.bootstrap().catch(() => {});

