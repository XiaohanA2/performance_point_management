<template>
  <view class="app">
    <!-- 版本更新提示 -->
    <view v-if="showUpdateTip" class="update-tip-modal">
      <view class="update-tip-content">
        <text class="update-tip-title">🎉 版本更新</text>
        <text class="update-tip-text">
          【1.4.0版本更新】
          
1. 首页新增奖励金额显示，积分换奖励一目了然
2. 龙虎榜支持季度和月份选择，灵活查看排名
3. 优化了奖励规则配置界面
        </text>
        <button class="update-tip-btn" @click="closeUpdateTip">知道了</button>
      </view>
    </view>
    
    <!-- 应用内容 -->
    <view class="app-content">
      <slot></slot>
    </view>
  </view>
</template>

<script>
export default {
  globalData: {
    currentVersion: '1.4.0' // 当前版本号
  },
  data() {
    return {
      showUpdateTip: false
    };
  },
  onLaunch() {
    console.log('App Launch');
    this.checkVersionUpdate();
  },
  onShow() {
    console.log('App Show');
  },
  onHide() {
    console.log('App Hide');
  },
  methods: {
    /**
     * 检查版本更新
     */
    checkVersionUpdate() {
      const savedVersion = uni.getStorageSync('appVersion') || '0.0.0';
      const currentVersion = this.globalData.currentVersion;
      
      // 对比版本号，判断是否需要显示更新提示
      if (this.compareVersions(currentVersion, savedVersion) > 0) {
        this.showUpdateTip = true;
      }
    },
    
    /**
     * 版本号比较
     * @param {string} v1 新版本号
     * @param {string} v2 旧版本号
     * @returns {number} 1: v1>v2, -1: v1<v2, 0: 相等
     */
    compareVersions(v1, v2) {
      const arr1 = v1.split('.').map(Number);
      const arr2 = v2.split('.').map(Number);
      
      for (let i = 0; i < Math.max(arr1.length, arr2.length); i++) {
        const num1 = arr1[i] || 0;
        const num2 = arr2[i] || 0;
        if (num1 > num2) return 1;
        if (num1 < num2) return -1;
      }
      return 0;
    },
    
    /**
     * 关闭更新提示
     */
    closeUpdateTip() {
      this.showUpdateTip = false;
      // 保存当前版本号，避免重复提示
      uni.setStorageSync('appVersion', this.globalData.currentVersion);
    }
  }
};
</script>

<style>
/* 应用容器样式 */
.app {
  overflow: hidden;
  height: 100vh;
  width: 100%;
  box-sizing: border-box;
  position: relative;
}

.app-content {
  height: 100%;
  width: 100%;
  overflow: auto;
}

/* 版本更新提示样式 */
.update-tip-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.update-tip-content {
  background: #ffffff;
  border-radius: 28rpx;
  padding: 48rpx;
  width: 80%;
  max-width: 600rpx;
  box-shadow: 0 40rpx 100rpx rgba(0, 0, 0, 0.15);
}

.update-tip-title {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #0f766e;
  margin-bottom: 24rpx;
  text-align: center;
}

.update-tip-text {
  display: block;
  font-size: 28rpx;
  line-height: 44rpx;
  color: #64748b;
  margin-bottom: 36rpx;
  white-space: pre-line;
}

.update-tip-btn {
  width: 100%;
  background: #0f766e;
  color: #ffffff;
  border: none;
  border-radius: 12rpx;
  padding: 20rpx 0;
  font-size: 28rpx;
  font-weight: 600;
  transition: all 0.2s ease;
}

.update-tip-btn:active {
  opacity: 0.9;
  transform: scale(0.98);
}
</style>