<template>
  <view class="user-details-page">
    <view class="details-header">
      <view>
        <text class="details-title">{{ employeeName }} 的提报记录</text>
        <text class="details-subtitle">{{ branchName }} · 共 {{ userSubmissions.length }} 条历史记录</text>
      </view>
      <view class="details-icon">
        <uni-icons type="clock" size="26" color="#0f766e" />
      </view>
    </view>

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
    </view>
      <button class="reset-btn-inline" @click="resetFilters">重置</button>
    </view>

    <view v-if="Object.keys(groupedSubmissions).length === 0" class="empty-state">
      <view class="empty-icon">
        <uni-icons type="refreshempty" size="48" color="#cbd5f5" />
      </view>
      <text class="empty-text">暂无提报数据</text>
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
          <view v-for="sub in dateGroup" :key="sub.id" class="details-card">
            <view class="details-card__bar" :class="getRule(sub.ruleId)?.category" />
            <view class="details-card__body">
              <view class="details-card__info">
                <view class="details-card__info-content">
                  <view class="submission-rule-info">
                    <text class="submission-category" :class="getCategoryColorClass(getRuleCategory(sub.ruleId))">
                      {{ getRuleCategory(sub.ruleId) }}
                    </text>
                    <text class="details-card__title">{{ getRule(sub.ruleId)?.name }}</text>
                  </view>
                  <view class="submission-meta">
                    <text class="submission-type type-gray">
                      {{ getDetails(sub).typeLabel }}
                    </text>
                    <text class="submission-time">{{ formatTime(sub.timestamp) }}</text>
                  </view>
                </view>
              </view>
              <view class="details-card__stats">
                <text class="details-card__count">{{ sub.count }} 笔 / {{ sub.amount }} 万</text>
                <text class="details-card__score highlight">+{{ getDetails(sub).totalPoints }} 分</text>
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
import { StoreService } from '../../../services/store.js';
import IconHelper from '../../../components/IconHelper.vue';
import SubmissionEditModal from '../../../components/SubmissionEditModal.vue';

const DAY_MS = 24 * 60 * 60 * 1000;

