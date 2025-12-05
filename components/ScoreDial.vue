<template>
  <view class="score-dial">
    <view class="score-dial__header">
      <view class="score-dial__badge">
        <image src="/static/logo.png" mode="aspectFit" style="width: 40rpx; height: 40rpx;" />
      </view>
      <text class="score-dial__subtitle">个人积分看板</text>
    </view>

    <text class="score-dial__label">{{ quarter }} 累计积分</text>
    <text class="score-dial__value">{{ score }}</text>

    <view class="score-dial__meta">
      <view class="score-dial__meta-item">
        <text class="score-dial__meta-label">用户</text>
        <text class="score-dial__meta-value">{{ name }}</text>
      </view>
      <view class="score-dial__divider" />
      <view class="score-dial__meta-item">
        <text class="score-dial__meta-label">排名</text>
        <text class="score-dial__meta-value">第 {{ rank }} 名</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'ScoreDial',
  props: {
    score: {
      type: Number,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    rank: {
      type: Number,
      required: true
    },
    quarter: {
      type: String,
      required: true
    }
  }
};
</script>

<style scoped>
.score-dial {
  margin: 0 32rpx;
  margin-top: 20rpx;
  padding: 48rpx 32rpx 56rpx;
  border-radius: 32rpx;
  background: linear-gradient(to right, #0f766e, #0ea5e9);
  color: #fff;
  box-shadow: 0 20rpx 60rpx rgba(15, 118, 110, 0.35);
}

.score-dial__header {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}

.score-dial__badge {
  width: 60rpx;
  height: 60rpx;
  border-radius: 60rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 600;
  margin-right: 16rpx;
  background: rgba(255, 255, 255, 0.1);
}

.score-dial__subtitle {
  font-size: 24rpx;
  opacity: 0.9;
}

.score-dial__label {
  font-size: 26rpx;
  opacity: 0.9;
}

.score-dial__value {
  display: block;
  font-size: 96rpx;
  font-weight: 700;
  margin: 12rpx 0 32rpx;
}

.score-dial__meta {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 20rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.score-dial__meta-item {
  width: 45%;
}

.score-dial__meta-label {
  display: block;
  font-size: 22rpx;
  opacity: 0.85;
  margin-bottom: 8rpx;
}

.score-dial__meta-value {
  font-size: 30rpx;
  font-weight: 600;
}

.score-dial__divider {
  width: 1px;
  height: 60rpx;
  background: rgba(255, 255, 255, 0.3);
}
</style>