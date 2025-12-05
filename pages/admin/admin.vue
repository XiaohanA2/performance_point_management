<template>
  <view class="admin-page">
    <view class="admin-header">
      <view class="admin-info">
        <text class="admin-title">后台管理</text>
        <text class="admin-subtitle">第 {{ currentQuarter }} 季度 </text>
        <text class="admin-subtitle"> {{ overviewData.length }} 名客户经理</text>
      </view>
      <view class="header-actions">
        <button class="action-chip" @click="handleExport">导出 Excel</button>
        <button class="action-chip danger" @click="handleReset">清空本季度</button>
        <button class="action-chip" @click="gotoProfile">账号设置</button>
        <button class="action-chip" @click="handleLogout">退出登录</button>
      </view>
    </view>

    <view class="admin-tabs">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="admin-tab"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </view>
    </view>

    <scroll-view scroll-y class="admin-content">
      <view v-if="activeTab === 'overview'" class="tab-panel">
        <view class="panel-header">
          <text class="panel-title">业绩汇总</text>
          <input
            class="search-input"
            placeholder="搜索姓名/支行"
            v-model="searchKeyword"
          />
        </view>
        <text class="panel-tip">点击姓名可查看具体提报记录</text>
        <view class="table-wrapper">
          <view class="table">
            <view class="table-row table-header">
              <text>排名</text>
              <text>姓名</text>
              <text>支行</text>
              <text>总分</text>
              <text>个贷</text>
              <text>小微</text>
            </view>
            <view
              v-for="row in filteredOverviewData"
              :key="row.employee.id"
              class="table-row"
              @click="gotoUserDetails(row.employee)"
            >
              <text>{{ getRank(row.employee.id) }}</text>
              <text class="employee-name">{{ row.employee.name }}</text>
              <text class="branch-name">{{ formatBranchName(row.employee.branch) }}</text>
              <text class="highlight">{{ row.stats.totalScore }}</text>
              <text>{{ row.stats.personalScore }}</text>
              <text>{{ row.stats.microScore }}</text>
            </view>
          </view>
        </view>
      </view>

      <view v-else-if="activeTab === 'users'" class="tab-panel">
      <view class="panel-header panel-header--user">
        <text class="panel-title">用户管理</text>
        <input
          class="search-input"
          placeholder="搜索姓名/手机号/支行"
          v-model="userSearch"
        />
        <button class="primary-btn small" @click="openUserModal()">新增用户</button>
      </view>
      <view class="user-card" v-for="user in filteredUsers" :key="user.id">
        <view>
          <text class="user-name">{{ user.name }}</text>
          <text class="user-branch">{{ user.branch }} · {{ user.phone }}</text>
          <text class="user-meta">角色：{{ user.role === 'admin' ? '管理员' : '客户经理' }}</text>
        </view>
        <view class="user-actions">
          <button class="link-btn" @click="openUserModal(user)">编辑</button>
          <button class="link-btn" @click="handleResetPassword(user)">重置密码</button>
          <button class="link-btn danger" @click="toggleUserStatus(user)">
            {{ user.status === 'active' ? '停用' : '启用' }}
          </button>
        </view>
      </view>
      </view>

      <view v-else-if="activeTab === 'rules'" class="tab-panel">
      <view class="panel-header">
        <text class="panel-title">业务与积分规则</text>
        <view class="panel-actions">
          <button class="ghost-btn small" @click="openRuleDescriptionModal">编辑说明</button>
          <button class="primary-btn small" @click="openRuleModal()">新增业务</button>
        </view>
      </view>
      <view class="rule-groups">
        <view class="rule-section" v-for="section in ruleSections" :key="section.key">
          <view class="rule-section__header">
            <text class="rule-section__title">{{ section.title }}</text>
            <text class="rule-section__subtitle">{{ section.subtitle }}</text>
          </view>
          <view
            v-for="rule in section.rules"
            :key="rule.id"
            class="rule-card"
          >
            <view class="rule-card__main">
              <view class="rule-card__icon" :style="{ backgroundColor: rule.color }">
                <IconHelper :name="rule.icon || 'circle'" :size="22" />
              </view>
              <view>
                <text class="rule-card__title">{{ rule.name }}</text>
                <text> </text>
                <text class="rule-card__meta">&nbsp;&nbsp;
                  {{ rule.hasStockOption ? '新增 + ' + (rule.stockLabel || '存量') : '新增' }}
                </text>
              </view>
            </view>
            <view class="rule-card__points">
              <text>新增 {{ rule.pointsNew.item }} 分/笔 · 每100万 {{ rule.pointsNew.million }} 分</text>
              <text v-if="rule.hasStockOption">
                {{ rule.stockLabel || '存量' }} {{ rule.pointsStock.item }} 分/笔 · 每100万 {{ rule.pointsStock.million }} 分
              </text>
            </view>
            <view class="rule-card__actions">
              <button class="link-btn" @click="openRuleModal(rule)">编辑</button>
              <button class="link-btn danger" @click="deleteRule(rule)">删除</button>
            </view>
          </view>
          <view v-if="section.rules.length === 0" class="rule-card rule-card--empty">
            <text>暂无规则，点击右上角新增</text>
          </view>
        </view>
      </view>
      </view>

      <view v-else-if="activeTab === 'branches'" class="tab-panel">
      <view class="panel">
        <view class="panel-header">
          <text class="panel-title">支行管理</text>
          <button class="primary-btn small" @click="openBranchModal()">新增支行</button>
        </view>
        <view class="branch-list">
          <view class="branch-item" v-for="branch in branches" :key="branch.id">
            <text class="branch-name">{{ branch.id }} · {{ branch.name }}</text>
            <view class="branch-actions">
              <button class="link-btn" @click="openBranchModal(branch)">编辑</button>
              <button class="link-btn danger" @click="deleteBranch(branch)">删除</button>
            </view>
          </view>
        </view>
      </view>
      </view>

      <view v-else class="tab-panel">
      <view class="panel-group">
        <view class="panel">
          <text class="panel-title">季度管理</text>
          <view class="panel-body">
            <view class="form-item">
            <text class="form-label">当前季度</text>
              <picker :range="quarterOptions" :value="quarterOptions.indexOf(selectedQuarter)" @change="handleQuarterPicker">
                <view class="picker-value">{{ selectedQuarter }}</view>
              </picker>
            </view>
            <text class="form-tip">可选择保留数据（仅用于查询）或直接清空当前积分。</text>
            <view class="button-row">
              <button class="ghost-btn" @click="handleSwitchQuarter(false)">保留后切换</button>
              <button class="danger-btn" @click="handleSwitchQuarter(true)">清空后切换</button>
            </view>
          </view>
        </view>

        <view class="panel">
          <text class="panel-title">系统参数</text>
          <view class="panel-body">
            <view class="switch-row">
              <view>
                <text class="switch-label">允许用户修改/删除提报</text>
                <text class="switch-tip">可限制24小时内可修改</text>
              </view>
              <switch :checked="settings.allowEditSubmission" @change="updateSetting('allowEditSubmission', $event.detail.value)" />
            </view>
          </view>
        </view>
      </view>
      </view>
    </scroll-view>

    <view v-if="!isAdmin" class="unauth">
      <text>{{ (!currentUser || (currentUser && currentUser.role === 'guest')) ? '请先登录' : '仅管理员可访问此页面' }}</text>
      <button class="light-btn" @click="gotoLogin">{{ (!currentUser || (currentUser && currentUser.role === 'guest')) ? '立即登录' : '切换账号' }}</button>
    </view>

    <view v-if="showUserModal" class="modal-overlay">
      <view class="modal">
        <view class="modal-header">
          <text>{{ editingUser ? '编辑用户' : '新增用户' }}</text>
          <view class="modal-close" @click="closeUserModal">
            <uni-icons type="closeempty" :size="28" color="#fff" />
          </view>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">姓名</text>
            <input class="form-input" v-model="userForm.name" placeholder="请输入姓名" />
          </view>
          <view class="form-item">
            <text class="form-label">手机号</text>
            <input class="form-input" type="number" v-model="userForm.phone" placeholder="11位手机号" />
          </view>
          <view class="form-item">
            <text class="form-label">所属支行</text>
            <picker :range="branchNameOptions" :value="branchIndex" @change="handleBranchPicker">
              <view class="picker-value">{{ branchNameOptions[branchIndex] || '请选择支行' }}</view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">角色</text>
            <picker :range="roleOptions" :value="roleIndex" @change="handleRolePicker">
              <view class="picker-value">
                {{ roleOptions[roleIndex] }}
              </view>
            </picker>
          </view>
        </view>
        <view class="modal-footer">
          <button class="ghost-btn" @click="closeUserModal">取消</button>
          <button class="primary-btn" @click="submitUserForm">保存</button>
        </view>
      </view>
    </view>

    <view v-if="showRuleModal" class="modal-overlay">
      <view class="modal">
        <view class="modal-header">
          <text>{{ editingRule ? '编辑规则' : '新增规则' }}</text>
          <view class="modal-close" @click="closeRuleModal">
            <uni-icons type="closeempty" :size="28" color="#fff" />
          </view>
        </view>
        <scroll-view scroll-y class="modal-body rule-form-body">
          <view class="rule-form-content">
          <view class="form-item">
            <text class="form-label">业务名称</text>
            <input class="form-input" v-model="ruleForm.name" placeholder="请输入业务名称" />
          </view>
          <view class="form-item">
            <text class="form-label">业务分类</text>
            <view class="segment">
              <view
                v-for="option in ruleCategoryOptions"
                :key="option.value"
                class="segment__item"
                :class="{ active: ruleForm.category === option.value }"
                @click="selectRuleCategory(option.value)"
              >
                {{ option.label }}
              </view>
            </view>
          </view>
          <view class="form-item">
            <text class="form-label">业务类型</text>
            <view class="chip-list">
              <view
                v-for="option in currentRuleGroups"
                :key="option.value"
                class="chip"
                :class="{ active: ruleForm.group === option.value }"
                @click="selectRuleGroup(option.value)"
              >
                {{ option.label }}
              </view>
            </view>
          </view>
          <view class="form-row">
            <view class="form-item half">
              <text class="form-label">图标标识</text>
              <view class="icon-picker">
                <view
                  v-for="icon in iconOptions"
                  :key="icon"
                  class="icon-picker__item"
                  :class="{ active: ruleForm.icon === icon }"
                  @click="selectRuleIcon(icon)"
                >
                  <view class="icon-picker__preview">
                    <IconHelper :name="icon" :size="32" color="#0f172a" />
                  </view>
                </view>
              </view>
            </view>
            <view class="form-item half">
              <text class="form-label">主题色</text>
              <view class="color-picker">
                <view
                  v-for="color in colorOptions"
                  :key="color"
                  class="color-picker__item"
                  :class="{ active: ruleForm.color === color }"
                  :style="{ backgroundColor: color }"
                  @click="selectRuleColor(color)"
                />
              </view>
              <input class="form-input" v-model="ruleForm.color" placeholder="或输入 HEX 颜色（如 #0f766e）" />
            </view>
          </view>
          <view class="form-item">
              <text class="form-label">新增积分设置</text>
              <view class="dual-inputs">
                <view class="input-with-suffix">
                  <input
                    class="form-input"
                    type="digit"
                    v-model="ruleForm.pointsNewItem"
                    placeholder="输入数值"
                  />
                  <text class="input-unit">分/笔</text>
                </view>
                <view class="input-with-suffix">
                  <input
                    class="form-input"
                    type="digit"
                    v-model="ruleForm.pointsNewMillion"
                    placeholder="输入数值"
                  />
                  <text class="input-unit">分/100万</text>
                </view>
              </view>
          </view>
          <view class="form-item switch-row">
            <view>
              <text class="form-label">包含存量 / 转贷</text>
              <text class="form-tip">开启后可单独配置积分</text>
            </view>
            <switch :checked="ruleForm.hasStockOption" @change="ruleForm.hasStockOption = $event.detail.value" />
          </view>
          <view v-if="ruleForm.hasStockOption" class="form-item">
            <text class="form-label">存量积分设置</text>
            <input class="form-input" v-model="ruleForm.stockLabel" placeholder="存量标签，例如 转贷" />
            <view class="dual-inputs">
              <view class="input-with-suffix">
                <input
                  class="form-input"
                  type="digit"
                  v-model="ruleForm.pointsStockItem"
                  placeholder="输入数值"
                />
                <text class="input-unit">分/笔</text>
              </view>
              <view class="input-with-suffix">
                <input
                  class="form-input"
                  type="digit"
                  v-model="ruleForm.pointsStockMillion"
                  placeholder="输入数值"
                />
                <text class="input-unit">分/100万</text>
              </view>
            </view>
          </view>
          </view>
        </scroll-view>
        <view class="modal-footer">
          <button class="ghost-btn" @click="closeRuleModal">取消</button>
          <button class="primary-btn" @click="submitRuleForm">保存</button>
        </view>
      </view>
    </view>

    <view v-if="showRuleDescriptionModal" class="modal-overlay">
      <view class="modal">
        <view class="modal-header">
          <text>规则说明配置</text>
          <view class="modal-close" @click="closeRuleDescriptionModal">
            <uni-icons type="closeempty" :size="28" color="#fff" />
          </view>
        </view>
        <scroll-view scroll-y class="modal-body rule-desc-body">
          <view
            class="rule-desc-section"
            v-for="(section, index) in ruleDescriptionForm"
            :key="section.uid"
          >
            <view class="form-item">
              <text class="form-label">说明分组标题</text>
              <input
                class="form-input"
                v-model="section.title"
                placeholder="如 个贷条线"
              />
            </view>
            <view class="form-item">
              <text class="form-label">说明内容</text>
              <textarea
                class="form-textarea"
                v-model="section.itemsText"
                placeholder="每行一条说明，例如：抵押类：新增3分/笔"
              />
              <text class="form-tip">换行代表新的说明条目</text>
            </view>
            <view class="rule-desc-actions">
              <button
                v-if="ruleDescriptionForm.length > 1"
                class="link-btn danger"
                @click="removeRuleDescriptionSection(index)"
              >
                删除该分组
              </button>
            </view>
          </view>
          <button class="ghost-btn full-width" @click="addRuleDescriptionSection">
            + 新增说明分组
          </button>
        </scroll-view>
        <view class="modal-footer">
          <button class="ghost-btn" @click="closeRuleDescriptionModal">取消</button>
          <button class="primary-btn" @click="submitRuleDescriptionForm">保存</button>
        </view>
      </view>
    </view>

    <view v-if="showBranchModal" class="modal-overlay">
      <view class="modal">
        <view class="modal-header">
          <text>{{ editingBranch ? '编辑支行' : '新增支行' }}</text>
          <view class="modal-close" @click="closeBranchModal">
            <uni-icons type="closeempty" :size="28" color="#fff" />
          </view>
        </view>
        <view class="modal-body">
          <view class="form-row">
            <view class="form-item half">
              <text class="form-label">支行编号</text>
              <input
                class="form-input"
                placeholder="输入支行编号"
                v-model="branchForm.id"
              />
            </view>
            <view class="form-item half">
              <text class="form-label">支行名称</text>
              <input
                class="form-input"
                placeholder="输入支行名称"
                v-model="branchForm.name"
              />
            </view>
          </view>
        </view>
        <view class="modal-footer">
          <button class="ghost-btn" @click="closeBranchModal">取消</button>
          <button class="primary-btn" @click="saveBranch">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { StoreService } from '../../services/store.js';
