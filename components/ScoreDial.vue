<template>
  <view class="score-dial">
    <view class="score-dial__header">
      <view class="score-dial__badge">
        <image src="/static/logo.png" mode="aspectFit" style="width: 40rpx; height: 40rpx;" />
      </view>
      <text class="score-dial__subtitle">你好，{{ name }}</text>
      <view class="score-dial__rank-badge">
        <text class="score-dial__rank-label">排名</text>
        <text class="score-dial__rank-value">第 {{ rank }} 名</text>
      </view>
    </view>

    <text class="score-dial__label">{{ quarter }} 累计积分</text>
    <text class="score-dial__value">{{ totalScore }}</text>

    <view class="score-dial__meta">
      <view class="score-dial__meta-item">
        <text class="score-dial__meta-label">个贷积分</text>
        <text class="score-dial__meta-value">{{ personalScore }}</text>
      </view>
      <view class="score-dial__divider" />
      <view class="score-dial__meta-item">
        <text class="score-dial__meta-label">小微积分</text>
        <text class="score-dial__meta-value">{{ microScore }}</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'ScoreDial',
  props: {
    totalScore: {
      type: Number,
      required: true
    },
    personalScore: {
      type: Number,
      required: true
    },
    microScore: {
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
  padding: 56rpx 40rpx 56rpx;
  border-radius: 36rpx;
  background: linear-gradient(135deg, #0f766e 0%, #0ea5e9 100%);
  color: #fff;
  box-shadow: 0 24rpx 64rpx rgba(15, 118, 110, 0.4);
  position: relative;
  overflow: hidden;
}

.score-dial::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -20%;
  width: 80%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%);
  transform: rotate(30deg);
}

.score-dial__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32rpx;
  position: relative;
  z-index: 1;
  width: 100%;
}

.score-dial__badge {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  border: 3rpx solid rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10rpx);
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.15);
}

.score-dial__subtitle {
  font-size: 28rpx;
  opacity: 0.95;
  font-weight: 500;
  flex: 1;
}

.score-dial__rank-badge {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20rpx;
  padding: 16rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10rpx);
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.1);
  min-width: 120rpx;
}

.score-dial__rank-label {
  font-size: 20rpx;
  opacity: 0.85;
  margin-bottom: 4rpx;
  font-weight: 500;
}

.score-dial__rank-value {
  font-size: 28rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
}

.score-dial__label {
  font-size: 28rpx;
  opacity: 0.9;
  position: relative;
  z-index: 1;
}

.score-dial__value {
  display: block;
  font-size: 120rpx;
  font-weight: 700;
  margin: 16rpx 0 36rpx;
  position: relative;
  z-index: 1;
  line-height: 1;
}

.score-dial__meta {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 24rpx;
  padding: 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28rpx;
  backdrop-filter: blur(10rpx);
  position: relative;
  z-index: 1;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.1);
}

.score-dial__meta-item {
  width: 45%;
  text-align: center;
}

.score-dial__meta-label {
  display: block;
  font-size: 26rpx;
  opacity: 0.85;
  margin-bottom: 12rpx;
  font-weight: 500;
  letter-spacing: 1rpx;
}

.score-dial__meta-value {
  font-size: 36rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
}

.score-dial__divider {
  width: 2rpx;
  height: 80rpx;
  background: linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.4), transparent);
}

.score-dial__rank {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 24rpx;
  padding: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  backdrop-filter: blur(10rpx);
  position: relative;
  z-index: 1;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.score-dial__rank:hover {
  background: rgba(255, 255, 255, 0.25);
}

.score-dial__rank-label {
  display: block;
  font-size: 22rpx;
  opacity: 0.85;
  margin-bottom: 8rpx;
  font-weight: 500;
}

.score-dial__rank-value {
  font-size: 40rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
}
</style>