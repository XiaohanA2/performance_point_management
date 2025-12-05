<template>
  <view class="profile-page">
    <view class="section">
      <text class="section-title">账号信息</text>
      <view class="info-card">
        <view class="info-row">
          <text class="label">姓名</text>
          <text class="value">{{ user?.name || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="label">手机号</text>
          <text class="value">{{ user?.phone || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="label">所属支行</text>
          <text class="value">{{ user?.branch || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="label">角色</text>
          <text class="value">{{ userRoleLabel }}</text>
        </view>
      </view>
    </view>

    <!-- 登录按钮（游客模式） -->
    <view v-if="user?.role === 'guest'" class="login-section">
      <button class="primary-btn" @click="gotoLogin">立即登录</button>
    </view>

    <!-- 修改密码（仅登录用户可见） -->
    <view v-else class="section">
      <text class="section-title">修改密码</text>
      <view class="form-card">
        <view class="form-item">
          <text class="form-label">原密码</text>
          <input class="form-input" type="text" password v-model="form.oldPassword" />
        </view>
        <view class="form-item">
          <text class="form-label">新密码</text>
          <input class="form-input" type="text" password v-model="form.newPassword" />
        </view>
        <view class="form-item">
          <text class="form-label">确认新密码</text>
          <input class="form-input" type="text" password v-model="form.confirmPassword" />
        </view>
        <button class="primary-btn" @click="handleChangePassword">确认修改</button>
      </view>

      <button class="logout-btn" @click="handleLogout">退出登录</button>
    </view>
  </view>
</template>

<script>
import { StoreService } from '../../services/store.js';

export default {
  data() {
    return {
      user: null,
      form: {
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      }
    };
  },
  onShow() {
    this.user = StoreService.getCurrentUser();
  },
  computed: {
    userRoleLabel() {
      if (!this.user) return '-';
      return this.user.role === 'admin' ? '管理员' : '客户经理';
    }
  },
  methods: {
    gotoLogin() {
      uni.navigateTo({ url: '/pages/login/login' });
    },
    async handleChangePassword() {
      if (!this.form.oldPassword || !this.form.newPassword || !this.form.confirmPassword) {
        uni.showToast({ title: '请完整填写', icon: 'none' });
        return;
      }
      if (this.form.newPassword !== this.form.confirmPassword) {
        uni.showToast({ title: '两次新密码不一致', icon: 'none' });
        return;
      }
      try {
        await StoreService.changePassword(
          this.user.id,
          this.form.oldPassword,
          this.form.newPassword
        );
        uni.showToast({ title: '密码已更新', icon: 'success' });
        this.form.oldPassword = '';
        this.form.newPassword = '';
        this.form.confirmPassword = '';
      } catch (error) {
        uni.showToast({ title: error.message || '修改失败', icon: 'none' });
      }
    },
    handleLogout() {
      uni.showModal({
        title: '退出登录',
        content: '确认退出当前账号？',
        success: res => {
          if (!res.confirm) return;
          StoreService.logout();
          this.user = StoreService.getCurrentUser();
        }
      });
    }
  }
};
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: #f8fafc;
  padding: 32rpx;
}

.section {
  margin-bottom: 32rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 16rpx;
  display: inline-block;
}

.info-card,
.form-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 16rpx 40rpx rgba(15, 118, 110, 0.08);
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 18rpx 0;
  border-bottom: 1px solid #f1f5f9;
}

.info-row:last-child {
  border-bottom: none;
}

.label {
  font-size: 26rpx;
  color: #94a3b8;
}

.value {
  font-size: 26rpx;
  color: #0f172a;
  font-weight: 600;
}

.form-item {
  margin-bottom: 24rpx;
}

.form-label {
  display: block;
  font-size: 24rpx;
  color: #6b7280;
  margin-bottom: 12rpx;
}

.form-input {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: #f8fafc;
  border-radius: 18rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #0f172a;
  box-sizing: border-box;
  border: none;
  display: block;
}

.primary-btn {
  width: 100%;
  border: none;
  border-radius: 999rpx;
  padding: 20rpx 0;
  background: linear-gradient(to right, #0f766e, #0ea5e9);
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
}

.logout-btn {
  width: 100%;
  border: none;
  border-radius: 999rpx;
  padding: 20rpx 0;
  background: #fef2f2;
  color: #ef4444;
  font-size: 28rpx;
}
</style>

