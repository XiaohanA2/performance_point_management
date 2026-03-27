<template>
  <view class="response-detail-page">
    <!-- 加载状态 -->
    <view class="loading-container" v-if="loading">
      <LoadingSpinner />
    </view>

    <template v-else-if="response && questionnaire">
      <!-- 1. 问卷名 -->
      <view class="questionnaire-title">
        <text class="title-text">{{ questionnaire.title }}</text>
        <view class="status-badge" :class="response.status">
          {{ response.status === 'replied' ? '已回复' : '待回复' }}
        </view>
      </view>

      <!-- 2. 信息卡 -->
      <view class="user-card">
        <view class="info-row">
          <uni-icons type="person" size="14" color="#909399"></uni-icons>
          <text class="info-label">姓名</text>
          <text class="info-value">{{ getPersonalInfo('name') || '未填写' }}</text>
        </view>
        <view class="info-row">
          <uni-icons type="location" size="14" color="#909399"></uni-icons>
          <text class="info-label">单位</text>
          <text class="info-value">{{ getPersonalInfo('branch') || '未填写' }}</text>
        </view>
        <view class="info-row">
          <uni-icons type="calendar" size="14" color="#909399"></uni-icons>
          <text class="info-label">提交时间</text>
          <text class="info-value">{{ formatTime(response.submittedAt) }}</text>
        </view>
      </view>

      <!-- 3. 回复情况 -->
      <view class="reply-section">
        <view class="section-title">
          <uni-icons type="chatbubble-filled" size="15" color="#E6A23C"></uni-icons>
          <text>管理员回复</text>
        </view>
        <view class="reply-content" v-if="response.adminReply">
          <text class="reply-text">{{ response.adminReply }}</text>
          <text class="reply-time" v-if="response.repliedAt">{{ formatTime(response.repliedAt) }}</text>
        </view>
        <view class="no-reply" v-else>
          <text>暂无回复</text>
        </view>
      </view>

      <!-- 4. 问卷详情 -->
      <view class="section-title-bar">
        <uni-icons type="list" size="15" color="#3B82F6"></uni-icons>
        <text>问卷详情</text>
      </view>
      <view class="qa-list">
        <view
          class="qa-item"
          v-for="(question, index) in questionnaire.questions"
          :key="question.id"
        >
          <view class="question">
            <text class="question-number">{{ index + 1 }}.</text>
            <text class="question-text">{{ question.title }}</text>
          </view>
          <view class="answer">
            <text>{{ getAnswerValue(question.id) }}</text>
          </view>
        </view>
      </view>

      <!-- 底部操作栏 -->
      <view class="bottom-actions">
        <button class="action-btn nav" :disabled="!hasPrev" @click="goPrev">
          <uni-icons type="left" size="18" :color="hasPrev ? '#606266' : '#C0C4CC'"></uni-icons>
          <text>上一个</text>
        </button>
        <button class="action-btn primary" v-if="isAdmin" @click="showReplyDialog">
          <uni-icons type="compose" size="18" color="#fff"></uni-icons>
          <text>回复</text>
        </button>
        <button class="action-btn nav" :disabled="!hasNext" @click="goNext">
          <text>下一个</text>
          <uni-icons type="right" size="18" :color="hasNext ? '#606266' : '#C0C4CC'"></uni-icons>
        </button>
      </view>
    </template>

    <!-- 回复对话框 -->
    <uni-popup ref="replyPopup" type="dialog">
      <view class="reply-popup">
        <view class="popup-title">回复用户</view>
        <textarea
          class="reply-textarea"
          placeholder="请输入回复内容..."
          v-model="replyText"
          maxlength="500"
          auto-height
        ></textarea>
        <view class="char-count">{{ replyText.length }}/500</view>
        <view class="popup-actions">
          <button class="btn-cancel" @click="cancelReply">取消</button>
          <button class="btn-confirm" @click="confirmReply" :disabled="!replyText.trim()">
            发送
          </button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
import LoadingSpinner from '../../components/LoadingSpinner.vue';
import { getQuestionnaireDetail, getResponseDetail, replyToResponse } from '../../services/questionnaire-service.js';

