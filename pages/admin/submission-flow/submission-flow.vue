<template>
  <view class="submission-flow-page">
    <view class="filter-section">
      <input
        class="search-input"
        placeholder="搜索姓名/支行/业务名称"
        v-model="searchKeyword"
      />
      <view class="filter-row">
        <picker mode="date" start="2024-01-01" end="2030-12-31" @change="handleStartDateChange" :value="startDate">
          <view class="date-picker-btn">{{ startDate || '开始日期' }}</view>
        </picker>
        <text class="date-separator">至</text>
        <picker mode="date" start="2024-01-01" end="2030-12-31" @change="handleEndDateChange" :value="endDate">
          <view class="date-picker-btn">{{ endDate || '结束日期' }}</view>
        </picker>
        <button class="reset-btn" @click="resetFilters">重置条件</button>
        <button class="primary-btn" @click="handleExportSubmissions">导出记录</button>
      </view>
    </view>

    <view class="stats-section">
      <text class="stats-text">共 {{ filteredSubmissions.length }} 条提报记录</text>
    </view>

    <scroll-view scroll-y class="content" @scrolltolower="loadMore">
      <view v-if="Object.keys(groupedSubmissions).length === 0 && !isLoading" class="empty-state">
        <uni-icons type="empty" size="64" color="#cbd5e1" />
        <text class="empty-text">暂无提报记录</text>
        <text class="empty-tip">请尝试调整搜索条件或日期范围</text>
      </view>
      
      <view v-else-if="isLoading" class="loading-state">
        <uni-icons type="spinner-cycle" size="64" color="#cbd5e1" animation="rotate" />
        <text class="loading-text">加载中...</text>
      </view>
      
      <view v-else class="submission-groups">
        <!-- 按日期分组 -->
        <view v-for="(dateGroup, dateKey) in groupedSubmissions" :key="dateKey" class="submission-date-group">
          <!-- 日期标题 -->
          <view class="submission-date-header">
            <text class="submission-date">{{ dateKey }}</text>
            <text class="day-total">共 {{ getDayTotalSubmissions(dateGroup) }} 条记录</text>
          </view>
          
          <!-- 该日期下的用户分组 -->
          <view class="submission-user-groups">
            <view v-for="(userSubmissions, employeeId) in dateGroup" :key="employeeId" class="submission-group">
              <view class="submission-group-header">
                <text class="submission-group-name">{{ getEmployeeName(employeeId) }}</text>
                <text class="submission-group-branch">{{ getEmployeeBranch(employeeId) }}</text>
                <text class="user-total">{{ userSubmissions.length }} 条</text>
              </view>
              <view class="submission-list">
                <view v-for="sub in userSubmissions" :key="sub.id" class="submission-item">
                  <!-- 左侧颜色标签 -->
                  <view class="submission-item__bar" :class="getRule(sub.ruleId)?.category" />
                  <view class="submission-item__body">
                    <view class="submission-item__info">
                      <view class="submission-item__info-content">
                        <view class="submission-rule-info">
                          <text class="submission-category" :class="getCategoryColorClass(getRuleCategory(sub.ruleId))">
                            {{ getRuleCategory(sub.ruleId) }}
                          </text>
                          <text class="submission-item__title">{{ getRuleName(sub.ruleId) }}</text>
                        </view>
                        <view class="submission-meta">
                          <text class="submission-type type-gray">
                            {{ sub.type === 'new' ? '新增' : '存量' }}
                          </text>
                          <text class="submission-time">{{ formatDate(sub.timestamp, 'time') }}</text>
                        </view>
                      </view>
                    </view>
                    <view class="submission-item__stats">
                      <text class="submission-item__count">{{ sub.count }} 笔 / {{ sub.amount }} 万</text>
                      <text class="submission-item__score highlight">{{ calculateSubmissionScore(sub) }} 分</text>
                    </view>
                    <button class="edit-btn" @click="handleEditSubmission(sub)">编辑</button>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
        
        <!-- 加载更多 -->
        <view v-if="hasMore" class="loading-more">
          <uni-icons type="spinner-cycle" size="32" color="#cbd5e1" animation="rotate" />
          <text class="loading-more-text">加载更多...</text>
        </view>
        
        <!-- 无更多数据 -->
        <view v-else class="no-more">
          <text class="no-more-text">已加载全部数据</text>
        </view>
      </view>
    </scroll-view>

    <!-- 编辑弹框 -->
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
import SubmissionEditModal from '../../../components/SubmissionEditModal.vue';