import IconHelper from '../../components/IconHelper.vue';

const RULE_SECTIONS = [
  { key: 'personal-mortgage', title: '个贷 · 抵押类', subtitle: '农户 / 经营抵押', category: 'personal', group: 'mortgage' },
  { key: 'personal-credit', title: '个贷 · 信用类', subtitle: '商户e贷 / 消费贷 / 快农贷', category: 'personal', group: 'credit' },
  { key: 'micro-mortgage', title: '小微 · 抵押类', subtitle: '转贷 / 新增', category: 'micro', group: 'mortgage' },
  { key: 'micro-credit', title: '小微 · 信用类', subtitle: '微捷贷 / 闽e贷 / 转贷', category: 'micro', group: 'credit' },
  { key: 'micro-offline', title: '小微 · 线下特色', subtitle: '科技贷 / 智动贷', category: 'micro', group: 'offline' }
];

const ruleFormDefaults = () => ({
  name: '',
  category: 'personal',
  group: 'mortgage',
  icon: 'home',
  color: '#0f766e',
  hasStockOption: false,
  stockLabel: '存量',
  pointsNewItem: 0,
  pointsNewMillion: 0,
  pointsStockItem: 0,
  pointsStockMillion: 0
});

export default {
  components: { IconHelper },
  data() {
    return {
      currentUser: StoreService.getCurrentUser(),
      activeTab: 'overview',
      tabs: [
        { key: 'overview', label: '业绩汇总' },
        { key: 'users', label: '用户管理' },
        { key: 'rules', label: '业务规则' },
        { key: 'branches', label: '支行管理' },
        { key: 'settings', label: '季度管理' }
      ],
      searchKeyword: '',
      overviewData: [],
      leaderboard: [],
      users: [],
      branches: StoreService.getBranches(),
      rules: StoreService.getRules(),
      ruleDescriptionSections: StoreService.getRuleDescriptionSections(),
      currentQuarter: StoreService.getCurrentQuarter(),
      selectedQuarter: StoreService.getCurrentQuarter(),
      quarterOptions: ['2025Q4', '2026Q1', '2026Q2', '2026Q3', '2026Q4', '2027Q1', '2027Q2', '2027Q3', '2027Q4', '2028Q1', '2028Q2', '2028Q3', '2028Q4'],
      settings: StoreService.getSettings(),
      showUserModal: false,
      showRuleModal: false,
      showRuleDescriptionModal: false,
      editingUser: null,
      editingRule: null,
      userForm: {
        name: '',
        phone: '',
        branch: '',
        role: 'manager'
      },
      roleOptions: ['客户经理', '管理员'],
      branchIndex: 0,
      roleIndex: 0,
      userSearch: '',
      branchForm: { id: '', name: '' },
      editingBranch: null,
      showBranchModal: false,
      ruleForm: ruleFormDefaults(),
      ruleDescriptionForm: [],
      iconOptions: ['home', 'cart', 'wallet', 'shop', 'flag', 'redo', 'gear', 'compose', 'star'],
      colorOptions: ['#0f766e', '#2563eb', '#db2777', '#f97316', '#0ea5e9', '#8b5cf6', '#14b8a6', '#f43f5e'],
      ruleCategoryOptions: [
        { value: 'personal', label: '个贷业务' },
        { value: 'micro', label: '小微业务' }
      ],
      ruleGroupOptions: {
        personal: [
          { value: 'mortgage', label: '抵押类' },
          { value: 'credit', label: '信用类' }
        ],
        micro: [
          { value: 'mortgage', label: '抵押类' },
          { value: 'credit', label: '信用类' },
          { value: 'offline', label: '线下特色' }
        ]
      }
    };
  },
  computed: {
    isAdmin() {
      return this.currentUser && this.currentUser.role === 'admin';
    },
    filteredUsers() {
      const keyword = this.userSearch.trim().toLowerCase();
      if (!keyword) return this.users;
      return this.users.filter(
        user =>
          user.name.toLowerCase().includes(keyword) ||
          user.phone.includes(keyword) ||
          user.branch.toLowerCase().includes(keyword)
      );
    },
    filteredOverviewData() {
      const keyword = this.searchKeyword.trim().toLowerCase();
      if (!keyword) return this.overviewData;
      return this.overviewData.filter(
        item =>
          item.employee.name.toLowerCase().includes(keyword) ||
          item.employee.branch.toLowerCase().includes(keyword)
      );
    },
    ruleSections() {
      return RULE_SECTIONS.map(section => ({
        ...section,
        rules: this.rules.filter(rule => rule.category === section.category && rule.group === section.group)
      }));
    },
    currentRuleGroups() {
      return this.ruleGroupOptions[this.ruleForm.category] || [];
    },
    branchNameOptions() {
      return this.branches.map(branch => branch.name);
    },
    branchMapByName() {
      return this.branches.reduce((acc, branch) => {
        acc[branch.name] = branch;
        return acc;
      }, {});
    }
  },
  async onShow() {
    await this.refresh();
  },
  methods: {
    async refresh() {
      try {
        await StoreService.ensureReady();
        this.currentUser = StoreService.getCurrentUser();
        if (!this.isAdmin) return;
        this.currentQuarter = StoreService.getCurrentQuarter();
        this.selectedQuarter = this.currentQuarter;
        this.overviewData = StoreService.getOverviewTable();
        this.leaderboard = StoreService.getLeaderboard();
        this.users = StoreService.getUsers();
        this.refreshBranches();
        this.refreshRules();
        this.settings = StoreService.getSettings();
        this.ruleDescriptionSections = StoreService.getRuleDescriptionSections();
      } catch (error) {
        uni.showToast({ title: error.message || '数据加载失败', icon: 'none' });
      }
    },
    refreshBranches() {
      this.branches = StoreService.getBranches();
      if (this.userForm.branch) {
        const idx = Math.max(
          this.branchNameOptions.findIndex(name => name === this.userForm.branch),
          0
        );
        this.branchIndex = idx;
        this.userForm.branch = this.branchNameOptions[idx] || '';
      }
    },
    refreshRules() {
      this.rules = StoreService.getRules();
    },
    getRank(employeeId) {
      return this.leaderboard.find(entry => entry.employeeId === employeeId)?.rank || '-';
    },
    handleExport() {
      if (!this.isAdmin) return;
      if (!this.overviewData.length) {
        uni.showToast({ title: '暂无数据', icon: 'none' });
        return;
      }
      
      const isWeChat = typeof wx !== 'undefined' && !!wx.getFileSystemManager;
      if (isWeChat) {
        // 微信环境使用CSV格式，更可靠
        const csv = this.buildExportCsv();
        const filename = `收单通报_${this.currentQuarter}_${Date.now()}.csv`;
        this.saveAndShareExcel(csv, filename, 'csv');
      } else {
        // Web环境保持原有XML格式
        const columnTree = this.getExportColumnTree();
        const leafColumns = this.collectLeafColumns(columnTree);
        const headerRows = this.buildHeaderRows(columnTree);
        const { start, end } = this.getQuarterDateRange(this.currentQuarter);
        const dateRangeText = `${start} - ${end}`;
        const title = `${this.currentQuarter}个人贷款收单通报`;
        const html = this.buildExportHtml({
          title,
          dateRangeText,
          headerRows,
          leafColumns
        });
        const filename = `收单通报_${this.currentQuarter}_${Date.now()}.xlsx`;
        this.saveAndShareExcel(html, filename);
      }
    },
    getExportColumnTree() {
      const sumRuleMetrics = (row, ruleIds, type) => {
        const bucketKey = type === 'stock' ? 'stock' : 'new';
        return (ruleIds || []).reduce(
          (acc, ruleId) => {
            const detail = row.breakdown?.[ruleId];
            if (!detail) return acc;
            const source = detail[bucketKey] || { count: 0, amount: 0 };
            acc.count += Number(source.count) || 0;
            acc.amount += Number(source.amount) || 0;
            return acc;
          },
          { count: 0, amount: 0 }
        );
      };

      const createRuleMetric = (label, ruleIds, type, metric) => ({
        label,
        getter: row => {
          const data = sumRuleMetrics(row, ruleIds, type);
          return metric === 'count'
            ? data.count
            : Number(data.amount.toFixed ? data.amount.toFixed(2) : data.amount);
        }
      });

      const createRuleSegment = (label, ruleIds, type, footerKey) => ({
        label,
        footerKey,
        children: [
          createRuleMetric('笔数', ruleIds, type, 'count'),
          createRuleMetric('授信金额', ruleIds, type, 'amount')
        ]
      });

      return [
        {
          label: '基础信息',
          children: [
            { label: '网点编号', getter: row => this.getBranchIdByName(row.employee.branch) },
            { label: '网点', getter: row => row.employee.branch },
            { label: '客户经理', getter: row => row.employee.name },
            { label: '排名', getter: row => this.getRank(row.employee.id) }
          ]
        },
        {
          label: '积分',
          children: [
            { label: '个贷积分', getter: row => row.stats.personalScore },
            { label: '小微积分', getter: row => row.stats.microScore }
          ]
        },
        {
          label: '个贷',
          children: [
            {
              label: '农户抵押类完成数',
              children: [
                createRuleSegment('新增', ['p_agri_mortgage'], 'new', 'personal'),
                createRuleSegment('存量', ['p_agri_mortgage'], 'stock', 'personal')
              ]
            },
            {
              label: '经营抵押类完成数',
              children: [
                createRuleSegment('新增', ['p_biz_mortgage'], 'new', 'personal'),
                createRuleSegment('存量', ['p_biz_mortgage'], 'stock', 'personal')
              ]
            },
            {
              label: '商户e贷',
              children: [
                createRuleMetric('笔数', ['p_merchant_e'], 'new', 'count'),
                createRuleMetric('授信金额', ['p_merchant_e'], 'new', 'amount')
              ]
            },
            {
              label: '消费贷',
              children: [
                createRuleMetric('笔数', ['p_consumer'], 'new', 'count'),
                createRuleMetric('授信金额', ['p_consumer'], 'new', 'amount')
              ]
            },
            {
              label: '快农贷',
              children: [
                createRuleMetric('笔数', ['p_fast_agri'], 'new', 'count'),
                createRuleMetric('授信金额', ['p_fast_agri'], 'new', 'amount')
              ]
            }
          ]
        },
        {
          label: '小微',
          children: [
            {
              label: '抵押类完成数',
              children: [
                createRuleSegment('新增', ['m_mortgage'], 'new', 'micro'),
                createRuleSegment('转贷', ['m_mortgage'], 'stock', 'micro')
              ]
            },
            {
              label: '信用类完成数',
              children: [
                createRuleSegment('转贷', ['m_credit_transfer'], 'new', 'micro'),
                createRuleSegment('微捷贷', ['m_micro_quick'], 'new', 'micro'),
                createRuleSegment('闽e贷', ['m_min_e'], 'new', 'micro')
              ]
            },
            {
              label: '线下特色',
              children: [
                createRuleSegment('线下转贷', ['m_offline_transfer'], 'new', 'micro'),
                createRuleSegment('科技贷', ['m_tech'], 'new', 'micro'),
                createRuleSegment('智动贷', ['m_smart'], 'new', 'micro')
              ]
            }
          ]
        }
      ];
    },
    collectLeafColumns(tree) {
      const leaves = [];
      const totals = {
        personal: {},
        micro: {}
      };
      const traverse = node => {
        if (!node.children || !node.children.length) {
          if (node.footerKey && node.label) {
            totals[node.footerKey][node.label] = node.getter;
          }
          leaves.push(node);
          return;
        }
        node.children.forEach(traverse);
      };
      tree.forEach(traverse);
      Object.entries(totals).forEach(([key, metrics]) => {
        const labels = Object.keys(metrics);
        if (!labels.length) return;
        leaves.push({
          label: key === 'personal' ? '个贷类总笔数' : '小微类总笔数',
          getter: row =>
            labels
              .filter(label => label.includes('笔数'))
              .reduce((sum, label) => sum + (metrics[label]?.(row) || 0), 0)
        });
        leaves.push({
          label: key === 'personal' ? '个贷类总授信金额' : '小微类总授信金额',
          getter: row =>
            labels
              .filter(label => label.includes('授信金额'))
              .reduce((sum, label) => sum + (metrics[label]?.(row) || 0), 0)
        });
      });
      return leaves;
    },
    buildHeaderRows(tree) {
      const depthOf = node => {
        if (!node.children || !node.children.length) return 1;
        return 1 + Math.max(...node.children.map(depthOf));
      };
      const maxDepth = Math.max(...tree.map(depthOf));
      const rows = [];
      const traverse = (node, level) => {
        const hasChildren = node.children && node.children.length;
        let colspan = 0;
        if (hasChildren) {
          node.children.forEach(child => {
            colspan += traverse(child, level + 1);
          });
        } else {
          colspan = 1;
        }
        const rowspan = hasChildren ? 1 : maxDepth - level;
        if (!rows[level]) rows[level] = [];
        rows[level].push({
          label: node.label,
          colspan,
          rowspan
        });
        return colspan;
      };
      tree.forEach(node => traverse(node, 0));
      return rows;
    },
    buildExportHtml({ title, dateRangeText, headerRows, leafColumns }) {
      const columnCount = leafColumns.length;
      const headerRowsXml = headerRows
        .map(
          row =>
            `<Row ss:AutoFitHeight="1">${row
              .map(
                cell =>
                  `<Cell ss:MergeAcross="${cell.colspan - 1}" ss:MergeDown="${
                    cell.rowspan - 1
                  }"><Data ss:Type="String">${this.escapeExcel(cell.label)}</Data></Cell>`
              )
              .join('')}</Row>`
        )
        .join('');
      const bodyRowsXml = this.overviewData
        .map(row => {
          const cells = leafColumns
            .map(col => {
              const value = col.getter ? col.getter(row) : '';
              const isNumber = typeof value === 'number';
              return `<Cell><Data ss:Type="${isNumber ? 'Number' : 'String'}">${this.escapeExcel(
                this.formatCellValue(value)
              )}</Data></Cell>`;
            })
            .join('');
          return `<Row>${cells}</Row>`;
        })
        .join('');
      return `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="title">
      <Font ss:Bold="1" ss:Size="14" />
      <Alignment ss:Horizontal="Center" />
    </Style>
    <Style ss:ID="meta">
      <Alignment ss:Horizontal="Center" />
    </Style>
    <Style ss:ID="header">
      <Font ss:Bold="1" />
      <Alignment ss:Horizontal="Center" />
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" />
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" />
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" />
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" />
      </Borders>
    </Style>
    <Style ss:ID="cell">
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" />
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" />
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" />
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" />
      </Borders>
    </Style>
  </Styles>
  <Worksheet ss:Name="Sheet1">
    <Table>
      <Row ss:AutoFitHeight="1" ss:StyleID="title">
        <Cell ss:MergeAcross="${columnCount - 1}"><Data ss:Type="String">${this.escapeExcel(
          title
        )}</Data></Cell>
      </Row>
      <Row ss:AutoFitHeight="1" ss:StyleID="meta">
        <Cell ss:MergeAcross="${columnCount - 1}"><Data ss:Type="String">${this.escapeExcel(
          `数据区间：${dateRangeText}`
        )}</Data></Cell>
      </Row>
      ${headerRowsXml}
      ${bodyRowsXml}
    </Table>
  </Worksheet>
</Workbook>`;
    },
    
    buildExportCsv() {
            // 动态从规则生成CSV导出
      const { start, end } = this.getQuarterDateRange(this.currentQuarter);
      const title = `${this.currentQuarter}个人贷款收单通报`;
      const dateRangeText = `数据区间：${start} - ${end}`;
      
      // 构建动态表头
      const headers = ['网点编号', '网点', '客户经理', '排名', '个贷积分', '小微积分'];
      
      // 遍历所有规则分组，按分类和分组组织表头
      this.ruleSections.forEach(section => {
        // 遍历该分组下的所有规则
        section.rules.forEach(rule => {
          // 根据规则类型构建完整的列名
          const baseName = `${rule.name}`;
          
          // 新增业务列
          headers.push(`${baseName}-新增笔数`);
          headers.push(`${baseName}-新增授信金额`);
          
          // 如果有存量/转贷选项，添加相应列
          if (rule.hasStockOption) {
            headers.push(`${baseName}-${rule.stockLabel || '存量'}笔数`);
            headers.push(`${baseName}-${rule.stockLabel || '存量'}授信金额`);
          }
        });
      });
      
      // 添加总计字段
      headers.push('个贷类总笔数', '小微类总笔数');
      
      // 构建数据行
      const dataRows = this.overviewData.map(row => {
        // 获取员工信息
        const employee = row.employee;
        const stats = row.stats;
        const breakdown = row.breakdown;
        
        // 构建数据数组，与表头对应
        const rowData = [
          // 基础信息
          this.getBranchIdByName(employee.branch),
          employee.branch,
          employee.name,
          this.getRank(employee.id),
          
          // 积分信息
          stats.personalScore,
          stats.microScore
        ];
        
        // 遍历所有规则分组，按分类和分组组织数据
        this.ruleSections.forEach(section => {
          // 遍历该分组下的所有规则
          section.rules.forEach(rule => {
            const breakdownData = breakdown?.[rule.id] || {};
            
            // 新增业务数据
            rowData.push(
              breakdownData.new?.count || 0,
              breakdownData.new?.amount || 0
            );
            
            // 如果有存量/转贷选项，添加相应数据
            if (rule.hasStockOption) {
              rowData.push(
                breakdownData.stock?.count || 0,
                breakdownData.stock?.amount || 0
              );
            }
          });
        });
        
        // 计算个贷类总笔数和小微类总笔数
        let personalTotalCount = 0;
        let microTotalCount = 0;
        
        // 遍历所有规则，计算总计
        this.rules.forEach(rule => {
          const breakdownData = breakdown?.[rule.id] || {};
          const ruleTotal = (breakdownData.new?.count || 0) + (breakdownData.stock?.count || 0);
          
          if (rule.category === 'personal') {
            personalTotalCount += ruleTotal;
          } else if (rule.category === 'micro') {
            microTotalCount += ruleTotal;
          }
        });
        
        // 添加总计数据
        rowData.push(personalTotalCount, microTotalCount);
        
        return rowData;
      });
      
      // 构建完整CSV内容
      let csv = `${title}\n`;
      csv += `${dateRangeText}\n\n`;
      csv += `${headers.join(',')}\n`;
      
      // 添加数据行
      dataRows.forEach(row => {
        // 处理CSV转义
        const escapedRow = row.map(cell => {
          const str = String(cell);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        });
        csv += `${escapedRow.join(',')}\n`;
      });
      
      return csv;
    },
     
    saveAndShareExcel(html, filename, fileType = 'xlsx') {
      const isWeChat = typeof wx !== 'undefined' && !!wx.getFileSystemManager;
      if (isWeChat) {
        try {
          const fs = wx.getFileSystemManager();
          const filePath = `${wx.env.USER_DATA_PATH}/${filename}`;
          
          // 清理旧文件
          this.cleanupWeChatExports(fs);
          
          if (fileType === 'csv') {
            // CSV格式直接写入，使用同步方式确保可靠性
            fs.writeFileSync(filePath, html, 'utf-8');
          } else {
            // XML格式处理
            const buffer = this.stringToUint8Array(html);
            const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
            fs.writeFileSync(filePath, arrayBuffer);
          }
          
          // 微信小程序分享文件
          if (wx.shareFileMessage) {
            // 使用微信原生分享文件API
            wx.shareFileMessage({
              filePath: filePath,
              fileName: filename,
              success: () => {
                uni.showToast({ title: '分享成功', icon: 'success' });
              },
              fail: (error) => {
                console.error('分享失败', error);
                // 分享失败后尝试打开文件
                this.tryOpenDocument(filePath, fileType);
              }
            });
          } else {
            // 兼容旧版本微信，直接打开文件
            this.tryOpenDocument(filePath, fileType);
          }
        } catch (error) {
          console.error('导出失败', error);
          uni.showToast({ title: '导出失败，请重试', icon: 'none' });
        }
        return;
      }
      if (typeof window !== 'undefined') {
        // Web环境处理
        try {
          let mimeType = 'application/vnd.ms-excel;charset=utf-8;';
          if (fileType === 'csv') {
            mimeType = 'text/csv;charset=utf-8;';
          }
          
          // 使用Blob URL下载
          const blob = new Blob([html], { type: mimeType });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
          }));
          document.body.removeChild(link);
          setTimeout(() => {
            URL.revokeObjectURL(url);
          }, 100);
          uni.showToast({ title: '已导出', icon: 'success' });
        } catch (error) {
          console.error('Web下载失败', error);
          this.downloadFileBackup(html, filename);
        }
      } else {
        uni.showToast({ title: '当前环境不支持导出', icon: 'none' });
      }
    },
    downloadFileBackup(html, filename) {
      // 使用uni.downloadFile的备用方案
      try {
        // 将html转换为base64
        const base64 = uni.arrayBufferToBase64(this.stringToUint8Array(html).buffer);
        const dataUrl = `data:application/vnd.ms-excel;base64,${base64}`;
        
        // 使用a标签下载
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        uni.showToast({ title: '已导出', icon: 'success' });
      } catch (error) {
        console.error('备用下载方案失败', error);
        uni.showToast({ title: '导出失败，请重试', icon: 'none' });
      }
    },
    getQuarterDateRange(code) {
      const match = /^(\d{4})Q([1-4])$/.exec(code || '');
      if (!match) {
        const today = this.formatDate(new Date());
        return { start: today, end: today };
      }
      const year = Number(match[1]);
      const quarter = Number(match[2]);
      const map = {
        1: ['01-01', '03-31'],
        2: ['04-01', '06-30'],
        3: ['07-01', '09-30'],
        4: ['10-01', '12-31']
      };
      const [startMd, endMd] = map[quarter];
      const start = `${year}${startMd.replace('-', '')}`;
      const quarterEnd = new Date(`${year}-${endMd}T23:59:59`);
      const now = new Date();
      const endDate = now > quarterEnd ? quarterEnd : now;
      const end = this.formatDate(endDate);
      return { start, end };
    },
    formatDate(date) {
      const d = typeof date === 'string' ? new Date(date) : date;
      const year = d.getFullYear();
      const month = `${d.getMonth() + 1}`.padStart(2, '0');
      const day = `${d.getDate()}`.padStart(2, '0');
      return `${year}${month}${day}`;
    },
    stringToUint8Array(str) {
      if (typeof TextEncoder !== 'undefined') {
        return new TextEncoder().encode(str);
      }
      const encoded = unescape(encodeURIComponent(str));
      const result = new Uint8Array(encoded.length);
      for (let i = 0; i < encoded.length; i++) {
        result[i] = encoded.charCodeAt(i);
      }
      return result;
    },
    formatCellValue(value) {
      if (value === null || value === undefined || Number.isNaN(value)) return '';
      if (typeof value === 'number') {
        return Number.isInteger(value) ? value : value.toFixed(2);
      }
      return value;
    },
    escapeExcel(value) {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    },
    getBranchIdByName(name) {
      return this.branchMapByName[name]?.id || '';
    },
    formatBranchName(name) {
      // 每两个字换行
      return name.replace(/(.{2})/g, '$1\n');
    },
    cleanupWeChatExports(fs) {
      try {
        const files = fs.readdirSync(wx.env.USER_DATA_PATH) || [];
        files
          .filter(name => /\.(xls[x]?|csv)$/.test(name))
          .forEach(name => {
            try {
              fs.unlinkSync(`${wx.env.USER_DATA_PATH}/${name}`);
            } catch (error) {
              console.warn('删除旧导出失败', error);
            }
          });
      } catch (error) {
        console.warn('读取导出目录失败', error);
      }
    },
    
    tryOpenDocument(filePath, fileType) {
      // 尝试打开文档
      uni.openDocument({
        filePath,
        fileType: fileType,
        showMenu: true,
        success: () => {
          uni.showToast({ title: '文件已打开，可手动分享', icon: 'success' });
        },
        fail: (error) => {
          console.error('打开文件失败', error);
          // 显示简单的成功提示，避免用户困惑
          uni.showModal({
            title: '导出成功',
            content: '文件已生成，可通过"微信-我-设置-通用-文件管理"查看',
            showCancel: false,
            confirmText: '知道了'
          });
        }
      });
    },
    handleReset() {
      if (!this.isAdmin) return;
      uni.showModal({
        title: '清空数据',
        content: '确认清空本季度所有提报记录？该操作不可恢复。',
        confirmColor: '#ef4444',
        success: async res => {
          if (!res.confirm) return;
          try {
            await StoreService.clearQuarterData({ archiveOnly: false });
            await this.refresh();
            uni.showToast({ title: '已清空', icon: 'success' });
          } catch (error) {
            uni.showToast({ title: error.message || '清空失败', icon: 'none' });
          }
        }
      });
    },
    handleQuarterPicker(event) {
      this.selectedQuarter = this.quarterOptions[event.detail.value];
    },
    handleSwitchQuarter(reset) {
      if (!this.isAdmin) return;
      uni.showModal({
        title: '切换季度',
        content: `将切换至 ${this.selectedQuarter} ，${reset ? '并清空当前季度所有积分记录' : '并保留当前季度数据（仅供查看）'}，是否继续？`,
        success: async res => {
          if (!res.confirm) return;
          try {
            await StoreService.switchQuarter(this.selectedQuarter, {
              resetCurrent: reset
            });
            uni.showToast({ title: '季度已切换', icon: 'success' });
            await this.refresh();
          } catch (error) {
            uni.showToast({ title: error.message || '切换失败', icon: 'none' });
          }
        }
      });
    },
    async updateSetting(key, value) {
      try {
        await StoreService.updateSettings({ [key]: value });
        this.settings = StoreService.getSettings();
        uni.showToast({ title: '设置已更新', icon: 'success' });
      } catch (error) {
        uni.showToast({ title: error.message || '更新失败', icon: 'none' });
      }
    },
    openUserModal(user) {
      this.editingUser = user || null;
      if (user) {
        this.userForm = { ...user };
      } else {
        this.userForm = {
          name: '',
          phone: '',
          branch: this.branchNameOptions[0] || '',
          role: 'manager'
        };
      }
      const idx = Math.max(
        this.branchNameOptions.findIndex(name => name === this.userForm.branch),
        0
      );
      this.branchIndex = idx;
      this.userForm.branch = this.branchNameOptions[idx] || '';
      this.roleIndex = this.userForm.role === 'admin' ? 1 : 0;
      this.showUserModal = true;
    },
    closeUserModal() {
      this.showUserModal = false;
    },
    handleBranchPicker(event) {
      this.branchIndex = Number(event.detail.value);
      this.userForm.branch = this.branchNameOptions[this.branchIndex] || '';
    },
    handleRolePicker(event) {
      this.roleIndex = Number(event.detail.value);
      this.userForm.role = this.roleIndex === 1 ? 'admin' : 'manager';
    },
    async submitUserForm() {
      if (!this.userForm.name || !this.userForm.phone) {
        uni.showToast({ title: '请完整填写信息', icon: 'none' });
        return;
      }
      try {
        if (this.editingUser) {
          await StoreService.updateUser(this.editingUser.id, this.userForm);
          uni.showToast({ title: '已更新', icon: 'success' });
        } else {
          await StoreService.addUser(this.userForm);
          uni.showToast({ title: '已新增', icon: 'success' });
        }
        this.closeUserModal();
        await this.refresh();
      } catch (error) {
        uni.showToast({ title: error.message || '保存失败', icon: 'none' });
      }
    },
    async toggleUserStatus(user) {
      try {
        await StoreService.toggleUserStatus(user.id);
        await this.refresh();
      } catch (error) {
        uni.showToast({ title: error.message || '操作失败', icon: 'none' });
      }
    },
    handleResetPassword(user) {
      if (!user) return;
      uni.showModal({
        title: '确认重置',
        content: `确认将【${user.name}】的密码重置为123456？`,
        cancelText: '再想想',
        confirmText: '确认重置',
        confirmColor: '#0f766e',
        success: async res => {
          if (!res.confirm) return;
          try {
            await StoreService.resetPassword(user.id);
            uni.showToast({
              title: '密码已重置',
              icon: 'success'
            });
          } catch (error) {
            uni.showToast({ title: error.message || '重置失败', icon: 'none' });
          }
        }
      });
    },
    gotoProfile() {
      uni.switchTab({ url: '/pages/profile/profile' });
    },
    handleLogout() {
      StoreService.logout();
      this.currentUser = null;
      uni.reLaunch({ url: '/pages/login/login' });
    },
    gotoLogin() {
      uni.navigateTo({ url: '/pages/login/login' });
    },
    gotoUserDetails(employee) {
      uni.navigateTo({
        url: `/pages/user-details/user-details?employeeId=${employee.id}&name=${encodeURIComponent(employee.name)}&branch=${encodeURIComponent(employee.branch)}`
      });
    },
    openBranchModal(branch = null) {
      this.editingBranch = branch;
      this.branchForm = branch ? { ...branch } : { id: '', name: '' };
      this.showBranchModal = true;
    },
    closeBranchModal() {
      this.showBranchModal = false;
      this.editingBranch = null;
      this.branchForm = { id: '', name: '' };
    },
    async saveBranch() {
      const id = (this.branchForm.id || '').trim();
      const name = (this.branchForm.name || '').trim();
      if (!id || !name) {
        uni.showToast({ title: '请输入支行编号和名称', icon: 'none' });
        return;
      }
      try {
        if (this.editingBranch) {
          await StoreService.updateBranch(this.editingBranch.id, { id, name });
          uni.showToast({ title: '已更新支行', icon: 'success' });
        } else {
          await StoreService.addBranch({ id, name });
          uni.showToast({ title: '已新增支行', icon: 'success' });
        }
        this.closeBranchModal();
        this.refreshBranches();
      } catch (error) {
        uni.showToast({ title: error.message || '操作失败', icon: 'none' });
      }
    },
    deleteBranch(branch) {
      uni.showModal({
        title: '删除支行',
        content: `确认删除【${branch.name}】？如有关联用户请先调整所属支行。`,
        confirmColor: '#ef4444',
        success: async res => {
          if (!res.confirm) return;
          try {
            await StoreService.deleteBranch(branch.id);
            uni.showToast({ title: '已删除', icon: 'success' });
            this.refreshBranches();
          } catch (error) {
            uni.showToast({ title: error.message || '删除失败', icon: 'none' });
          }
        }
      });
    },
    openRuleModal(rule = null) {
      if (rule) {
        this.editingRule = rule;
        this.ruleForm = {
          name: rule.name,
          category: rule.category,
          group: rule.group,
          icon: rule.icon,
          color: rule.color,
          hasStockOption: !!rule.hasStockOption,
          stockLabel: rule.stockLabel || '存量',
          pointsNewItem: rule.pointsNew?.item ?? 0,
          pointsNewMillion: rule.pointsNew?.million ?? 0,
          pointsStockItem: rule.pointsStock?.item ?? 0,
          pointsStockMillion: rule.pointsStock?.million ?? 0
        };
      } else {
        this.editingRule = null;
        this.ruleForm = ruleFormDefaults();
      }
      this.selectRuleCategory(this.ruleForm.category);
      this.showRuleModal = true;
    },
    closeRuleModal() {
      this.showRuleModal = false;
      this.editingRule = null;
    },
    selectRuleCategory(value) {
      this.ruleForm.category = value;
      const groups = this.ruleGroupOptions[value] || [];
      if (!groups.some(item => item.value === this.ruleForm.group)) {
        this.ruleForm.group = groups[0]?.value || '';
      }
    },
    selectRuleGroup(value) {
      this.ruleForm.group = value;
    },
    selectRuleIcon(icon) {
      this.ruleForm.icon = icon;
    },
    selectRuleColor(color) {
      this.ruleForm.color = color;
    },
    async submitRuleForm() {
      const name = this.ruleForm.name.trim();
      if (!name) {
        uni.showToast({ title: '请输入业务名称', icon: 'none' });
        return;
      }
      const payload = {
        name,
        category: this.ruleForm.category,
        group: this.ruleForm.group,
        icon: this.ruleForm.icon || 'circle',
        color: this.ruleForm.color || '#0f766e',
        hasStockOption: !!this.ruleForm.hasStockOption,
        stockLabel: this.ruleForm.stockLabel || '存量',
        pointsNew: {
          item: Number(this.ruleForm.pointsNewItem) || 0,
          million: Number(this.ruleForm.pointsNewMillion) || 0
        },
        pointsStock: {
          item: this.ruleForm.hasStockOption ? Number(this.ruleForm.pointsStockItem) || 0 : 0,
          million: this.ruleForm.hasStockOption ? Number(this.ruleForm.pointsStockMillion) || 0 : 0
        }
      };
      try {
        if (this.editingRule) {
          await StoreService.updateRule(this.editingRule.id, payload);
          uni.showToast({ title: '规则已更新', icon: 'success' });
        } else {
          await StoreService.addRule(payload);
          uni.showToast({ title: '规则已新增', icon: 'success' });
        }
        this.closeRuleModal();
        this.refreshRules();
      } catch (error) {
        uni.showToast({ title: error.message || '保存失败', icon: 'none' });
      }
    },
    deleteRule(rule) {
      uni.showModal({
        title: '删除规则',
        content: `确定删除业务【${rule.name}】？`,
        confirmColor: '#ef4444',
        success: async res => {
          if (!res.confirm) return;
          try {
            await StoreService.deleteRule(rule.id);
            uni.showToast({ title: '已删除', icon: 'success' });
            this.refreshRules();
          } catch (error) {
            uni.showToast({ title: error.message || '删除失败', icon: 'none' });
          }
        }
      });
    },
    openRuleDescriptionModal() {
      const source = this.ruleDescriptionSections.length
        ? this.ruleDescriptionSections
        : StoreService.getRuleDescriptionSections();
      this.ruleDescriptionForm = source.map(section => this.createRuleDescriptionSection(section));
      if (!this.ruleDescriptionForm.length) {
        this.ruleDescriptionForm = [this.createRuleDescriptionSection()];
      }
      this.showRuleDescriptionModal = true;
    },
    closeRuleDescriptionModal() {
      this.showRuleDescriptionModal = false;
    },
    createRuleDescriptionSection(section = null) {
      const uid = `rule_desc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      if (!section) {
        return { id: '', uid, title: '', itemsText: '' };
      }
      return {
        id: section.id || '',
        uid,
        title: section.title || '',
        itemsText: Array.isArray(section.items) ? section.items.join('\n') : ''
      };
    },
    addRuleDescriptionSection() {
      this.ruleDescriptionForm.push(this.createRuleDescriptionSection());
    },
    removeRuleDescriptionSection(index) {
      if (this.ruleDescriptionForm.length <= 1) return;
      this.ruleDescriptionForm.splice(index, 1);
    },
    async submitRuleDescriptionForm() {
      const payload = this.ruleDescriptionForm
        .map(section => {
          const items = section.itemsText
            .split('\n')
            .map(item => item.trim())
            .filter(Boolean);
          return {
            id: section.id || section.uid,
            title: section.title.trim(),
            items
          };
        })
        .filter(section => section.title || section.items.length);
      try {
        this.ruleDescriptionSections = await StoreService.updateRuleDescriptionSections(payload);
        uni.showToast({ title: '说明已更新', icon: 'success' });
        this.closeRuleDescriptionModal();
      } catch (error) {
        uni.showToast({ title: error.message || '保存失败', icon: 'none' });
      }
    }
  }
};
</script>