export default {
  name: 'ResponseDetail',
  components: { LoadingSpinner },
  data() {
    return {
      loading: true,
      responseId: '',
      response: null,
      questionnaire: null,
      replyText: '',
      isAdmin: false,
      responseIds: [],
      currentIndex: 0
    };
  },

  computed: {
    hasPrev() {
      return this.currentIndex > 0;
    },
    hasNext() {
      return this.currentIndex < this.responseIds.length - 1;
    }
  },

  onLoad(options) {
    this.responseId = options.responseId;
    this.isAdmin = options.mode === 'admin';

    // 读取列表数据
    try {
      const ids = uni.getStorageSync('response_list_ids');
      const idx = uni.getStorageSync('response_current_index');
      if (ids) this.responseIds = JSON.parse(ids);
      if (idx !== '' && idx !== null) this.currentIndex = Number(idx);
    } catch (e) {}

    this.loadData();
  },

  methods: {
    async loadData() {
      this.loading = true;
      try {
        // 获取回答详情
        this.response = await getResponseDetail(this.responseId);

        // 获取问卷详情
        this.questionnaire = await getQuestionnaireDetail(this.response.questionnaireId);
      } catch (error) {
        uni.showToast({
          title: error.message || '加载失败',
          icon: 'none'
        });
      } finally {
        this.loading = false;
      }
    },

    getPersonalInfo(fieldType) {
      if (!this.questionnaire || !this.response) return '';

      // 优先从问卷 question 的 fieldType 匹配
      let question = this.questionnaire.questions.find(q => q.fieldType === fieldType);

      // 兼容旧问卷：从 answer 上的 fieldType 匹配
      if (!question) {
        const answer = this.response.answers.find(a => a.fieldType === fieldType);
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
      const answer = this.response.answers.find(a => a.questionId === question.id);
      return answer?.value || '';
    },

    getAnswerValue(questionId) {
      const answer = this.response.answers.find(a => a.questionId === questionId);
      if (!answer) return '未填写';

      if (Array.isArray(answer.value)) {
        return answer.value.join('、');
      }
      return answer.value || '未填写';
    },

    maskIdCard(idCard) {
      if (!idCard || idCard.length < 8) return idCard;
      return idCard.substring(0, 6) + '********' + idCard.substring(14);
    },

    formatTime(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');
    },

    showReplyDialog() {
      this.replyText = '';
      this.$refs.replyPopup.open();
    },

    cancelReply() {
      this.$refs.replyPopup.close();
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

      try {
        await replyToResponse(this.responseId, this.replyText.trim());

        uni.showToast({
          title: '回复成功',
          icon: 'success'
        });

        this.$refs.replyPopup.close();
        this.replyText = '';

        // 重新加载数据
        await this.loadData();
      } catch (error) {
        uni.showToast({
          title: error.message || '回复失败',
          icon: 'none'
        });
      }
    },

    goBack() {
      uni.navigateBack();
    },

    goPrev() {
      if (!this.hasPrev) return;
      this.currentIndex--;
      this.responseId = this.responseIds[this.currentIndex];
      this.loadData();
    },

    goNext() {
      if (!this.hasNext) return;
      this.currentIndex++;
      this.responseId = this.responseIds[this.currentIndex];
      this.loadData();
    }
  }
};
</script>

<style lang="scss" scoped>
.response-detail-page {
  min-height: 100vh;
  background-color: #F5F7FA;
  padding-bottom: 120rpx;
}

.loading-container {
  padding: 120rpx 0;
}

// 1. 问卷名
.questionnaire-title {
  margin: 20rpx 30rpx;
  padding: 24rpx;
  background: linear-gradient(135deg, #3B82F6, #2563EB);
  border-radius: 16rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4rpx 12rpx rgba(59, 130, 246, 0.3);

  .title-text {
    flex: 1;
    font-size: 32rpx;
    font-weight: bold;
    color: #fff;
    line-height: 1.5;
  }

  .status-badge {
    padding: 8rpx 16rpx;
    border-radius: 8rpx;
    font-size: 22rpx;
    font-weight: bold;
    flex-shrink: 0;
    margin-left: 16rpx;

    &.submitted {
      background-color: rgba(255, 255, 255, 0.3);
      color: #fff;
    }

    &.replied {
      background-color: #67C23A;
      color: #fff;
    }
  }
}

// 2. 信息卡
.user-card {
  margin: 0 30rpx 20rpx;
  padding: 24rpx;
  background-color: #fff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);

  .info-row {
    display: flex;
    align-items: center;
    padding: 16rpx 0;

    &:not(:last-child) {
      border-bottom: 1rpx solid #F5F7FA;
    }

    .info-label {
      margin-left: 8rpx;
      font-size: 26rpx;
      color: #909399;
      width: 120rpx;
    }

    .info-value {
      flex: 1;
      font-size: 26rpx;
      color: #303133;
      font-weight: 500;
    }
  }
}

// 3. 回复情况
.reply-section {
  margin: 0 30rpx 20rpx;
  padding: 24rpx;
  background-color: #fff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);

  .section-title {
    display: flex;
    align-items: center;
    gap: 8rpx;
    margin-bottom: 16rpx;
    font-size: 28rpx;
    font-weight: bold;
    color: #E6A23C;
  }

  .reply-content {
    padding: 20rpx;
    background-color: #FFF7E6;
    border-radius: 12rpx;
    border-left: 4rpx solid #E6A23C;

    .reply-text {
      display: block;
      font-size: 26rpx;
      color: #606266;
      line-height: 1.8;
      margin-bottom: 12rpx;
    }

    .reply-time {
      display: block;
      font-size: 22rpx;
      color: #909399;
    }
  }

  .no-reply {
    padding: 40rpx;
    text-align: center;

    text {
      font-size: 26rpx;
      color: #C0C4CC;
    }
  }
}

// 4. 问卷详情标题栏
.section-title-bar {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin: 0 30rpx 16rpx;
  padding: 16rpx 20rpx;
  background-color: #fff;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);

  text {
    font-size: 28rpx;
    font-weight: bold;
    color: #3B82F6;
  }
}

.qa-list {
  margin: 0 30rpx;
}

.qa-item {
  margin-bottom: 16rpx;
  padding: 24rpx;
  background-color: #fff;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);

  .question {
    display: flex;
    align-items: flex-start;
    margin-bottom: 12rpx;

    .question-number {
      font-size: 26rpx;
      font-weight: bold;
      color: #3B82F6;
      margin-right: 8rpx;
      flex-shrink: 0;
    }

    .question-text {
      flex: 1;
      font-size: 26rpx;
      font-weight: 500;
      color: #303133;
      line-height: 1.6;
    }
  }

  .answer {
    padding: 16rpx;
    background-color: #F5F7FA;
    border-radius: 8rpx;

    text {
      font-size: 26rpx;
      color: #606266;
      line-height: 1.8;
      word-break: break-all;
    }
  }
}

.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 12rpx;
  padding: 20rpx 30rpx;
  background-color: #fff;
  border-top: 1rpx solid #EBEEF5;
  box-shadow: 0 -2rpx 8rpx rgba(0, 0, 0, 0.05);

  .action-btn {
    height: 80rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8rpx;
    border-radius: 12rpx;
    font-size: 28rpx;
    border: none;

    &.primary {
      flex: 2;
      background: linear-gradient(135deg, #3B82F6, #2563EB);
      color: #fff;
    }

    &.nav {
      flex: 1;
      background-color: #F5F7FA;
      color: #606266;

      &[disabled] {
        opacity: 0.4;
        color: #C0C4CC;
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

  .char-count {
    margin-top: 8rpx;
    font-size: 22rpx;
    color: #909399;
    text-align: right;
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
    }

    .btn-cancel {
      background-color: #F5F7FA;
      color: #606266;
    }

    .btn-confirm {
      background: linear-gradient(135deg, #3B82F6, #2563EB);
      color: #fff;

      &[disabled] {
        opacity: 0.5;
      }
    }
  }
}
</style>
