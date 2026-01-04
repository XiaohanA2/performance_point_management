<template>
  <view class="dashboard">
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
        进入后台管理
      </button>
    </view>

    <!-- 游客模式登录按钮 -->
    <view v-if="currentUser && currentUser.role === 'guest'" class="login-prompt">
      <button class="primary-btn" @click="gotoLogin">
        登录后可使用提报功能
      </button>
    </view>

    <view class="section-header">
      <text class="section-title">积分提报</text>
      <button class="light-btn" @click="showRules = true">
        <uni-icons type="help" :size="22" color="#0f766e" />
        规则说明
      </button>
    </view>

    <view class="category-group">
      <view class="category-tag">
        <view class="title-dot" />
        个贷业务
      </view>
      <view
        v-for="panel in personalSections"
        :key="panel.id"
        class="category-card"
        :class="panel.theme"
      >
        <view class="category-card__header" @tap="togglePanel(panel.id)">
          <view class="category-card__title">
            <view class="category-card__title-icon">
              <uni-icons :type="panel.icon" :size="28" color="#fff" />
            </view>
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
          <TaskCard
            v-for="rule in panel.rules"
            :key="rule.id"
            :rule="rule"
            @submit="payload => handleSubmit(rule, payload)"
          />
        </view>
      </view>
    </view>

    <view class="category-group">
      <view class="category-tag">
        <view class="title-dot" />
        小微业务
      </view>
      <view
        v-for="panel in microSections"
        :key="panel.id"
        class="category-card"
        :class="panel.theme"
      >
        <view class="category-card__header" @tap="togglePanel(panel.id)">
          <view class="category-card__title">
            <view class="category-card__title-icon">
              <uni-icons :type="panel.icon" :size="28" color="#fff" />
            </view>
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
          <TaskCard
            v-for="rule in panel.rules"
            :key="rule.id"
            :rule="rule"
            @submit="payload => handleSubmit(rule, payload)"
          />
        </view>
      </view>
    </view>

    <!-- 这个区域已经被游客模式登录按钮替代，不再需要 -->

    <view v-if="showRules" class="rule-overlay" @click.self="showRules = false">
      <view class="rule-modal">
        <view class="rule-modal__header">
          <text>计分规则说明</text>
          <uni-icons type="closeempty" :size="26" color="#fff" @click="showRules = false" />
        </view>
        <scroll-view v-if="ruleDescriptionSections.length" scroll-y class="rule-modal__body">
          <view
            class="rule-group"
            v-for="section in ruleDescriptionSections"
            :key="section.id"
          >
            <text class="rule-group__title">{{ section.title }}</text>
            <text
              class="rule-group__item"
              v-for="(item, index) in section.items"
              :key="index"
            >
              {{ item }}
            </text>
          </view>
        </scroll-view>
        <view v-else class="rule-modal__empty">
          <text>暂未配置规则说明</text>
        </view>
        <button class="modal-btn" @click="showRules = false">我已知晓</button>
      </view>
    </view>

  </view>
</template>

<script>
import ScoreDial from '../../components/ScoreDial.vue';
import TaskCard from '../../components/TaskCard.vue';
import { StoreService } from '../../services/store.js';

