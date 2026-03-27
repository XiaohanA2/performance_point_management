<template>
  <view class="login-page">
    <view class="login-hero">
      <text class="login-hero__title">积分管理</text>
      <text class="login-hero__subtitle">个人积分记录工具</text>
    </view>

    <view class="login-card">
      <view class="login-form">
        <view class="form-item">
          <text class="form-label">手机号</text>
          <input
            type="number"
            class="form-input"
            placeholder="请输入手机号"
            maxlength="11"
            v-model="phone"
          />
        </view>

        <view class="form-item">
          <text class="form-label">密码</text>
          <input
            class="form-input"
            placeholder="请输入密码"
            password
            v-model="password"
          />
        </view>

        <button class="login-btn" :loading="loading" @click="handleSubmit">
          登录
        </button>

        <view class="form-footer">
          <view class="form-links">
            <text @click="handleShowNote" class="note-btn">&nbsp;&nbsp;&nbsp;登录说明</text>
            <text @click="handleForgotPassword" class="forgot-btn">忘记密码？</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { StoreService } from '../../services/store.js';
import { getUserDefaultSystem } from '../../services/permission-service.js';

export default {
  data() {
    return {
      phone: '',
      password: '',
      loading: false
    };
  },
  onShow() {
    if (StoreService.isLoggedIn()) {
      const user = StoreService.getCurrentUser();
      this.redirectToDefaultSystem(user);
    }
  },
  methods: {
    validatePhone() {
      const reg = /^1\d{10}$/;
      if (!reg.test(this.phone)) {
        uni.showToast({ title: '请输入正确的手机号', icon: 'none' });
        return false;
      }
      return true;
    },
    async handleSubmit() {
      if (!this.validatePhone()) return;
      if (!this.password) {
        uni.showToast({ title: '请输入密码', icon: 'none' });
        return;
      }
      this.loading = true;
      try {
        const result = await StoreService.loginWithPassword(this.phone, this.password);
        console.log('登录结果:', result);
        this.handleLoginSuccess(result);
      } catch (error) {
        uni.showToast({ title: error.message || '登录失败', icon: 'none' });
      } finally {
        this.loading = false;
      }
    },
    handleLoginSuccess(result) {
      const { user } = result;

      if (!user) {
        uni.showToast({ title: '登录失败，请重试', icon: 'none' });
        return;
      }

      uni.showToast({ title: `欢迎 ${user.name}`, icon: 'success' });
      setTimeout(() => {
        this.redirectToDefaultSystem(user);
      }, 300);
    },
    redirectToDefaultSystem(user) {
      const defaultSystem = getUserDefaultSystem(user);

      if (defaultSystem === 'pf') {
        // 个金系统用户 - 设置系统模式后跳转到工作台
        uni.setStorageSync('system_mode', 'pf');
        uni.switchTab({ url: '/pages/dashboard/dashboard' });
      } else if (defaultSystem === 'credit') {
        // 个贷系统用户
        uni.setStorageSync('system_mode', 'credit');
        uni.switchTab({ url: '/pages/dashboard/dashboard' });
      } else {
        // 其他角色(如管理员)默认进入个贷系统
        uni.setStorageSync('system_mode', 'credit');
        uni.switchTab({ url: '/pages/dashboard/dashboard' });
      }
    },
    handleForgotPassword() {
      uni.showModal({
        title: '找回密码',
        content: '请联系管理员重置密码。',
        showCancel: false
      });
    },
    handleShowNote() {
      uni.showModal({
        title: '登录说明',
        content: '如果您不是直接业务人员，请联系管理员录入信息后登录',
        showCancel: false
      });
    }
  }
};
</script>

<style scoped>
.login-page {
  height: 100vh;
  background: linear-gradient(to bottom, #e6fffb 0%, #f6fff9 40%, #ffffff 100%);
  padding: 80rpx 32rpx 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  box-sizing: border-box;
  -webkit-overflow-scrolling: touch;
}

.login-hero {
  text-align: center;
  margin-bottom: 40rpx;
}

.login-hero__title {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
  color: #0f172a;
  margin-top: 20rpx;
}

.login-hero__subtitle {
  display: block;
  font-size: 26rpx;
  color: #64748b;
  margin-top: 12rpx;
}

.login-card {
  background: #ffffff;
  border-radius: 32rpx;
  padding: 32rpx 32rpx 48rpx;
  box-shadow: 0 30rpx 80rpx rgba(15, 118, 110, 0.08);
  width: 100%;
  box-sizing: border-box;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.form-label {
  font-size: 24rpx;
  color: #4b5563;
}

.form-input {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 18rpx;
  padding: 0 24rpx;
  background: #f8fafc;
  font-size: 28rpx;
  color: #0f172a;
  box-sizing: border-box;
  border: none;
  display: block;
}

.login-btn {
  background: linear-gradient(to right, #0f766e, #0ea5e9);
  color: #fff;
  border: none;
  border-radius: 20rpx;
  padding: 24rpx 0;
  font-size: 30rpx;
  font-weight: 600;
  width: 100%;
  min-width: 300rpx;
  max-width: 100%;
  display: block;
}

.form-footer {
  margin-top: 20rpx;
}

.form-links {
  display: flex;
  justify-content: space-between;
  font-size: 24rpx;
  color: #0f766e;
  margin-top: 8rpx;
}

.note-btn {
  text-align: left;
}

.forgot-btn {
  text-align: right;
}
</style>
