<template>
  <view class="my-submissions-container">
    <!-- 顶部标题栏 -->
    <view class="header" v-if="!isGuest">
      <view class="header-left">
        <view class="header-title">
          <uni-icons type="list" size="20" color="#3B82F6"></uni-icons>
          <text>我的提交记录</text>
        </view>
        <text class="header-subtitle" v-if="currentUser && !isGuest">{{ currentUser.name }} · {{ currentUser.branch || '未设置网点' }}</text>
      </view>
    </view>

    <!-- 游客查询输入框 -->
    <view class="guest-search-box" v-if="isGuest">
      <view class="search-title">
        <uni-icons type="search" size="34" color="#3B82F6"></uni-icons>
        <text>查询提交记录</text>
      </view>
      <view class="search-desc">请输入您填写问卷时使用的身份证后四位</view>
      <view class="search-input-row">
        <input class="search-input" v-model="idCardLast4" placeholder="身份证后四位" maxlength="4" type="number" />
        <button class="search-btn" @click="searchByIdCard">查询</button>
      </view>
    </view>

    <!-- 加载状态 -->
    <view class="loading-container" v-if="loading">
      <uni-load-more status="loading"></uni-load-more>
    </view>

    <!-- 列表内容 -->
    <view class="content" v-else>
      <!-- 空状态 -->
      <view class="empty-state" v-if="submissions.length === 0">
        <uni-icons type="folder-add" size="60" color="#DCDFE6"></uni-icons>
        <text class="empty-text">暂无提交记录</text>
        <text class="empty-hint">填写问卷后记录将显示在这里</text>
      </view>

      <!-- 提交记录列表 -->
      <view class="submissions-list" v-else>
        <view
          class="submission-card"
          v-for="(item, index) in submissions"
          :key="item._id"
          @click="viewDetail(item, index)"
        >
          <!-- 状态标签（绝对定位） -->
          <view class="card-status">
            <view class="status-badge" :class="getStatusClass(item.adminReply)">
              {{ item.adminReply ? '已回复' : '待回复' }}
            </view>
          </view>

          <!-- 问卷标题 -->
          <view class="card-title">{{ item.questionnaireTitle || '问卷' }}</view>

          <!-- 提交时间 -->
          <view class="card-meta">
            <uni-icons type="calendar" size="13" color="#909399"></uni-icons>
            <text>{{ formatDate(item.submittedAt) }}</text>
          </view>

          <!-- 管理员回复预览 -->
          <view class="admin-reply-preview" v-if="item.adminReply">
            <view class="reply-label">
              <uni-icons type="chatbubble-filled" size="14" color="#E6A23C"></uni-icons>
              <text>管理员回复：</text>
            </view>
            <text class="reply-text">{{ item.adminReply }}</text>
          </view>

          <!-- 查看详情 -->
          <view class="card-action">
            <text>查看详情</text>
            <uni-icons type="right" size="14" color="#909399"></uni-icons>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getUserResponses, getSubmissionsByIdCard, getQuestionnaireDetail } from '../../services/questionnaire-service.js';

