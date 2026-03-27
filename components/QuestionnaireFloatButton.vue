<template>
  <view
    class="questionnaire-float-button"
    :class="{ 'with-badge': showBadge }"
    @click="handleClick"
  >
    <view class="button-content">
      <uni-icons type="compose" size="20" color="#fff"></uni-icons>
      <text class="button-text">问卷</text>
    </view>
    <view class="badge" v-if="showBadge">
      <text>免登录</text>
    </view>
    <view class="pulse-ring"></view>
  </view>
</template>

<script>
export default {
  name: 'QuestionnaireFloatButton',
  props: {
    // 是否有新问卷
    hasNew: {
      type: Boolean,
      default: false
    },
    // 新问卷数量
    newCount: {
      type: Number,
      default: 0
    }
  },
  computed: {
    showBadge() {
      return this.hasNew && this.newCount > 0;
    },
    badgeCount() {
      return this.newCount;
    }
  },
  methods: {
    handleClick() {
      // 跳转到问卷列表页
      uni.navigateTo({
        url: '/pages/questionnaire/questionnaire-list'
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.questionnaire-float-button {
  position: fixed;
  right: 24rpx;
  bottom: 180rpx;
  width: auto;
  min-width: 88rpx;
  height: 88rpx;
  padding: 0 20rpx;
  border-radius: 44rpx;
  background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
  box-shadow: 0 6rpx 20rpx rgba(59, 130, 246, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  transition: all 0.3s ease;

  &:active {
    transform: scale(0.95);
    box-shadow: 0 3rpx 12rpx rgba(59, 130, 246, 0.25);
  }

  &.with-badge {
    // badge 已通过 .badge 元素显示，无需伪元素
  }

  .button-content {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 8rpx;
    animation: icon-float 3s ease-in-out infinite;

    .button-text {
      font-size: 28rpx;
      font-weight: bold;
      color: #fff;
      line-height: 1;
    }
  }

  .badge {
    position: absolute;
    top: -12rpx;
    right: -16rpx;
    height: 32rpx;
    padding: 0 10rpx;
    background: #F56C6C;
    border-radius: 16rpx;
    border: 3rpx solid #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;

    text {
      font-size: 18rpx;
      color: #fff;
      font-weight: bold;
      line-height: 1;
      white-space: nowrap;
    }
  }

  .pulse-ring {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 44rpx;
    background: rgba(59, 130, 246, 0.3);
    animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
    z-index: 0;
  }
}

@keyframes pulse-ring {
  0% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.25);
    opacity: 0.3;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

@keyframes icon-float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3rpx);
  }
}

@keyframes badge-pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.15);
  }
}
</style>
