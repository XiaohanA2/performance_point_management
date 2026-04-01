<template>
  <view class="history-page">
    <view class="filter-section">
      <view class="filter-row-main">
        <view class="system-badge-inline">{{ systemMode === 'pf' ? '个金' : '个贷' }}</view>
        <input class="search-input-inline" placeholder="搜索业务名称" v-model="searchKeyword" />
        <picker mode="date" @change="handleDateChange" :value="dateFilter">
          <view class="date-picker-inline">
            <uni-icons type="flag" size="20" color="#0f766e" />
            <text>{{ dateFilter || '选择日期' }}</text>
          </view>
        </picker>
        <button class="reset-btn-inline" @click="resetFilters">重置</button>
      </view>
      <text class="history-subtitle">共 {{ systemMode === 'credit' ? mySubmissions.length : pfFilteredSubmissions.length }} 条业务记录</text>
    </view>

    <!-- 加载状态 -->
    <view v-if="isLoading" class="loading-state">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 个贷记录 -->
    <template v-if="!isLoading && systemMode === 'credit'">
      <view v-if="!currentUser || currentUser.role === 'guest'" class="empty-state">
        <text>请先登录后查看您的提报记录</text>
        <button class="light-btn" @click="gotoLogin">前往登录</button>
      </view>
      <view v-else-if="Object.keys(groupedSubmissions).length === 0" class="empty-state">
        <view class="empty-icon"><uni-icons type="refreshempty" size="48" color="#cbd5f5" /></view>
        <text class="empty-text">暂无提报数据，立即前往工作台提报吧</text>
        <button class="light-btn" @click="gotoDashboard">前往提报</button>
      </view>
      <view v-else class="submission-groups">
        <view v-for="(dateGroup, dateKey) in groupedSubmissions" :key="dateKey" class="submission-date-group">
          <view class="submission-date-header">
            <text class="submission-date">{{ dateKey }}</text>
            <text class="day-total">共 {{ dateGroup.length }} 条记录</text>
          </view>
          <view class="submission-list">
            <view v-for="sub in dateGroup" :key="sub.id" class="history-card">
              <view class="history-card__bar" :class="getRule(sub.ruleId)?.category" />
              <view class="history-card__body">
                <view class="history-card__info">
                  <view class="history-card__info-content">
                    <view class="submission-rule-info">
                      <text class="submission-category" :class="getCategoryColorClass(getRuleCategory(sub.ruleId))">{{ getRuleCategory(sub.ruleId) }}</text>
                      <text class="history-card__title">{{ getRule(sub.ruleId)?.name }}</text>
                    </view>
                    <view class="submission-meta">
                      <text class="submission-type type-gray">{{ getDetails(sub).typeLabel }}</text>
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
    </template>

    <!-- 个金记录 -->
    <template v-if="!isLoading && systemMode === 'pf'">
      <view v-if="Object.keys(pfGroupedSubmissions).length === 0" class="empty-state">
        <view class="empty-icon"><uni-icons type="refreshempty" size="48" color="#cbd5f5" /></view>
        <text class="empty-text">暂无提报数据，立即前往工作台提报吧</text>
        <button class="light-btn" @click="gotoDashboard">前往提报</button>
      </view>
      <view v-else class="submission-groups">
        <view v-for="(dateGroup, dateKey) in pfGroupedSubmissions" :key="dateKey" class="submission-date-group">
          <view class="submission-date-header">
            <text class="submission-date">{{ dateKey }}</text>
            <text class="day-total">共 {{ dateGroup.length }} 条记录</text>
          </view>
          <view class="submission-list">
            <view v-for="sub in dateGroup" :key="sub._id" class="history-card">
              <view class="history-card__bar" :class="getPFTaskCategory(sub.taskId) === 'personal' ? 'bar-pf-required' : 'bar-pf-bonus'" />
              <view class="history-card__body">
                <view class="history-card__info">
                  <view class="history-card__info-content">
                    <view class="submission-rule-info">
                      <text class="submission-category" :class="getPFCategoryClass(sub.taskId)">{{ getPFCategoryLabel(sub.taskId) }}</text>
                      <text class="history-card__title">{{ getPFTaskName(sub.taskId) }}</text>
                    </view>
                    <view class="submission-meta">
                      <text class="submission-time">{{ formatTime(sub.createdAt) }}</text>
                    </view>
                  </view>
                </view>
                <view class="history-card__stats">
                  <text class="history-card__count">{{ sub.value }} {{ getPFTaskUnit(sub.taskId) }}</text>
                </view>
                <button class="edit-btn" v-if="pfCanModify(sub)" @click="handlePFEdit(sub)">编辑</button>
              </view>
            </view>
          </view>
        </view>
      </view>
    </template>

    <SubmissionEditModal
      v-if="showEditModal && systemMode === 'credit'"
      :editingSubmission="editingSubmission"
      :rules="rules"
      @cancel="cancelEdit"
      @confirm="confirmEdit"
      @delete="handleDeleteSubmission"
    />

    <!-- 个金编辑弹窗 -->
    <view v-if="showPFEditModal" class="modal-overlay">
      <view class="pf-edit-modal">
        <view class="pf-edit-modal__header">
          <view class="pf-edit-modal__header-left">
            <text class="pf-edit-modal__tag" :class="getPFTaskCategory(pfEditingSubmission && pfEditingSubmission.taskId) === 'personal' ? 'tag-required' : 'tag-bonus'">
              {{ getPFCategoryLabel(pfEditingSubmission && pfEditingSubmission.taskId) }}
            </text>
            <text class="pf-edit-modal__title">{{ getPFTaskName(pfEditingSubmission && pfEditingSubmission.taskId) }}</text>
          </view>
          <view class="pf-edit-modal__close" @tap="cancelPFEdit">
            <uni-icons type="closeempty" :size="20" color="rgba(255,255,255,0.7)" />
          </view>
        </view>
        <view class="pf-edit-modal__body">
          <view class="pf-edit-info-row">
            <view class="pf-edit-info-item">
              <text class="pf-edit-info-label">提报日期</text>
              <text class="pf-edit-info-value">{{ pfEditingSubmission && pfEditingSubmission.date }}</text>
            </view>
            <view class="pf-edit-info-item">
              <text class="pf-edit-info-label">原完成数量</text>
              <text class="pf-edit-info-value">{{ pfEditingSubmission && pfEditingSubmission.value }} {{ getPFTaskUnit(pfEditingSubmission && pfEditingSubmission.taskId) }}</text>
            </view>
          </view>
          <view class="pf-edit-input-wrap">
            <text class="pf-edit-label">修改完成数量</text>
            <view class="pf-edit-input-row">
              <input class="pf-edit-input" type="digit" v-model="pfEditValue" placeholder="输入新数量" focus />
              <text class="pf-edit-unit">{{ getPFTaskUnit(pfEditingSubmission && pfEditingSubmission.taskId) }}</text>
            </view>
          </view>
        </view>
        <view class="pf-edit-modal__footer">
          <button class="pf-edit-btn delete" @tap="handlePFDelete">删除记录</button>
          <button class="pf-edit-btn primary" @tap="confirmPFEdit">保存修改</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { StoreService } from '../../services/store.js';
