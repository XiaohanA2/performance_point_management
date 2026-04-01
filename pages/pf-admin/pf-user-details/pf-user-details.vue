<template>
  <view class="detail-page">
    <!-- 用户头部 -->
    <view class="user-header">
      <text class="user-header__name">{{ employeeName }}</text>
      <text class="user-header__meta">{{ branchName }} · {{ getRoleLabel(employeeRole) }}</text>
    </view>

    <!-- 筛选区 -->
    <view class="filter-bar">
      <view class="filter-row">
        <input class="search-input" placeholder="搜索业务" v-model="searchKeyword" />
        <picker :range="periodOptions" :value="periodOptions.indexOf(selectedPeriod)" @change="handlePeriodChange">
          <view class="picker-btn">{{ formatPeriod(selectedPeriod) }}</view>
        </picker>
        <button class="reset-btn" @click="resetFilters">重置</button>
      </view>
    </view>

    <!-- 提报列表 -->
    <scroll-view scroll-y class="detail-content">
      <view v-if="userSubmissions.length === 0" class="empty-state">
        <uni-icons type="refreshempty" size="48" color="#cbd5e1" />
        <text class="empty-text">暂无提报记录</text>
      </view>
      <view v-else class="submission-groups">
        <view v-for="(dateGroup, dateKey) in groupedSubmissions" :key="dateKey" class="date-group">
          <view class="date-header">
            <text class="date-label">{{ dateKey }}</text>
            <text class="date-count">{{ dateGroup.length }} 条</text>
          </view>
          <view class="submission-list">
            <view v-for="sub in dateGroup" :key="sub._id" class="submission-item">
              <view class="submission-item__bar" :class="getTaskCategory(sub.taskId) === 'required' ? 'bar-required' : 'bar-bonus'" />
              <view class="submission-item__body">
                <view class="submission-item__info">
                  <view class="submission-item__info-content">
                    <view class="submission-rule-info">
                      <text class="submission-category" :class="getTaskCategory(sub.taskId) === 'required' ? 'category-required' : 'category-bonus'">
                        {{ getTaskCategory(sub.taskId) === 'required' ? '必选' : '加分' }}
                      </text>
                      <text class="submission-item__title">{{ getTaskName(sub.taskId) }}</text>
                    </view>
                    <text class="submission-time">{{ formatTime(sub.createdAt) }}</text>
                  </view>
                </view>
                <view class="submission-item__stats">
                  <text class="submission-item__count">{{ sub.value }} {{ getTaskUnit(sub.taskId) }}</text>
                </view>
                <button v-if="isAdmin" class="edit-btn" @click="handleEdit(sub)">编辑</button>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 编辑弹窗 -->
    <view v-if="showEditModal" class="modal-overlay">
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
          <button class="delete-btn" @tap="handleDelete(editingSub)">删除</button>
          <button class="primary-btn" @tap="confirmEdit">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { StoreService } from '../../../services/store.js';