export default {
  components: { SubmissionEditModal },
  data() {
    return {
      searchKeyword: '',
      startDate: '',
      endDate: '',
      allSubmissions: [],
      users: [],
      rules: [],
      isLoading: true,
      isLoadingMore: false,
      currentPage: 1,
      pageSize: 20,
      hasMore: true,
      // 编辑功能相关
      showEditModal: false,
      editingSubmission: null,
      editForm: {
        count: '',
        amount: '',
        type: 'new'
      }
    };
  },
  computed: {
    filteredSubmissions() {
      let filtered = this.allSubmissions;
      
      // 只显示客户经理的提报记录
      filtered = filtered.filter(sub => {
        const user = this.users.find(u => u.id === sub.employeeId);
        return user && user.role === 'manager';
      });
      
      // 搜索过滤
      const keyword = this.searchKeyword.trim().toLowerCase();
      if (keyword) {
        filtered = filtered.filter(sub => {
          const employee = this.users.find(u => u.id === sub.employeeId);
          const rule = this.rules.find(r => r.id === sub.ruleId);
          return (
            (employee && employee.name.toLowerCase().includes(keyword)) ||
            (employee && (employee.branchName || employee.branch).toLowerCase().includes(keyword)) ||
            (rule && rule.name.toLowerCase().includes(keyword))
          );
        });
      }
      
      // 日期范围过滤
      if (this.startDate) {
        const start = new Date(this.startDate).getTime();
        filtered = filtered.filter(sub => sub.timestamp >= start);
      }
      if (this.endDate) {
        const end = new Date(this.endDate).getTime() + 24 * 60 * 60 * 1000; // 包含当天结束
        filtered = filtered.filter(sub => sub.timestamp < end);
      }
      
      // 按时间降序排列
      filtered = filtered.sort((a, b) => b.timestamp - a.timestamp);
      
      // 分页处理
      return filtered;
    },
    paginatedSubmissions() {
      const startIndex = (this.currentPage - 1) * this.pageSize;
      const endIndex = startIndex + this.pageSize;
      return this.filteredSubmissions.slice(0, endIndex);
    },
    groupedSubmissions() {
      const groups = {};
      
      // 先按日期分组
      this.paginatedSubmissions.forEach(sub => {
        const dateKey = this.formatDate(sub.timestamp, 'date');
        if (!groups[dateKey]) {
          groups[dateKey] = {};
        }
        if (!groups[dateKey][sub.employeeId]) {
          groups[dateKey][sub.employeeId] = [];
        }
        groups[dateKey][sub.employeeId].push(sub);
      });
      
      // 按日期降序排序
      const sortedGroups = {};
      Object.keys(groups).sort((a, b) => new Date(b) - new Date(a)).forEach(dateKey => {
        sortedGroups[dateKey] = groups[dateKey];
      });
      
      return sortedGroups;
    },
  },
  async onLoad() {
    await this.initData();
  },
  
  onPageScroll(e) {
    // 滚动到底部加载更多
    if (this.isLoadingMore || !this.hasMore) return;
    const windowHeight = uni.getSystemInfoSync().windowHeight;
    const scrollTop = e.scrollTop;
    const scrollHeight = e.scrollHeight;
    
    if (scrollTop + windowHeight >= scrollHeight - 200) {
      this.loadMore();
    }
  },
  methods: {
    async initData() {
      this.isLoading = true;
      // 重置分页状态
      this.currentPage = 1;
      this.hasMore = true;
      try {
        await StoreService.ensureReady();
        this.allSubmissions = StoreService.getSubmissions();
        this.users = StoreService.getUsers();
        this.rules = StoreService.getRules();
      } catch (error) {
        uni.showToast({ title: error.message || '数据加载失败', icon: 'none' });
      } finally {
        this.isLoading = false;
      }
    },
    
    async loadMore() {
      if (this.isLoadingMore || !this.hasMore) return;
      
      this.isLoadingMore = true;
      try {
        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 500));
        
        this.currentPage++;
        const startIndex = (this.currentPage - 1) * this.pageSize;
        
        // 检查是否还有更多数据
        if (startIndex >= this.filteredSubmissions.length) {
          this.hasMore = false;
        }
      } catch (error) {
        uni.showToast({ title: '加载更多失败', icon: 'none' });
      } finally {
        this.isLoadingMore = false;
      }
    },
    navigateBack() {
      uni.navigateBack();
    },
    handleStartDateChange(e) {
      this.startDate = e.detail.value;
    },
    handleEndDateChange(e) {
      this.endDate = e.detail.value;
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
      } else if (format === 'datetime') {
        return `${year}-${month}-${day} ${hours}:${minutes}`;
      } else {
        return `${year}${month}${day}`;
      }
    },
    getEmployeeName(employeeId) {
      const user = this.users.find(u => u.id === employeeId);
      return user ? user.name : '未知用户';
    },
    getEmployeeBranch(employeeId) {
      const user = this.users.find(u => u.id === employeeId);
      return user ? (user.branchName || user.branch) : '未知支行';
    },
    getRuleName(ruleId) {
      const rule = this.rules.find(r => r.id === ruleId);
      return rule ? rule.name : '未知业务';
    },
    getRuleCategory(ruleId) {
      const rule = this.rules.find(r => r.id === ruleId);
      if (!rule) return '其他';
      return rule.category === 'personal' ? '个贷' : '小微';
    },
    getCategoryColorClass(category) {
      return category === '个贷' ? 'category-personal' : 'category-micro';
    },
    resetFilters() {
      this.searchKeyword = '';
      this.startDate = '';
      this.endDate = '';
    },
    calculateSubmissionScore(submission) {
      const rule = this.rules.find(r => r.id === submission.ruleId);
      if (!rule) return 0;
      
      const config = submission.type === 'stock' ? rule.pointsStock : rule.pointsNew;
      const itemPoints = (config?.item || 0) * submission.count;
      const amountPoints = (config?.million || 0) * (submission.amount / 100);
      
      return Math.round((itemPoints + amountPoints) * 100) / 100;
    },
    getDayTotalSubmissions(dateGroup) {
      let total = 0;
      Object.values(dateGroup).forEach(userSubmissions => {
        total += userSubmissions.length;
      });
      return total;
    },
    async handleExportSubmissions() {
      if (!this.filteredSubmissions.length) {
        uni.showToast({ title: '暂无数据', icon: 'none' });
        return;
      }
      
      // 构建CSV内容
      const headers = ['日期', '客户经理', '支行', '业务分类','业务名称', '业务类型', '笔数', '金额(万)', '积分', '提报时间'];
      const rows = this.filteredSubmissions.map(sub => {
        const employee = this.users.find(u => u.id === sub.employeeId);
        const rule = this.rules.find(r => r.id === sub.ruleId);
        return [
          this.formatDate(sub.timestamp, 'date'),
          employee?.name || '未知用户',
          employee?.branch || '未知支行',
          this.getRuleCategory(sub.ruleId),
          rule?.name || '未知业务',
          sub.type === 'new' ? '新增' : '存量',
          sub.count,
          Number(sub.amount).toFixed(2),
          this.calculateSubmissionScore(sub),
          this.formatDate(sub.timestamp, 'time'),
        ];
      });
      
      // 构建完整CSV内容
      const bom = '\ufeff'; // UTF-8 BOM
      const csvContent = bom + [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      // 生成文件名
      const filename = `提报记录_${new Date().toISOString().slice(0, 10)}_${Date.now()}.csv`;
      
      // 使用通用导出函数
      this.saveAndShareExcel(csvContent, filename, 'csv');
    },
    // 编辑功能相关方法
    handleEditSubmission(submission) {
      this.editingSubmission = submission;
      this.editForm = {
        count: submission.count,
        amount: submission.amount,
        type: submission.type
      };
      this.showEditModal = true;
    },
    cancelEdit() {
      this.showEditModal = false;
      this.editingSubmission = null;
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
        this.allSubmissions = StoreService.getSubmissions();
        this.users = StoreService.getUsers();
        this.rules = StoreService.getRules();
        this.showEditModal = false;
      } catch (error) {
        uni.showToast({ title: error.message || '修改失败', icon: 'none' });
      }
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
            this.allSubmissions = StoreService.getSubmissions();
            this.users = StoreService.getUsers();
            this.rules = StoreService.getRules();
            this.showEditModal = false;
          } catch (error) {
            uni.showToast({ title: error.message || '删除失败', icon: 'none' });
          }
        }
      });
    },
    getRule(ruleId) {
      return this.rules.find(rule => rule.id === ruleId);
    },
    calculatePreviewScore() {
      if (!this.editingSubmission) return '0.00';
      const rule = this.getRule(this.editingSubmission.ruleId);
      const cfg = this.editForm.type === 'stock' && rule?.pointsStock ? rule.pointsStock : rule?.pointsNew;
      const itemPoints = (Number(this.editForm.count) || 0) * (cfg?.item || 0);
      const amountPoints = ((Number(this.editForm.amount) || 0) / 100) * (cfg?.million || 0);
      return (itemPoints + amountPoints).toFixed(2);
    },
    saveAndShareExcel(html, filename, fileType = 'xlsx') {
      const isWeChat = typeof wx !== 'undefined' && !!wx.getFileSystemManager;
      if (isWeChat) {
        try {
          const fs = wx.getFileSystemManager();
          const filePath = `${wx.env.USER_DATA_PATH}/${filename}`;
          
          // 清理旧文件
          this.cleanupWeChatExports(fs);
          
          if (fileType === 'csv') {
            // CSV格式直接写入，使用同步方式确保可靠性
            fs.writeFileSync(filePath, html, 'utf-8');
          } else {
            // XML格式处理
            const buffer = this.stringToUint8Array(html);
            const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
            fs.writeFileSync(filePath, arrayBuffer);
          }
          
          // 微信小程序分享文件
          if (wx.shareFileMessage) {
            // 使用微信原生分享文件API
            wx.shareFileMessage({
              filePath: filePath,
              fileName: filename,
              success: () => {
                uni.showToast({ title: '分享成功', icon: 'success' });
              },
              fail: (error) => {
                console.error('分享失败', error);
                // 分享失败后尝试打开文件
                this.tryOpenDocument(filePath, fileType);
              }
            });
          } else {
            // 兼容旧版本微信，直接打开文件
            this.tryOpenDocument(filePath, fileType);
          }
        } catch (error) {
          console.error('导出失败', error);
          uni.showToast({ title: '导出失败，请重试', icon: 'none' });
        }
        return;
      }
      if (typeof window !== 'undefined') {
        // Web环境处理
        try {
          let mimeType = 'application/vnd.ms-excel;charset=utf-8;';
          if (fileType === 'csv') {
            mimeType = 'text/csv;charset=utf-8;';
          }
          
          // 使用Blob URL下载
          const blob = new Blob([html], { type: mimeType });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
          }));
          document.body.removeChild(link);
          setTimeout(() => {
            URL.revokeObjectURL(url);
          }, 100);
          uni.showToast({ title: '已导出', icon: 'success' });
        } catch (error) {
          console.error('Web下载失败', error);
          this.downloadFileBackup(html, filename);
        }
      } else {
        uni.showToast({ title: '当前环境不支持导出', icon: 'none' });
      }
    },
    cleanupWeChatExports(fs) {
      try {
        const files = fs.readdirSync(wx.env.USER_DATA_PATH) || [];
        files
          .filter(name => /\.(xls[x]?|csv)$/.test(name))
          .forEach(name => {
            try {
              fs.unlinkSync(`${wx.env.USER_DATA_PATH}/${name}`);
            } catch (error) {
              console.warn('删除旧导出失败', error);
            }
          });
      } catch (error) {
        console.warn('读取导出目录失败', error);
      }
    },
    tryOpenDocument(filePath, fileType) {
      // 尝试打开文档
      uni.openDocument({
        filePath,
        fileType: fileType,
        showMenu: true,
        success: () => {
          uni.showToast({ title: '文件已打开，可手动分享', icon: 'success' });
        },
        fail: (error) => {
          console.error('打开文件失败', error);
          // 显示简单的成功提示，避免用户困惑
          uni.showModal({
            title: '导出成功',
            content: '文件已生成，可通过"微信-我-设置-通用-文件管理"查看',
            showCancel: false,
            confirmText: '知道了'
          });
        }
      });
    },
    downloadFileBackup(html, filename) {
      // 使用uni.downloadFile的备用方案
      try {
        // 将html转换为base64
        const base64 = uni.arrayBufferToBase64(this.stringToUint8Array(html).buffer);
        const dataUrl = `data:application/vnd.ms-excel;base64,${base64}`;
        
        // 使用a标签下载
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        uni.showToast({ title: '已导出', icon: 'success' });
      } catch (error) {
        console.error('备用下载方案失败', error);
        uni.showToast({ title: '导出失败，请重试', icon: 'none' });
      }
    },
    stringToUint8Array(str) {
      if (typeof TextEncoder !== 'undefined') {
        return new TextEncoder().encode(str);
      }
      const encoded = unescape(encodeURIComponent(str));
      const result = new Uint8Array(encoded.length);
      for (let i = 0; i < encoded.length; i++) {
        result[i] = encoded.charCodeAt(i);
      }
      return result;
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
  padding: 0 20rpx;
}

