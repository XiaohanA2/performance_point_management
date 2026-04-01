import { getPFTasks, getPFRankings, getCurrentPeriod, formatPeriod, getPFSettings, updatePFSettings, invalidateTasksCache } from '../../../services/pf-service.js';
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
        invalidateTasksCache();
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
        invalidateTasksCache();
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
            invalidateTasksCache();
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
    async exportPFOverview() {
      if (this.pfOverviewData.length === 0) {
        uni.showToast({ title: '暂无数据可导出', icon: 'none' });
        return;
      }
      try {
        uni.showLoading({ title: '正在生成...' });

        // 确保任务列表已加载
        if (!this.pfTasks || this.pfTasks.length === 0) {
          await this.refreshPFTasks();
        }

        // 使用优化的导出接口（基于聚合表）
        const result = await uniCloud.callFunction({
          name: 'appService',
          data: { action: 'exportPFData', payload: { period: this.pfSelectedPeriod } }
        });

        // 云函数返回结构: { data: { data: [...] } }
        const exportData = result.result?.data?.data || [];

        if (exportData.length === 0) {
          uni.showToast({ title: '暂无数据', icon: 'none' });
          return;
        }

        // 按角色分组用户
        const roleGroups = {
          manager: { label: '客户经理', users: [] },
          lobby_manager: { label: '大堂经理', users: [] },
          elastic_counter: { label: '弹性柜面', users: [] },
          counter_manager: { label: '柜面经理', users: [] }
        };

        exportData.forEach((user) => {
          if (roleGroups[user.role] && user.status === 'active') {
            roleGroups[user.role].users.push(user);
          }
        });

        const csv = this.buildPFExportCsv(roleGroups);
        const filename = `个金业绩汇总_${this.pfSelectedPeriod}.csv`;
        this.savePFExport(csv, filename);
      } catch (e) {
        uni.showToast({ title: e.message || '导出失败', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    },

    buildPFExportCsv(roleGroups) {
      const lines = [];
      const requiredTasks = this.pfRequiredTasks || [];
      const bonusTasks = this.pfBonusTasks || [];

      if (requiredTasks.length === 0) {
        return '\uFEFF';
      }

      Object.keys(roleGroups).forEach(roleKey => {
        const group = roleGroups[roleKey];
        if (group.users.length === 0) return;

        lines.push('');
        lines.push(`${group.label}`);
        lines.push('');

        const headers = ['排名', '姓名', '网点'];
        requiredTasks.forEach(task => {
          headers.push(`${task.taskName}-任务数(${task.unit})`, `${task.taskName}-完成`, `${task.taskName}-得分`);
        });
        headers.push('必选业务总分');
        bonusTasks.forEach(task => {
          headers.push(`${task.taskName}(${task.unit})`);
        });
        lines.push(headers.join(','));

        group.users.sort((a, b) => b.totalScore - a.totalScore).forEach((user, idx) => {
          const row = [idx + 1, user.userName, user.branch || '-'];

          requiredTasks.forEach(task => {
            const target = user.taskTargets?.[task.taskId] || 0;
            const completed = user.taskTotals?.[task.taskId] || 0;
            const score = user.taskScores?.[task.taskId] || 0;
            row.push(target, completed, score.toFixed(2));
          });

          row.push((user.requiredScore || 0).toFixed(2));

          bonusTasks.forEach(task => {
            const completed = user.taskTotals?.[task.taskId] || 0;
            row.push(completed);
          });

          lines.push(row.join(','));
        });
      });

      return '\uFEFF' + lines.join('\n');
    },

    savePFExport(csv, filename) {
      // #ifdef H5
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      uni.showToast({ title: '导出成功', icon: 'success' });
      // #endif
      // #ifdef MP-WEIXIN
      try {
        const fs = wx.getFileSystemManager();
        const filePath = `${wx.env.USER_DATA_PATH}/${filename}`;
        console.log('准备写入文件:', filePath);
        try {
          const files = fs.readdirSync(wx.env.USER_DATA_PATH) || [];
          files.filter(name => /\.(csv)$/.test(name)).forEach(name => {
            try { fs.unlinkSync(`${wx.env.USER_DATA_PATH}/${name}`); } catch (e) {}
          });
        } catch (e) {}
        fs.writeFileSync(filePath, csv, 'utf-8');
        console.log('文件写入成功');

        // 验证文件是否存在
        try {
          const stat = fs.statSync(filePath);
          console.log('文件大小:', stat.size);
        } catch (e) {
          console.error('文件验证失败', e);
        }

        if (wx.shareFileMessage) {
          console.log('调用 wx.shareFileMessage');
          wx.shareFileMessage({
            filePath: filePath,
            fileName: filename,
            success: () => {
              console.log('分享成功');
              uni.showToast({ title: '分享成功', icon: 'success' });
            },
            fail: (error) => {
              console.error('wx.shareFileMessage 失败', error);
              uni.openDocument({
                filePath,
                fileType: 'csv',
                showMenu: true,
                success: () => uni.showToast({ title: '文件已打开，可手动分享', icon: 'success' }),
                fail: () => uni.showModal({
                  title: '导出成功',
                  content: '文件已生成，可通过"微信-我-设置-通用-文件管理"查看',
                  showCancel: false
                })
              });
            }
          });
        } else {
          console.log('wx.shareFileMessage 不可用');
          uni.openDocument({
            filePath,
            fileType: 'csv',
            showMenu: true,
            success: () => uni.showToast({ title: '文件已打开，可手动分享', icon: 'success' }),
            fail: () => uni.showToast({ title: '当前微信版本不支持分享', icon: 'none' })
          });
        }
      } catch (error) {
        console.error('导出异常', error);
        uni.showToast({ title: '导出失败：' + (error.message || ''), icon: 'none' });
      }
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
