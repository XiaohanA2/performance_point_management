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

    <view v-else-if="mySubmissions.length === 0" class="empty-state">
      <view class="empty-icon">
        <uni-icons type="time" size="48" color="#cbd5f5" />
      </view>
      <text class="empty-text">暂无提报数据，立即前往工作台提报吧</text>
      <button class="light-btn" @click="gotoDashboard">前往提报</button>
    </view>

    <view v-else class="history-list">
      <view v-for="sub in mySubmissions" :key="sub.id" class="history-card">
        <view class="history-card__bar" :class="getRule(sub.ruleId)?.category" />
        <view class="history-card__body">
          <view class="history-card__info">
            <view class="history-card__icon" :style="{ backgroundColor: getRule(sub.ruleId)?.color }">
              <IconHelper :name="getRule(sub.ruleId)?.icon || 'circle'" :size="26" />
            </view>
            <view class="history-card__info-content">
              <text class="history-card__title">{{ getRule(sub.ruleId)?.name }}</text>
              <view class="history-card__meta">
                <view class="history-card__meta-top">
                  <text class="tag tag--gray">
                    {{ getDetails(sub).typeLabel }}
                  </text>
                  <text class="history-card__count">{{ sub.count }} 笔 / {{ sub.amount }} 万</text>
                </view>
                <text class="history-card__time">{{ getDetails(sub).date }}</text>
              </view>
            </view>
          </view>
          <view class="history-card__score">
            <text class="history-card__score-value">+{{ getDetails(sub).totalPoints }} 分</text>
          </view>
        </view>
        <view class="history-card__actions" v-if="canModify(sub)">
          <button class="action-btn" @click="handleEdit(sub)">
            <uni-icons type="compose" size="16" color="#0f766e" />
            编辑
          </button>
          <button class="action-btn danger" @click="handleDelete(sub)">
            <uni-icons type="trash" size="16" color="#ef4444" />
            删除
          </button>
        </view>
      </view>
    </view>

    <view v-if="showEditModal" class="edit-overlay">
      <view class="edit-modal">
        <view class="edit-modal__header">
          <text>编辑提报</text>
          <view class="edit-modal__close" @click="cancelEdit">
            <uni-icons type="closeempty" :size="28" color="#fff" />
          </view>
        </view>
        <view class="edit-modal__body">
          <view class="edit-summary">
            <view class="edit-icon" :style="{ backgroundColor: getRule(editingSubmission.ruleId)?.color }">
              <IconHelper :name="getRule(editingSubmission.ruleId)?.icon || 'circle'" :size="20" />
            </view>
            <view>
              <text class="edit-title">{{ getRule(editingSubmission.ruleId)?.name }}</text>
              <text class="edit-subtitle">
                {{ getRule(editingSubmission.ruleId)?.category === 'personal' ? '个贷业务' : '小微业务' }}
              </text>
            </view>
          </view>

          <view v-if="getRule(editingSubmission.ruleId)?.hasStockOption" class="edit-segmented">
            <view
              class="edit-segment"
              :class="{ active: editForm.type === 'new' }"
              @click="editForm.type = 'new'"
            >
              新增
            </view>
            <view
              class="edit-segment"
              :class="{ active: editForm.type === 'stock' }"
              @click="editForm.type = 'stock'"
            >
              {{ getRule(editingSubmission.ruleId)?.stockLabel || '存量' }}
            </view>
          </view>

          <view class="edit-form-grid">
            <view class="form-item">
              <text class="form-label">笔数</text>
              <input
                class="form-input"
                type="number"
                v-model="editForm.count"
                placeholder="输入业务笔数"
                placeholder-style="font-size:24rpx;color:#cbd5e1"
              />
            </view>
            <view class="form-item">
              <text class="form-label">授信金额（万元）</text>
              <input
                class="form-input"
                type="digit"
                v-model="editForm.amount"
                placeholder="输入授信金额"
                placeholder-style="font-size:24rpx;color:#cbd5e1"
              />
            </view>
          </view>

          <view class="preview-box">
            <text class="preview-label">修改后积分</text>
            <text class="preview-value">+{{ calculatePreviewScore() }} 分</text>
          </view>
        </view>
        <view class="edit-modal__footer">
          <button class="modal-btn ghost" @click="cancelEdit">取消</button>
          <button class="modal-btn primary" @click="confirmEdit">确认修改</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { StoreService } from '../../services/store.js';
import IconHelper from '../../components/IconHelper.vue';

const DAY_MS = 24 * 60 * 60 * 1000;

export default {
  components: { IconHelper },
  data() {
    return {
      currentUser: null,
      submissions: [],
      rules: [],
      settings: StoreService.getSettings(),
      showEditModal: false,
      editingSubmission: null,
      editForm: {
        count: '',
        amount: '',
        type: 'new'
      },
      searchKeyword: '',
      dateFilter: ''
    };
  },
  computed: {
    isAdmin() {
      return this.currentUser && this.currentUser.role === 'admin';
    },
    mySubmissions() {
      const quarter = StoreService.getCurrentQuarter();
      const userId = this.currentUser ? this.currentUser.id : null;
      let filtered = this.submissions
        .filter(sub => sub.employeeId === userId && sub.quarter === quarter);
      
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
      if (!this.currentUser || this.currentUser.id !== sub.employeeId) return false;
      const withinWindow = Date.now() - sub.timestamp <= DAY_MS;
      return withinWindow && !sub.archived;
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
    async confirmEdit() {
      if (!this.editForm.count || Number(this.editForm.count) <= 0) {
        uni.showToast({ title: '请输入有效的笔数', icon: 'none' });
        return;
      }
      if (Number(this.editForm.amount) < 0) {
        uni.showToast({ title: '请输入正确的金额', icon: 'none' });
        return;
      }
      try {
        await StoreService.updateSubmission(this.editingSubmission.id, {
          count: Number(this.editForm.count),
          amount: Number(this.editForm.amount) || 0,
          type: this.editForm.type
        });
        uni.showToast({ title: '修改成功', icon: 'success' });
        this.showEditModal = false;
        await this.fetchData();
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
  background: linear-gradient(135deg, #0f766e, #0ea5e9);
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

.edit-modal__footer {
  padding: 24rpx 32rpx 32rpx;
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
  background: linear-gradient(135deg, #0f766e, #0ea5e9);
  color: #fff;
}
</style>

