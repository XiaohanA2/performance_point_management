<template>
  <view class="loading-spinner">
    <view class="spinner"></view>
    <text class="loading-text">加载中...</text>
  </view>
</template>

<script>
export default {
  name: 'LoadingSpinner'
};
</script>

<style lang="scss" scoped>
.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}

.spinner {
  width: 40rpx;
  height: 40rpx;
  border: 4rpx solid #E5E7EB;
  border-top-color: #3B82F6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-text {
  margin-top: 16rpx;
  font-size: 24rpx;
  color: #909399;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