.filter-section {
  max-width: 900rpx;
  margin: 0 auto;
  padding: 20rpx 32rpx;
  background: #fff;
  border-bottom: 2rpx solid #f1f5f9;
  border-radius: 0 0 16rpx 16rpx;
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
  flex: 1.5 0 280rpx;   /* 加大基础宽度，优先横向伸展 */
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

.date-separator {
  font-size: 26rpx;
  color: #94a3b8;
  margin: 0 8rpx;
}

.stats-section {
  max-width: 900rpx;
  margin: 0 auto;
  padding: 12rpx 0;
  font-size: 26rpx;
  color: #64748b;
  background: #f8fafc;
  border-bottom: 1rpx solid #e2e8f0;
}

.content {
  max-width: 900rpx;
  margin: 0 auto;
  padding: 20rpx 0;
  height: calc(100vh - 280rpx);
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

/* 加载状态 */
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

/* 加载更多 */
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

/* 无更多数据 */
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

/* 提报记录样式 */
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

.submission-group-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #0f172a;
  flex: 1;
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

.stats-section {
  max-width: 900rpx;
  margin: 0 auto;
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

/* 提报记录样式 - 匹配 history.vue */
.submission-item {
  position: relative;
  background: #fff;
  border-radius: 10rpx;
  padding: 16rpx;
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

.submission-item__bar.personal {
  background: #3b82f6;
}

.submission-item__bar.micro {
  background: #14b8a6;
}

.submission-item__body {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex: 1;
  gap: 20rpx;
}

.submission-item__info {
  flex: 1;
  min-width: 0;
  margin-right: 20rpx;
}

.submission-item__info-content {
  flex: 1;
  min-width: 0;
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

/* 业务分类颜色 */
.category-personal {
  background: #dbeafe;
  color: #1e40af;
}

.category-micro {
  background: #dcfce7;
  color: #166534;
}

.submission-item__title {
  font-size: 28rpx;
  font-weight: 600;
  color: #0f172a;
}

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

/* 新增和存量都用灰色 */
.type-gray {
  background: #f1f5f9;
  color: #64748b;
}

.submission-time {
  font-size: 24rpx;
  color: #94a3b8;
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

.submission-item__score {
  font-size: 28rpx;
  font-weight: 700;
  color: #0f766e;
}

/* 按钮样式 */
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

/* 状态提示 */
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
  cursor: pointer;
}

/* 高亮样式 */
.highlight {
  color: #0f766e;
  font-weight: 700;
}
</style>