import SubmissionEditModal from '../../components/SubmissionEditModal.vue';
import { getUserDefaultSystem } from '../../services/permission-service.js';
import { getPFSubmissions, getPFTasks, updatePFSubmission, deletePFSubmission, getCurrentPeriod } from '../../services/pf-service.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export default {
  components: { SubmissionEditModal },
  data() {
    return {
      currentUser: null,
      systemMode: 'credit',
      isLoading: false,
      // 个贷
      submissions: [],
      rules: [],
      settings: StoreService.getSettings(),
      showEditModal: false,
      editingSubmission: null,
      searchKeyword: '',
      dateFilter: '',
      // 个金
      pfSubmissions: [],
      pfTasksMap: {},
      showPFEditModal: false,
      pfEditingSubmission: null,
      pfEditValue: ''
    };
  },
  computed: {
    mySubmissions() {
      const userId = this.currentUser ? this.currentUser.id : null;
      let filtered = this.submissions.filter(sub => sub.employeeId === userId);
      if (this.searchKeyword.trim()) {
        const kw = this.searchKeyword.trim().toLowerCase();
        filtered = filtered.filter(sub => { const r = this.rules.find(r => r.id === sub.ruleId); return r && r.name.toLowerCase().includes(kw); });
      }
      if (this.dateFilter) {
        const t = new Date(this.dateFilter);
        const s = new Date(t.setHours(0,0,0,0)).getTime();
        const e = new Date(t.setHours(23,59,59,999)).getTime();
        filtered = filtered.filter(sub => sub.timestamp >= s && sub.timestamp <= e);
      }
      return filtered.sort((a, b) => b.timestamp - a.timestamp);
    },
    groupedSubmissions() {
      const groups = {};
      this.mySubmissions.forEach(sub => {
        const k = this.formatDate(sub.timestamp, 'date');
        if (!groups[k]) groups[k] = [];
        groups[k].push(sub);
      });
      const sorted = {};
      Object.keys(groups).sort((a, b) => new Date(b) - new Date(a)).forEach(k => { sorted[k] = groups[k]; });
      return sorted;
    },
    pfFilteredSubmissions() {
      let result = this.pfSubmissions;
      if (this.searchKeyword) result = result.filter(sub => this.getPFTaskName(sub.taskId).includes(this.searchKeyword));
      if (this.dateFilter) result = result.filter(sub => sub.date === this.dateFilter);
      return result;
    },
    pfGroupedSubmissions() {
      const groups = {};
      this.pfFilteredSubmissions.forEach(sub => {
        if (!groups[sub.date]) groups[sub.date] = [];
        groups[sub.date].push(sub);
      });
      const sorted = {};
      Object.keys(groups).sort((a, b) => new Date(b) - new Date(a)).forEach(k => { sorted[k] = groups[k]; });
      return sorted;
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
        const user = StoreService.getCurrentUser();
        if (!user) { this.currentUser = null; return; }
        this.currentUser = user;
        const saved = uni.getStorageSync('system_mode');
        const def = getUserDefaultSystem(user);
        this.systemMode = saved || (def === 'pf' ? 'pf' : 'credit');
        if (this.systemMode === 'credit') {
          this.submissions = StoreService.getSubmissions();
          this.settings = StoreService.getSettings();
          this.rules = StoreService.getRules();
        } else {
          await this.fetchPFData();
        }
      } catch (error) {
        uni.showToast({ title: error.message || '数据加载失败', icon: 'none' });
      } finally {
        this.isLoading = false;
      }
    },
    async fetchPFData() {
      if (!this.currentUser) return;
      try {
        const [tasks, submissions] = await Promise.all([
          getPFTasks({ isActive: true }),
          getPFSubmissions({ userId: this.currentUser.id, period: getCurrentPeriod() })
        ]);
        this.pfTasksMap = {};
        tasks.forEach(t => { this.pfTasksMap[t.taskId] = t; });
        this.pfSubmissions = submissions.sort((a, b) => new Date(b.date) - new Date(a.date));
      } catch (error) {
        uni.showToast({ title: error.message || '数据加载失败', icon: 'none' });
      }
    },
    getPFTaskName(taskId) { return this.pfTasksMap[taskId]?.taskName || '未知业务'; },
    getPFTaskUnit(taskId) { return this.pfTasksMap[taskId]?.unit || ''; },
    getPFTaskCategory(taskId) { return this.pfTasksMap[taskId]?.category === 'required' ? 'personal' : 'micro'; },
    getPFCategoryLabel(taskId) { return this.pfTasksMap[taskId]?.category === 'required' ? '必选' : '加分'; },
    getPFCategoryClass(taskId) { return this.pfTasksMap[taskId]?.category === 'required' ? 'category-required' : 'category-bonus'; },
    pfCanModify(sub) {
      if (!this.currentUser) return false;
      const isAdmin = ['super_admin', 'personal_finance_admin'].includes(this.currentUser.role);
      if (isAdmin) return true;
      return Date.now() - (sub.createdAt || 0) <= DAY_MS;
    },
    handlePFEdit(sub) { this.pfEditingSubmission = sub; this.pfEditValue = String(sub.value); this.showPFEditModal = true; },
    cancelPFEdit() { this.showPFEditModal = false; this.pfEditingSubmission = null; this.pfEditValue = ''; },
    async confirmPFEdit() {
      if (!this.pfEditValue || parseFloat(this.pfEditValue) <= 0) { uni.showToast({ title: '请输入有效数量', icon: 'none' }); return; }
      try {
        uni.showLoading({ title: '保存中...' });
        const submissionId = this.pfEditingSubmission._id;
        const newValue = parseFloat(this.pfEditValue);

        await updatePFSubmission(submissionId, newValue);
        uni.showToast({ title: '修改成功', icon: 'success' });

        // 立即更新本地数据
        const sub = this.pfSubmissions.find(s => s._id === submissionId);
        if (sub) {
          sub.value = newValue;
        }

        this.cancelPFEdit();
      } catch (error) {
        uni.showToast({ title: error.message || '修改失败', icon: 'none' });
      } finally { uni.hideLoading(); }
    },
    handlePFDelete() {
      uni.showModal({
        title: '确认删除', content: '删除后将无法恢复，确定删除该提报记录吗？', confirmColor: '#ef4444',
        success: async res => {
          if (!res.confirm) return;
          try {
            uni.showLoading({ title: '删除中...' });
            await deletePFSubmission(this.pfEditingSubmission._id);
            uni.showToast({ title: '删除成功', icon: 'success' });

            // 立即从本地移除
            const index = this.pfSubmissions.findIndex(s => s._id === this.pfEditingSubmission._id);
            if (index > -1) {
              this.pfSubmissions.splice(index, 1);
            }

            this.cancelPFEdit();
          } catch (error) {
            uni.showToast({ title: error.message || '删除失败', icon: 'none' });
          } finally { uni.hideLoading(); }
        }
      });
    },
    gotoLogin() { uni.navigateTo({ url: '/pages/login/login' }); },
    gotoDashboard() { uni.switchTab({ url: '/pages/dashboard/dashboard' }); },
    getRule(ruleId) { return this.rules.find(r => r.id === ruleId); },
    getDetails(sub) {
      const rule = this.getRule(sub.ruleId);
      const cfg = sub.type === 'stock' && rule?.pointsStock ? rule.pointsStock : rule?.pointsNew;
      const itemPoints = sub.count * (cfg?.item || 0);
      const amountPoints = (sub.amount / 100) * (cfg?.million || 0);
      return { rule, typeLabel: sub.type === 'stock' ? rule?.stockLabel || '存量' : '新增', totalPoints: (itemPoints + amountPoints).toFixed(2) };
    },
    canModify(sub) {
      if (!this.currentUser) return false;
      const isAdmin = ['admin', 'super_admin', 'credit_admin'].includes(this.currentUser.role);
      if (isAdmin) return !sub.archived;
      if (!this.settings.allowEditSubmission) return false;
      if (this.currentUser.id !== sub.employeeId) return false;
      return Date.now() - sub.timestamp <= DAY_MS && !sub.archived;
    },
    formatDate(date, format = 'date') {
      const d = typeof date === 'number' ? new Date(date) : new Date(date);
      const year = d.getFullYear(), month = `${d.getMonth()+1}`.padStart(2,'0'), day = `${d.getDate()}`.padStart(2,'0');
      const hours = `${d.getHours()}`.padStart(2,'0'), minutes = `${d.getMinutes()}`.padStart(2,'0');
      if (format === 'date') return `${year}-${month}-${day}`;
      if (format === 'time') return `${hours}:${minutes}`;
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    },
    formatTime(timestamp) { return this.formatDate(timestamp, 'time'); },
    getRuleCategory(ruleId) { const r = this.getRule(ruleId); if (!r) return '其他'; return r.category === 'personal' ? '个贷' : '小微'; },
    getCategoryColorClass(category) { return category === '个贷' ? 'category-personal' : 'category-micro'; },
    handleEdit(sub) { this.editingSubmission = sub; this.showEditModal = true; },
    cancelEdit() { this.showEditModal = false; this.editingSubmission = null; },
    handleDeleteSubmission() {
      uni.showModal({
        title: '确认删除', content: '删除后将无法恢复，确定删除该提报记录吗？', confirmColor: '#ef4444',
        success: async res => {
          if (!res.confirm) return;
          try {
            await StoreService.deleteSubmission(this.editingSubmission.id);
            uni.showToast({ title: '删除成功', icon: 'success' });
            await this.fetchData();
            this.showEditModal = false;
          } catch (error) { uni.showToast({ title: error.message || '删除失败', icon: 'none' }); }
        }
      });
    },
    async confirmEdit(editData) {
      try {
        await StoreService.updateSubmission(this.editingSubmission.id, { count: editData.count, amount: editData.amount, type: editData.type });
        uni.showToast({ title: '修改成功', icon: 'success' });
        await this.fetchData();
        this.showEditModal = false;
      } catch (error) { uni.showToast({ title: error.message || '修改失败', icon: 'none' }); }
    },
    handleDateChange(e) { this.dateFilter = e.detail.value; },
    resetFilters() { this.searchKeyword = ''; this.dateFilter = ''; }
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

