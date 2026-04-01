<template>
  <view class="questionnaire-responses-page">
    <!-- 顶部信息 -->
    <view class="page-header">
      <view class="header-left">
        <text class="page-title">{{ questionnaire ? questionnaire.title : '回复管理' }}</text>
        <text class="page-subtitle" v-if="questionnaire">共 {{ responses.length }} 条回复</text>
      </view>
      <view class="header-actions">
        <button class="btn-search" @click="showSearchPopup" v-if="canExport">
          <uni-icons type="search" size="16" color="#3B82F6"></uni-icons>
          <text>搜索</text>
        </button>
        <button class="btn-export" @click="exportData" v-if="canExport">
          <uni-icons type="download" size="16" color="#fff"></uni-icons>
          <text>导出</text>
        </button>
      </view>
    </view>

    <!-- 统计概览 -->
    <view class="stats-container" v-if="responses.length > 0">
      <view class="stat-card">
        <text class="stat-value">{{ responses.length }}</text>
        <text class="stat-label">提交总数</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ repliedCount }}</text>
        <text class="stat-label">已回复</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ questionnaire ? questionnaire.questions.length : 0 }}</text>
        <text class="stat-label">问题数</text>
      </view>
    </view>

    <!-- 加载状态 -->
    <view class="loading-container" v-if="loading">
      <uni-load-more status="loading"></uni-load-more>
    </view>

    <!-- 回复列表 -->
    <view class="responses-list" v-else>
      <!-- 空状态 -->
      <view class="empty-state" v-if="responses.length === 0">
        <uni-icons type="inbox" size="60" color="#DCDFE6"></uni-icons>
        <text class="empty-text">暂无回复</text>
      </view>

      <!-- 回复卡片 -->
      <view
        class="response-card"
        v-for="(response, index) in filteredResponses"
        :key="response._id"
      >
        <view class="response-header">
          <view class="user-info">
            <text class="user-name">{{ getPersonalInfo(response, 'name') || '未填写姓名' }}</text>
          </view>
          <view class="response-status" :class="response.status">
            {{ response.status === 'replied' ? '已回复' : '待回复' }}
          </view>
        </view>

        <view class="response-info">
          <view class="info-item">
            <text class="info-label">网点：</text>
            <text class="info-value">{{ getPersonalInfo(response, 'branch') || '未填写' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">提交时间：</text>
            <text class="info-value">{{ formatTime(response.submittedAt) }}</text>
          </view>
        </view>

        <!-- 管理员回复预览 -->
        <view class="admin-reply-preview" v-if="response.adminReply">
          <uni-icons type="chatbubble" size="14" color="#E6A23C"></uni-icons>
          <text class="reply-text">{{ response.adminReply }}</text>
        </view>

        <!-- 操作按钮 -->
        <view class="response-actions" @click.stop>
          <button class="action-btn detail" @click="viewResponseDetail(response, index)">
            <uni-icons type="eye" size="14" color="#3B82F6"></uni-icons>
            <text>查看详情</text>
          </button>
          <button
            class="action-btn"
            :class="{ primary: !response.adminReply }"
            @click="replyToResponse(response)"
          >
            <uni-icons type="compose" size="14" :color="response.adminReply ? '#909399' : '#fff'"></uni-icons>
            <text>{{ response.adminReply ? '再次回复' : '回复' }}</text>
          </button>
          <button class="action-btn delete-btn" @click="deleteResponse(response)">
            <uni-icons type="trash" size="14" color="#F56C6C"></uni-icons>
          </button>
        </view>
      </view>
    </view>

    <!-- 回复对话框 -->
    <uni-popup ref="replyPopup" type="dialog">
      <view class="reply-popup">
        <view class="popup-title">
          <text>回复用户</text>
          <text class="user-info-text">{{ currentResponse ? getPersonalInfo(currentResponse, 'name') : '' }}</text>
        </view>
        <textarea
          class="reply-textarea"
          placeholder="请输入回复内容..."
          v-model="replyText"
          maxlength="500"
          auto-height
        ></textarea>
        <view class="popup-actions">
          <button class="btn-cancel" @click="cancelReply">取消</button>
          <button class="btn-confirm" @click="confirmReply" :disabled="!replyText.trim()">发送</button>
        </view>
      </view>
    </uni-popup>

    <!-- 搜索对话框 -->
    <uni-popup ref="searchPopup" type="dialog">
      <view class="search-popup">
        <view class="popup-title">
          <text>搜索回复</text>
        </view>
        <input
          class="search-input"
          v-model="searchKeyword"
          placeholder="输入姓名或身份证号搜索"
          maxlength="18"
        />
        <view class="popup-actions">
          <button class="btn-cancel" @click="cancelSearch">取消</button>
          <button class="btn-confirm" @click="confirmSearch">搜索</button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
import { getQuestionnaireDetail, getQuestionnaireResponses, replyToResponse as replyToResponseApi, deleteResponse as deleteResponseApi, exportQuestionnaireData, getQuestionnaireStats } from '../../services/questionnaire-service.js';
import { hasAnyRole, ROLES } from '../../services/permission-service.js';

export default {
  name: 'QuestionnaireResponses',
  data() {
    return {
      loading: true,
      questionnaireId: '',
      questionnaire: null,
      responses: [],
      stats: null,
      currentResponse: null,
      replyText: '',
      canExport: false,
      searchKeyword: ''
    };
  },

  computed: {
    repliedCount() {
      return this.responses.filter(r => r.status === 'replied' || r.adminReply).length;
    },

    filteredResponses() {
      if (!this.searchKeyword.trim()) {
        return this.responses;
      }

      const keyword = this.searchKeyword.trim().toLowerCase();
      return this.responses.filter(response => {
        const name = this.getPersonalInfo(response, 'name') || '';
        const idCard = this.getPersonalInfo(response, 'idCard') || '';
        return name.toLowerCase().includes(keyword) || idCard.toLowerCase().includes(keyword);
      });
    }
  },

  onLoad(options) {
    this.questionnaireId = options.questionnaireId;
    this.checkPermission();
    this.loadData();
  },

  methods: {
    checkPermission() {
      // store.js 用 JSON.stringify 存储，需要 JSON.parse 读取
      const parseStorage = (key) => {
        try {
          const raw = uni.getStorageSync(key);
          if (!raw) return null;
          return typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch (e) {
          return null;
        }
      };

      const user = parseStorage('perf_current_user') || parseStorage('currentUser');
      if (!user) {
        uni.redirectTo({ url: '/pages/login/login' });
        return;
      }

      // 检查导出权限
      this.canExport = hasAnyRole(user, [ROLES.SUPER_ADMIN, ROLES.QUESTIONNAIRE_ADMIN]);
    },

    async loadData() {
      this.loading = true;

      try {
        // 并行加载问卷、回复和统计
        const [questionnaireData, responsesData, statsData] = await Promise.all([
          getQuestionnaireDetail(this.questionnaireId),
          getQuestionnaireResponses(this.questionnaireId),
          getQuestionnaireStats(this.questionnaireId)
        ]);

        this.questionnaire = questionnaireData;
        this.responses = responsesData;
        this.stats = statsData;
      } catch (error) {
        uni.showToast({
          title: error.message || '加载失败',
          icon: 'none'
        });
      } finally {
        this.loading = false;
      }
    },

    getPreviewAnswers(response) {
      // 显示前3个答案作为预览
      return response.answers.slice(0, 3);
    },

    getQuestionTitle(questionId) {
      if (!this.questionnaire) return '';
      const q = this.questionnaire.questions.find(q => q.id === questionId);
      return q ? q.title : '';
    },

    getAnswerValue(answers, questionId) {
      const answer = answers.find(a => a.questionId === questionId);
      return answer?.value || '';
    },

    /**
     * 根据 fieldType 获取个人信息
     * @param {Object} response - 回复对象
     * @param {String} fieldType - 字段类型 ('name', 'idCard', 'branch')
     */
    getPersonalInfo(response, fieldType) {
      if (!this.questionnaire || !response) return '';

      // 优先从问卷 question 的 fieldType 匹配
      let question = this.questionnaire.questions.find(q => q.fieldType === fieldType);

      // 兼容旧问卷：从 answer 上的 fieldType 匹配
      if (!question) {
        const answer = response.answers.find(a => a.fieldType === fieldType);
        if (answer) return answer.value || '';
      }

      // 兼容旧问卷：按 questionId 推断（q1=姓名, q2=身份证, q3=网点）
      if (!question) {
        const fallbackMap = { name: 'q1', idCard: 'q2', branch: 'q3' };
        const fallbackId = fallbackMap[fieldType];
        if (fallbackId) {
          question = this.questionnaire.questions.find(q => q.id === fallbackId);
        }
      }

      if (!question) return '';
      const answer = response.answers.find(a => a.questionId === question.id);
      return answer?.value || '';
    },

    maskIdCard(idCard) {
      if (!idCard || idCard.length < 10) return idCard;
      return idCard.substring(0, 6) + '****' + idCard.substring(idCard.length - 4);
    },

    formatAnswerValue(value) {
      if (Array.isArray(value)) {
        return value.join('、');
      }
      return value || '未填写';
    },

    formatTime(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');
    },

    viewResponseDetail(response, index) {
      // 将响应列表的ID数组存储到全局数据中，供详情页使用
      const responseIds = this.filteredResponses.map(r => r._id);
      uni.setStorageSync('response_list_ids', JSON.stringify(responseIds));
      uni.setStorageSync('response_current_index', index);

      uni.navigateTo({
        url: `/pages/questionnaire/response-detail?responseId=${response._id}&mode=admin`
      });
    },

    replyToResponse(response) {
      this.currentResponse = response;
      this.replyText = '';
      this.$refs.replyPopup.open();
    },

    cancelReply() {
      this.$refs.replyPopup.close();
      this.currentResponse = null;
      this.replyText = '';
    },

    async confirmReply() {
      if (!this.replyText.trim()) {
        uni.showToast({
          title: '请输入回复内容',
          icon: 'none'
        });
        return;
      }

      uni.showLoading({ title: '发送中...' });

      try {
        await replyToResponseApi(this.currentResponse._id, this.replyText);

        uni.hideLoading();
        uni.showToast({
          title: '回复成功',
          icon: 'success'
        });

        this.$refs.replyPopup.close();
        this.currentResponse = null;
        this.replyText = '';

        // 重新加载数据
        this.loadData();
      } catch (error) {
        uni.hideLoading();
        uni.showToast({
          title: error.message || '回复失败',
          icon: 'none'
        });
      }
    },

    deleteResponse(response) {
      uni.showModal({
        title: '确认删除',
        content: `确定要删除 ${this.getPersonalInfo(response, 'name') || '该用户'} 的提交记录吗？`,
        confirmColor: '#F56C6C',
        success: async (res) => {
          if (res.confirm) {
            uni.showLoading({ title: '删除中...' });
            try {
              await deleteResponseApi(response._id);
              uni.hideLoading();
              uni.showToast({ title: '删除成功', icon: 'success' });
              this.loadData();
            } catch (e) {
              uni.hideLoading();
              uni.showToast({ title: e.message || '删除失败', icon: 'none' });
            }
          }
        }
      });
    },

    async exportData() {
      if (!this.canExport) {
        uni.showToast({ title: '您没有导出权限', icon: 'none' });
        return;
      }

      uni.showLoading({ title: '生成中...' });

      try {
        const result = await exportQuestionnaireData(this.questionnaireId);
        uni.hideLoading();

        if (!result || !result.data || result.data.length === 0) {
          uni.showToast({ title: '暂无提交数据', icon: 'none' });
          return;
        }

        // 生成 CSV（UTF-8 BOM）
        const headers = Object.keys(result.data[0]);
        const rows = [
          headers.join(','),
          ...result.data.map(row =>
            headers.map(h => {
              const val = String(row[h] == null ? '' : row[h]).replace(/"/g, '""');
              return `"${val}"`;
            }).join(',')
          )
        ];
        const csvContent = '\uFEFF' + rows.join('\r\n');

        const title = (this.questionnaire ? this.questionnaire.title : '问卷').replace(/[/\\:*?"<>|]/g, '_');
        const date = new Date().toLocaleDateString('zh-CN').replace(/\//g, '');
        const fileName = `${title}_${date}.csv`;

        try {
          const fs = uni.getFileSystemManager();
          const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
          fs.writeFileSync(filePath, csvContent, 'utf8');

          wx.shareFileMessage({
            filePath,
            fileName,
            success: () => {
              console.log('分享成功');
            },
            fail(e) {
              console.error('分享失败', e);
              uni.showToast({ title: '分享失败：' + (e.errMsg || ''), icon: 'none' });
            }
          });
        } catch (e) {
          console.error('导出失败', e);
          uni.showToast({ title: '导出失败：' + e.message, icon: 'none' });
        }
      } catch (error) {
        uni.hideLoading();
        uni.showToast({ title: error.message || '导出失败', icon: 'none' });
      }
    },

    showSearchPopup() {
      this.$refs.searchPopup.open();
    },

    cancelSearch() {
      this.$refs.searchPopup.close();
    },

    confirmSearch() {
      this.$refs.searchPopup.close();
      // filteredResponses computed property will handle the filtering
    }
  }
};
</script>

<style lang="scss" scoped>
.questionnaire-responses-page {
  min-height: 100vh;
  background-color: #F5F7FA;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 30rpx;
  background-color: #fff;
  border-bottom: 1rpx solid #EBEEF5;

  .header-left {
    flex: 1;

    .page-title {
      display: block;
      font-size: 36rpx;
      font-weight: bold;
      color: #303133;
      margin-bottom: 8rpx;
    }

    .page-subtitle {
      font-size: 26rpx;
      color: #909399;
    }
  }

  .header-actions {
    display: flex;
    gap: 12rpx;
  }

  .btn-search {
    display: flex;
    align-items: center;
    gap: 6rpx;
    padding: 12rpx 24rpx;
    background-color: #fff;
    border: 2rpx solid #3B82F6;
    border-radius: 12rpx;
    font-size: 26rpx;
    color: #3B82F6;
  }

  .btn-export {
    display: flex;
    align-items: center;
    gap: 6rpx;
    padding: 12rpx 24rpx;
    background: linear-gradient(135deg, #3B82F6, #2563EB);
    border-radius: 12rpx;
    font-size: 26rpx;
    color: #fff;
    border: none;
  }
}

.stats-container {
  display: flex;
  gap: 20rpx;
  padding: 0 30rpx 30rpx;

  .stat-card {
    flex: 1;
    padding: 24rpx;
    background: linear-gradient(135deg, #fff, #F5F7FA);
    border-radius: 16rpx;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
    text-align: center;

    .stat-value {
      display: block;
      font-size: 48rpx;
      font-weight: bold;
      color: #3B82F6;
      margin-bottom: 8rpx;
    }

    .stat-label {
      font-size: 24rpx;
      color: #909399;
    }
  }
}

.loading-container {
  padding: 120rpx 0;
}

.responses-list {
  padding: 0 30rpx 30rpx;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;

  .empty-text {
    margin-top: 20rpx;
    font-size: 28rpx;
    color: #909399;
  }
}

.response-card {
  padding: 30rpx;
  background-color: #fff;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
  margin-bottom: 20rpx;

  .response-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16rpx;

    .user-info {
      display: flex;
      flex-direction: column;
      gap: 6rpx;

      .user-name {
        font-size: 30rpx;
        font-weight: bold;
        color: #303133;
      }
    }

    .response-status {
      padding: 6rpx 16rpx;
      border-radius: 8rpx;
      font-size: 22rpx;
      font-weight: bold;

      &.submitted {
        background-color: #E6A23C;
        color: #fff;
      }

      &.replied {
        background-color: #67C23A;
        color: #fff;
      }
    }
  }

  .response-info {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
    margin-bottom: 20rpx;

    .info-item {
      display: flex;
      align-items: center;
      font-size: 24rpx;

      .info-label {
        color: #909399;
        min-width: 100rpx;
      }

      .info-value {
        color: #606266;
        flex: 1;
      }
    }
  }

  .admin-reply-preview {
    display: flex;
    align-items: flex-start;
    gap: 8rpx;
    padding: 16rpx;
    background-color: #FFF7E6;
    border-radius: 12rpx;
    border-left: 4rpx solid #E6A23C;
    margin-bottom: 16rpx;

    .reply-text {
      flex: 1;
      font-size: 26rpx;
      color: #303133;
      line-height: 1.4;
    }
  }

  .response-actions {
    display: flex;
    gap: 12rpx;
    padding-top: 16rpx;
    border-top: 1rpx solid #EBEEF5;

    .action-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6rpx;
      padding: 12rpx 24rpx;
      border-radius: 8rpx;
      font-size: 26rpx;
      border: none;

      &.detail {
        background-color: #EBF5FF;
        color: #3B82F6;
        border: 1rpx solid #3B82F6;
      }

      &.primary {
        background-color: #3B82F6;
        color: #fff;
      }

      &.delete-btn {
        flex: 0 0 60rpx;
        padding: 12rpx;
        background-color: #FEF0F0;
        border: 1rpx solid #F56C6C;
      }

      &:not(.primary):not(.detail):not(.delete-btn) {
        background-color: #F5F7FA;
        color: #606266;
      }
    }
  }
}

.reply-popup {
  width: 600rpx;
  padding: 40rpx;
  background-color: #fff;
  border-radius: 16rpx;

  .popup-title {
    font-size: 32rpx;
    font-weight: bold;
    color: #303133;
    margin-bottom: 24rpx;
    text-align: center;

    .user-info-text {
      display: block;
      font-size: 26rpx;
      color: #909399;
      font-weight: normal;
      margin-top: 8rpx;
    }
  }

  .reply-textarea {
    width: 100%;
    min-height: 200rpx;
    padding: 20rpx;
    background-color: #F5F7FA;
    border-radius: 8rpx;
    font-size: 28rpx;
    color: #606266;
    line-height: 1.6;
    box-sizing: border-box;
  }

  .popup-actions {
    display: flex;
    gap: 20rpx;
    margin-top: 30rpx;

    button {
      flex: 1;
      height: 80rpx;
      border-radius: 12rpx;
      font-size: 28rpx;
      border: none;

      &.btn-cancel {
        background-color: #F5F7FA;
        color: #606266;
      }

      &.btn-confirm {
        background: linear-gradient(135deg, #3B82F6, #2563EB);
        color: #fff;

        &[disabled] {
          opacity: 0.5;
        }
      }
    }
  }
}

.search-popup {
  width: 600rpx;
  padding: 30rpx;

  .popup-title {
    font-size: 32rpx;
    font-weight: bold;
    color: #303133;
    margin-bottom: 24rpx;
    text-align: center;
  }

  .search-input {
    width: 100%;
    height: 80rpx;
    padding: 0 20rpx;
    background-color: #F5F7FA;
    border-radius: 12rpx;
    font-size: 28rpx;
    margin-bottom: 30rpx;
  }

  .popup-actions {
    display: flex;
    gap: 20rpx;

    button {
      flex: 1;
      height: 80rpx;
      border-radius: 12rpx;
      font-size: 28rpx;
      font-weight: bold;
      border: none;

      &.btn-cancel {
        background-color: #F5F7FA;
        color: #606266;
      }

      &.btn-confirm {
        background: linear-gradient(135deg, #3B82F6, #2563EB);
        color: #fff;
      }
    }
  }
}
</style>
