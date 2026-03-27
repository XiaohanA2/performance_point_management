<template>
  <view class="leaderboard-page">
    <view class="leaderboard-hero">
      <view class="hero-icon">
        <image src="/static/rank.png" mode="aspectFill" style="width: 64rpx; height: 64rpx;" />
      </view>
      <text class="hero-title">{{ systemMode === 'pf' ? '月度排名' : '龙虎榜' }}</text>
      <view class="system-badge">{{ systemMode === 'pf' ? '岗位穿透' : '信贷系统' }}</view>

      <view class="filter-section">
        <!-- 个贷：季度/月份切换 -->
        <template v-if="systemMode === 'credit'">
          <view class="filter-tabs">
            <view class="filter-tab" :class="{ active: filterType === 'quarter' }" @click="setFilterType('quarter')">按季度</view>
            <view class="filter-tab" :class="{ active: filterType === 'month' }" @click="setFilterType('month')">按月份</view>
          </view>
          <view class="filter-row">
            <view v-if="filterType === 'quarter'" class="date-picker-container">
              <picker :range="quarterOptions" :value="quarterOptions.indexOf(selectedQuarter)" @change="handleQuarterChange">
                <view class="date-picker-btn"><text class="icon">📅</text><text>{{ selectedQuarter || '选择季度' }}</text></view>
              </picker>
            </view>
            <view v-if="filterType === 'month'" class="date-picker-container">
              <picker mode="date" :fields="'month'" @change="handleMonthChange" :value="monthValue">
                <view class="date-picker-btn"><text class="icon">📅</text><text>{{ formatMonth(selectedMonth) || '选择月份' }}</text></view>
              </picker>
            </view>
            <text class="rank-label">积分排名</text>
          </view>
        </template>
        <!-- 个金：月份选择 -->
        <template v-if="systemMode === 'pf'">
          <view class="filter-row">
            <picker mode="date" :fields="'month'" @change="handlePFMonthChange" :value="pfMonthPickerValue">
              <view class="date-picker-btn"><text class="icon">📅</text><text>{{ formatPeriod(pfSelectedPeriod) }}</text></view>
            </picker>
            <text class="rank-label">积分排名</text>
          </view>
          <!-- 角色筛选tabs -->
          <view class="role-filter-tabs">
            <view
              v-for="roleFilter in pfRoleFilters"
              :key="roleFilter.value"
              class="role-tab"
              :class="{ active: pfSelectedRole === roleFilter.value }"
              @click="pfSelectedRole = roleFilter.value"
            >
              {{ roleFilter.label }}
            </view>
          </view>
        </template>
      </view>
    </view>

    <view v-if="isLoading" class="loading-state">
      <text class="loading-text">加载中...</text>
    </view>

    <view v-else class="leaderboard-content">
      <!-- 个贷榜单 -->
      <template v-if="systemMode === 'credit'">
        <view v-if="leaderboard.length === 0" class="empty-state">
          <text>暂无榜单数据，先去提报业务赚积分吧</text>
          <button class="light-btn" @click="gotoDashboard">前往工作台</button>
        </view>
        <view v-for="entry in leaderboard" :key="`${filterType}_${selectedQuarter}_${dateRange.start}_${entry.employeeId}`" class="leaderboard-card"
          :class="{ 'rank-1': entry.rank===1, 'rank-2': entry.rank===2, 'rank-3': entry.rank===3 }">
          <view class="rank-badge">
            <uni-icons v-if="entry.rank===1" type="medal" :color="rankColor(1)" size="26" />
            <uni-icons v-else-if="entry.rank===2" type="medal" :color="rankColor(2)" size="26" />
            <uni-icons v-else-if="entry.rank===3" type="medal" :color="rankColor(3)" size="26" />
            <text v-else>{{ entry.rank }}</text>
          </view>
          <view class="employee-info">
            <text class="employee-name">{{ entry.name }}</text>
            <view class="employee-meta">
              <text class="employee-branch">{{ entry.branchName || entry.branch }}</text>
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
      </template>

      <!-- 个金榜单 -->
      <template v-if="systemMode === 'pf'">
        <view v-if="filteredPFRankings.length === 0" class="empty-state">
          <text>暂无榜单数据，先去提报业务赚积分吧</text>
          <button class="light-btn" @click="gotoDashboard">前往工作台</button>
        </view>
        <view v-for="(item, index) in filteredPFRankings" :key="item.userId" class="leaderboard-card"
          :class="{ 'rank-1': index===0, 'rank-2': index===1, 'rank-3': index===2, 'highlight': currentUser && item.userId === currentUser.id }">
          <view class="rank-badge">
            <uni-icons v-if="index===0" type="medal" :color="rankColor(1)" size="26" />
            <uni-icons v-else-if="index===1" type="medal" :color="rankColor(2)" size="26" />
            <uni-icons v-else-if="index===2" type="medal" :color="rankColor(3)" size="26" />
            <text v-else>{{ index + 1 }}</text>
          </view>
          <view class="employee-info">
            <text class="employee-name">{{ item.userName }}</text>
            <view class="employee-meta">
              <text class="employee-branch">{{ item.branchName || item.branch || '未设置支行' }}</text>
              <view class="score-chips">
                <view class="chip blue">必选 {{ item.requiredScore }}</view>
                <view class="chip teal">加分 {{ item.bonusScore }}</view>
              </view>
            </view>
          </view>
          <view class="score-total">
            <text>{{ item.totalScore }}</text>
            <text class="score-label">&nbsp;&nbsp;总积分</text>
          </view>
        </view>
      </template>
    </view>
  </view>
