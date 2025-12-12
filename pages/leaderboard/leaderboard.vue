<template>
  <view class="leaderboard-page">
    <view class="leaderboard-hero">
      <view class="hero-icon">
        <uni-icons type="medal" size="40" color="#fbbf24" />
      </view>
      <text class="hero-title">龙虎榜</text>
      <text class="hero-subtitle">{{ currentQuarter }} 季度积分排名</text>
    </view>

    <view class="leaderboard-content">
      <view
        v-for="(entry, index) in leaderboard"
        :key="entry.employeeId"
        class="leaderboard-card"
        :class="{
          'rank-1': entry.rank === 1,
          'rank-2': entry.rank === 2,
          'rank-3': entry.rank === 3
        }"
      >
        <view class="rank-badge">
          <uni-icons v-if="entry.rank === 1" type="medal" :color="rankColor(1)" size="26" />
          <uni-icons v-else-if="entry.rank === 2" type="medal" :color="rankColor(2)" size="26" />
          <uni-icons v-else-if="entry.rank === 3" type="medal" :color="rankColor(3)" size="26" />
          <text v-else>{{ entry.rank }}</text>
        </view>
        <view class="employee-info">
          <text class="employee-name">{{ entry.name }}</text>
          <view class="employee-meta">
            <text class="employee-branch">{{ entry.branch }}</text>
            <view class="score-chips">
              <view class="chip blue">个贷 {{ entry.personalScore }}</view>
              <view class="chip teal">小微 {{ entry.microScore }}</view>
            </view>
          </view>
        </view>
        <view class="score-total">
          <text>{{ entry.totalScore }}</text>
          <text class="score-label">&nbsp;&nbsp;总积分</text>
        </view>
      </view>
    </view>

    <view v-if="leaderboard.length === 0" class="empty-state">
      <text>暂无榜单数据，先去提报业务赚积分吧</text>
      <button class="light-btn" @click="gotoDashboard">前往工作台</button>
    </view>
  </view>
</template>

<script>
import { StoreService } from '../../services/store.js';

export default {
  data() {
    return {
      leaderboard: [],
      currentQuarter: StoreService.getCurrentQuarter(),
      currentUser: null
    };
  },
  computed: {
    isAdmin() {
      return this.currentUser && this.currentUser.role === 'admin';
    }
  },
  async onShow() {
    await this.fetchData();
  },
  methods: {
    async fetchData() {
      try {
        await StoreService.ensureReady();
        this.currentUser = StoreService.getCurrentUser();
        // 先清空排行榜数据，触发重新渲染
        this.leaderboard = [];
        // 强制Vue更新DOM
        await this.$nextTick();
        // 重新获取排行榜数据
        this.leaderboard = StoreService.getLeaderboard();
        this.currentQuarter = StoreService.getCurrentQuarter();
      } catch (error) {
        uni.showToast({ title: error.message || '数据加载失败', icon: 'none' });
      }
    },
    rankColor(rank) {
      if (rank === 1) return '#fbbf24';
      if (rank === 2) return '#94a3b8';
      if (rank === 3) return '#fb923c';
      return '#cbd5f5';
    },
    gotoDashboard() {
      uni.switchTab({ url: '/pages/dashboard/dashboard' });
    }
  }
};
</script>

<style scoped>
.leaderboard-page {
  min-height: 100vh;
  background: linear-gradient(to bottom, #0f172a, #0f766e);
  display: flex;
  flex-direction: column;
}

.leaderboard-hero {
  padding: 80rpx 32rpx 40rpx;
  text-align: center;
  color: #fff;
}

.hero-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.15);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
}

.hero-title {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
}

.hero-subtitle {
  display: block;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 8rpx;
  letter-spacing: 4rpx;
}

.leaderboard-content {
  background: #f8fafc;
  border-top-left-radius: 48rpx;
  border-top-right-radius: 48rpx;
  padding: 40rpx 32rpx 80rpx;
  margin-top: -24rpx;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.leaderboard-card {
  display: flex;
  align-items: center;
  background: #ffffff;
  border-radius: 28rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 20rpx 60rpx rgba(15, 118, 110, 0.06);
}

.rank-badge {
  width: 72rpx;
  height: 72rpx;
  border-radius: 24rpx;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 700;
  color: #94a3b8;
  margin-right: 20rpx;
}

.leaderboard-card.rank-1 .rank-badge {
  background: #fef3c7;
  color: #b45309;
}

.leaderboard-card.rank-2 .rank-badge {
  background: #e0f2fe;
  color: #0f172a;
}

.leaderboard-card.rank-3 .rank-badge {
  background: #ffedd5;
  color: #c2410c;
}

.leaderboard-card.rank-1 {
  border: 2rpx solid #facc15;
}

.leaderboard-card.rank-2 {
  border: 2rpx solid #cbd5f5;
}

.leaderboard-card.rank-3 {
  border: 2rpx solid #fed7aa;
}

.employee-info {
  flex: 1;
}

.employee-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #0f172a;
}

.employee-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8rpx;
}

.employee-branch {
  font-size: 24rpx;
  color: #94a3b8;
}

.score-chips {
  display: flex;
  gap: 8rpx;
}

.chip {
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  color: #fff;
}

.chip.blue {
  background: rgba(59, 130, 246, 0.15);
  color: #2563eb;
}

.chip.teal {
  background: rgba(20, 184, 166, 0.15);
  color: #0f766e;
}

.score-total {
  text-align: right;
}

.score-total text:first-child {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #0f172a;
}

.score-label {
  font-size: 22rpx;
  color: #94a3b8;
}

.empty-state {
  text-align: center;
  color: #e2e8f0;
  margin-top: 60rpx;
}

.light-btn {
  margin-top: 16rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.6);
  color: #fff;
  padding: 16rpx 32rpx;
  border-radius: 999rpx;
  background: transparent;
}
</style>

