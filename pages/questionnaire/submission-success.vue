<template>
  <view class="success-container">
    <!-- 成功图标 -->
    <view class="success-icon">
      <uni-icons type="checkmarkempty" size="80" color="#67C23A"></uni-icons>
    </view>

    <!-- 成功提示 -->
    <view class="success-title">提交成功！</view>
    <view class="success-subtitle">您的问卷已成功提交</view>

    <!-- 问卷信息 -->
    <view class="info-card">
      <view class="info-row">
        <view class="info-label">问卷名称</view>
        <view class="info-value">{{ questionnaireTitle }}</view>
      </view>
      <view class="info-row">
        <view class="info-label">提交时间</view>
        <view class="info-value">{{ submitTime }}</view>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="actions">
      <button class="action-btn primary" @click="queryRecords">
        <uni-icons type="search" size="18" color="#fff"></uni-icons>
        <text>查询我的记录</text>
      </button>
      <button class="action-btn secondary" @click="backToList">
        <uni-icons type="bars" size="18" color="#3B82F6"></uni-icons>
        <text>返回问卷列表</text>
      </button>
    </view>

    <!-- 提示信息 -->
    <view class="tips">
      <uni-icons type="info" size="14" color="#909399"></uni-icons>
      <text>管理员回复后，您可以通过身份证号查询记录查看回复内容</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'SubmissionSuccess',
  data() {
    return {
      questionnaireTitle: '',
      submitTime: ''
    };
  },

  onLoad(options) {
    // 从URL参数获取问卷标题
    if (options.title) {
      this.questionnaireTitle = decodeURIComponent(options.title);
    }

    // 设置提交时间为当前时间
    this.submitTime = this.formatDate(Date.now());
  },

  methods: {
    /**
     * 查询记录
     */
    queryRecords() {
      uni.redirectTo({
        url: '/pages/questionnaire/my-submissions'
      });
    },

    /**
     * 返回问卷列表
     */
    backToList() {
      uni.navigateBack();
    },

    /**
     * 格式化日期
     */
    formatDate(timestamp) {
      const date = new Date(timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hour = String(date.getHours()).padStart(2, '0');
      const minute = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${hour}:${minute}`;
    }
  }
};
</script>

<style lang="scss" scoped>
.success-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #F0F9FF 0%, #F5F7FA 100%);
  padding: 120rpx 30rpx 30rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.success-icon {
  margin-bottom: 40rpx;
  animation: scaleIn 0.5s ease-out;
}

.success-title {
  font-size: 48rpx;
  font-weight: bold;
  color: #303133;
  margin-bottom: 16rpx;
  animation: fadeInUp 0.6s ease-out 0.1s both;
}

.success-subtitle {
  font-size: 28rpx;
  color: #909399;
  margin-bottom: 60rpx;
  animation: fadeInUp 0.6s ease-out 0.2s both;
}

.info-card {
  width: 100%;
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 40rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
  animation: fadeInUp 0.6s ease-out 0.3s both;

  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20rpx 0;

    &:not(:last-child) {
      border-bottom: 1rpx solid #EBEEF5;
    }

    .info-label {
      font-size: 28rpx;
      color: #909399;
    }

    .info-value {
      font-size: 28rpx;
      color: #303133;
      font-weight: 500;
      text-align: right;
      max-width: 400rpx;
    }
  }
}

.actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin-bottom: 40rpx;
  animation: fadeInUp 0.6s ease-out 0.4s both;

  .action-btn {
    width: 100%;
    height: 88rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8rpx;
    border-radius: 12rpx;
    font-size: 30rpx;
    border: none;

    &.primary {
      background: linear-gradient(135deg, #3B82F6, #2563EB);
      color: #fff;
    }

    &.secondary {
      background-color: #fff;
      color: #3B82F6;
      border: 2rpx solid #3B82F6;
    }
  }
}

.tips {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 24rpx;
  color: #909399;
  animation: fadeInUp 0.6s ease-out 0.5s both;
}

@keyframes scaleIn {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes fadeInUp {
  from {
    transform: translateY(30rpx);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