import { getPFSubmissions, getPFTasks, getPFMonthlyStats, updatePFSubmission, deletePFSubmission, getCurrentPeriod, formatPeriod, invalidateAllCache } from '../../../services/pf-service.js';

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
      taskScores: {},
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

        // 构建 taskScores 映射
        const scores = {};
        if (stats && stats.requiredTasks) {
          stats.requiredTasks.forEach(t => {
            scores[t.taskId] = t.score || 0;
          });
        }
        this.taskScores = scores;
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

        // 立即更新本地数据
        const sub = this.submissions.find(s => s._id === this.editingSub._id);
        if (sub) sub.value = val;

        uni.showToast({ title: '修改成功', icon: 'success' });
        this.cancelEdit();
        invalidateAllCache();
        StoreService.clearCache();
      } catch (e) {
        uni.showToast({ title: e.message || '修改失败', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    },

    handleDelete(sub) {
      const target = sub || this.editingSub;
      uni.showModal({
        title: '确认删除',
        content: `确定删除「${this.getTaskName(target.taskId)}」的提报记录？`,
        confirmColor: '#ef4444',
        success: async res => {
          if (!res.confirm) return;
          try {
            uni.showLoading({ title: '删除中...' });
            await deletePFSubmission(target._id);
            uni.showToast({ title: '已删除，积分计算中...', icon: 'success' });
            this.cancelEdit();
            invalidateAllCache();
            StoreService.clearCache();
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

/* 用户头部 - 固定 */
.user-header { background: linear-gradient(135deg, #0f766e 0%, #0ea5e9 100%); padding: 32rpx; color: #fff; flex-shrink: 0; }
.user-header__name { font-size: 40rpx; font-weight: 700; display: block; margin-bottom: 8rpx; }
.user-header__meta { font-size: 26rpx; opacity: 0.85; display: block; }

/* 筛选区 - 固定 */
.filter-bar { background: #fff; padding: 20rpx 32rpx; border-bottom: 1rpx solid #e5e7eb; flex-shrink: 0; }
.filter-row { display: flex; gap: 12rpx; align-items: center; }
.search-input { flex: 1; height: 64rpx; line-height: 64rpx; padding: 0 20rpx; background: #f1f5f9; border-radius: 12rpx; font-size: 26rpx; box-sizing: border-box; }
.picker-btn { padding: 12rpx 20rpx; background: #ecfdf5; border: 2rpx solid rgba(15, 118, 110, 0.2); border-radius: 12rpx; font-size: 24rpx; color: #0f766e; font-weight: 600; white-space: nowrap; }
.reset-btn { padding: 12rpx 20rpx; background: #f1f5f9; color: #64748b; border: none; border-radius: 12rpx; font-size: 24rpx; white-space: nowrap; }

/* 内容区 - 滚动 */
.detail-content { flex: 1; overflow-y: auto; }

/* 空状态 */
.empty-state { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; gap: 20rpx; }
.empty-text { font-size: 28rpx; color: #94a3b8; }

/* 日期分组 */
.submission-groups { display: flex; flex-direction: column; gap: 20rpx; padding: 24rpx; }
.date-group { background: #fff; border-radius: 16rpx; padding: 20rpx; box-shadow: 0 1rpx 3rpx rgba(0, 0, 0, 0.05); }
.date-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12rpx; margin-bottom: 16rpx; border-bottom: 2rpx solid #f1f5f9; }
.date-label { font-size: 34rpx; font-weight: 700; color: #0f172a; }
.date-count { font-size: 24rpx; color: #94a3b8; background: #f1f5f9; padding: 4rpx 16rpx; border-radius: 12rpx; }

/* 提报列表 */
.submission-list { display: flex; flex-direction: column; gap: 12rpx; }
.submission-item { position: relative; background: #fff; border-radius: 10rpx; padding: 10rpx 16rpx; box-shadow: 0 1rpx 3rpx rgba(0, 0, 0, 0.05); display: flex; justify-content: space-between; align-items: flex-start; }
.submission-item__bar { position: absolute; left: 0; top: 0; bottom: 0; width: 8rpx; border-top-left-radius: 10rpx; border-bottom-left-radius: 10rpx; }
.bar-required { background: #0f766e; }
.bar-bonus { background: #f59e0b; }
.submission-item__body { display: flex; justify-content: space-between; align-items: flex-start; flex: 1; gap: 20rpx; padding-left: 16rpx; }
.submission-item__info { flex: 1; min-width: 0; }
.submission-item__info-content { flex: 1; min-width: 0; }
.submission-rule-info { display: flex; align-items: center; gap: 10rpx; margin-bottom: 6rpx; }
.submission-category { font-size: 20rpx; font-weight: 600; padding: 4rpx 12rpx; border-radius: 10rpx; flex-shrink: 0; }
.category-required { background: #ecfdf5; color: #0f766e; }
.category-bonus { background: #fffbeb; color: #d97706; }
.submission-item__title { font-size: 28rpx; font-weight: 600; color: #0f172a; display: block; margin-bottom: 6rpx; }
.submission-time { font-size: 24rpx; color: #94a3b8; }
.submission-item__stats { display: flex; flex-direction: column; align-items: flex-end; gap: 8rpx; }
.submission-item__count { font-size: 26rpx; color: #475569; font-weight: 500; }
.edit-btn { background: #ecfdf5; color: #0f766e; border: 2rpx solid rgba(15, 118, 110, 0.25); border-radius: 8rpx; padding: 8rpx 12rpx; font-size: 22rpx; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; min-width: 80rpx; margin-left: auto; }

/* 按钮 */
.ghost-btn { background: #f1f5f9; color: #64748b; border: none; border-radius: 16rpx; padding: 22rpx 0; font-size: 30rpx; text-align: center; flex: 1; }
.delete-btn { background: #fef2f2; color: #ef4444; border: 2rpx solid rgba(239, 68, 68, 0.25); border-radius: 16rpx; padding: 22rpx 0; font-size: 30rpx; font-weight: 600; text-align: center; flex: 1; }
.primary-btn { background: linear-gradient(135deg, #0f766e 0%, #0ea5e9 100%); color: #fff; border: none; border-radius: 16rpx; padding: 22rpx 0; font-size: 30rpx; text-align: center; flex: 1; }

/* 编辑弹窗 */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 32rpx; }
.edit-modal { width: 100%; max-width: 640rpx; background: #fff; border-radius: 28rpx; overflow: hidden; box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.15); }
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
</style>