</template>

<script>
import { StoreService } from '../../services/store.js';
import { getUserDefaultSystem } from '../../services/permission-service.js';
import { getPFRankings, getCurrentPeriod, formatPeriod } from '../../services/pf-service.js';

export default {
  data() {
    return {
      currentUser: null,
      systemMode: 'credit',
      isLoading: true,
      // 个贷
      leaderboard: [],
      currentQuarter: StoreService.getCurrentQuarter(),
      filterType: 'quarter',
      quarterOptions: ['2025Q4','2026Q1','2026Q2','2026Q3','2026Q4','2027Q1','2027Q2','2027Q3','2027Q4'],
      selectedQuarter: StoreService.getCurrentQuarter(),
      dateRange: { start: '', end: '' },
      // 个金
      pfRankings: [],
      pfSelectedPeriod: getCurrentPeriod(),
      pfSelectedRole: 'manager',
      pfRoleFilters: [
        { label: '客户经理', value: 'manager' },
        { label: '大堂经理', value: 'lobby_manager' },
        { label: '弹性柜面', value: 'elastic_counter' },
        { label: '柜面经理', value: 'counter_manager' }
      ]
    };
  },
  computed: {
    monthValue() {
      if (this.dateRange.start) return `${this.dateRange.start}-01`;
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    },
    selectedMonth() {
      if (this.dateRange.start) return this.dateRange.start;
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    },
    pfMonthPickerValue() {
      return `${this.pfSelectedPeriod}-01`;
    },
    filteredPFRankings() {
      return this.pfRankings.filter(item => item.role === this.pfSelectedRole);
    }
  },
  async onShow() {
    await this.fetchData();
  },
  methods: {
    async fetchData() {
      this.isLoading = true;
      try {
        await StoreService.ensureReady();
        this.currentUser = StoreService.getCurrentUser();
        const saved = uni.getStorageSync('system_mode');
        const def = getUserDefaultSystem(this.currentUser);
        this.systemMode = saved || (def === 'pf' ? 'pf' : 'credit');
        if (this.systemMode === 'credit') {
          await this.loadCreditLeaderboard();
        } else {
          await this.loadPFLeaderboard();
        }
      } catch (error) {
        uni.showToast({ title: error.message || '数据加载失败', icon: 'none' });
      } finally {
        this.isLoading = false;
      }
    },
    async loadCreditLeaderboard() {
      const dateRange = this.filterType === 'quarter' ? { quarter: this.selectedQuarter } : this.dateRange;
      const data = StoreService.getLeaderboard(this.filterType, dateRange);
      this.leaderboard = data;
      this.currentQuarter = StoreService.getCurrentQuarter();
    },
    async loadPFLeaderboard() {
      this.pfRankings = await getPFRankings(this.pfSelectedPeriod, 500);
    },
    setFilterType(type) {
      this.filterType = type;
      if (type === 'quarter') {
        this.selectedQuarter = StoreService.getCurrentQuarter();
      } else {
        const now = new Date();
        this.dateRange.start = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
        this.dateRange.end = '';
      }
      StoreService.clearCache();
      this.loadCreditLeaderboard();
    },
    handleQuarterChange(e) {
      this.selectedQuarter = this.quarterOptions[e.detail.value];
      StoreService.clearCache();
      this.loadCreditLeaderboard();
    },
    handleMonthChange(e) {
      this.dateRange.start = e.detail.value.substring(0, 7);
      this.dateRange.end = '';
      StoreService.clearCache();
      this.loadCreditLeaderboard();
    },
    handlePFMonthChange(e) {
      this.pfSelectedPeriod = e.detail.value.substring(0, 7);
      this.loadPFLeaderboard();
    },
    formatMonth(monthStr) {
      if (!monthStr) return '';
      const [year, month] = monthStr.split('-');
      return `${year}年${month}月`;
    },
    formatPeriod,
    rankColor(rank) {
      if (rank === 1) return '#fbbf24';
      if (rank === 2) return '#94a3b8';
      if (rank === 3) return '#fb923c';
      return '#cbd5f5';
    },
    getRoleLabel(roleCode) {
      return StoreService.getRoleName(roleCode);
    },
    gotoDashboard() { uni.switchTab({ url: '/pages/dashboard/dashboard' }); }
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
  padding: 40rpx 32rpx 30rpx;
  text-align: center;
  color: #fff;
}

/* 移除顶部图标，优化布局 */
/* .hero-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.15);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
} */

.hero-icon {
  width: 70rpx;
  height: 70rpx;
  margin: 0 auto 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
}

.hero-title {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
}

.system-badge {
  display: inline-block;
  margin: 12rpx auto 0;
  background: rgba(255,255,255,0.2);
  color: rgba(255,255,255,0.9);
  font-size: 22rpx;
  padding: 6rpx 20rpx;
  border-radius: 999rpx;
  border: 1rpx solid rgba(255,255,255,0.3);
}

.leaderboard-card.highlight {
  border: 2rpx solid #0f766e;
  background: #f0fdfa;
}

/* 时间段筛选样式 */
.filter-section {
  margin-top: 32rpx;
  margin-bottom: 20rpx;
}

.filter-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 16rpx;
  padding: 8rpx;
  max-width: 400rpx;
  margin: 0 auto 20rpx;
}

