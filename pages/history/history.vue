<template>
  <view class="history-page">
    <view class="filter-section">
      <view class="filter-row-main">
        <input
          class="search-input-inline"
          placeholder="搜索业务名称"
          v-model="searchKeyword"
        />
        <picker mode="date" @change="handleDateChange" :value="dateFilter">
          <view class="date-picker-inline">
            <uni-icons type="flag" size="20" color="#0f766e" />
            <text>{{ dateFilter || '选择日期' }}</text>
          </view>
        </picker>
        <button class="reset-btn-inline" @click="resetFilters">重置</button>
      </view>
      <text class="history-subtitle">共 {{ mySubmissions.length }} 条业务记录</text>
    </view>

    <view v-if="!currentUser || (currentUser && currentUser.role === 'guest')" class="empty-state">
      <text>请先登录后查看您的提报记录</text>
      <button class="light-btn" @click="gotoLogin">前往登录</button>
    </view>

    <view v-else-if="Object.keys(groupedSubmissions).length === 0" class="empty-state">
      <view class="empty-icon">
        <uni-icons type="time" size="48" color="#cbd5f5" />
      </view>
      <text class="empty-text">暂无提报数据，立即前往工作台提报吧</text>
      <button class="light-btn" @click="gotoDashboard">前往提报</button>
    </view>

    <view v-else class="submission-groups">
      <!-- 按日期分组 -->
      <view v-for="(dateGroup, dateKey) in groupedSubmissions" :key="dateKey" class="submission-date-group">
        <!-- 日期标题 -->
        <view class="submission-date-header">
          <text class="submission-date">{{ dateKey }}</text>
          <text class="day-total">共 {{ dateGroup.length }} 条记录</text>
        </view>
        
        <!-- 该日期下的记录列表 -->
        <view class="submission-list">
          <view v-for="sub in dateGroup" :key="sub.id" class="history-card">
            <view class="history-card__bar" :class="getRule(sub.ruleId)?.category" />
            <view class="history-card__body">
              <view class="history-card__info">
                <view class="history-card__info-content">
                  <view class="submission-rule-info">
                    <text class="submission-category" :class="getCategoryColorClass(getRuleCategory(sub.ruleId))">
                      {{ getRuleCategory(sub.ruleId) }}
                    </text>
                    <text class="history-card__title">{{ getRule(sub.ruleId)?.name }}</text>
                  </view>
                  <view class="submission-meta">
                    <text class="submission-type type-gray">
                      {{ getDetails(sub).typeLabel }}
                    </text>
                    <text class="submission-time">{{ formatTime(sub.timestamp) }}</text>
                  </view>
                </view>
              </view>
              <view class="history-card__stats">
                <text class="history-card__count">{{ sub.count }} 笔 / {{ sub.amount }} 万</text>
                <text class="history-card__score highlight">+{{ getDetails(sub).totalPoints }} 分</text>
              </view>
              <button class="edit-btn" v-if="canModify(sub)" @click="handleEdit(sub)">编辑</button>
            </view>
          </view>
        </view>
      </view>
    </view>

    <SubmissionEditModal
      v-if="showEditModal"
      :editingSubmission="editingSubmission"
      :rules="rules"
      @cancel="cancelEdit"
      @confirm="confirmEdit"
      @delete="handleDeleteSubmission"
    />
  </view>
</template>

<script>
import { StoreService } from '../../services/store.js';
import IconHelper from '../../components/IconHelper.vue';
import SubmissionEditModal from '../../components/SubmissionEditModal.vue';

const DAY_MS = 24 * 60 * 60 * 1000;

