<template>
  <view class="detail-page">
    <!-- 用户头部 -->
    <view class="user-header">
      <view class="user-header__info">
        <text class="user-header__name">{{ employeeName }}</text>
        <text class="user-header__meta">{{ branchName }} · {{ getRoleLabel(employeeRole) }}</text>
      </view>
      <view class="user-header__stats">
        <view class="stat-item">
          <text class="stat-value">{{ monthlyStats.totalScore || 0 }}</text>
          <text class="stat-label">总分</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ monthlyStats.requiredScore || 0 }}</text>
          <text class="stat-label">必选</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ monthlyStats.bonusScore || 0 }}</text>
          <text class="stat-label">加分</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ userSubmissions.length }}</text>
          <text class="stat-label">提报数</text>
        </view>
      </view>
    </view>

    <!-- 筛选区 -->
    <view class="filter-bar">
      <input class="search-input" placeholder="搜索业务名称" v-model="searchKeyword" />
      <view class="filter-row">
        <picker :range="periodOptions" :value="periodOptions.indexOf(selectedPeriod)" @change="handlePeriodChange">
          <view class="picker-btn">{{ formatPeriod(selectedPeriod) }}</view>
        </picker>
        <button class="ghost-btn small" @click="resetFilters">重置</button>
      </view>
    </view>

    <!-- 提报列表 -->
    <scroll-view scroll-y class="detail-content">
      <view v-if="userSubmissions.length === 0" class="empty-state">
        <uni-icons type="refreshempty" size="48" color="#cbd5f5" />
        <text class="empty-text">暂无提报记录</text>
      </view>
      <view v-else>
        <view v-for="(dateGroup, dateKey) in groupedSubmissions" :key="dateKey" class="date-group">
          <view class="date-header">
            <text class="date-label">{{ dateKey }}</text>
            <text class="date-count">{{ dateGroup.length }} 条</text>
          </view>
          <view v-for="sub in dateGroup" :key="sub._id" class="sub-card">
            <view class="sub-card__bar" :class="getTaskCategory(sub.taskId) === 'required' ? 'bar-required' : 'bar-bonus'" />
            <view class="sub-card__body">
              <view class="sub-card__info">
                <text class="sub-card__tag" :class="getTaskCategory(sub.taskId) === 'required' ? 'tag-required' : 'tag-bonus'">
                  {{ getTaskCategory(sub.taskId) === 'required' ? '必选' : '加分' }}
                </text>
                <text class="sub-card__name">{{ getTaskName(sub.taskId) }}</text>
                <text class="sub-card__time">{{ formatTime(sub.createdAt) }}</text>
              </view>
              <view class="sub-card__right">
                <text class="sub-card__value">{{ sub.value }} {{ getTaskUnit(sub.taskId) }}</text>
                <view v-if="getTaskCategory(sub.taskId) === 'bonus'" class="sub-card__score">
                  +{{ calcBonusScore(sub) }}分
                </view>
                <view v-else class="sub-card__score sub-card__score--dynamic">动态积分</view>
                <view v-if="isAdmin" class="sub-card__actions">
                  <button class="link-btn" @click="handleEdit(sub)">编辑</button>
                  <button class="link-btn danger" @click="handleDelete(sub)">删除</button>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 编辑弹窗 -->
    <view v-if="showEditModal" class="modal-overlay" @tap.self="cancelEdit">
      <view class="edit-modal">
        <view class="edit-modal__header">
          <text class="edit-modal__title">编辑提报</text>
          <view class="edit-modal__close" @tap="cancelEdit">
            <uni-icons type="closeempty" :size="20" color="rgba(255,255,255,0.7)" />
          </view>
        </view>
        <view class="edit-modal__body">
          <view class="edit-info-row">
            <view class="edit-info-item">
              <text class="edit-info-label">业务</text>
              <text class="edit-info-value">{{ editingSub && getTaskName(editingSub.taskId) }}</text>
            </view>
            <view class="edit-info-item">
              <text class="edit-info-label">日期</text>
              <text class="edit-info-value">{{ editingSub && editingSub.date }}</text>
            </view>
          </view>
          <view class="edit-info-row">
            <view class="edit-info-item">
              <text class="edit-info-label">原数量</text>
              <text class="edit-info-value">{{ editingSub && editingSub.value }} {{ editingSub && getTaskUnit(editingSub.taskId) }}</text>
            </view>
          </view>
          <view class="edit-input-wrap">
            <text class="edit-label">修改数量</text>
            <view class="edit-input-row">
              <input class="edit-input" type="digit" v-model="editValue" placeholder="输入新数量" focus />
              <text class="edit-unit">{{ editingSub && getTaskUnit(editingSub.taskId) }}</text>
            </view>
          </view>
        </view>
        <view class="edit-modal__footer">
          <button class="ghost-btn" @tap="cancelEdit">取消</button>
          <button class="primary-btn" @tap="confirmEdit">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { StoreService } from '../../../services/store.js';