.filter-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  margin-top: 20rpx;
}

.date-picker-container {
  display: flex;
  align-items: center;
}

.date-picker-btn {
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 20rpx;
  padding: 16rpx 24rpx;
  color: rgba(255, 255, 255, 0.9);
  font-size: 24rpx;
  transition: all 0.2s ease;
  height: 60rpx;
  line-height: 60rpx;
}

.rank-label {
  color: rgba(255, 255, 255, 0.9);
  font-size: 24rpx;
  font-weight: 600;
  height: 60rpx;
  line-height: 60rpx;
  margin-top: 0;
}

.filter-tab {
  flex: 1;
  padding: 12rpx 0;
  text-align: center;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
  border-radius: 12rpx;
  transition: all 0.2s ease;
}

.filter-tab.active {
  background: rgba(255, 255, 255, 0.9);
  color: #0f766e;
  font-weight: 600;
}

.date-picker-container {
  display: flex;
  justify-content: center;
  margin-bottom: 20rpx;
}

.date-picker-btn {
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 20rpx;
  padding: 16rpx 24rpx;
  color: rgba(255, 255, 255, 0.9);
  font-size: 24rpx;
  transition: all 0.2s ease;
}

.date-picker-btn .icon {
  font-size: 24rpx;
}

.date-picker-btn:active {
  background: rgba(255, 255, 255, 0.25);
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

/* 加载状态样式 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  border-top-left-radius: 48rpx;
  border-top-right-radius: 48rpx;
  padding: 120rpx 32rpx;
  margin-top: -24rpx;
  flex: 1;
  min-height: 300rpx;
}

.loading-text {
  margin-top: 24rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #64748b;
}

/* 优化空状态样式，使其与加载状态风格一致 */
.leaderboard-content .empty-state {
  text-align: center;
  color: #94a3b8;
  margin: 60rpx auto;
  max-width: 600rpx;
  padding: 40rpx 0;
}

.leaderboard-content .empty-state text {
  font-size: 28rpx;
  color: #64748b;
}

.leaderboard-content .empty-state .light-btn {
  margin-top: 32rpx;
  background: #0f766e;
  color: #fff;
  border: none;
  padding: 20rpx 48rpx;
  font-size: 28rpx;
}

/* 个金角色筛选tabs */
.role-filter-tabs {
  display: flex;
  gap: 12rpx;
  margin-top: 24rpx;
  justify-content: center;
  flex-wrap: wrap;
}

.role-tab {
  flex-shrink: 0;
  padding: 12rpx 28rpx;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 20rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
  transition: all 0.2s ease;
}

.role-tab.active {
  background: rgba(255, 255, 255, 0.9);
  color: #0f766e;
  font-weight: 600;
}
</style>