export default {
  components: { IconHelper, SubmissionEditModal },
  data() {
    return {
      currentUser: null,
      submissions: [],
      rules: [],
      settings: StoreService.getSettings(),
      showEditModal: false,
      editingSubmission: null,
      searchKeyword: '',
      dateFilter: ''
    };
  },
  computed: {
    isAdmin() {
      return this.currentUser && this.currentUser.role === 'admin';
    },
    mySubmissions() {
      const userId = this.currentUser ? this.currentUser.id : null;
      let filtered = this.submissions
        .filter(sub => sub.employeeId === userId); // 移除季度筛选，查看所有历史记录

      // 关键词搜索
      if (this.searchKeyword.trim()) {
        const keyword = this.searchKeyword.trim().toLowerCase();
        filtered = filtered.filter(sub => {
          const rule = this.rules.find(r => r.id === sub.ruleId);
          return rule && rule.name.toLowerCase().includes(keyword);
        });
      }

      // 日期筛选
      if (this.dateFilter) {
        const targetDate = new Date(this.dateFilter);
        const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0)).getTime();
        const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999)).getTime();
        filtered = filtered.filter(sub => sub.timestamp >= startOfDay && sub.timestamp <= endOfDay);
      }

      return filtered.sort((a, b) => b.timestamp - a.timestamp);
    },
    groupedSubmissions() {
      const groups = {};
      
      // 先按日期分组
      this.mySubmissions.forEach(sub => {
        const dateKey = this.formatDate(sub.timestamp, 'date');
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(sub);
      });
      
      // 按日期降序排序
      const sortedGroups = {};
      Object.keys(groups).sort((a, b) => new Date(b) - new Date(a)).forEach(dateKey => {
        sortedGroups[dateKey] = groups[dateKey];
      });
      
      return sortedGroups;
    }
  },
  async onShow() {
    await this.fetchData();
  },
  methods: {
    async fetchData() {
      try {
        await StoreService.ensureReady();
        const user = StoreService.getCurrentUser();
        if (!user) {
          this.currentUser = null;
          return;
        }
        this.currentUser = user;
        this.submissions = StoreService.getSubmissions();
        this.settings = StoreService.getSettings();
        this.rules = StoreService.getRules();
      } catch (error) {
        uni.showToast({ title: error.message || '数据加载失败', icon: 'none' });
      }
    },
    gotoLogin() {
      uni.navigateTo({ url: '/pages/login/login' });
    },
    gotoDashboard() {
      uni.switchTab({ url: '/pages/dashboard/dashboard' });
    },
    getRule(ruleId) {
      return this.rules.find(rule => rule.id === ruleId);
    },
    getDetails(sub) {
      const rule = this.getRule(sub.ruleId);
      const cfg = sub.type === 'stock' && rule?.pointsStock ? rule.pointsStock : rule?.pointsNew;
      const itemPoints = sub.count * (cfg?.item || 0);
      const amountPoints = (sub.amount / 100) * (cfg?.million || 0);
      const d = new Date(sub.timestamp);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      const date = `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
      return {
        rule,
        typeLabel: sub.type === 'stock' ? rule?.stockLabel || '存量' : '新增',
        totalPoints: (itemPoints + amountPoints).toFixed(2),
        date
      };
    },
    canModify(sub) {
      if (!this.settings.allowEditSubmission) return false;
      if (!this.currentUser) return false;
      // 管理员用户可以编辑所有记录，不受24小时限制
      if (this.currentUser.role === 'admin') {
        return !sub.archived;
      }
      // 普通用户只能编辑自己的记录，且在24小时内
      if (this.currentUser.id !== sub.employeeId) return false;
      const withinWindow = Date.now() - sub.timestamp <= DAY_MS;
      return withinWindow && !sub.archived;
    },
    formatDate(date, format = 'date') {
      const d = typeof date === 'string' ? new Date(date) : typeof date === 'number' ? new Date(date) : date;
      const year = d.getFullYear();
      const month = `${d.getMonth() + 1}`.padStart(2, '0');
      const day = `${d.getDate()}`.padStart(2, '0');
      const hours = `${d.getHours()}`.padStart(2, '0');
      const minutes = `${d.getMinutes()}`.padStart(2, '0');
      
      if (format === 'date') {
        return `${year}-${month}-${day}`;
      } else if (format === 'time') {
        return `${hours}:${minutes}`;
      } else {
        return `${year}-${month}-${day} ${hours}:${minutes}`;
      }
    },
    formatTime(timestamp) {
      return this.formatDate(timestamp, 'time');
    },
    getRuleCategory(ruleId) {
      const rule = this.getRule(ruleId);
      if (!rule) return '其他';
      return rule.category === 'personal' ? '个贷' : '小微';
    },
    getCategoryColorClass(category) {
      return category === '个贷' ? 'category-personal' : 'category-micro';
    },
    handleEdit(sub) {
      this.editingSubmission = sub;
      this.editForm = {
        count: sub.count,
        amount: sub.amount,
        type: sub.type
      };
      this.showEditModal = true;
    },
    cancelEdit() {
      this.showEditModal = false;
      this.editingSubmission = null;
    },
    handleDeleteSubmission() {
      uni.showModal({
        title: '确认删除',
        content: '删除后将无法恢复，确定删除该提报记录吗？',
        confirmColor: '#ef4444',
        success: async res => {
          if (!res.confirm) return;
          try {
            await StoreService.deleteSubmission(this.editingSubmission.id);
            uni.showToast({ title: '删除成功', icon: 'success' });
            await this.fetchData();
            this.showEditModal = false;
          } catch (error) {
            uni.showToast({ title: error.message || '删除失败', icon: 'none' });
          }
        }
      });
    },
    async confirmEdit(editData) {
      try {
        await StoreService.updateSubmission(this.editingSubmission.id, {
          count: editData.count,
          amount: editData.amount,
          type: editData.type
        });
        uni.showToast({ title: '修改成功', icon: 'success' });
        await this.fetchData();
        this.showEditModal = false;
      } catch (error) {
        uni.showToast({ title: error.message || '修改失败', icon: 'none' });
      }
    },
    handleDelete(sub) {
      uni.showModal({
        title: '确认删除',
        content: '删除后将无法恢复，确定删除该提报记录吗？',
        confirmColor: '#ef4444',
        success: async res => {
          if (!res.confirm) return;
          try {
            await StoreService.deleteSubmission(sub.id);
            uni.showToast({ title: '删除成功', icon: 'success' });
            await this.fetchData();
          } catch (error) {
            uni.showToast({ title: error.message || '删除失败', icon: 'none' });
          }
        }
      });
    },
    handleDateChange(e) {
      this.dateFilter = e.detail.value;
    },
    resetFilters() {
      this.searchKeyword = '';
      this.dateFilter = '';
    },
    calculatePreviewScore() {
      if (!this.editingSubmission) return '0.00';
      const rule = this.getRule(this.editingSubmission.ruleId);
      const cfg =
        this.editForm.type === 'stock' && rule?.pointsStock ? rule.pointsStock : rule?.pointsNew;
      const itemPoints = (Number(this.editForm.count) || 0) * (cfg?.item || 0);
      const amountPoints = ((Number(this.editForm.amount) || 0) / 100) * (cfg?.million || 0);
      return (itemPoints + amountPoints).toFixed(2);
    }
  }
};
</script>

<style scoped>
.history-page {
  min-height: 100vh;
  background: #f8fafc;
  padding: 32rpx;
  padding-bottom: 160rpx;
}

.filter-section {
  background: #fff;
  border-radius: 20rpx;
  padding: 20rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(15, 118, 110, 0.08);
  position: relative;
}

.history-subtitle {
  display: block;
  font-size: 24rpx;
  color: #94a3b8;
  margin-top: 12rpx;
}

.filter-row-main {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex: 1;
}

.search-input-inline {
  background: #f1f5f9;
  border-radius: 16rpx;
  padding: 14rpx 20rpx;
  font-size: 24rpx;
  color: #0f766e;
  border: none;
  flex: 1;
  max-width: 230rpx;
  min-width: 0;
}

.date-picker-inline {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 14rpx 20rpx;
  background: #ecfdf5;
  border-radius: 16rpx;
  border: 2rpx solid rgba(15, 118, 110, 0.2);
  color: #0f766e;
  font-size: 24rpx;
  min-width: 230rpx;
  cursor: pointer;
}

.reset-btn-inline {
  padding: 8rpx 16rpx;
  border-radius: 16rpx;
  border: 1rpx solid rgba(15, 118, 110, 0.2);
  background: #fff;
  color: #0f766e;
  font-size: 20rpx;
  align-self: center;
}

.filter-row-main .uni-icons {
  margin-right: 8rpx;
}



.history-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.history-card {
  position: relative;
  background: #ffffff;
  border-radius: 28rpx;
  padding: 24rpx;
  box-shadow: 0 20rpx 60rpx rgba(15, 118, 110, 0.06);
}

.history-card__bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 8rpx;
  border-top-left-radius: 28rpx;
  border-bottom-left-radius: 28rpx;
}

.history-card__bar.personal {
  background: #3b82f6;
}

.history-card__bar.micro {
  background: #14b8a6;
}

.history-card__body {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-card__info {
  display: flex;
  align-items: center;
  gap: 20rpx;
  flex: 1;
  min-width: 0;
}

.history-card__icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.history-card__info-content {
  flex: 1;
  min-width: 0;
}

.history-card__title {
  font-size: 30rpx;
  font-weight: 600;
  color: #0f172a;
}

.history-card__meta {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-top: 6rpx;
}

.history-card__meta-top {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex-wrap: nowrap;
}

.history-card__count {
  font-size: 22rpx;
  color: #94a3b8;
  white-space: nowrap;
}

.history-card__time {
  font-size: 22rpx;
  color: #94a3b8;
  white-space: nowrap;
}

.tag {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
  white-space: nowrap;
}

.tag--gray {
  background: #f1f5f9;
  color: #475569;
}

/* 按日期分组样式 */
.submission-groups {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.submission-date-group {
  background: #ffffff;
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

.submission-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.submission-rule-info {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 6rpx;
}

.submission-category {
  font-size: 22rpx;
  font-weight: 600;
  padding: 4rpx 12rpx;
  border-radius: 10rpx;
}

/* 业务分类颜色 - 个贷蓝色，小微绿色 */
.category-personal {
  background: #dbeafe;
  color: #1e40af;
}

.category-micro {
  background: #dcfce7;
  color: #166534;
}

/* 卡片布局调整 - 匹配 submission-flow.vue */
.history-card {
  position: relative;
  background: #fff;
  border-radius: 10rpx;
  padding: 16rpx;
  box-shadow: 0 1rpx 3rpx rgba(0, 0, 0, 0.05);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.history-card__body {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex: 1;
  gap: 20rpx;
}

.history-card__info {
  flex: 1;
  min-width: 0;
  margin-right: 20rpx;
}

.history-card__info-content {
  flex: 1;
  min-width: 0;
}

/* 业务元信息样式 */
.submission-meta {
  display: flex;
  align-items: center;
  gap: 16rpx;
  font-size: 24rpx;
  color: #94a3b8;
}

.submission-type {
  padding: 4rpx 14rpx;
  border-radius: 12rpx;
  font-size: 20rpx;
  font-weight: 600;
}

.type-gray {
  background: #f1f5f9;
  color: #64748b;
}

.submission-time {
  font-size: 24rpx;
  color: #94a3b8;
}

/* 统计信息样式 */
.history-card__stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
}

.history-card__count {
  font-size: 26rpx;
  color: #475569;
  font-weight: 500;
}

.history-card__score {
  font-size: 28rpx;
  font-weight: 700;
  color: #0f766e;
}

/* 编辑按钮样式 */
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

.edit-form-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 12rpx;
}

.edit-form-grid .form-item {
  flex: 1;
  min-width: 0;
}

.history-card__score-value {
  font-size: 34rpx;
  font-weight: 700;
  color: #0f766e;
}

.history-card__score-meta {
  font-size: 24rpx;
  color: #94a3b8;
}

.history-card__actions {
  margin-top: 20rpx;
  display: flex;
  gap: 12rpx;
}

.action-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  padding: 12rpx 0;
  border-radius: 12rpx;
  border: 2rpx solid rgba(15, 118, 110, 0.2);
  color: #0f766e;
  background: #ecfdf5;
  font-size: 22rpx;
}

.action-btn.danger {
  border-color: rgba(239, 68, 68, 0.25);
  color: #b91c1c;
  background: #fee2e2;
}

.empty-state {
  margin-top: 120rpx;
  text-align: center;
  color: #94a3b8;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  align-items: center;
}

.empty-icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 999rpx;
  background: #e0f2fe;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-text {
  font-size: 26rpx;
}

.light-btn {
  border: 2rpx solid rgba(15, 118, 110, 0.2);
  border-radius: 999rpx;
  padding: 16rpx 32rpx;
  color: #0f766e;
  background: #fff;
  font-size: 26rpx;
}

</style>