<style scoped>
.admin-page {
  height: 100vh;
  background: #f5f7fb;
  padding: 32rpx;
  padding-bottom: 32rpx;
  overflow: hidden;
  box-sizing: border-box;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  gap: 24rpx;
  margin-bottom: 24rpx;
}

.admin-info {
  flex: 1;
}

.admin-title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #0f172a;
}

.admin-subtitle {
  display: block;
  font-size: 24rpx;
  color: #94a3b8;
  margin-top: 8rpx;
}

.header-actions {
  min-width: 280rpx;
  max-width: 360rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  justify-content: flex-end;
}

.action-chip {
  flex: 1 1 45%;
  min-width: 120rpx;
  border-radius: 999rpx;
  padding: 16rpx 0;
  border: 2rpx solid rgba(15, 118, 110, 0.15);
  background: #fff;
  color: #0f766e;
  font-size: 24rpx;
}

.action-chip.danger {
  border-color: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.admin-tabs {
  display: flex;
  background: #ffffff;
  border-radius: 999rpx;
  padding: 4rpx;
  gap: 4rpx;
  margin-bottom: 24rpx;
}

.admin-tab {
  flex: 1;
  text-align: center;
  border-radius: 999rpx;
  padding: 16rpx 0;
  font-size: 26rpx;
  color: #94a3b8;
}

.admin-tab.active {
  background: #0f766e;
  color: #fff;
  font-weight: 600;
}

.admin-content {
  height: calc(100vh - 320rpx);
  width: 100%;
  overflow-y: auto;
  padding-bottom: 60rpx;
}

.tab-panel {
  width: 100%;
}

.admin-content::-webkit-scrollbar,
.tab-panel::-webkit-scrollbar {
  display: none;
}

.table-wrapper {
  background: #fff;
  border-radius: 24rpx;
  padding: 16rpx;
  overflow-x: auto;
}

.table {
  min-width: 100%;
}

.table-row {
  display: grid;
  grid-template-columns: 60rpx 140rpx 120rpx repeat(3, 120rpx);
  align-items: center;
  padding: 16rpx 12rpx;
  border-bottom: 1px solid #f1f5f9;
  font-size: 26rpx;
  color: #475569;
}

.table-row text {
  text-align: center;
}

.table-row text:nth-child(3) {
  text-align: center;
  white-space: pre-wrap;
  line-height: 1.4;
}

.branch-name {
  text-align: center;
  white-space: pre-wrap;
  line-height: 1.4;
}

.table-header {
  font-size: 24rpx;
  font-weight: 600;
  color: #94a3b8;
}

.highlight {
  color: #0f766e;
  font-weight: 700;
}

.employee-name {
  color: #3b82f6;
  font-weight: 600;
  cursor: pointer;
}

.panel-header {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin-bottom: 16rpx;
  gap: 16rpx;
}

.panel-actions {
  display: flex;
  gap: 12rpx;
}

.panel-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #0f172a;
  flex: 1;
}

