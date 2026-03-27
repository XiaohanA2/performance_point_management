import { StoreService } from '../../../services/store.js';

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
  pointsStockMillion: 0,
  hidden: false
});

export const rulesTabMixin = {
  data() {
    return {
      rules: StoreService.getRules(),
      ruleDescriptionSections: StoreService.getRuleDescriptionSections(),
      showRuleModal: false,
      showRuleDescriptionModal: false,
      editingRule: null,
      ruleForm: ruleFormDefaults(),
      ruleDescriptionForm: [],
      ruleTabType: 'business', // business - 业务规则, bonus - 奖励规则
      // UI options
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
    currentRuleGroups() {
      return this.ruleGroupOptions[this.ruleForm.category] || [];
    },

    RULE_SECTIONS() {
      return RULE_SECTIONS;
    }
  },

  methods: {
    refreshRules() {
      this.rules = StoreService.getRules();
      this.ruleDescriptionSections = StoreService.getRuleDescriptionSections();
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
          pointsStockMillion: rule.pointsStock?.million ?? 0,
          hidden: !!rule.hidden
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
        },
        hidden: this.ruleForm.hidden
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

    async toggleRuleHidden(rule) {
      try {
        const newHiddenState = !rule.hidden;
        await StoreService.updateRule(rule.id, { hidden: newHiddenState });

        uni.showToast({
          title: newHiddenState ? '已隐藏' : '已显示',
          icon: 'success'
        });

        const index = this.rules.findIndex(r => r.id === rule.id);
        if (index !== -1) {
          this.rules.splice(index, 1, { ...this.rules[index], hidden: newHiddenState });
        } else {
          this.refreshRules();
        }
      } catch (error) {
        uni.showToast({
          title: error.message || '操作失败',
          icon: 'none'
        });
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
    }
  }
};
