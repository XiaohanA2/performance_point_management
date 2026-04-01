<template>
  <view class="submission-flow-page">
    <view class="filter-section sticky-header">
      <input class="search-input" placeholder="搜索姓名/支行/业务名称" v-model="searchKeyword" />
      <view class="filter-row">
        <picker :range="periodOptions" :value="periodOptions.indexOf(selectedPeriod)" @change="handlePeriodChange">
          <view class="date-picker-btn">{{ formatPeriod(selectedPeriod) }}</view>
        </picker>
        <picker :range="roleLabels" :value="roleIndex" @change="handleRoleChange">
          <view class="date-picker-btn">{{ roleLabels[roleIndex] }}</view>
        </picker>
        <button class="reset-btn" @click="resetFilters">重置条件</button>
        <button class="primary-btn" @click="handleExport">导出记录</button>
      </view>
    </view>

    <view class="stats-section">
      <text class="stats-text">共 {{ filteredSubmissions.length }} 条提报记录</text>
    </view>

    <scroll-view scroll-y class="content" @scrolltolower="loadMore">
      <view v-if="Object.keys(groupedSubmissions).length === 0 && !isLoading" class="empty-state">
        <uni-icons type="empty" size="64" color="#cbd5e1" />
        <text class="empty-text">暂无提报记录</text>
        <text class="empty-tip">请尝试调整搜索条件或月份</text>
      </view>

      <view v-else-if="isLoading" class="loading-state">
        <uni-icons type="spinner-cycle" size="64" color="#cbd5e1" />
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else class="submission-groups">
        <view v-for="(dateGroup, dateKey) in groupedSubmissions" :key="dateKey" class="submission-date-group">
          <view class="submission-date-header">
            <text class="submission-date">{{ dateKey }}</text>
            <text class="day-total">共 {{ getDayTotalSubmissions(dateGroup) }} 条记录</text>
          </view>

          <view class="submission-user-groups">
            <view v-for="(userSubmissions, userId) in dateGroup" :key="userId" class="submission-group">
              <view class="submission-group-header">
                <view class="user-info">
                  <text class="submission-group-name">{{ getUserName(userId) }}</text>
                  <text class="user-role-tag">{{ getUserRoleLabel(userId) }}</text>
                </view>
                <text class="submission-group-branch">{{ getUserBranch(userId) }}</text>
                <text class="user-total">{{ userSubmissions.length }} 条</text>
              </view>
              <view class="submission-list">
                <view v-for="sub in userSubmissions" :key="sub._id" class="submission-item">
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
                    <button class="edit-btn" @click="handleEdit(sub)">编辑</button>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view v-if="hasMore" class="loading-more">
          <uni-icons type="spinner-cycle" size="32" color="#cbd5e1" />
          <text class="loading-more-text">加载更多...</text>
        </view>

        <view v-else class="no-more">
          <text class="no-more-text">已加载全部数据</text>
        </view>
      </view>
    </scroll-view>

    <view v-if="!isAdmin" class="unauth">
      <text>{{ (!currentUser || currentUser.role === 'guest') ? '请先登录' : '仅管理员可访问此页面' }}</text>
      <button class="light-btn" @click="gotoLogin">{{ (!currentUser || currentUser.role === 'guest') ? '立即登录' : '切换账号' }}</button>
    </view>

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
              <text class="edit-info-label">员工</text>
              <text class="edit-info-value">{{ editingSub && editingSub.userName }}</text>
            </view>
            <view class="edit-info-item">
              <text class="edit-info-label">业务</text>
              <text class="edit-info-value">{{ editingSub && getTaskName(editingSub.taskId) }}</text>
            </view>
          </view>
          <view class="edit-info-row">
            <view class="edit-info-item">
              <text class="edit-info-label">日期</text>
              <text class="edit-info-value">{{ editingSub && editingSub.date }}</text>
            </view>
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
import { getAllPFSubmissions, getPFTasks, updatePFSubmission, deletePFSubmission, getCurrentPeriod, formatPeriod, invalidateAllCache } from '../../../services/pf-service.js';

