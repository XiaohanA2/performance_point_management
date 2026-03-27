import { getPFTasks, getPFRankings, getCurrentPeriod, formatPeriod, getPFSettings, updatePFSettings } from '../../../services/pf-service.js';
import { StoreService } from '../../../services/store.js';

const PF_RULE_DEFAULT_SECTIONS = [
  {
    id: 'required',
    title: '必选业务（贡献度积分）',
    items: [
      '必选业务采用组内相对排名计分，同角色员工之间相互比较',
      '完成数 = 0 时，该项得分为 0 分',
      '完成数 ≥ 组内平均：得分 = 权重分 + (完成数 - 平均) ÷ (最高 - 平均) × 权重分 × 40%',
      '完成数 < 组内平均：得分 = 权重分 - (平均 - 完成数) ÷ (平均 - 最低) × 权重分 × 40%',
      '单项得分最高不超过该业务封顶分'
    ]
  },
  {
    id: 'bonus',
    title: '加分业务（线性积分）',
    items: [
      '加分业务按完成数线性计分，与他人无关',
      '得分 = 完成数 × 单位分数',
      '部分业务设有单项上限，超出上限部分不计入'
    ]
  },
  {
    id: 'cap',
    title: '封顶规则',
    items: [
      '所有加分业务合计得分上限为 40 分',
      '必选业务总分不设上限（受各项封顶分限制）'
    ]
  }
];


const pfTaskFormDefaults = () => ({
  taskName: '',
  category: 'required',
  unit: '户',
  description: '',
  scoreConfig: {
    weightScore: 10,
    maxScore: 20,
    unitPrice: 0,
    maxScoreBonus: null
  },
  targetByRole: {
    manager: 0,
    lobby_manager: 0,
    elastic_counter: 0,
    counter_manager: 0
  },
  isActive: true
});