.system-badge-inline {
  background: #0f766e;
  color: #fff;
  font-size: 22rpx;
  font-weight: 600;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  white-space: nowrap;
  flex-shrink: 0;
}

.filter-section { background: #fff; border-radius: 20rpx; padding: 20rpx; margin-bottom: 24rpx; box-shadow: 0 4rpx 12rpx rgba(15,118,110,0.08); }
.history-subtitle { display: block; font-size: 24rpx; color: #94a3b8; margin-top: 12rpx; }
.filter-row-main { display: flex; align-items: center; gap: 12rpx; flex: 1; }
.search-input-inline { background: #f1f5f9; border-radius: 16rpx; padding: 14rpx 20rpx; font-size: 24rpx; color: #0f766e; border: none; flex: 1; min-width: 0; }
.date-picker-inline { display: flex; align-items: center; gap: 8rpx; padding: 14rpx 20rpx; background: #ecfdf5; border-radius: 16rpx; border: 2rpx solid rgba(15,118,110,0.2); color: #0f766e; font-size: 24rpx; }
.reset-btn-inline { padding: 8rpx 16rpx; border-radius: 16rpx; border: 1rpx solid rgba(15,118,110,0.2); background: #fff; color: #0f766e; font-size: 20rpx; }

.submission-groups { display: flex; flex-direction: column; gap: 20rpx; }
.submission-date-group { background: #ffffff; border-radius: 16rpx; padding: 20rpx; box-shadow: 0 1rpx 3rpx rgba(0,0,0,0.05); }
.submission-date-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; padding-bottom: 12rpx; border-bottom: 2rpx solid #f1f5f9; }
.submission-date { font-size: 34rpx; font-weight: 700; color: #0f172a; }
.day-total { font-size: 24rpx; color: #94a3b8; background: #f1f5f9; padding: 4rpx 16rpx; border-radius: 12rpx; }
.submission-list { display: flex; flex-direction: column; gap: 12rpx; }

.history-card { position: relative; background: #fff; border-radius: 10rpx; padding: 16rpx; box-shadow: 0 1rpx 3rpx rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: flex-start; }
.history-card__bar { position: absolute; left: 0; top: 0; bottom: 0; width: 8rpx; border-top-left-radius: 10rpx; border-bottom-left-radius: 10rpx; }
.history-card__bar.personal { background: #3b82f6; }
.history-card__bar.micro { background: #14b8a6; }
.bar-pf-required { background: #14b8a6; }
.bar-pf-bonus { background: #f59e0b; }
.history-card__body { display: flex; justify-content: space-between; align-items: flex-start; flex: 1; gap: 20rpx; padding-left: 16rpx; }
.history-card__info { flex: 1; min-width: 0; }
.history-card__info-content { flex: 1; min-width: 0; }
.submission-rule-info { display: flex; align-items: center; gap: 12rpx; margin-bottom: 6rpx; }
.submission-category { font-size: 22rpx; font-weight: 600; padding: 4rpx 12rpx; border-radius: 10rpx; flex-shrink: 0; }
.category-personal { background: #dbeafe; color: #1e40af; }
.category-micro { background: #dcfce7; color: #166534; }
.category-required { background: #ecfdf5; color: #0f766e; }
.category-bonus { background: #fffbeb; color: #d97706; }
.history-card__title { font-size: 30rpx; font-weight: 600; color: #0f172a; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.submission-meta { display: flex; align-items: center; gap: 16rpx; font-size: 24rpx; color: #94a3b8; }
.submission-type { padding: 4rpx 14rpx; border-radius: 12rpx; font-size: 20rpx; font-weight: 600; }
.type-gray { background: #f1f5f9; color: #64748b; }
.submission-time { font-size: 24rpx; color: #94a3b8; }
.history-card__stats { display: flex; flex-direction: column; align-items: flex-end; gap: 8rpx; }
.history-card__count { font-size: 26rpx; color: #475569; font-weight: 500; }
.history-card__score { font-size: 28rpx; font-weight: 700; color: #0f766e; }
.edit-btn { background: #ecfdf5; color: #0f766e; border: 2rpx solid rgba(15,118,110,0.25); border-radius: 8rpx; padding: 8rpx 12rpx; font-size: 22rpx; font-weight: 600; min-width: 80rpx; margin-left: auto; }

.empty-state { margin-top: 120rpx; text-align: center; color: #94a3b8; display: flex; flex-direction: column; gap: 16rpx; align-items: center; }
.empty-icon { width: 120rpx; height: 120rpx; border-radius: 999rpx; background: #e0f2fe; display: flex; align-items: center; justify-content: center; }
.empty-text { font-size: 26rpx; }
.light-btn { border: 2rpx solid rgba(15,118,110,0.2); border-radius: 999rpx; padding: 16rpx 32rpx; color: #0f766e; background: #fff; font-size: 26rpx; }

.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { width: 600rpx; background: #fff; border-radius: 24rpx; overflow: hidden; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 30rpx; background: #0f766e; color: #fff; font-size: 32rpx; font-weight: 600; }
.modal-close { padding: 8rpx; }
.modal-close-icon { font-size: 28rpx; color: rgba(255,255,255,0.8); }
.modal-body { padding: 40rpx 30rpx; }
.form-item { margin-bottom: 30rpx; }
.form-label { display: block; font-size: 28rpx; color: #64748b; margin-bottom: 16rpx; }
.form-value { display: block; font-size: 30rpx; color: #0f172a; }
.form-input { width: 100%; padding: 24rpx; background: #f1f5f9; border-radius: 12rpx; font-size: 30rpx; }
.modal-footer { display: flex; gap: 20rpx; padding: 30rpx; border-top: 1rpx solid #e5e7eb; }
.modal-btn { flex: 1; padding: 24rpx; border-radius: 12rpx; font-size: 30rpx; text-align: center; }
.modal-btn.ghost { background: #f1f5f9; color: #ef4444; }
.modal-btn.primary { background: #0f766e; color: #fff; }

/* 个金编辑弹窗 */
.pf-edit-modal { width: 640rpx; background: #fff; border-radius: 28rpx; overflow: hidden; box-shadow: 0 20rpx 60rpx rgba(0,0,0,0.15); }
.pf-edit-modal__header { background: linear-gradient(135deg, #0f766e 0%, #0ea5e9 100%); padding: 32rpx; display: flex; align-items: center; justify-content: space-between; }
.pf-edit-modal__header-left { display: flex; align-items: center; gap: 16rpx; flex: 1; }
.pf-edit-modal__tag { font-size: 20rpx; font-weight: 600; padding: 4rpx 14rpx; border-radius: 20rpx; flex-shrink: 0; }
.pf-edit-modal__title { font-size: 32rpx; font-weight: 700; color: #fff; }
.pf-edit-modal__close { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: rgba(255,255,255,0.15); flex-shrink: 0; }
.pf-edit-modal__body { padding: 28rpx 32rpx 8rpx; }
.pf-edit-info-row { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.pf-edit-info-item { flex: 1; background: #f8fafc; border-radius: 14rpx; padding: 16rpx 20rpx; border: 1rpx solid #e2e8f0; }
.pf-edit-info-label { display: block; font-size: 22rpx; color: #94a3b8; margin-bottom: 8rpx; }
.pf-edit-info-value { display: block; font-size: 28rpx; font-weight: 600; color: #0f172a; }
.pf-edit-input-wrap { margin-bottom: 20rpx; }
.pf-edit-label { display: block; font-size: 26rpx; color: #64748b; margin-bottom: 12rpx; font-weight: 500; }
.pf-edit-input-row { display: flex; align-items: center; background: #f8fafc; border: 2rpx solid #e2e8f0; border-radius: 14rpx; overflow: hidden; }
.pf-edit-input { flex: 1; padding: 22rpx 20rpx; font-size: 36rpx; font-weight: 600; color: #0f172a; background: transparent; }
.pf-edit-unit { padding: 0 20rpx; font-size: 26rpx; color: #94a3b8; border-left: 1rpx solid #e2e8f0; }
.pf-edit-preview { background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 14rpx; padding: 20rpx 24rpx; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; border: 1rpx solid #a7f3d0; }
.pf-edit-preview-label { font-size: 26rpx; color: #0f766e; }
.pf-edit-preview-score { font-size: 40rpx; font-weight: 700; color: #0f766e; }
.pf-edit-modal__footer { padding: 20rpx 32rpx 32rpx; display: flex; gap: 16rpx; }
.pf-edit-btn { flex: 1; padding: 22rpx 0; border-radius: 16rpx; font-size: 30rpx; font-weight: 600; text-align: center; border: none; }
.pf-edit-btn.delete { background: #fef2f2; color: #ef4444; }
.pf-edit-btn.primary { background: linear-gradient(135deg, #0f766e 0%, #0ea5e9 100%); color: #fff; }

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120rpx 32rpx;
}

.loading-text {
  font-size: 28rpx;
  color: #64748b;
}

/* 积分徽章 */
.pf-score-badge { display: inline-flex; }
.history-card__score--dynamic { font-size: 22rpx; color: #94a3b8; font-weight: 400; }
</style>