export default {
  data() {
    return {
      currentUser: null,
      allSubmissions: [],
      tasksMap: {},
      usersMap: {},
      searchKeyword: '',
      selectedPeriod: getCurrentPeriod(),
      periodOptions: [],
      selectedRole: '',
      roleLabels: ['全部角色'],
      roleValues: [''],
      roleIndex: 0,
      isLoading: true,
      currentPage: 1,
      pageSize: 20,
      hasMore: true,
      showEditModal: false,
      editingSub: null,
      editValue: ''
    };
  },
  computed: {
    isAdmin() {
      return this.currentUser && ['super_admin', 'personal_finance_admin', 'branch_leader'].includes(this.currentUser.role);
    },
    filteredSubmissions() {
      let data = this.allSubmissions;
      if (this.selectedRole) {
        data = data.filter(s => s.role === this.selectedRole);
      }
      if (this.searchKeyword.trim()) {
        const kw = this.searchKeyword.trim().toLowerCase();
        data = data.filter(s =>
          (s.userName || '').toLowerCase().includes(kw) ||
          (s.branchName || '').toLowerCase().includes(kw) ||
          (this.getTaskName(s.taskId) || '').toLowerCase().includes(kw)
        );
      }
      return data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    },
    paginatedSubmissions() {
      return this.filteredSubmissions.slice(0, this.currentPage * this.pageSize);
    },
    groupedSubmissions() {
      const groups = {};
      this.paginatedSubmissions.forEach(sub => {
        const dateKey = sub.date || '未知日期';
        if (!groups[dateKey]) groups[dateKey] = {};
        const uid = sub.userId || sub.userName || '未知';
        if (!groups[dateKey][uid]) groups[dateKey][uid] = [];
        groups[dateKey][uid].push(sub);
      });
      const sorted = {};
      Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(k => { sorted[k] = groups[k]; });
      return sorted;
    }
  },
  async onShow() {
    await this.initData();
  },
  methods: {
    formatPeriod,
    async initData() {
      this.isLoading = true;
      this.currentPage = 1;
      this.hasMore = true;
      try {
        await StoreService.ensureReady();
        this.currentUser = StoreService.getCurrentUser();
        if (!this.isAdmin) return;
        this.generatePeriodOptions();
        this.buildRoleOptions();
        await this.loadData();
      } catch (e) {
        uni.showToast({ title: e.message || '加载失败', icon: 'none' });
      } finally {
        this.isLoading = false;
      }
    },
    generatePeriodOptions() {
      const options = [];
      const now = new Date();
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        options.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
      this.periodOptions = options;
    },
    buildRoleOptions() {
      const allRoles = StoreService.getRoles();
      const pfRoleCodes = ['manager', 'lobby_manager', 'elastic_counter', 'counter_manager'];
      this.roleLabels = ['全部角色'];
      this.roleValues = [''];
      pfRoleCodes.forEach(code => {
        const found = allRoles.find(r => r.roleCode === code);
        this.roleLabels.push(found ? found.roleName : code);
        this.roleValues.push(code);
      });
    },
    async loadData() {
      const [tasks, submissions] = await Promise.all([
        getPFTasks({ isActive: true }),
        getAllPFSubmissions(this.selectedPeriod)
      ]);
      this.tasksMap = {};
      tasks.forEach(t => { this.tasksMap[t.taskId] = t; });
      this.usersMap = {};
      StoreService.getUsers().forEach(u => { this.usersMap[u.id] = u; });
      this.allSubmissions = submissions;
      this.hasMore = submissions.length > this.pageSize;
    },
    loadMore() {
      if (!this.hasMore) return;
      const nextEnd = (this.currentPage + 1) * this.pageSize;
      if (nextEnd >= this.filteredSubmissions.length) this.hasMore = false;
      this.currentPage++;
    },
    handlePeriodChange(e) {
      this.selectedPeriod = this.periodOptions[e.detail.value];
      this.isLoading = true;
      this.loadData().finally(() => { this.isLoading = false; });
    },
    handleRoleChange(e) {
      this.roleIndex = e.detail.value;
      this.selectedRole = this.roleValues[e.detail.value];
    },
    resetFilters() {
      this.searchKeyword = '';
      this.selectedRole = '';
      this.roleIndex = 0;
      this.selectedPeriod = getCurrentPeriod();
    },
    getDayTotalSubmissions(dateGroup) {
      return Object.values(dateGroup).reduce((sum, arr) => sum + arr.length, 0);
    },
    getUserName(userId) {
      const sub = this.allSubmissions.find(s => (s.userId || s.userName) === userId);
      return sub ? sub.userName : (this.usersMap[userId]?.name || '未知');
    },
    getUserBranch(userId) {
      const sub = this.allSubmissions.find(s => (s.userId || s.userName) === userId);
      return sub ? (sub.branchName || '') : (this.usersMap[userId]?.branchName || '');
    },
    getUserRoleLabel(userId) {
      const sub = this.allSubmissions.find(s => (s.userId || s.userName) === userId);
      const role = sub ? sub.role : this.usersMap[userId]?.role;
      return StoreService.getRoleName(role) || '';
    },
    getTaskName(taskId) { return this.tasksMap[taskId]?.taskName || '未知业务'; },
    getTaskUnit(taskId) { return this.tasksMap[taskId]?.unit || ''; },
    getTaskCategory(taskId) { return this.tasksMap[taskId]?.category || 'required'; },
    formatTime(ts) {
      if (!ts) return '';
      const d = new Date(ts);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    },
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
      if (!this.editValue || parseFloat(this.editValue) <= 0) {
        uni.showToast({ title: '请输入有效数量', icon: 'none' });
        return;
      }
      try {
        uni.showLoading({ title: '保存中...' });
        await updatePFSubmission(this.editingSub._id, parseFloat(this.editValue));
        uni.showToast({ title: '修改成功', icon: 'success' });
        this.cancelEdit();
        invalidateAllCache();
        StoreService.clearCache();
        await this.loadData();
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
        content: `确定删除 ${target.userName} 的「${this.getTaskName(target.taskId)}」提报记录？`,
        confirmColor: '#ef4444',
        success: async res => {
          if (!res.confirm) return;
          try {
            uni.showLoading({ title: '删除中...' });
            await deletePFSubmission(target._id);
            uni.showToast({ title: '删除成功', icon: 'success' });
            this.cancelEdit();
            invalidateAllCache();
            StoreService.clearCache();
            await this.loadData();
          } catch (e) {
            uni.showToast({ title: e.message || '删除失败', icon: 'none' });
          } finally {
            uni.hideLoading();
          }
        }
      });
    },
    handleExport() {
      if (this.filteredSubmissions.length === 0) {
        uni.showToast({ title: '暂无数据可导出', icon: 'none' });
        return;
      }
      const header = '日期,姓名,支行,角色,业务名称,数量,单位';
      const rows = this.filteredSubmissions.map(s =>
        `${s.date},${s.userName},${s.branchName || '-'},${StoreService.getRoleName(s.role)},${this.getTaskName(s.taskId)},${s.value},${this.getTaskUnit(s.taskId)}`
      );
      const csv = '\uFEFF' + [header, ...rows].join('\n');
      const filename = `个金提报流_${this.selectedPeriod}.csv`;
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
      const isWeChat = typeof wx !== 'undefined' && !!wx.getFileSystemManager;
      if (isWeChat) {
        try {
          const fs = wx.getFileSystemManager();
          const filePath = `${wx.env.USER_DATA_PATH}/${filename}`;
          try {
            const files = fs.readdirSync(wx.env.USER_DATA_PATH) || [];
            files.filter(name => /\.(csv)$/.test(name)).forEach(name => {
              try { fs.unlinkSync(`${wx.env.USER_DATA_PATH}/${name}`); } catch (e) {}
            });
          } catch (e) {}
          fs.writeFileSync(filePath, csv, 'utf-8');
          if (wx.shareFileMessage) {
            wx.shareFileMessage({
              filePath: filePath,
              fileName: filename,
              success: () => uni.showToast({ title: '分享成功', icon: 'success' }),
              fail: (error) => uni.showToast({ title: '分享失败：' + (error.errMsg || ''), icon: 'none' })
            });
          } else {
            uni.showToast({ title: '当前微信版本不支持分享', icon: 'none' });
          }
        } catch (error) {
          uni.showToast({ title: '导出失败：' + (error.message || ''), icon: 'none' });
        }
      }
      // #endif
    },
    gotoLogin() {
      uni.navigateTo({ url: '/pages/login/login' });
    }
  }
};
</script>