export default {
  components: { ScoreDial, TaskCard },
  data() {
    return {
      currentUser: null,
      stats: {
        totalScore: 0,
        personalScore: 0,
        microScore: 0
      },
      myRank: 0,
      currentQuarter: StoreService.getCurrentQuarter(),
      showRules: false,
      rules: [],
      ruleDescriptionSections: [],
      collapsedPanels: {
        'personal-mortgage': true,
        'personal-credit': true,
        'micro-mortgage': true,
        'micro-credit': true,
        'micro-offline': true
      }
    };
  },
  computed: {
    isAdmin() {
      return this.currentUser && this.currentUser.role === 'admin';
    },
    personalSections() {
      const list = this.rules;
      return [
        {
          id: 'personal-mortgage',
          title: '抵押类业务',
          subtitle: '农户 / 经营抵押',
          icon: 'home',
          theme: 'blue',
          rules: list.filter(r => r.category === 'personal' && r.group === 'mortgage' && !r.hidden)
        },
        {
          id: 'personal-credit',
          title: '信用类业务',
          subtitle: '商户e贷 / 消费贷 / 快农贷',
          icon: 'cart',
          theme: 'pink',
          rules: list.filter(r => r.category === 'personal' && r.group === 'credit' && !r.hidden)
        }
      ];
    },
    microSections() {
      const list = this.rules;
      return [
        {
          id: 'micro-mortgage',
          title: '抵押类业务',
          subtitle: '转贷 / 新增',
          icon: 'shop',
          theme: 'teal',
          rules: list.filter(r => r.category === 'micro' && r.group === 'mortgage' && !r.hidden)
        },
        {
          id: 'micro-credit',
          title: '信用类业务',
          subtitle: '转贷 / 微捷贷 / 闽e贷',
          icon: 'redo',
          theme: 'cyan',
          rules: list.filter(r => r.category === 'micro' && r.group === 'credit' && !r.hidden)
        },
        {
          id: 'micro-offline',
          title: '线下特色',
          subtitle: '转贷 / 科技贷 / 智动贷',
          icon: 'flag',
          theme: 'purple',
          rules: list.filter(r => r.category === 'micro' && r.group === 'offline' && !r.hidden)
        }
      ];
    }
  },
  async onShow() {
    await this.refresh();
  },
  methods: {
    async refresh() {
      try {
        await StoreService.ensureReady();
        const user = StoreService.getCurrentUser();
        this.rules = StoreService.getRules();
        this.ruleDescriptionSections = StoreService.getRuleDescriptionSections();
        this.currentQuarter = StoreService.getCurrentQuarter();
        this.currentUser = user;
        if (user && user.role === 'guest') {
          this.stats = { totalScore: 0, personalScore: 0, microScore: 0, bonusAmount: 0 };
          this.myRank = 0;
          return;
        }
        if (user) {
          this.stats = StoreService.calculateScoreForEmployee(user.id);
          const leaderboard = StoreService.getLeaderboard();
          this.myRank = leaderboard.find(entry => entry.employeeId === user.id)?.rank || leaderboard.length || 0;
        } else {
          this.stats = { totalScore: 0, personalScore: 0, microScore: 0, bonusAmount: 0 };
          this.myRank = 0;
        }
      } catch (error) {
        uni.showToast({ title: error.message || '数据加载失败', icon: 'none' });
      }
    },
    gotoLogin() {
      uni.navigateTo({ url: '/pages/login/login' });
    },
    togglePanel(id) {
      this.collapsedPanels = {
        ...this.collapsedPanels,
        [id]: !this.collapsedPanels[id]
      };
    },
    isCollapsed(id) {
      return !!this.collapsedPanels[id];
    },
    handleSubmit(rule, payload) {
      if (!this.currentUser || this.currentUser.role === 'guest') {
        this.gotoLogin();
        return;
      }
      uni.showModal({
        title: '确认提报',
        content: `确认提报【${rule.name}】 ${payload.count}笔 / ${payload.amount}万？`,
        success: async res => {
          if (!res.confirm) return;
          try {
            await StoreService.addSubmission({
              employeeId: this.currentUser.id,
              ruleId: rule.id,
              ...payload
            });
            uni.showToast({ title: '提报成功', icon: 'success' });
            await this.refresh();
          } catch (error) {
            uni.showToast({ title: error.message || '提报失败', icon: 'none' });
          }
        }
      });
    },
    gotoAdmin() {
      uni.navigateTo({ url: '/pages/admin/admin' });
    }
  }
};
</script>

<style scoped>
.dashboard {
  padding-bottom: 200rpx;
}

.stats-cards {
  display: flex;
  gap: 24rpx;
  padding: 0 32rpx;
  margin: 32rpx 0;
}