.panel-tip {
  font-size: 22rpx;
  color: #94a3b8;
  margin: 12rpx 0;
  display: block;
}

.panel-header--user {
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 200rpx;
  background: #f1f5f9;
  border-radius: 20rpx;
  padding: 16rpx 24rpx;
  font-size: 26rpx;
  color: #0f172a;
  border: none;
}

.panel-header .primary-btn {
  margin-left: auto;
}

.panel-actions .primary-btn,
.panel-actions .ghost-btn {
  margin-left: 0;
}

.user-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #0f172a;
}

.user-branch,
.user-meta {
  display: block;
  font-size: 24rpx;
  color: #94a3b8;
}

.user-actions {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.branch-form {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-bottom: 24rpx;
}

.branch-form__actions {
  display: flex;
  gap: 12rpx;
}

.branch-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.branch-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  border-radius: 20rpx;
  background: #f8fafc;
  font-size: 26rpx;
  color: #0f172a;
}

.branch-name {
  font-size: 26rpx;
  font-weight: 600;
}

.branch-actions {
  display: flex;
  gap: 12rpx;
}

.panel-group {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.panel {
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
}

.rule-groups {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.rule-section {
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
}

.rule-section__header {
  margin-bottom: 16rpx;
}

.rule-section__title {
  font-size: 28rpx;
  font-weight: 600;
  color: #0f172a;
}

.rule-section__subtitle {
  display: block;
  font-size: 24rpx;
  color: #94a3b8;
  margin-top: 4rpx;
}

.rule-card {
  border: 1px solid #eef2ff;
  border-radius: 20rpx;
  padding: 16rpx;
  margin-bottom: 12rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.rule-card--empty {
  border-style: dashed;
  color: #94a3b8;
  text-align: center;
}

.rule-card__main {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.rule-card__icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.rule-card__title {
  font-size: 28rpx;
  font-weight: 600;
  color: #0f172a;
}

.rule-card__meta {
  font-size: 24rpx;
  color: #94a3b8;
  margin-top: 4rpx;
}

.rule-card__points {
  font-size: 24rpx;
  color: #475569;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.rule-card__actions {
  display: flex;
  gap: 12rpx;
}

.switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.switch-label {
  font-size: 26rpx;
  color: #0f172a;
}

.switch-tip {
  font-size: 22rpx;
  color: #94a3b8;
}

.form-item {
  margin-bottom: 16rpx;
}

.form-row {
  display: flex;
  gap: 16rpx;
}

.form-item.half {
  flex: 1;
}

.form-label {
  font-size: 24rpx;
  color: #94a3b8;
}

.form-input,
.picker-value {
  margin-top: 8rpx;
  background: #f8fafc;
  border-radius: 18rpx;
  font-size: 28rpx;
  color: #0f172a;
  width: 100%;
  box-sizing: border-box;
  height: 88rpx;
  line-height: 88rpx;
  padding: 0 24rpx;
  border: none;
}

.form-textarea {
  margin-top: 8rpx;
  width: 100%;
  min-height: 220rpx;
  background: #f8fafc;
  padding: 20rpx 24rpx;
  border-radius: 18rpx;
  font-size: 26rpx;
  color: #0f172a;
  line-height: 1.5;
  border: none;
  box-sizing: border-box;
  resize: vertical;
}

.form-tip {
  font-size: 22rpx;
  color: #94a3b8;
}

.dual-inputs {
  display: flex;
  gap: 12rpx;
  margin-top: 12rpx;
}

.dual-inputs .form-input {
  flex: 1;
}

.input-with-suffix {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.input-with-suffix .form-input {
  flex: 1;
  width: auto;
}

.input-unit {
  font-size: 24rpx;
  color: #94a3b8;
  white-space: nowrap;
}

.segment {
  display: flex;
  background: #f1f5f9;
  border-radius: 18rpx;
  overflow: hidden;
  margin-top: 12rpx;
}

.segment__item {
  flex: 1;
  text-align: center;
  padding: 12rpx 0;
  font-size: 24rpx;
  color: #64748b;
}

.segment__item.active {
  background: #0f766e;
  color: #fff;
  font-weight: 600;
}

.chip-list {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
  margin-top: 12rpx;
}

.chip {
  padding: 12rpx 20rpx;
  border-radius: 999rpx;
  background: #f1f5f9;
  font-size: 24rpx;
  color: #64748b;
}

.chip.active {
  background: #ecfdf5;
  color: #0f766e;
  font-weight: 600;
}

.icon-picker,
.color-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 12rpx;
  margin-bottom: 12rpx;
}

.icon-picker__item {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #475569;
  border: 2rpx solid transparent;
  box-shadow: 0 6rpx 16rpx rgba(15, 23, 42, 0.08);
}

.icon-picker__preview {
  width: 56rpx;
  height: 56rpx;
  border-radius: 16rpx;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-picker__item.active {
  border-color: #0f766e;
  background: #ecfdf5;
  color: #0f766e;
}

.color-picker__item {
  width: 60rpx;
  height: 60rpx;
  border-radius: 18rpx;
  border: 2rpx solid transparent;
}

.color-picker__item.active {
  border-color: #0f172a;
  box-shadow: 0 6rpx 16rpx rgba(15, 23, 42, 0.2);
}

.button-row {
  display: flex;
  gap: 16rpx;
  margin-top: 12rpx;
}

.ghost-btn,
.danger-btn,
.primary-btn,
.light-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  padding: 16rpx 24rpx;
  font-size: 26rpx;
  border: none;
  flex-direction: row;
}

.ghost-btn {
  background: #fff;
  border: 2rpx solid rgba(15, 118, 110, 0.2);
  color: #0f766e;
}

.danger-btn {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.primary-btn {
  background: #0f766e;
  color: #fff;
}

.primary-btn.small {
  padding: 12rpx 20rpx;
  font-size: 24rpx;
}

.ghost-btn.small {
  padding: 12rpx 20rpx;
  font-size: 24rpx;
}

.ghost-btn.full-width,
.primary-btn.full-width {
  width: 92%;
}

.link-btn {
  border: none;
  background: transparent;
  font-size: 24rpx;
  color: #0f766e;
}

.link-btn.danger {
  color: #ef4444;
}

.tab-panel::-webkit-scrollbar {
  display: none;
}

.unauth {
  text-align: center;
  color: #94a3b8;
  margin-top: 80rpx;
}

.modal-overlay {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 32rpx;
}

.modal {
  width: 100%;
  max-width: 640rpx;
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
}

.modal-header {
  background: linear-gradient(to right, #0f766e, #0ea5e9);
  color: #fff;
  padding: 28rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 30rpx;
  font-weight: 600;
}

.modal-close {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.modal-body {
  padding: 24rpx;
}

.rule-form-body {
  padding: 0 0 24rpx;
}

.rule-form-content {
  margin: 0 24rpx;
}

.rule-desc-body {
  max-height: 60vh;
  padding: 0 0 24rpx;
}

.rule-desc-section {
  border-radius: 24rpx;
  padding: 28rpx;
  margin: 0 24rpx 16rpx;
  background: #ffffff;
  box-shadow: 0 20rpx 60rpx rgba(15, 118, 110, 0.08);
}

.rule-desc-body .ghost-btn.full-width {
  margin: 0 24rpx 24rpx;
}

.rule-desc-actions {
  display: flex;
  justify-content: flex-end;
}

.modal-footer {
  padding: 24rpx;
  display: flex;
  gap: 16rpx;
}
</style>