import { getPFSubmissions, getPFTasks, getPFMonthlyStats, updatePFSubmission, deletePFSubmission, getCurrentPeriod, formatPeriod } from '../../../services/pf-service.js';

export default {
  data() {
    return {
      currentUser: null,
      employeeId: '',
      employeeName: '',
      branchName: '',
      employeeRole: '',
      submissions: [],
      tasksMap: {},
      monthlyStats: {},
      searchKeyword: '',
      selectedPeriod: getCurrentPeriod(),
      periodOptions: [],
      showEditModal: false,
      editingSub: null,
      editValue: ''
    };
  },

  computed: {
    isAdmin() {
      return this.currentUser && ['super_admin', 'personal_finance_admin'].includes(this.currentUser.role);
    },
    userSubmissions() {
      let data = this.submissions;
      if (this.searchKeyword.trim()) {
        const kw = this.searchKeyword.trim().toLowerCase();
        data = data.filter(sub => {
          const name = this.getTaskName(sub.taskId).toLowerCase();
          return name.includes(kw);
        });
      }
      return data;
    },
    groupedSubmissions() {
      const groups = {};
      this.userSubmissions.forEach(sub => {
        const date = sub.date || '未知日期';
        if (!groups[date]) groups[date] = [];
        groups[date].push(sub);
      });
      return groups;
    }
  },

  onLoad(options) {
    this.employeeId = options.userId || '';
    this.employeeName = decodeURIComponent(options.name || '');
    this.branchName = decodeURIComponent(options.branch || '');
    this.employeeRole = options.role || '';
    this.generatePeriodOptions();
  },

  async onShow() {
    await this.initData();
  },

  methods: {
    formatPeriod,

    generatePeriodOptions() {
      const options = [];
      const now = new Date();
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        options.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
      this.periodOptions = options;
    },

    async initData() {
      try {
        uni.showLoading({ title: '加载中...' });
        await StoreService.ensureReady();
        this.currentUser = StoreService.getCurrentUser();

        const [tasks, submissions, stats] = await Promise.all([
          getPFTasks(),
          getPFSubmissions({ userId: this.employeeId, period: this.selectedPeriod }),
          getPFMonthlyStats(this.employeeId, this.selectedPeriod)
        ]);

        const map = {};
        tasks.forEach(t => { map[t.taskId] = t; });
        this.tasksMap = map;
        this.submissions = submissions;
        this.monthlyStats = stats || {};
      } catch (e) {
        uni.showToast({ title: e.message || '加载失败', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    },

    handlePeriodChange(e) {
      this.selectedPeriod = this.periodOptions[e.detail.value];
      this.initData();
    },

    resetFilters() {
      this.searchKeyword = '';
      this.selectedPeriod = getCurrentPeriod();
      this.initData();
    },

    getRoleLabel(role) {
      return StoreService.getRoleName(role);
    },

    getTaskName(taskId) {
      return this.tasksMap[taskId]?.taskName || '未知业务';
    },

    getTaskUnit(taskId) {
      return this.tasksMap[taskId]?.unit || '';
    },

    getTaskCategory(taskId) {
      return this.tasksMap[taskId]?.category || 'required';
    },

    calcBonusScore(sub) {
      const task = this.tasksMap[sub.taskId];
      if (!task || task.category !== 'bonus') return '0';
      const unitPrice = task.scoreConfig?.unitPrice || 0;
      const maxScore = task.scoreConfig?.maxScore || null;
      const raw = sub.value * unitPrice;
      return (maxScore ? Math.min(raw, maxScore) : raw).toFixed(1);
    },

    formatTime(ts) {
      if (!ts) return '';
      const d = new Date(ts);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    },

    // 编辑
    handleEdit(sub) {
      this.editingSub = sub;
      this.editValue = String(sub.value);
      this.showEditModal = true;
    },

    cancelEdit() {
      this.showEditModal = false;
      this.editingSub = null;
      this.editValue = '';
    },

    async confirmEdit() {
      const val = parseFloat(this.editValue);
      if (!val || val <= 0) {
        uni.showToast({ title: '请输入有效数量', icon: 'none' });
        return;
      }
      try {
        uni.showLoading({ title: '保存中...' });
        await updatePFSubmission(this.editingSub._id, val);
        uni.showToast({ title: '修改成功', icon: 'success' });
        this.cancelEdit();
        await this.initData();
      } catch (e) {
        uni.showToast({ title: e.message || '修改失败', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    },

    handleDelete(sub) {
      uni.showModal({
        title: '确认删除',
        content: `确定删除「${this.getTaskName(sub.taskId)}」的提报记录？`,
        confirmColor: '#ef4444',
        success: async res => {
          if (!res.confirm) return;
          try {
            uni.showLoading({ title: '删除中...' });
            await deletePFSubmission(sub._id);
            uni.showToast({ title: '已删除', icon: 'success' });
            await this.initData();
          } catch (e) {
            uni.showToast({ title: e.message || '删除失败', icon: 'none' });
          } finally {
            uni.hideLoading();
          }
        }
      });
    }
  }
};
</script>

<style scoped>
.detail-page { min-height: 100vh; background: #f8fafc; display: flex; flex-direction: column; }

/* 用户头部 */
.user-header { background: linear-gradient(135deg, #0f766e 0%, #0ea5e9 100%); padding: 40rpx 32rpx 32rpx; color: #fff; }
.user-header__info { margin-bottom: 24rpx; }
.user-header__name { font-size: 40rpx; font-weight: 700; display: block; }
.user-header__meta { font-size: 26rpx; opacity: 0.85; display: block; margin-top: 8rpx; }
.user-header__stats { display: flex; gap: 16rpx; }
.stat-item { flex: 1; background: rgba(255,255,255,0.15); border-radius: 12rpx; padding: 16rpx; text-align: center; }
.stat-value { display: block; font-size: 36rpx; font-weight: 700; }
.stat-label { display: block; font-size: 22rpx; opacity: 0.8; margin-top: 4rpx; }

/* 筛选区 */
.filter-bar { background: #fff; padding: 20rpx 32rpx; border-bottom: 1rpx solid #e5e7eb; }
.search-input { width: 100%; height: 72rpx; line-height: 72rpx; padding: 0 24rpx; background: #f1f5f9; border-radius: 12rpx; font-size: 28rpx; box-sizing: border-box; margin-bottom: 16rpx; }
.filter-row { display: flex; gap: 16rpx; align-items: center; }
.picker-btn { padding: 12rpx 24rpx; background: #f1f5f9; border-radius: 8rpx; font-size: 26rpx; color: #334155; }
.ghost-btn { background: #f1f5f9; color: #64748b; border: none; border-radius: 8rpx; font-size: 26rpx; }
.ghost-btn.small { padding: 12rpx 24rpx; font-size: 24rpx; width: fit-content; }

/* 内容区 */
.detail-content { flex: 1; padding: 24rpx 32rpx; }

/* 空状态 */
.empty-state { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; gap: 24rpx; }
.empty-text { font-size: 28rpx; color: #94a3b8; }

/* 日期分组 */
.date-group { margin-bottom: 24rpx; }
.date-header { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; }
.date-label { font-size: 28rpx; font-weight: 600; color: #1e293b; }
.date-count { font-size: 24rpx; color: #94a3b8; }

/* 提报卡片 */
.sub-card { display: flex; background: #fff; border-radius: 12rpx; margin-bottom: 12rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.sub-card__bar { width: 6rpx; flex-shrink: 0; }
.bar-required { background: #0f766e; }
.bar-bonus { background: #f59e0b; }
.sub-card__body { flex: 1; padding: 20rpx 24rpx; display: flex; justify-content: space-between; align-items: center; min-width: 0; }
.sub-card__info { display: flex; flex-direction: column; gap: 8rpx; flex: 1; min-width: 0; }
.sub-card__tag { font-size: 20rpx; font-weight: 600; padding: 2rpx 12rpx; border-radius: 6rpx; width: fit-content; }
.tag-required { background: #ecfdf5; color: #0f766e; }
.tag-bonus { background: #fffbeb; color: #d97706; }
.sub-card__name { font-size: 28rpx; font-weight: 500; color: #1e293b; }
.sub-card__time { font-size: 22rpx; color: #94a3b8; }
.sub-card__right { display: flex; flex-direction: column; align-items: flex-end; gap: 8rpx; flex-shrink: 0; }
.sub-card__value { font-size: 30rpx; font-weight: 600; color: #0f172a; }
.sub-card__score { font-size: 24rpx; font-weight: 600; color: #0f766e; }
.sub-card__score--dynamic { color: #94a3b8; font-weight: 400; font-size: 22rpx; }
.sub-card__actions { display: flex; gap: 8rpx; }

/* 按钮 */
.link-btn { background: none; border: none; color: #0f766e; font-size: 24rpx; padding: 4rpx 12rpx; }
.link-btn.danger { color: #ef4444; }
.primary-btn { background: #0f766e; color: #fff; border: none; border-radius: 12rpx; padding: 16rpx 32rpx; font-size: 28rpx; }

/* 编辑弹窗 */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.edit-modal { width: 640rpx; background: #fff; border-radius: 28rpx; overflow: hidden; }
.edit-modal__header { background: linear-gradient(135deg, #0f766e 0%, #0ea5e9 100%); padding: 28rpx 32rpx; display: flex; align-items: center; justify-content: space-between; }
.edit-modal__title { font-size: 32rpx; font-weight: 700; color: #fff; }
.edit-modal__close { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: rgba(255,255,255,0.15); }
.edit-modal__body { padding: 28rpx 32rpx 8rpx; }
.edit-info-row { display: flex; gap: 16rpx; margin-bottom: 20rpx; }
.edit-info-item { flex: 1; background: #f8fafc; border-radius: 12rpx; padding: 16rpx 20rpx; border: 1rpx solid #e2e8f0; }
.edit-info-label { display: block; font-size: 22rpx; color: #94a3b8; margin-bottom: 6rpx; }
.edit-info-value { display: block; font-size: 28rpx; font-weight: 600; color: #0f172a; }
.edit-input-wrap { margin-bottom: 16rpx; }
.edit-label { display: block; font-size: 26rpx; color: #64748b; margin-bottom: 12rpx; font-weight: 500; }
.edit-input-row { display: flex; align-items: center; background: #f8fafc; border: 2rpx solid #e2e8f0; border-radius: 14rpx; overflow: hidden; }
.edit-input { flex: 1; padding: 22rpx 20rpx; font-size: 36rpx; font-weight: 600; color: #0f172a; background: transparent; }
.edit-unit { padding: 0 20rpx; font-size: 26rpx; color: #94a3b8; border-left: 1rpx solid #e2e8f0; }
.edit-modal__footer { padding: 20rpx 32rpx 32rpx; display: flex; gap: 16rpx; }
.edit-modal__footer .ghost-btn { flex: 1; padding: 22rpx 0; border-radius: 16rpx; font-size: 30rpx; text-align: center; }
.edit-modal__footer .primary-btn { flex: 1; padding: 22rpx 0; border-radius: 16rpx; font-size: 30rpx; text-align: center; }
</style>