.stats-card {
  flex: 1;
  border-radius: 24rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.stats-card.blue {
  background: linear-gradient(to right, #e0f2fe, #e0e7ff);
}

.stats-card.teal {
  background: linear-gradient(to right, #ccfbf1, #dcfce7);
}

.stats-card__icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stats-card__label {
  font-size: 24rpx;
  color: #4b5563;
}

.stats-card__value {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #0f172a;
}

.admin-entry {
  padding: 0 32rpx;
  margin-top: -24rpx;
  margin-bottom: 16rpx;
  display: flex;
  justify-content: flex-end;
}

.admin-btn {
  border: 2rpx solid rgba(15, 118, 110, 0.2);
  border-radius: 999rpx;
  padding: 12rpx 24rpx;
  background: #fff;
  color: #0f766e;
  font-size: 24rpx;
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 0 32rpx;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #0f172a;
  flex: 1;
}

.title-dot {
  width: 12rpx;
  height: 40rpx;
  border-radius: 999rpx;
  background: #0f766e;
}

.light-btn {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  border: 2rpx solid rgba(15, 118, 110, 0.2);
  border-radius: 999rpx;
  padding: 12rpx 24rpx;
  background: #fff;
  color: #0f766e;
  font-size: 24rpx;
}

.section-header .light-btn {
  margin-left: auto;
}

.login-prompt {
  padding: 0 32rpx;
  margin-bottom: 24rpx;
}

.primary-btn {
  width: 100%;
  background: #0f766e;
  color: #fff;
  border-radius: 24rpx;
  padding: 20rpx 0;
  font-size: 28rpx;
}

.category-group {
  padding: 0 32rpx;
  margin-bottom: 24rpx;
}

.category-tag {
  font-size: 28rpx;
  color: #0f766e;
  font-weight: 600;
  margin-left: 8rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.category-tag .title-dot {
  width: 16rpx;
  height: 40rpx;
  border-radius: 999rpx;
  background: #0f766e;
  flex-shrink: 0;
}

.category-card {
  margin-top: 16rpx;
  border-radius: 28rpx;
  padding: 24rpx;
  box-shadow: 0 16rpx 50rpx rgba(15, 118, 110, 0.08);
  background: #ffffff;
}

.category-card.blue {
  background: #ffffff;
}

.category-card.pink {
  background: #ffffff;
}

.category-card.teal {
  background: #ffffff;
}

.category-card.cyan {
  background: #ffffff;
}

.category-card.purple {
  background: #ffffff;
}

.category-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.category-card__title {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.category-card__title-icon {
  width: 76rpx;
  height: 76rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0;
}

.category-card.blue .category-card__title-icon {
  background: rgba(59, 130, 246, 0.35);
}

.category-card.pink .category-card__title-icon {
  background: rgba(244, 114, 182, 0.38);
}

.category-card.teal .category-card__title-icon {
  background: rgba(20, 184, 166, 0.35);
}

.category-card.cyan .category-card__title-icon {
  background: rgba(6, 182, 212, 0.38);
}

.category-card.purple .category-card__title-icon {
  background: rgba(168, 85, 247, 0.38);
}

.category-card__title-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #0f172a;
}

.category-card__subtitle {
  display: block;
  font-size: 24rpx;
  color: #94a3b8;
  margin-top: 4rpx;
}

.category-card__arrow {
  transition: transform 0.2s ease;
  color: #94a3b8;
}

.category-card__arrow.collapsed {
  transform: rotate(-90deg);
}

.category-card__body {
  margin-top: 16rpx;
}

.auth-placeholder {
  margin: 80rpx auto;
  text-align: center;
  color: #94a3b8;
}

.rule-overlay {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 999;
}

.rule-modal {
  background: #ffffff;
  border-top-left-radius: 32rpx;
  border-top-right-radius: 32rpx;
  overflow: hidden;
  width: 100%;
}

.rule-modal__header {
  background: linear-gradient(to right, #0f766e, #0ea5e9);
  color: #fff;
  padding: 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 30rpx;
  font-weight: 600;
}

.rule-modal__body {
  max-height: 60vh;
  padding: 32rpx;
}

.rule-modal__empty {
  padding: 48rpx 32rpx;
  text-align: center;
  color: #94a3b8;
}

.rule-group {
  margin-bottom: 24rpx;
}

.rule-group__title {
  font-size: 28rpx;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 12rpx;
}

.rule-group__item {
  display: block;
  font-size: 24rpx;
  color: #475569;
  margin-bottom: 8rpx;
}

.modal-btn {
  width: calc(100% - 64rpx);
  margin: 0 auto 32rpx;
  background: #0f766e;
  color: #fff;
  border-radius: 24rpx;
  padding: 20rpx 0;
  font-size: 28rpx;
}
</style>

