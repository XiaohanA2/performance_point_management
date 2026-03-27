<template>
  <view class="dashboard">
    <!-- 系统切换 Tab -->
    <view v-if="canSwitch" class="system-tabs">
      <view class="system-tab" :class="{ active: systemMode === 'credit' }" @click="switchMode('credit')">信贷系统</view>
      <view class="system-tab" :class="{ active: systemMode === 'pf' }" @click="switchMode('pf')">岗位穿透</view>
    </view>

    <!-- 个贷系统 -->
    <template v-if="systemMode === 'credit'">
      <ScoreDial
        v-if="currentUser"
        :total-score="stats.totalScore"
        :personal-score="stats.personalScore"
        :micro-score="stats.microScore"
        :bonus-amount="stats.bonusAmount"
        :name="currentUser ? currentUser.name : ''"
        :rank="myRank"
        :quarter="currentQuarter"
      />

      <view v-if="isAdmin" class="admin-entry">
        <button class="admin-btn" @click="gotoAdmin">
          <uni-icons type="gear" :size="24" color="#0f766e" />
          进入个贷管理
        </button>
      </view>

      <QuestionnaireFloatButton :hasNew="hasNewQuestionnaire" :newCount="newQuestionnaireCount" />

      <view v-if="currentUser && currentUser.role === 'guest'" class="guest-banner">
        <view class="guest-banner__icon">
          <uni-icons type="person" :size="28" color="#0f766e" />
        </view>
        <view class="guest-banner__body">
          <text class="guest-banner__title">当前为游客模式</text>
          <text class="guest-banner__desc">登录后可使用积分提报、查看个人排名等功能</text>
        </view>
        <button class="guest-banner__btn" @click="gotoLogin">登录</button>
      </view>

      <view class="section-header">
        <text class="section-title">积分提报</text>
        <view class="header-actions">
          <button class="icon-btn" @click="showRules = true">
            <uni-icons type="help" :size="24" color="#0f766e" />
            <text class="icon-text">规则</text>
          </button>
          <view class="icon-btn-wrap">
            <button class="icon-btn" @click="gotoKnowledge">
              <uni-icons type="star" :size="24" color="#0f766e" />
              <text class="icon-text">知识库</text>
            </button>
            <view class="new-dot"></view>
          </view>
        </view>
      </view>

      <view class="category-group">
        <view class="category-tag"><view class="title-dot" />个贷业务</view>
        <view v-for="panel in personalSections" :key="panel.id" class="category-card" :class="panel.theme">
          <view class="category-card__header" @tap="togglePanel(panel.id)">
            <view class="category-card__title">
              <view class="category-card__title-icon"><uni-icons :type="panel.icon" :size="28" color="#fff" /></view>
              <view>
                <text class="category-card__title-text">{{ panel.title }}</text>
                <text class="category-card__subtitle">{{ panel.subtitle }}</text>
              </view>
            </view>
            <view class="category-card__arrow" :class="{ collapsed: isCollapsed(panel.id) }">
              <uni-icons type="chevron" :size="28" color="#0f172a" />
            </view>
          </view>
          <view v-show="!isCollapsed(panel.id)" class="category-card__body">
            <TaskCard v-for="rule in panel.rules" :key="rule.id" :rule="rule" @submit="payload => handleSubmit(rule, payload)" />
          </view>
        </view>
      </view>

      <view class="category-group">
        <view class="category-tag"><view class="title-dot" />小微业务</view>
        <view v-for="panel in microSections" :key="panel.id" class="category-card" :class="panel.theme">
          <view class="category-card__header" @tap="togglePanel(panel.id)">
            <view class="category-card__title">
              <view class="category-card__title-icon"><uni-icons :type="panel.icon" :size="28" color="#fff" /></view>
              <view>
                <text class="category-card__title-text">{{ panel.title }}</text>
                <text class="category-card__subtitle">{{ panel.subtitle }}</text>
              </view>
            </view>
            <view class="category-card__arrow" :class="{ collapsed: isCollapsed(panel.id) }">
              <uni-icons type="chevron" :size="28" color="#0f172a" />
            </view>
          </view>
          <view v-show="!isCollapsed(panel.id)" class="category-card__body">
            <TaskCard v-for="rule in panel.rules" :key="rule.id" :rule="rule" @submit="payload => handleSubmit(rule, payload)" />
          </view>
        </view>
      </view>

      <view v-if="showRules" class="rules-overlay" @click.self="showRules = false" @touchmove.stop.prevent>
        <view class="rules-sheet" @tap.stop>
          <view class="rules-sheet__handle" />
          <view class="rules-sheet__header">
            <view class="rules-sheet__header-icon">
              <uni-icons type="help" :size="20" color="#0f766e" />
            </view>
            <text class="rules-sheet__title">计分规则说明</text>
            <view class="rules-sheet__close" @click="showRules = false">
              <uni-icons type="closeempty" :size="18" color="#94a3b8" />
            </view>
          </view>
          <scroll-view scroll-y class="rules-sheet__body">
            <view v-if="!ruleDescriptionSections.length" class="rules-sheet__empty">暂未配置规则说明</view>
            <view v-for="section in ruleDescriptionSections" :key="section.id" class="rules-section">
              <view class="rules-section__title-row">
                <view class="rules-section__accent" />
                <text class="rules-section__title">{{ section.title }}</text>
              </view>
              <view v-for="(item, index) in section.items" :key="index" class="rules-item">
                <view class="rules-item__dot" />
                <view class="rules-item__text">{{ item }}</view>
              </view>
            </view>
          </scroll-view>
          <view class="rules-sheet__footer">
            <button class="rules-sheet__btn" @click="showRules = false">我已知晓</button>
          </view>
        </view>
      </view>
    </template>

    <!-- 个金系统 -->
    <template v-if="systemMode === 'pf'">
      <ScoreDial
        v-if="currentUser"
        :total-score="pfStats.totalScore"
        :personal-score="pfStats.requiredScore"
        :micro-score="pfStats.bonusScore"
        :hide-bonus="true"
        :name="currentUser ? currentUser.name : ''"
        :rank="pfMyRank"
        :quarter="pfCurrentPeriod"
        :personal-label="'必选业务分'"
        :micro-label="'加分业务分'"
      />

      <view v-if="currentUser && currentUser.role === 'guest'" class="guest-banner">
        <view class="guest-banner__icon">
          <uni-icons type="person" :size="28" color="#0f766e" />
        </view>
        <view class="guest-banner__body">
          <text class="guest-banner__title">当前为游客模式</text>
          <text class="guest-banner__desc">登录后可使用积分提报、查看个人排名等功能</text>
        </view>
        <button class="guest-banner__btn" @click="gotoLogin">登录</button>
      </view>
      <!-- 个金管理入口 -->
      <view v-if="isPFAdmin" class="admin-entry">
        <button class="admin-btn" @click="gotoPFAdmin">
          <uni-icons type="gear" :size="24" color="#0f766e" />
          <text>进入个金管理</text>
        </button>
      </view>

      <QuestionnaireFloatButton :hasNew="hasNewQuestionnaire" :newCount="newQuestionnaireCount" />

      <view class="section-header">
        <text class="section-title">积分提报</text>
        <view class="rule-hint-btn" @tap="openPFRuleModal">
          <uni-icons type="info" :size="16" color="#0f766e" />
          <text class="rule-hint-text">规则说明</text>
        </view>
      </view>

      <!-- 必选/加分 Tab -->
      <view class="pf-tabs">
        <view class="pf-tab" :class="{ active: pfActiveTab === 'required' }" @tap="pfActiveTab = 'required'">
          <text>必选业务</text>
          <text class="pf-tab-badge">{{ pfRequiredTasks.length }}</text>
        </view>
        <view class="pf-tab" :class="{ active: pfActiveTab === 'bonus' }" @tap="pfActiveTab = 'bonus'">
          <text>加分业务</text>
          <text class="pf-tab-badge bonus">{{ pfBonusTasks.length }}</text>
        </view>
      </view>

      <!-- 必选业务网格 -->
      <view v-if="pfActiveTab === 'required'" class="pf-grid">
        <view v-for="task in pfRequiredTasks" :key="task.taskId" class="pf-grid-card" @tap="openPFModal(task)">
          <view class="pf-grid-card__top">
            <view class="pf-grid-card__icon required">
              <uni-icons type="star" :size="18" color="#0f766e" />
            </view>
            <text class="pf-grid-card__name">{{ task.taskName }}</text>
          </view>
          <!-- 进度：xx/xx 单位 · xx% -->
          <view class="pf-grid-card__progress-row">
            <text class="pf-grid-card__value">{{ task.totalValue || 0 }}</text>
            <text class="pf-grid-card__sep">/</text>
            <text class="pf-grid-card__target">{{ task.target || '?' }} {{ task.unit }}</text>
            <text class="pf-grid-card__pct" v-if="task.target"> · {{ Math.min(100, Math.round((task.totalValue || 0) / task.target * 100)) }}%</text>
          </view>
          <!-- 进度条 -->
          <view class="pf-grid-card__bar-wrap">
            <view class="pf-grid-card__bar-fill"
              :style="{ width: (task.target ? Math.min((task.totalValue || 0) / task.target * 100, 100) : 0) + '%' }"
              :class="{ done: task.target && (task.totalValue || 0) >= task.target }"
            />
          </view>
          <!-- 得分 + 排名 -->
          <view class="pf-grid-card__foot">
            <view class="pf-grid-card__score-block">
              <text class="pf-grid-card__score">得 {{ (task.score || 0).toFixed(1) }} 分</text>
              <text class="pf-grid-card__cap" v-if="task.scoreConfig && task.scoreConfig.maxScore">上限 {{ task.scoreConfig.maxScore }} 分</text>
            </view>
            <text class="pf-grid-card__rank" v-if="pfMyRank > 0 && pfGroupSize > 0">组内 {{ pfMyRank }}/{{ pfGroupSize }}</text>
          </view>
        </view>
      </view>

      <!-- 加分业务网格 -->
      <view v-if="pfActiveTab === 'bonus'" class="pf-grid">
        <view v-for="task in pfBonusTasks" :key="task.taskId" class="pf-grid-card bonus" @tap="openPFModal(task)">
          <view class="pf-grid-card__top">
            <view class="pf-grid-card__icon bonus">
              <uni-icons type="gift" :size="18" color="#f97316" />
            </view>
            <text class="pf-grid-card__name">{{ task.taskName }}</text>
          </view>
          <!-- 完成量 -->
          <view class="pf-grid-card__progress-row">
            <text class="pf-grid-card__value bonus">{{ task.totalValue || 0 }}</text>
            <text class="pf-grid-card__target"> {{ task.unit }}</text>
          </view>
          <!-- 得分 + 上限 -->
          <view class="pf-grid-card__foot">
            <view class="pf-grid-card__score-block">
              <text class="pf-grid-card__score bonus">+{{ (task.score || 0).toFixed(1) }} 分</text>
              <text class="pf-grid-card__cap" v-if="task.scoreConfig && task.scoreConfig.maxScore">上限 {{ task.scoreConfig.maxScore }} 分</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 个金提报弹窗 -->
      <view v-if="pfModalTask" class="modal-overlay" @tap.self="closePFModal" @touchmove.stop.prevent>
        <view class="pf-submit-modal" @tap.stop :style="{ marginBottom: keyboardHeight ? keyboardHeight + 8 + 'px' : '0' }">
          <!-- 头部 -->
          <view class="pf-submit-modal__header">
            <view class="pf-submit-modal__header-left">
              <view class="pf-submit-modal__tag" :class="pfModalTask.category === 'required' ? 'tag-required' : 'tag-bonus'">
                {{ pfModalTask.category === 'required' ? '必选' : '加分' }}
              </view>
              <text class="pf-submit-modal__title">{{ pfModalTask.taskName }}</text>
            </view>
            <view class="pf-submit-modal__close" @tap="pfModalTask = null">
              <uni-icons type="closeempty" :size="20" color="rgba(255,255,255,0.7)" />
            </view>
          </view>

          <view class="pf-submit-modal__body">
            <!-- 必选业务：进度卡片 -->
            <view v-if="pfModalTask.category === 'required'" class="pf-submit-modal__progress-card">
              <view class="pf-progress-row">
                <view class="pf-progress-stat">
                  <text class="pf-progress-stat__value">{{ pfModalTask.totalValue || 0 }}</text>
                  <text class="pf-progress-stat__label">已完成</text>
                </view>
                <view class="pf-progress-divider" />
                <view class="pf-progress-stat">
                  <text class="pf-progress-stat__value">{{ pfModalTask.target || '-' }}</text>
                  <text class="pf-progress-stat__label">月度目标</text>
                </view>
                <view class="pf-progress-divider" />
                <view class="pf-progress-stat">
                  <text class="pf-progress-stat__value">{{ pfModalTask.unit }}</text>
                  <text class="pf-progress-stat__label">单位</text>
                </view>
              </view>
              <view class="pf-progress-bar-wrap">
                <view class="pf-progress-bar-track">
                  <view class="pf-progress-bar-fill" :style="{ width: Math.min(100, pfModalTask.target ? Math.round((pfModalTask.totalValue || 0) / pfModalTask.target * 100) : 0) + '%' }" />
                </view>
                <text class="pf-progress-pct">{{ pfModalTask.target ? Math.min(100, Math.round((pfModalTask.totalValue || 0) / pfModalTask.target * 100)) : 0 }}%</text>
              </view>
            </view>

            <!-- 加分业务：积分规则卡片 -->
            <view v-else class="pf-submit-modal__rule-card">
              <view class="pf-rule-item">
                <text class="pf-rule-item__label">计分规则</text>
                <text class="pf-rule-item__value">{{ pfModalTask.scoreConfig && pfModalTask.scoreConfig.unitPrice }} 分 / {{ pfModalTask.unit }}</text>
              </view>
              <view v-if="pfModalTask.scoreConfig && pfModalTask.scoreConfig.maxScore" class="pf-rule-item">
                <text class="pf-rule-item__label">单项上限</text>
                <text class="pf-rule-item__value accent">{{ pfModalTask.scoreConfig.maxScore }} 分</text>
              </view>
            </view>

            <!-- 输入区 -->
            <view class="pf-submit-modal__input-wrap">
              <text class="pf-submit-modal__label">本次完成数量</text>
              <view class="pf-submit-modal__input-row">
                <input
                  class="pf-submit-modal__input"
                  type="digit"
                  v-model="pfModalValue"
                  :placeholder="'输入' + pfModalTask.unit + '数'"
                  focus
                />
                <text class="pf-submit-modal__unit">{{ pfModalTask.unit }}</text>
              </view>
            </view>

            <!-- 加分业务实时预览 -->
            <view v-if="pfModalValue && parseFloat(pfModalValue) > 0 && pfModalTask.category === 'bonus'" class="pf-submit-modal__preview">
              <text class="pf-submit-modal__preview-label">预计获得积分</text>
              <text class="pf-submit-modal__preview-score">
                +{{ (pfModalTask.scoreConfig && pfModalTask.scoreConfig.maxScore != null
                  ? Math.min(pfModalTask.scoreConfig.maxScore, parseFloat(pfModalValue) * (pfModalTask.scoreConfig.unitPrice || 0))
                  : parseFloat(pfModalValue) * (pfModalTask.scoreConfig && pfModalTask.scoreConfig.unitPrice || 0)
                ).toFixed(1) }}
              </text>
            </view>

            <!-- 必选业务提报后预览 -->
            <view v-if="pfModalValue && parseFloat(pfModalValue) > 0 && pfModalTask.category === 'required'" class="pf-submit-modal__preview">
              <text class="pf-submit-modal__preview-label">提报后累计完成</text>
              <text class="pf-submit-modal__preview-score">
                {{ (pfModalTask.totalValue || 0) + parseFloat(pfModalValue) }} {{ pfModalTask.unit }}
              </text>
            </view>
          </view>

          <!-- 底部按钮 -->
          <view class="pf-submit-modal__footer">
            <button class="pf-submit-modal__btn ghost" @tap="closePFModal">取消</button>
            <button class="pf-submit-modal__btn primary" @tap="confirmPFModalSubmit">确认提报</button>
          </view>
        </view>
      </view>
    </template>

    <!-- 规则说明弹窗（个贷/个金共用） -->
    <view v-if="showPFRuleModal" class="rules-overlay" @tap.self="showPFRuleModal = false" @touchmove.stop.prevent>
      <view class="rules-sheet" @tap.stop>
        <view class="rules-sheet__handle" />
        <view class="rules-sheet__header">
          <view class="rules-sheet__header-icon">
            <uni-icons type="info" :size="20" color="#0f766e" />
          </view>
          <text class="rules-sheet__title">积分规则说明</text>
          <view class="rules-sheet__close" @tap="showPFRuleModal = false">
            <uni-icons type="closeempty" :size="18" color="#94a3b8" />
          </view>
        </view>
        <scroll-view scroll-y class="rules-sheet__body">
          <view v-if="pfRuleSections.length === 0" class="rules-sheet__empty">暂无规则说明</view>
          <view v-for="section in pfRuleSections" :key="section.id" class="rules-section">
            <view class="rules-section__title-row">
              <view class="rules-section__accent" />
              <text class="rules-section__title">{{ section.title }}</text>
            </view>
            <view v-for="(item, i) in section.items" :key="i" class="rules-item">
              <view class="rules-item__dot" />
              <view class="rules-item__text">{{ item }}</view>
            </view>
          </view>
        </scroll-view>
        <view class="rules-sheet__footer">
          <button class="rules-sheet__btn" @tap="showPFRuleModal = false">我已知晓</button>
        </view>
      </view>
    </view>

    <!-- 默认密码提醒弹框 -->
    <view v-if="showPasswordReminder" class="modal-overlay" @touchmove.stop.prevent>
      <view class="modal" @tap.stop>
        <view class="modal-header">
          <uni-icons type="locked" :size="20" color="#fff" />
          <text>安全提示</text>
        </view>
        <view class="modal-body">
          <view class="security-notice">
            <uni-icons type="info" :size="48" color="#f59e0b" />
            <text class="notice-text">检测到您正在使用默认密码</text>
            <text class="notice-desc">为了账号安全，建议立即修改密码</text>
          </view>
          <view class="form-item">
            <text class="form-label">新密码</text>
            <input class="form-input" type="password" v-model="passwordForm.newPassword" placeholder="请输入新密码（至少6位）" />
          </view>
          <view class="form-item">
            <text class="form-label">确认新密码</text>
            <input class="form-input" type="password" v-model="passwordForm.confirmPassword" placeholder="请再次输入新密码" />
          </view>
        </view>
        <view class="modal-footer">
          <button class="modal-btn ghost" @click="dismissPasswordReminder">下次再说</button>
          <button class="modal-btn primary" @click="handleChangePassword">立即修改</button>
        </view>
      </view>
    </view>

  </view>