export const pfAdminMixin = {
  data() {
    return {
      // 个金任务管理
      pfTasks: [],
      showPFTaskModal: false,
      editingPFTask: null,
      pfTaskForm: pfTaskFormDefaults(),
      pfTaskCategory: 'required',

      // 个金业绩汇总
      pfOverviewData: [],
      pfSelectedPeriod: getCurrentPeriod(),
      pfPeriodOptions: this.generatePeriodOptions(),
      pfSearchKeyword: '',
      pfSelectedRole: 'manager',

      // 系统设置
      pfSettings: {
        allowEditSubmission: true,
        allowDeleteSubmission: true
      },

      // 规则管理
      pfRuleContent: { sections: [] },
      showPFRuleModal: false,
      pfEditRuleSections: [],

      // UI options
      pfCategoryOptions: [
        { value: 'required', label: '必选业务' },
        { value: 'bonus', label: '加分业务' }
      ],
      pfUnitOptions: ['户', '笔', '万元', '人', '个', '次'],
      pfRoleOptions: [
        { value: 'manager', label: '客户经理' },
        { value: 'lobby_manager', label: '大堂经理' },
        { value: 'elastic_counter', label: '弹性柜面' },
        { value: 'counter_manager', label: '柜面经理' }
      ]
    };
  },

  computed: {
    pfRequiredTasks() {
      return this.pfTasks.filter(t => t.category === 'required');
    },
    pfBonusTasks() {
      return this.pfTasks.filter(t => t.category === 'bonus');
    },
    filteredPFOverviewData() {
      let data = this.pfOverviewData.filter(item => item.role === this.pfSelectedRole);
      if (this.pfSearchKeyword.trim()) {
        const kw = this.pfSearchKeyword.trim().toLowerCase();
        data = data.filter(item =>
          item.userName.toLowerCase().includes(kw) ||
          (item.branch || item.branchName || '').toLowerCase().includes(kw)
        );
      }
      return data;
    },
    pfCurrentPeriod() {
      return formatPeriod(this.pfSelectedPeriod);
    }
  },

  methods: {
    generatePeriodOptions() {
      const options = [];
      const now = new Date();
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        options.push(`${y}-${m}`);
      }
      return options;
    },

    formatPeriod,

    getRoleLabel(role) {
      return StoreService.getRoleName(role);
    },

    // ========== 任务管理 ==========
    async refreshPFTasks() {
      try {
        const tasks = await getPFTasks({ isActive: undefined });
        this.pfTasks = tasks;
      } catch (e) {
        uni.showToast({ title: e.message || '加载失败', icon: 'none' });
      }
    },

    openPFTaskModal(task) {
      if (task) {
        this.editingPFTask = task;
        this.pfTaskCategory = task.category;
        this.pfTaskForm = {
          taskName: task.taskName,
          category: task.category,
          unit: task.unit,
          description: task.description || '',
          scoreConfig: { ...task.scoreConfig },
          targetByRole: task.targetByRole ? { ...task.targetByRole } : { manager: 0, lobby_manager: 0, elastic_counter: 0, counter_manager: 0 },
          isActive: task.isActive
        };
      } else {
        this.editingPFTask = null;
        this.pfTaskForm = pfTaskFormDefaults();
        this.pfTaskForm.category = this.pfTaskCategory;
      }
      this.showPFTaskModal = true;
    },

    closePFTaskModal() {
      this.showPFTaskModal = false;
      this.editingPFTask = null;
      this.pfTaskForm = pfTaskFormDefaults();
    },

    async submitPFTaskForm() {
      const form = this.pfTaskForm;
      if (!form.taskName.trim()) {
        uni.showToast({ title: '请输入任务名称', icon: 'none' });
        return;
      }
      try {
        uni.showLoading({ title: '保存中...' });
        const action = this.editingPFTask ? 'updatePFTask' : 'createPFTask';
        const payload = {
          ...form,
          user: this.currentUser
        };
        if (this.editingPFTask) {
          payload.taskId = this.editingPFTask.taskId;
        }
        const result = await uniCloud.callFunction({
          name: 'appService',
          data: { action, payload }
        });
        if (result.result.error) throw new Error(result.result.error);
        uni.showToast({ title: '保存成功', icon: 'success' });
        this.closePFTaskModal();
        await this.refreshPFTasks();
      } catch (e) {
        uni.showToast({ title: e.message || '保存失败', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    },

    async togglePFTaskStatus(task) {
      try {
        uni.showLoading({ title: '操作中...' });
        const result = await uniCloud.callFunction({
          name: 'appService',
          data: {
            action: 'togglePFTask',
            payload: { taskId: task.taskId, isActive: !task.isActive, user: this.currentUser }
          }
        });
        if (result.result.error) throw new Error(result.result.error);
        uni.showToast({ title: task.isActive ? '已停用' : '已启用', icon: 'success' });
        await this.refreshPFTasks();
      } catch (e) {
        uni.showToast({ title: e.message || '操作失败', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    },

    deletePFTask(task) {
      uni.showModal({
        title: '确认删除',
        content: `确定删除「${task.taskName}」？删除后不可恢复。`,
        confirmColor: '#ef4444',
        success: async res => {
          if (!res.confirm) return;
          try {
            uni.showLoading({ title: '删除中...' });
            const result = await uniCloud.callFunction({
              name: 'appService',
              data: {
                action: 'deletePFTask',
                payload: { taskId: task.taskId, user: this.currentUser }
              }
            });
            if (result.result.error) throw new Error(result.result.error);
            uni.showToast({ title: '已删除', icon: 'success' });
            await this.refreshPFTasks();
          } catch (e) {
            uni.showToast({ title: e.message || '删除失败', icon: 'none' });
          } finally {
            uni.hideLoading();
          }
        }
      });
    },

    // ========== 业绩汇总 ==========
    async loadPFOverview() {
      try {
        uni.showLoading({ title: '加载中...' });
        const data = await getPFRankings(this.pfSelectedPeriod, 500);
        this.pfOverviewData = data;
      } catch (e) {
        uni.showToast({ title: e.message || '加载失败', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    },

    handlePFPeriodChange(e) {
      this.pfSelectedPeriod = this.pfPeriodOptions[e.detail.value];
      this.loadPFOverview();
    },

    gotoPFUserDetails(item) {
      const url = `/pages/pf-admin/pf-user-details/pf-user-details?userId=${item.userId}&name=${encodeURIComponent(item.userName)}&branch=${encodeURIComponent(item.branch || item.branchName || '')}&role=${item.role}`;
      uni.navigateTo({ url });
    },

    navigateToPFSubmissionFlow() {
      uni.navigateTo({ url: '/pages/pf-admin/pf-submission-flow/pf-submission-flow' });
    },

    // ========== 导出 ==========
    exportPFOverview() {
      if (this.filteredPFOverviewData.length === 0) {
        uni.showToast({ title: '暂无数据可导出', icon: 'none' });
        return;
      }
      const header = '排名,姓名,支行,角色,必选分,加分分,总分';
      const rows = this.filteredPFOverviewData.map((item, i) =>
        `${i + 1},${item.userName},${item.branch || item.branchName || '-'},${this.getRoleLabel(item.role)},${item.requiredScore},${item.bonusScore},${item.totalScore}`
      );
      const csv = [header, ...rows].join('\n');
      this.savePFExport(csv, `个金业绩汇总_${this.pfSelectedPeriod}.csv`);
    },

    savePFExport(csv, filename) {
      // #ifdef H5
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      uni.showToast({ title: '导出成功', icon: 'success' });
      // #endif
      // #ifdef MP-WEIXIN
      uni.setClipboardData({
        data: csv,
        success: () => uni.showToast({ title: '数据已复制到剪贴板', icon: 'success' })
      });
      // #endif
    },

    // ========== 系统设置 ==========
    async loadPFSettings() {
      try {
        const data = await getPFSettings();
        if (data) {
          this.pfSettings = {
            allowEditSubmission: data.allowEditSubmission !== false,
            allowDeleteSubmission: data.allowDeleteSubmission !== false
          };
        }
      } catch (e) {
        console.error('加载设置失败', e);
      }
    },

    async savePFSettings() {
      try {
        uni.showLoading({ title: '保存中...' });
        await updatePFSettings(this.pfSettings);
        uni.showToast({ title: '设置已保存', icon: 'success' });
      } catch (e) {
        uni.showToast({ title: e.message || '保存失败', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    },

    // ========== Tab 切换 ==========
    handleTabChange(key) {
      if (key === 'overview') this.loadPFOverview();
      if (key === 'tasks') this.refreshPFTasks();
      if (key === 'settings') this.loadPFSettings();
      if (key === 'rules') this.loadPFRuleContent();
    },

    // ========== 规则管理 ==========
    async loadPFRuleContent() {
      try {
        const data = await getPFSettings();
        const sections = data && data.ruleContent && data.ruleContent.sections;
        this.pfRuleContent = {
          sections: sections && sections.length > 0
            ? sections
            : JSON.parse(JSON.stringify(PF_RULE_DEFAULT_SECTIONS))
        };
      } catch (e) {
        console.error('加载规则失败', e);
        this.pfRuleContent = { sections: JSON.parse(JSON.stringify(PF_RULE_DEFAULT_SECTIONS)) };
      }
    },

    openPFRuleEditModal() {
      // 将 sections 转换为可编辑格式（items 数组 → 换行文本）
      this.pfEditRuleSections = this.pfRuleContent.sections.map(s => ({
        id: s.id,
        title: s.title,
        itemsText: (s.items || []).join('\n')
      }));
      this.showPFRuleModal = true;
    },

    closePFRuleModal() {
      this.showPFRuleModal = false;
    },

    addPFRuleSection() {
      this.pfEditRuleSections.push({ id: 'section_' + Date.now(), title: '', itemsText: '' });
    },

    removePFRuleSection(index) {
      this.pfEditRuleSections.splice(index, 1);
    },

    async savePFRuleContent() {
      const sections = this.pfEditRuleSections
        .filter(s => s.title.trim())
        .map(s => ({
          id: s.id,
          title: s.title.trim(),
          items: s.itemsText.split('\n').map(l => l.trim()).filter(Boolean)
        }));
      try {
        uni.showLoading({ title: '保存中...' });
        await updatePFSettings({ ruleContent: { sections } });
        this.pfRuleContent = { sections };
        this.showPFRuleModal = false;
        uni.showToast({ title: '规则已保存', icon: 'success' });
      } catch (e) {
        uni.showToast({ title: e.message || '保存失败', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    },

    // ========== 辅助 ==========
    getPFTaskName(taskId) {
      const task = this.pfTasks.find(t => t.taskId === taskId);
      return task ? task.taskName : '未知业务';
    },

    getPFTaskUnit(taskId) {
      const task = this.pfTasks.find(t => t.taskId === taskId);
      return task ? task.unit : '';
    }
  }
};