export default {
  name: 'MySubmissions',
  data() {
    return {
      loading: false,
      submissions: [],
      currentUser: null,
      idCardLast4: ''
    };
  },

  computed: {
    isGuest() {
      return !this.currentUser || this.currentUser.role === 'guest';
    }
  },

  onShow() {
    // 读取当前用户
    try {
      const raw = uni.getStorageSync('perf_current_user') || uni.getStorageSync('currentUser');
      this.currentUser = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
    } catch (e) {
      this.currentUser = null;
    }

    // 登录用户自动加载
    if (!this.isGuest) {
      this.loadSubmissions();
    }
  },

  methods: {
    async searchByIdCard() {
      if (!this.idCardLast4 || this.idCardLast4.length !== 4) {
        uni.showToast({ title: '请输入4位数字', icon: 'none' });
        return;
      }

      this.loading = true;
      try {
        const data = await getSubmissionsByIdCard(this.idCardLast4);

        const questionnaireIds = [...new Set(data.map(r => r.questionnaireId))];
        let questionnaireMap = {};

        for (const qid of questionnaireIds) {
          try {
            const q = await getQuestionnaireDetail(qid);
            questionnaireMap[qid] = q.title;
          } catch (e) {
            questionnaireMap[qid] = '问卷已删除';
          }
        }

        this.submissions = data.map(r => ({ ...r, questionnaireTitle: questionnaireMap[r.questionnaireId] || '未知问卷' }));
      } catch (e) {
        uni.showToast({ title: e.message || '查询失败', icon: 'none' });
      } finally {
        this.loading = false;
      }
    },

    async loadSubmissions() {
      this.loading = true;
      try {
        const data = await getUserResponses();

        // 批量获取问卷标题
        const questionnaireIds = [...new Set(data.map(r => r.questionnaireId))];
        let questionnaireMap = {};
        if (questionnaireIds.length > 0) {
          const res = await uniCloud.callFunction({
            name: 'appService',
            data: { action: 'getQuestionnaires', payload: {} }
          });
          const list = res.result?.data || [];
          list.forEach(q => { questionnaireMap[q._id] = q.title; });
        }

        this.submissions = data.map(r => ({
          ...r,
          questionnaireTitle: questionnaireMap[r.questionnaireId] || '问卷'
        }));
      } catch (error) {
        uni.showToast({ title: error.message || '加载失败', icon: 'none' });
      } finally {
        this.loading = false;
      }
    },

    viewDetail(item, index) {
      const responseIds = this.submissions.map(s => s._id);
      uni.setStorageSync('response_list_ids', JSON.stringify(responseIds));
      uni.setStorageSync('response_current_index', index);
      uni.navigateTo({
        url: `/pages/questionnaire/response-detail?responseId=${item._id}`
      });
    },

    formatDate(timestamp) {
      const date = new Date(timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hour = String(date.getHours()).padStart(2, '0');
      const minute = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${hour}:${minute}`;
    },

    getStatusClass(adminReply) {
      return adminReply ? 'status-replied' : 'status-pending';
    }
  }
};
</script>

<style lang="scss" scoped>
.my-submissions-container {
  min-height: 100vh;
  background-color: #F5F7FA;
  padding-bottom: 40rpx;
}

.guest-search-box {
  margin: 40rpx 30rpx;
  padding: 48rpx 40rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
}

.search-title {
  display: flex;
  align-items: center;
  gap: 10rpx;
  font-size: 34rpx;
  font-weight: bold;
  color: #303133;
  margin-bottom: 12rpx;
}

.search-desc {
  font-size: 26rpx;
  color: #909399;
  margin-bottom: 36rpx;
  line-height: 1.5;
}

.search-input-row {
  display: flex;
  gap: 16rpx;
  width: 100%;
}

.search-input {
  flex: 1;
  height: 72rpx;
  padding: 0 24rpx;
  border: 2rpx solid #DCDFE6;
  border-radius: 10rpx;
  font-size: 30rpx;
  background: #F5F7FA;
}

.search-btn {
  width: 140rpx;
  height: 72rpx;
  background: linear-gradient(135deg, #3B82F6, #2563EB);
  color: #fff;
  border: none;
  border-radius: 10rpx;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header {
  padding: 30rpx;
  background-color: #fff;
  border-bottom: 1rpx solid #EBEEF5;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10rpx;
  font-size: 36rpx;
  font-weight: bold;
  color: #303133;
  margin-bottom: 8rpx;
}

.header-subtitle {
  font-size: 24rpx;
  color: #909399;
  padding-left: 4rpx;
}

.loading-container {
  padding: 60rpx 0;
}

.content {
  padding: 24rpx 30rpx 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
}

.empty-text {
  margin-top: 20rpx;
  font-size: 28rpx;
  color: #909399;
}

.empty-hint {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #C0C4CC;
}

.submission-card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
  position: relative;
}

.card-status {
  position: absolute;
  top: 30rpx;
  right: 30rpx;
}

.status-badge {
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  font-weight: bold;
}

.status-replied {
  background-color: #f0fdf4;
  color: #16a34a;
  border: 1rpx solid #bbf7d0;
}

.status-pending {
  background-color: #eff6ff;
  color: #3B82F6;
  border: 1rpx solid #bfdbfe;
}

.card-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #303133;
  margin-bottom: 14rpx;
  padding-right: 140rpx;
  line-height: 1.4;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 24rpx;
  color: #909399;
  margin-bottom: 16rpx;
}

.admin-reply-preview {
  margin-top: 16rpx;
  padding: 20rpx;
  background-color: #FFF7E6;
  border-left: 4rpx solid #E6A23C;
  border-radius: 8rpx;
}

.reply-label {
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-bottom: 8rpx;
  font-size: 24rpx;
  color: #E6A23C;
  font-weight: bold;
}

.reply-text {
  font-size: 26rpx;
  color: #606266;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-action {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6rpx;
  padding-top: 20rpx;
  margin-top: 16rpx;
  border-top: 1rpx solid #EBEEF5;
  font-size: 26rpx;
  color: #909399;
}
</style>