<style scoped>
.submission-flow-page {
  min-height: 100vh;
  background: #f5f7fb;
  padding: 0;
}

.sticky-header {
  position: sticky;
  top: 0;
  z-index: 100;
}

.filter-section {
  width: 100%;
  padding: 20rpx 32rpx;
  background: #fff;
  border-bottom: 2rpx solid #f1f5f9;
  box-sizing: border-box;
}

.search-input {
  width: 100%;
  height: 72rpx;
  line-height: 72rpx;
  background: #f8fafc;
  border-radius: 18rpx;
  padding: 0 24rpx;
  font-size: 26rpx;
  color: #0f172a;
  border: none;
  margin-bottom: 16rpx;
  box-sizing: border-box;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.date-picker-btn {
  flex: 1.5 0 280rpx;
  height: 72rpx;
  line-height: 72rpx;
  background: #f8fafc;
  border-radius: 18rpx;
  font-size: 26rpx;
  color: #0f172a;
  text-align: center;
  min-width: 150rpx;
  box-sizing: border-box;
}

.stats-section {
  width: 100%;
  padding: 16rpx 32rpx;
  font-size: 26rpx;
  color: #64748b;
  background: #f8fafc;
  border-bottom: 1rpx solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-sizing: border-box;
}

.content {
  width: 100%;
  padding: 20rpx 24rpx;
  height: calc(100vh - 280rpx);
  box-sizing: border-box;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
  color: #94a3b8;
}

.empty-text {
  margin-top: 24rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #64748b;
}

.empty-tip {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #94a3b8;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
  color: #94a3b8;
}

.loading-text {
  margin-top: 24rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #64748b;
}

.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx 0;
  color: #94a3b8;
  gap: 12rpx;
}