</template>

<script>
import ScoreDial from '../../components/ScoreDial.vue';
import TaskCard from '../../components/TaskCard.vue';
import QuestionnaireFloatButton from '../../components/QuestionnaireFloatButton.vue';
import { StoreService } from '../../services/store.js';
import { getQuestionnaires } from '../../services/questionnaire-service.js';
import { canSwitchSystem, getUserDefaultSystem } from '../../services/permission-service.js';
import { getPFTasks, getPFMonthlyStats, submitPFRecord, getCurrentPeriod, formatPeriod, getPFSettings } from '../../services/pf-service.js';

export default {
  components: { ScoreDial, TaskCard, QuestionnaireFloatButton },
  data() {
    return {
      currentUser: null,
      canSwitch: false,
      systemMode: 'credit',
      // 个贷数据
      stats: { totalScore: 0, personalScore: 0, microScore: 0 },
      myRank: 0,
      currentQuarter: StoreService.getCurrentQuarter(),
      showRules: false,
      rules: [],
      ruleDescriptionSections: [],
      collapsedPanels: {
        'personal-mortgage': true, 'personal-credit': true,
        'micro-mortgage': true, 'micro-credit': true, 'micro-offline': true
      },
      hasNewQuestionnaire: false,
      newQuestionnaireCount: 0,
      myResponses: {},
      // 个金数据
      pfStats: { totalScore: 0, requiredScore: 0, bonusScore: 0 },
      pfMyRank: 0,
      pfGroupSize: 0,
      pfSelectedPeriod: getCurrentPeriod(),
      pfCurrentPeriod: formatPeriod(getCurrentPeriod()),
      pfRequiredTasks: [],
      pfBonusTasks: [],
      pfCollapsedTasks: {},
      pfActiveTab: 'required',
      pfModalTask: null,
      pfModalValue: '',
      keyboardHeight: 0,
      showPFRuleModal: false,
      pfRuleSections: [],
      // 默认密码提醒
      showPasswordReminder: false,
      passwordForm: {
        newPassword: '',
        confirmPassword: ''
      }
    };
  },
  computed: {
    isAdmin() {
      return this.currentUser && ['admin', 'super_admin', 'credit_admin', 'branch_leader'].includes(this.currentUser.role);
    },
    isPFAdmin() {
      return this.currentUser && ['personal_finance_admin', 'super_admin', 'branch_leader'].includes(this.currentUser.role);
    },
    personalSections() {
      const list = this.rules;
      return [
        { id: 'personal-mortgage', title: '抵押类业务', subtitle: '农户 / 经营抵押', icon: 'home', theme: 'blue', rules: list.filter(r => r.category === 'personal' && r.group === 'mortgage' && !r.hidden) },
        { id: 'personal-credit', title: '信用类业务', subtitle: '商户e贷 / 消费贷 / 快农贷', icon: 'person', theme: 'pink', rules: list.filter(r => r.category === 'personal' && r.group === 'credit' && !r.hidden) }
      ];
    },
    microSections() {
      const list = this.rules;
      return [
        { id: 'micro-mortgage', title: '抵押类业务', subtitle: '转贷 / 新增', icon: 'locked', theme: 'teal', rules: list.filter(r => r.category === 'micro' && r.group === 'mortgage' && !r.hidden) },
        { id: 'micro-credit', title: '信用类业务', subtitle: '转贷 / 微捷贷 / 闽e贷', icon: 'loop', theme: 'cyan', rules: list.filter(r => r.category === 'micro' && r.group === 'credit' && !r.hidden) },
        { id: 'micro-offline', title: '线下特色', subtitle: '转贷 / 科技贷 / 智动贷', icon: 'flag', theme: 'purple', rules: list.filter(r => r.category === 'micro' && r.group === 'offline' && !r.hidden) }
      ];
    }
  },
  async onShow() {
    await this.refresh();
    console.log('[Dashboard onShow] currentUser:', this.currentUser);
    // 问卷对所有人开放，包括游客和两个系统
    await this.checkNewQuestionnaires();
    // 检查默认密码
    console.log('[Dashboard onShow] 准备检查默认密码');
    await this.checkDefaultPassword();
  },
  methods: {
    async refresh() {
      try {
        await StoreService.ensureReady();
        const user = StoreService.getCurrentUser();
        console.log('[Dashboard refresh] user from StoreService:', user);
        this.currentUser = user;
        console.log('[Dashboard refresh] this.currentUser 已赋值:', this.currentUser);
        this.canSwitch = canSwitchSystem(user);

        // 初始化系统模式
        const saved = uni.getStorageSync('system_mode');
        if (saved) {
          this.systemMode = saved;
        } else {
          const def = getUserDefaultSystem(user);
          this.systemMode = def === 'pf' ? 'pf' : 'credit';
        }

        if (this.systemMode === 'credit') {
          await this.loadCreditData(user);
        } else {
          await this.loadPFData();
        }
      } catch (error) {
        uni.showToast({ title: error.message || '数据加载失败', icon: 'none' });
      }
    },
    async loadCreditData(user) {
      this.rules = StoreService.getRules();
      this.ruleDescriptionSections = StoreService.getRuleDescriptionSections();
      this.currentQuarter = StoreService.getCurrentQuarter();
      if (!user || user.role === 'guest') {
        this.stats = { totalScore: 0, personalScore: 0, microScore: 0, bonusAmount: 0 };
        this.myRank = 0;
        return;
      }
      this.stats = StoreService.calculateScoreForEmployee(user.id);
      const leaderboard = StoreService.getLeaderboard();
      this.myRank = leaderboard.find(e => e.employeeId === user.id)?.rank || leaderboard.length || 0;
    },
    async loadPFData() {
      if (!this.currentUser || !this.currentUser.id) return;
      try {
        // 短暂延迟确保云函数重算完成
        await new Promise(resolve => setTimeout(resolve, 300));
        const [tasks, stats] = await Promise.all([
          getPFTasks({ isActive: true }),
          getPFMonthlyStats(this.currentUser.id, this.pfSelectedPeriod)
        ]);
        this.pfRequiredTasks = tasks.filter(t => t.category === 'required').map(t => ({ ...t, totalValue: 0, score: 0, benchmarkValue: 0 }));
        this.pfBonusTasks = tasks.filter(t => t.category === 'bonus').map(t => ({ ...t, totalValue: 0, score: 0 }));
        this.pfStats = { totalScore: stats.totalScore || 0, requiredScore: stats.requiredScore || 0, bonusScore: stats.bonusScore || 0 };
        this.pfMyRank = stats.rank || 0;
        this.pfGroupSize = stats.groupSize || 0;
        this.pfCurrentPeriod = formatPeriod(this.pfSelectedPeriod);
        if (stats.requiredTasks) {
          this.pfRequiredTasks = this.pfRequiredTasks.map(t => {
            const s = stats.requiredTasks.find(x => x.taskId === t.taskId);
            return s ? { ...t, totalValue: s.totalValue, score: s.score, benchmarkValue: s.benchmarkValue } : t;
          });
        }
        if (stats.bonusTasks) {
          this.pfBonusTasks = this.pfBonusTasks.map(t => {
            const s = stats.bonusTasks.find(x => x.taskId === t.taskId);
            return s ? { ...t, totalValue: s.totalValue, score: s.score } : t;
          });
        }
      } catch (error) {
        uni.showToast({ title: error.message || '加载失败', icon: 'none' });
      }
    },
    switchMode(mode) {
      this.systemMode = mode;
      uni.setStorageSync('system_mode', mode);
      if (mode === 'credit') {
        this.loadCreditData(this.currentUser);
      } else {
        this.loadPFData();
      }
    },
    formatPFTaskForCard(task) {
      const isRequired = task.category === 'required';
      return {
        id: task.taskId,
        name: task.taskName,
        unit: task.unit,
        category: isRequired ? 'personal' : 'micro',
        description: task.description,
        currentValue: task.totalValue || 0,
        score: task.score || 0,
        benchmarkValue: task.benchmarkValue,
        unitPrice: task.scoreConfig?.unitPrice,
        isPFMode: true,
        isRequired: isRequired,
        pfScoreLabel: isRequired ? '任务数' : '单位分数',
        pfPreviewLabel: isRequired ? '动态积分' : '预计加分'
      };
    },
    async handlePFSubmit(task, payload) {
      try {
        await submitPFRecord({ taskId: task.taskId, date: payload.date || new Date().toISOString().split('T')[0], value: payload.value });
        uni.showToast({ title: '提交成功', icon: 'success' });
        await this.loadPFData();
      } catch (error) {
        uni.showToast({ title: error.message || '提交失败', icon: 'none' });
      }
    },
    handlePFMonthPickerChange(e) {
      this.pfSelectedPeriod = e.detail.value.substring(0, 7);
      this.pfCurrentPeriod = formatPeriod(this.pfSelectedPeriod);
      this.loadPFData();
    },
    togglePFTask(taskId) {
      const collapsed = this.isPFTaskCollapsed(taskId);
      this.pfCollapsedTasks = { ...this.pfCollapsedTasks, [taskId]: !collapsed };
    },
    isPFTaskCollapsed(taskId) {
      return this.pfCollapsedTasks[taskId] === undefined || this.pfCollapsedTasks[taskId] === true;
    },
    closePFModal() {
      this.pfModalTask = null;
      this.pfModalValue = '';
      this.keyboardHeight = 0;
      uni.offKeyboardHeightChange();
    },
    openPFModal(task) {
      if (!this.currentUser || this.currentUser.role === 'guest') { this.gotoLogin(); return; }
      this.pfModalTask = task;
      this.pfModalValue = '';
      this.keyboardHeight = 0;
      uni.onKeyboardHeightChange(res => {
        this.keyboardHeight = res.height;
      });
    },
    async openPFRuleModal() {
      if (this.pfRuleSections.length === 0) {
        try {
          const data = await getPFSettings();
          this.pfRuleSections = (data && data.ruleContent && data.ruleContent.sections) || [];
        } catch (e) {
          this.pfRuleSections = [];
        }
      }
      this.showPFRuleModal = true;
    },
    async confirmPFModalSubmit() {
      if (!this.pfModalValue || parseFloat(this.pfModalValue) <= 0) {
        uni.showToast({ title: '请输入有效数量', icon: 'none' });
        return;
      }
      try {
        uni.showLoading({ title: '提报中...' });
        await submitPFRecord({
          taskId: this.pfModalTask.taskId,
          value: parseFloat(this.pfModalValue),
          date: new Date().toISOString().split('T')[0],
          period: this.pfSelectedPeriod
        });
        uni.showToast({ title: '提报成功', icon: 'success' });
        this.pfModalTask = null;
        this.pfModalValue = '';
        this.keyboardHeight = 0;
        uni.offKeyboardHeightChange();
        await this.loadPFData();
      } catch (error) {
        uni.showToast({ title: error.message || '提报失败', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    },
    formatPeriod,
    handleSubmit(rule, payload) {
      if (!this.currentUser || this.currentUser.role === 'guest') { this.gotoLogin(); return; }
      uni.showModal({
        title: '确认提报',
        content: `确认提报【${rule.name}】 ${payload.count}笔 / ${payload.amount}万？`,
        success: async res => {
          if (!res.confirm) return;
          try {
            await StoreService.addSubmission({ employeeId: this.currentUser.id, ruleId: rule.id, ...payload });
            uni.showToast({ title: '提报成功', icon: 'success' });
            await this.loadCreditData(this.currentUser);
          } catch (error) {
            uni.showToast({ title: error.message || '提报失败', icon: 'none' });
          }
        }
      });
    },
    gotoLogin() { uni.navigateTo({ url: '/pages/login/login' }); },
    gotoKnowledge() { uni.navigateTo({ url: '/pages/knowledge/knowledge-list' }); },

    async checkDefaultPassword() {
      console.log('checkDefaultPassword 开始执行');
      if (!this.currentUser || this.currentUser.role === 'guest') {
        console.log('游客或无用户，跳过检查');
        return;
      }

      const dismissedAt = uni.getStorageSync('password_remind_dismissed_at');
      if (dismissedAt) {
        const hoursPassed = (Date.now() - dismissedAt) / (1000 * 60 * 60);
        console.log('距离上次关闭:', hoursPassed, '小时');
        if (hoursPassed < 24) return;
      }

      try {
        console.log('调用云函数检查默认密码, userId:', this.currentUser.id);
        const res = await uniCloud.callFunction({
          name: 'appService',
          data: { action: 'checkDefaultPassword', payload: { userId: this.currentUser.id } }
        });
        console.log('云函数返回:', res.result);
        if (res.result.data?.isDefaultPassword) {
          console.log('检测到默认密码，显示弹框');
          this.showPasswordReminder = true;
        }
      } catch (error) {
        console.error('检查默认密码失败:', error);
      }
    },

    dismissPasswordReminder() {
      uni.setStorageSync('password_remind_dismissed_at', Date.now());
      this.showPasswordReminder = false;
    },

    async handleChangePassword() {
      if (!this.passwordForm.newPassword || !this.passwordForm.confirmPassword) {
        uni.showToast({ title: '请完整填写', icon: 'none' });
        return;
      }
      if (this.passwordForm.newPassword.length < 6) {
        uni.showToast({ title: '密码至少6位', icon: 'none' });
        return;
      }
      if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
        uni.showToast({ title: '两次密码不一致', icon: 'none' });
        return;
      }
      try {
        await StoreService.changePassword(this.currentUser.id, '123456', this.passwordForm.newPassword);
        uni.showToast({ title: '密码修改成功', icon: 'success' });
        uni.removeStorageSync('password_remind_dismissed_at');
        this.showPasswordReminder = false;
        this.passwordForm = { newPassword: '', confirmPassword: '' };
      } catch (error) {
        uni.showToast({ title: error.message || '修改失败', icon: 'none' });
      }
    },
    gotoAdmin() { uni.navigateTo({ url: '/pages/admin/admin' }); },
    gotoPFAdmin() { uni.navigateTo({ url: '/pages/pf-admin/pf-admin' }); },
    togglePanel(id) { this.collapsedPanels = { ...this.collapsedPanels, [id]: !this.collapsedPanels[id] }; },
    isCollapsed(id) { return !!this.collapsedPanels[id]; },
    async checkNewQuestionnaires() {
      try {
        // 问卷对所有人开放，包括游客
        const questionnaires = await getQuestionnaires({ status: 'published' });

        // 游客模式下，显示所有已发布的问卷
        if (!this.currentUser || this.currentUser.role === 'guest') {
          this.hasNewQuestionnaire = questionnaires.length > 0;
          this.newQuestionnaireCount = questionnaires.length;
          return;
        }

        // 登录用户，显示未回答的问卷
        const myResponses = uni.getStorageSync('myResponses') || {};
        this.myResponses = myResponses;
        const unresponded = questionnaires.filter(q => !myResponses[q._id]);
        this.hasNewQuestionnaire = unresponded.length > 0;
        this.newQuestionnaireCount = unresponded.length;
      } catch (error) {
        console.error('检查问卷失败:', error);
      }
    }
  }
};
</script>

<style scoped>
.dashboard { padding-bottom: 200rpx; }

.system-tabs {
  display: flex;
  background: #f1f5f9;
  border-radius: 16rpx;
  padding: 8rpx;
  margin: 24rpx 32rpx 0;
}
.system-tab {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #64748b;
}
.system-tab.active {
  background: #fff;
  color: #0f766e;
  font-weight: 600;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.08);
}

.admin-entry { padding: 0 32rpx; margin-top: -24rpx; margin-bottom: 16rpx; display: flex; justify-content: flex-end; }
.admin-btn { border: 2rpx solid rgba(15,118,110,0.2); border-radius: 999rpx; padding: 12rpx 24rpx; background: #fff; color: #0f766e; font-size: 24rpx; display: inline-flex; align-items: center; gap: 8rpx; line-height: 1.8; width: fit-content; }

.section-header { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; padding: 0 32rpx; margin-top: 48rpx; margin-bottom: 24rpx; }
.section-title { font-size: 34rpx; font-weight: 700; color: #0f172a; flex: 1; }
.header-actions { display: flex; gap: 16rpx; align-items: center; }
.icon-btn { display: inline-flex; align-items: center; gap: 6rpx; border: 2rpx solid rgba(15,118,110,0.2); border-radius: 999rpx; padding: 10rpx 20rpx; background: #fff; font-size: 22rpx; line-height: 1.2; width: fit-content; }
.icon-text { font-size: 24rpx; margin-left: 4rpx; display: inline-block; vertical-align: -2rpx; line-height: 1; color: #0f766e; }

/* 规则说明按钮 */
.rule-hint-btn { display: flex; align-items: center; gap: 6rpx; background: #ecfdf5; border: 1rpx solid #a7f3d0; border-radius: 999rpx; padding: 8rpx 18rpx; }
.rule-hint-text { font-size: 22rpx; color: #0f766e; font-weight: 600; }

/* 统一规则说明弹窗 */
.rules-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15,23,42,0.5); display: flex; align-items: flex-end; z-index: 999; }
.rules-sheet { width: 100%; max-height: 78vh; background: #fff; border-radius: 28rpx 28rpx 0 0; display: flex; flex-direction: column; }
.rules-sheet__handle { width: 64rpx; height: 6rpx; background: #e2e8f0; border-radius: 999rpx; margin: 16rpx auto 0; flex-shrink: 0; }
.rules-sheet__header { display: flex; align-items: center; gap: 14rpx; padding: 24rpx 32rpx 20rpx; border-bottom: 1rpx solid #f1f5f9; flex-shrink: 0; }
.rules-sheet__header-icon { width: 48rpx; height: 48rpx; background: #ecfdf5; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.rules-sheet__title { flex: 1; font-size: 32rpx; font-weight: 700; color: #0f172a; }
.rules-sheet__close { width: 52rpx; height: 52rpx; display: flex; align-items: center; justify-content: center; background: #f1f5f9; border-radius: 50%; flex-shrink: 0; }
.rules-sheet__body { flex: 1; padding: 28rpx 32rpx 8rpx; overflow-y: auto; box-sizing: border-box; width: 100%; }
.rules-sheet__empty { text-align: center; color: #94a3b8; font-size: 28rpx; padding: 60rpx 0; }
.rules-sheet__footer { padding: 16rpx 32rpx 40rpx; flex-shrink: 0; }
.rules-sheet__btn { width: 100%; background: linear-gradient(135deg, #0f766e, #0ea5e9); color: #fff; border-radius: 20rpx; padding: 22rpx 0; font-size: 30rpx; font-weight: 600; border: none; }
.rules-section { margin-bottom: 28rpx; }
.rules-section:last-child { margin-bottom: 8rpx; }
.rules-section__title-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 14rpx; }
.rules-section__accent { width: 6rpx; height: 32rpx; background: linear-gradient(to bottom, #0f766e, #0ea5e9); border-radius: 999rpx; flex-shrink: 0; }
.rules-section__title { font-size: 30rpx; font-weight: 700; color: #0f172a; }
.rules-item { display: flex; gap: 12rpx; align-items: flex-start; margin-bottom: 8rpx; padding-right: 8rpx; }
.rules-item__dot { width: 8rpx; height: 8rpx; border-radius: 50%; background: #0f766e; flex-shrink: 0; margin-top: 12rpx; }
.rules-item__text { font-size: 26rpx; color: #475569; line-height: 1.7; flex: 1; min-width: 0; word-break: break-word; overflow-wrap: break-word; white-space: normal; }
.icon-btn-wrap { position: relative; display: inline-flex; }
.new-dot { position: absolute; top: -4rpx; right: -4rpx; width: 16rpx; height: 16rpx; background: #0f766e; border-radius: 50%; border: 2rpx solid #fff; }

.login-prompt { padding: 0 32rpx; margin-bottom: 24rpx; }
.primary-btn { width: 100%; background: #0f766e; color: #fff; border-radius: 24rpx; padding: 20rpx 0; font-size: 28rpx; }

.guest-banner {
  margin: 0 32rpx 24rpx;
  padding: 24rpx;
  background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
  border: 1rpx solid #bbf7d0;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.guest-banner__icon {
  width: 72rpx;
  height: 72rpx;
  background: rgba(15,118,110,0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.guest-banner__body {
  flex: 1;
  min-width: 0;
}
.guest-banner__title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 6rpx;
}
.guest-banner__desc {
  display: block;
  font-size: 22rpx;
  color: #64748b;
  line-height: 1.5;
}
.guest-banner__btn {
  flex-shrink: 0;
  padding: 14rpx 28rpx;
  background: #0f766e;
  color: #fff;
  border-radius: 12rpx;
  font-size: 26rpx;
  font-weight: 600;
  border: none;
  width: auto;
}

.category-group { padding: 0 32rpx; margin-bottom: 24rpx; }
.category-tag { font-size: 28rpx; color: #0f766e; font-weight: 600; margin-left: 8rpx; display: flex; align-items: center; gap: 12rpx; margin-bottom: 16rpx; }
.title-dot { width: 16rpx; height: 40rpx; border-radius: 999rpx; background: #0f766e; flex-shrink: 0; }
.title-dot.pf-bonus { background: #f97316; }
.category-card { margin-top: 16rpx; border-radius: 28rpx; padding: 24rpx; box-shadow: 0 16rpx 50rpx rgba(15,118,110,0.08); background: #ffffff; }

.category-card__header { display: flex; align-items: center; justify-content: space-between; cursor: pointer; }
.category-card__title { display: flex; align-items: center; gap: 16rpx; }
.category-card__title-icon { width: 76rpx; height: 76rpx; border-radius: 24rpx; display: flex; align-items: center; justify-content: center; }
.category-card.blue .category-card__title-icon { background: rgba(59,130,246,0.35); }
.category-card__title-icon.blue { background: rgba(59,130,246,0.35); }
.category-card__title-icon.teal { background: rgba(20,184,166,0.35); }
.category-card.pink .category-card__title-icon { background: rgba(244,114,182,0.38); }
.category-card.teal .category-card__title-icon { background: rgba(20,184,166,0.35); }
.category-card.cyan .category-card__title-icon { background: rgba(6,182,212,0.38); }
.category-card.purple .category-card__title-icon { background: rgba(168,85,247,0.38); }
.category-card__title-text { font-size: 30rpx; font-weight: 600; color: #0f172a; }
.category-card__subtitle { display: block; font-size: 24rpx; color: #94a3b8; margin-top: 4rpx; }
.category-card__arrow { transition: transform 0.2s ease; color: #94a3b8; }
.category-card__arrow.collapsed { transform: rotate(-90deg); }
.category-card__body { margin-top: 16rpx; }


.pf-task-item { background: #fff; border-radius: 20rpx; padding: 24rpx; margin-bottom: 16rpx; box-shadow: 0 4rpx 12rpx rgba(15,118,110,0.06); }
.pf-task-header { display: flex; align-items: center; justify-content: space-between; cursor: pointer; }
.pf-task-title { display: flex; align-items: center; gap: 12rpx; font-size: 28rpx; font-weight: 600; color: #0f172a; }
.pf-task-arrow { transition: transform 0.2s ease; color: #94a3b8; }
.pf-task-arrow.collapsed { transform: rotate(-90deg); }
.pf-task-body { margin-top: 16rpx; }

/* 个金 Tab */
.pf-tabs {
  display: flex;
  background: #f1f5f9;
  border-radius: 16rpx;
  padding: 6rpx;
  margin: 0 32rpx 24rpx;
}
.pf-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 16rpx 0;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #64748b;
}
.pf-tab.active {
  background: #fff;
  color: #0f766e;
  font-weight: 600;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.08);
}
.pf-tab-badge {
  font-size: 22rpx;
  background: #e2e8f0;
  color: #64748b;
  padding: 2rpx 10rpx;
  border-radius: 999rpx;
}
.pf-tab.active .pf-tab-badge {
  background: #dcfce7;
  color: #0f766e;
}
.pf-tab-badge.bonus { background: #ffedd5; color: #f97316; }

/* 个金网格卡片 */
.pf-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
  padding: 0 32rpx;
}
.pf-grid-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(15,118,110,0.07);
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  cursor: pointer;
  border: 2rpx solid transparent;
}
.pf-grid-card:active { opacity: 0.85; }
.pf-grid-card.bonus { box-shadow: 0 4rpx 12rpx rgba(249,115,22,0.07); }

.pf-grid-card__top {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.pf-grid-card__icon {
  width: 40rpx;
  height: 40rpx;
  border-radius: 10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.pf-grid-card__icon.required { background: rgba(15,118,110,0.1); }
.pf-grid-card__icon.bonus { background: rgba(249,115,22,0.1); }

.pf-grid-card__name {
  font-size: 26rpx;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.3;
  flex: 1;
  min-width: 0;
}
.pf-grid-card__progress-row {
  display: flex;
  align-items: baseline;
  gap: 2rpx;
  flex-wrap: nowrap;
}
.pf-grid-card__value {
  font-size: 30rpx;
  font-weight: 700;
  color: #0f766e;
}
.pf-grid-card__value.bonus { color: #f97316; }
.pf-grid-card__sep {
  font-size: 22rpx;
  color: #cbd5e1;
  margin: 0 1rpx;
}
.pf-grid-card__target {
  font-size: 22rpx;
  color: #94a3b8;
}
.pf-grid-card__pct {
  font-size: 22rpx;
  color: #64748b;
  font-weight: 500;
}
.pf-grid-card__bar-wrap {
  height: 6rpx;
  background: #f1f5f9;
  border-radius: 999rpx;
  overflow: hidden;
}
.pf-grid-card__bar-fill {
  height: 100%;
  background: #0f766e;
  border-radius: 999rpx;
  transition: width 0.3s ease;
}
.pf-grid-card__bar-fill.done { background: #10b981; }
.pf-grid-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8rpx;
  flex-wrap: nowrap;
}
.pf-grid-card__score-block {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-wrap: nowrap;
  flex: 1;
  min-width: 0;
}
.pf-grid-card__score {
  font-size: 22rpx;
  color: #0f766e;
  font-weight: 600;
  white-space: nowrap;
}
.pf-grid-card__score.bonus { color: #f97316; }
.pf-grid-card__cap {
  font-size: 20rpx;
  color: #94a3b8;
  background: #f8fafc;
  border-radius: 6rpx;
  padding: 2rpx 8rpx;
  white-space: nowrap;
}
.pf-grid-card__rank {
  font-size: 20rpx;
  color: #64748b;
  background: #f1f5f9;
  border-radius: 6rpx;
  padding: 2rpx 8rpx;
  white-space: nowrap;
  flex-shrink: 0;
}

/* 个金提报弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.pf-submit-modal {
  width: 640rpx;
  background: #fff;
  border-radius: 28rpx;
  overflow: hidden;
  box-shadow: 0 20rpx 60rpx rgba(0,0,0,0.15);
}

.pf-submit-modal__header {
  background: linear-gradient(135deg, #0f766e 0%, #0ea5e9 100%);
  color: #fff;
  padding: 32rpx 32rpx 28rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pf-submit-modal__header-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
}

.pf-submit-modal__tag {
  font-size: 20rpx;
  font-weight: 600;
  padding: 4rpx 14rpx;
  border-radius: 20rpx;
  flex-shrink: 0;
}

.tag-required {
  background: rgba(255,255,255,0.25);
  color: #fff;
}

.tag-bonus {
  background: rgba(251,191,36,0.3);
  color: #fef3c7;
}

.pf-submit-modal__title {
  font-size: 32rpx;
  font-weight: 700;
  color: #fff;
}

.pf-submit-modal__close {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255,255,255,0.15);
  flex-shrink: 0;
}

.pf-submit-modal__body {
  padding: 28rpx 32rpx 8rpx;
}

/* 必选业务进度卡片 */
.pf-submit-modal__progress-card {
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  border: 1rpx solid #bbf7d0;
}

.pf-progress-row {
  display: flex;
  align-items: center;
  justify-content: space-around;
  margin-bottom: 20rpx;
}

.pf-progress-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

.pf-progress-stat__value {
  font-size: 40rpx;
  font-weight: 700;
  color: #0f766e;
}

.pf-progress-stat__label {
  font-size: 22rpx;
  color: #6b7280;
}

.pf-progress-divider {
  width: 1rpx;
  height: 48rpx;
  background: #d1fae5;
}

.pf-progress-bar-wrap {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.pf-progress-bar-track {
  flex: 1;
  height: 12rpx;
  background: #d1fae5;
  border-radius: 6rpx;
  overflow: hidden;
}

.pf-progress-bar-fill {
  height: 100%;
  background: linear-gradient(to right, #0f766e, #10b981);
  border-radius: 6rpx;
  transition: width 0.3s;
}

.pf-progress-pct {
  font-size: 24rpx;
  font-weight: 600;
  color: #0f766e;
  min-width: 60rpx;
  text-align: right;
}

/* 加分业务规则卡片 */
.pf-submit-modal__rule-card {
  background: #f8fafc;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 24rpx;
  border: 1rpx solid #e2e8f0;
  display: flex;
  gap: 0;
  flex-direction: column;
}

.pf-rule-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8rpx 0;
}

.pf-rule-item + .pf-rule-item {
  border-top: 1rpx solid #e2e8f0;
  margin-top: 8rpx;
  padding-top: 16rpx;
}

.pf-rule-item__label {
  font-size: 26rpx;
  color: #64748b;
}

.pf-rule-item__value {
  font-size: 28rpx;
  font-weight: 600;
  color: #0f172a;
}

.pf-rule-item__value.accent {
  color: #0f766e;
}

/* 输入区 */
.pf-submit-modal__input-wrap {
  margin-bottom: 20rpx;
}

.pf-submit-modal__label {
  display: block;
  font-size: 26rpx;
  color: #64748b;
  margin-bottom: 12rpx;
  font-weight: 500;
}

.pf-submit-modal__input-row {
  display: flex;
  align-items: center;
  background: #f8fafc;
  border: 2rpx solid #e2e8f0;
  border-radius: 14rpx;
  overflow: hidden;
  transition: border-color 0.2s;
}

.pf-submit-modal__input {
  flex: 1;
  padding: 22rpx 20rpx;
  font-size: 36rpx;
  font-weight: 600;
  color: #0f172a;
  background: transparent;
}

.pf-submit-modal__unit {
  padding: 0 20rpx;
  font-size: 26rpx;
  color: #94a3b8;
  border-left: 1rpx solid #e2e8f0;
  height: 100%;
  display: flex;
  align-items: center;
}

/* 预览区 */
.pf-submit-modal__preview {
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
  border-radius: 14rpx;
  padding: 20rpx 24rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
  border: 1rpx solid #a7f3d0;
}

.pf-submit-modal__preview-label {
  font-size: 26rpx;
  color: #0f766e;
}

.pf-submit-modal__preview-score {
  font-size: 40rpx;
  font-weight: 700;
  color: #0f766e;
}

.pf-submit-modal__footer {
  padding: 20rpx 32rpx 32rpx;
  display: flex;
  gap: 16rpx;
}

.pf-submit-modal__btn {
  flex: 1;
  padding: 22rpx 0;
  border-radius: 16rpx;
  font-size: 30rpx;
  font-weight: 600;
  text-align: center;
  border: none;
}

.pf-submit-modal__btn.ghost {
  background: #f1f5f9;
  color: #64748b;
}

.pf-submit-modal__btn.primary {
  background: linear-gradient(135deg, #0f766e 0%, #0ea5e9 100%);
  color: #fff;
}

/* 默认密码提醒弹框 */
.modal-overlay {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.6);
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
  box-shadow: 0 24rpx 64rpx rgba(15, 23, 42, 0.25);
  animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-40rpx) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  color: #fff;
  padding: 28rpx 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  font-size: 30rpx;
  font-weight: 600;
}

.modal-body {
  padding: 40rpx 32rpx 32rpx;
}

.security-notice {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 32rpx;
  padding: 32rpx;
  background: linear-gradient(135deg, #fffbeb, #fef3c7);
  border-radius: 16rpx;
  border: 2rpx solid #fbbf24;
}

.notice-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #92400e;
  text-align: center;
}

.notice-desc {
  font-size: 24rpx;
  color: #b45309;
  text-align: center;
}

.form-item {
  margin-bottom: 24rpx;
}

.form-label {
  display: block;
  font-size: 24rpx;
  color: #6b7280;
  margin-bottom: 12rpx;
  font-weight: 600;
}

.form-input {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  background: #f8fafc;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 26rpx;
  color: #0f172a;
  box-sizing: border-box;
  border: 2rpx solid transparent;
}

.form-input:focus {
  border-color: #0f766e;
  background: #ffffff;
  box-shadow: 0 0 0 4rpx rgba(15, 118, 110, 0.1);
}

.modal-footer {
  padding: 0 32rpx 32rpx;
  display: flex;
  gap: 16rpx;
}

.modal-btn {
  flex: 1;
  border-radius: 20rpx;
  padding: 20rpx 0;
  font-size: 26rpx;
  font-weight: 600;
  border: none;
}

.modal-btn.ghost {
  border: 2rpx solid rgba(15, 118, 110, 0.2);
  color: #0f766e;
  background: #fff;
}

.modal-btn.primary {
  background: linear-gradient(135deg, #0f766e, #0ea5e9);
  color: #fff;
  box-shadow: 0 8rpx 20rpx rgba(15, 118, 110, 0.25);
}

</style>