export default {
  components: { IconHelper, SubmissionEditModal },
  data() {
    return {
      submissions: [],
      rules: [],
      settings: StoreService.getSettings(),
      showEditModal: false,
      editingSubmission: null,
      employeeId: '',
      employeeName: '',
      branchName: '',
      currentQuarter: StoreService.getCurrentQuarter(),
      searchKeyword: '',
      dateFilter: ''
    };
  },
  computed: {
    userSubmissions() {
      let filtered = this.submissions
        .filter(sub => sub.employeeId === this.employeeId); // 移除季度筛选，查看所有历史记录

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
      this.userSubmissions.forEach(sub => {
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
  onLoad(options) {
    this.employeeId = options.employeeId;
    this.employeeName = decodeURIComponent(options.name);
    this.branchName = decodeURIComponent(options.branch);
  },
  async onShow() {
    await this.fetchData();
  },
  methods: {
    async fetchData() {
      try {
        await StoreService.ensureReady();
        this.submissions = StoreService.getSubmissions();
        this.settings = StoreService.getSettings();
        this.rules = StoreService.getRules();
      } catch (error) {
        uni.showToast({ title: error.message || '数据加载失败', icon: 'none' });
      }
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
      return !sub.archived;
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
            await StoreService.bootstrap({ force: true });
            this.submissions = StoreService.getSubmissions();
            this.settings = StoreService.getSettings();
            this.rules = StoreService.getRules();
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
        await StoreService.bootstrap({ force: true });
        this.submissions = StoreService.getSubmissions();
        this.settings = StoreService.getSettings();
        this.rules = StoreService.getRules();
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

  }
};
</script>

<style scoped>
.user-details-page {
  min-height: 100vh;
  background: #f8fafc;
  padding: 32rpx;
  padding-bottom: 160rpx;
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.filter-section {
  background: #fff;
  border-radius: 20rpx;
  padding: 20rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(15, 118, 110, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
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

.details-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #0f172a;
  display: block;
}

.details-subtitle {
  font-size: 24rpx;
  color: #94a3b8;
}

.details-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 20rpx;
  background: #ecfdf5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.details-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.details-card {
  position: relative;
  background: #ffffff;
  border-radius: 28rpx;
  padding: 24rpx;
  box-shadow: 0 20rpx 60rpx rgba(15, 118, 110, 0.06);
}

.details-card__bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 8rpx;
  border-top-left-radius: 28rpx;
  border-bottom-left-radius: 28rpx;
}

.details-card__bar.personal {
  background: #3b82f6;
}

.details-card__bar.micro {
  background: #14b8a6;
}

.details-card__body {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.details-card__info {
  display: flex;
  align-items: center;
  gap: 20rpx;
  flex: 1;
  min-width: 0;
}

.details-card__icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.details-card__info-content {
  flex: 1;
  min-width: 0;
}

.details-card__title {
  font-size: 30rpx;
  font-weight: 600;
  color: #0f172a;
}

.details-card__meta {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-top: 6rpx;
}

.details-card__meta-top {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex-wrap: nowrap;
}

.details-card__count {
  font-size: 22rpx;
  color: #94a3b8;
  white-space: nowrap;
}

.details-card__time {
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
.details-card {
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

.details-card__body {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex: 1;
  gap: 20rpx;
}

.details-card__info {
  flex: 1;
  min-width: 0;
  margin-right: 20rpx;
}

.details-card__info-content {
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
.details-card__stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
}

.details-card__count {
  font-size: 26rpx;
  color: #475569;
  font-weight: 500;
}

.details-card__score {
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

.details-card__score-value {
  font-size: 34rpx;
  font-weight: 700;
  color: #0f766e;
}

.details-card__score-meta {
  font-size: 24rpx;
  color: #94a3b8;
}

.details-card__actions {
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

.edit-overlay {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 32rpx;
}

.edit-modal {
  width: 100%;
  max-width: 640rpx;
  background: #ffffff;
  border-radius: 32rpx;
  overflow: hidden;
}

.edit-modal__header {
  background: linear-gradient(to right, #0f766e, #0ea5e9);
  color: #fff;
  padding: 28rpx 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 30rpx;
  font-weight: 600;
}

.edit-modal__close {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.edit-modal__body {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.edit-summary {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.edit-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.edit-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #0f172a;
}

.edit-subtitle {
  font-size: 24rpx;
  color: #94a3b8;
}

.edit-segmented {
  display: flex;
  background: #f1f5f9;
  border-radius: 16rpx;
  overflow: hidden;
}

.edit-segment {
  flex: 1;
  text-align: center;
  padding: 18rpx 0;
  font-size: 26rpx;
  color: #64748b;
}

.edit-segment.active {
  background: #ecfdf5;
  color: #0f766e;
  font-weight: 600;
}

.preview-box {
  background: #ecfdf5;
  border-radius: 20rpx;
  padding: 20rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preview-label {
  font-size: 24rpx;
  color: #0f766e;
}

.preview-value {
  font-size: 34rpx;
  font-weight: 700;
  color: #0f766e;
}

.edit-modal__delete-section {
  padding: 0 32rpx 24rpx;
  border-top: 2rpx solid rgba(15, 23, 42, 0.05);
  margin-top: 16rpx;
}

.edit-modal__delete-section .modal-btn {
  width: 100%;
  margin: 0;
  background: #fee2e2;
  color: #b91c1c;
  border: 2rpx solid rgba(239, 68, 68, 0.25);
}

.edit-modal__footer {
  padding: 0 32rpx 32rpx;
  display: flex;
  gap: 16rpx;
}

.modal-btn {
  flex: 1;
  border-radius: 20rpx;
  padding: 18rpx 0;
  font-size: 28rpx;
}

.modal-btn.ghost {
  border: 2rpx solid rgba(15, 118, 110, 0.2);
  color: #0f766e;
  background: #fff;
}

.modal-btn.primary {
  background: linear-gradient(to right, #0f766e, #0ea5e9);
  color: #fff;
}
</style>