.loading-more-text {
  font-size: 24rpx;
  color: #94a3b8;
}

.no-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx 0;
  color: #cbd5e1;
}

.no-more-text {
  font-size: 24rpx;
  color: #cbd5e1;
}

.submission-groups {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.submission-date-group {
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  box-shadow: 0 1rpx 3rpx rgba(0, 0, 0, 0.05);
}

.submission-date-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  padding-bottom: 12rpx;
  border-bottom: 2rpx solid #f1f5f9;
}

.submission-date {
  font-size: 34rpx;
  font-weight: 700;
  color: #0f172a;
}

.day-total {
  font-size: 24rpx;
  color: #94a3b8;
  background: #f1f5f9;
  padding: 4rpx 16rpx;
  border-radius: 12rpx;
}

.submission-user-groups {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.submission-group {
  background: #f8fafc;
  border-radius: 12rpx;
  padding: 16rpx;
}

.submission-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
  padding-bottom: 8rpx;
  border-bottom: 1rpx solid #e2e8f0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex: 1;
}

.submission-group-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #0f172a;
}

.user-role-tag {
  font-size: 20rpx;
  color: #0f766e;
  background: #ecfdf5;
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
}

.submission-group-branch {
  font-size: 24rpx;
  color: #94a3b8;
  margin: 0 16rpx;
}

.user-total {
  font-size: 22rpx;
  color: #94a3b8;
  background: #e2e8f0;
  padding: 4rpx 12rpx;
  border-radius: 10rpx;
}

.submission-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.submission-item {
  position: relative;
  background: #fff;
  border-radius: 10rpx;
  padding: 10rpx 16rpx;
  box-shadow: 0 1rpx 3rpx rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.submission-item__bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 8rpx;
  border-top-left-radius: 10rpx;
  border-bottom-left-radius: 10rpx;
}

.bar-required {
  background: #0f766e;
}

.bar-bonus {
  background: #f59e0b;
}

.submission-rule-info {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 6rpx;
}

.submission-category {
  font-size: 20rpx;
  font-weight: 600;
  padding: 4rpx 12rpx;
  border-radius: 10rpx;
  flex-shrink: 0;
}

.category-required {
  background: #ecfdf5;
  color: #0f766e;
}

.category-bonus {
  background: #fffbeb;
  color: #d97706;
}

.submission-item__body {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex: 1;
  gap: 20rpx;
  padding-left: 16rpx;
}

.submission-item__info {
  flex: 1;
  min-width: 0;
}

.submission-item__info-content {
  flex: 1;
  min-width: 0;
}

.submission-item__title {
  font-size: 28rpx;
  font-weight: 600;
  color: #0f172a;
  display: block;
  margin-bottom: 6rpx;
}

.submission-time {
  font-size: 24rpx;
  color: #94a3b8;
}

.submission-meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 6rpx;
}

.submission-branch {
  font-size: 22rpx;
  color: #64748b;
  background: #f1f5f9;
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
}

.submission-item__stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
}

.submission-item__count {
  font-size: 26rpx;
  color: #475569;
  font-weight: 500;
}

.edit-btn {
  background: #ecfdf5;
  color: #0f766e;
  border: 2rpx solid rgba(15, 118, 110, 0.25);
  border-radius: 8rpx;
  padding: 8rpx 12rpx;
  font-size: 22rpx;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 80rpx;
  margin-left: auto;
}

/* 按钮 */
.primary-btn {
  background: linear-gradient(to right, #0f766e, #0ea5e9);
  color: #fff;
  border: none;
  border-radius: 12rpx;
  padding: 12rpx 0;
  font-size: 24rpx;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 130rpx;
  text-align: center;
  box-shadow: 0 10rpx 24rpx rgba(14, 165, 233, 0.25);
}

.reset-btn {
  background: #f8fafc;
  color: #64748b;
  border: 1rpx solid #e2e8f0;
  border-radius: 12rpx;
  padding: 12rpx 0;
  font-size: 24rpx;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 130rpx;
  text-align: center;
}

.ghost-btn {
  background: #f1f5f9;
  color: #64748b;
  border: none;
  border-radius: 12rpx;
  padding: 16rpx 0;
  font-size: 26rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.delete-btn {
  background: #fef2f2;
  color: #ef4444;
  border: 2rpx solid rgba(239, 68, 68, 0.25);
  border-radius: 12rpx;
  padding: 16rpx 0;
  font-size: 26rpx;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* 未授权 */
.unauth {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
  gap: 24rpx;
  color: #94a3b8;
}

.light-btn {
  padding: 16rpx 32rpx;
  background: #fff;
  color: #0f766e;
  border: 2rpx solid #0f766e;
  border-radius: 12rpx;
  font-size: 26rpx;
}

/* 编辑弹窗 */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.edit-modal {
  width: 640rpx;
  background: #fff;
  border-radius: 28rpx;
  overflow: hidden;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.15);
}

.edit-modal__header {
  background: linear-gradient(135deg, #0f766e 0%, #0ea5e9 100%);
  padding: 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.edit-modal__title {
  font-size: 32rpx;
  font-weight: 700;
  color: #fff;
}

.edit-modal__close {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
}

.edit-modal__body {
  padding: 28rpx 32rpx;
}

.edit-info-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.edit-info-item {
  flex: 1;
  background: #f8fafc;
  border-radius: 14rpx;
  padding: 16rpx 20rpx;
  border: 1rpx solid #e2e8f0;
}

.edit-info-label {
  display: block;
  font-size: 22rpx;
  color: #94a3b8;
  margin-bottom: 6rpx;
}

.edit-info-value {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #0f172a;
}

.edit-input-wrap {
  margin-top: 8rpx;
}

.edit-label {
  display: block;
  font-size: 26rpx;
  color: #64748b;
  margin-bottom: 12rpx;
  font-weight: 500;
}

.edit-input-row {
  display: flex;
  align-items: center;
  background: #f8fafc;
  border: 2rpx solid #e2e8f0;
  border-radius: 14rpx;
  overflow: hidden;
}

.edit-input {
  flex: 1;
  padding: 22rpx 20rpx;
  font-size: 36rpx;
  font-weight: 600;
  color: #0f172a;
  background: transparent;
}

.edit-unit {
  padding: 0 20rpx;
  font-size: 26rpx;
  color: #94a3b8;
  border-left: 1rpx solid #e2e8f0;
}

.edit-modal__footer {
  padding: 20rpx 32rpx 32rpx;
  display: flex;
  gap: 16rpx;
}

.edit-modal__footer .ghost-btn,
.edit-modal__footer .delete-btn,
.edit-modal__footer .primary-btn {
  flex: 1;
}
</style>
