<template>
  <view class="profile-page">
    <!-- 头部信息 -->
    <view class="profile-header">
      <view class="header-left">
        <view class="user-avatar">
          <text class="avatar-text">{{ user?.name?.charAt(0) || 'U' }}</text>
        </view>
        <view class="user-info">
          <text class="user-name">{{ user?.name || '-' }}</text>
          <text class="user-role">{{ userRoleLabel }}</text>
          <text class="user-branch">{{ user?.branchName || user?.branch || '-' }}</text>
        </view>
      </view>
      <!-- 退出登录图标 -->
      <view v-if="user?.role !== 'guest'" class="logout-icon" @click="handleLogout">
        <view class="logout-icon-inner">
          <uni-icons type="undo" :size="22" color="#ef4444" />
        </view>
      </view>
    </view>

    <!-- 详细信息卡片 -->
    <view class="info-section" v-if="user?.role !== 'guest'">
      <view class="info-card">
        <view class="info-item">
          <view class="info-item__label">
            <uni-icons type="person" :size="18" color="#0f766e" />
            <text>姓名</text>
          </view>
          <text class="info-item__value">{{ user?.name || '-' }}</text>
        </view>
        <view class="info-item">
          <view class="info-item__label">
            <uni-icons type="phone" :size="18" color="#0f766e" />
            <text>手机号</text>
          </view>
          <text class="info-item__value">{{ user?.phone || '-' }}</text>
        </view>
        <view class="info-item">
          <view class="info-item__label">
            <uni-icons type="location" :size="18" color="#0f766e" />
            <text>所属支行</text>
          </view>
          <text class="info-item__value">{{ user?.branchName || user?.branch || '-' }}</text>
        </view>
        <view class="info-item">
          <view class="info-item__label">
            <uni-icons type="star" :size="18" color="#0f766e" />
            <text>角色</text>
          </view>
          <text class="info-item__value">{{ userRoleLabel }}</text>
        </view>
      </view>

      <!-- 功能按钮区 -->
      <view class="action-buttons">
        <button class="action-btn primary" @click="showEditModal = true">
          <uni-icons type="compose" :size="18" color="#fff" />
          <text>编辑信息</text>
        </button>
        <button class="action-btn secondary" @click="showPasswordModal = true">
          <uni-icons type="locked" :size="18" color="#0f766e" />
          <text>修改密码</text>
        </button>
      </view>
    </view>

    <!-- 游客登录按钮 -->
    <view class="action-buttons" v-if="user?.role === 'guest'">
      <button class="action-btn primary" @click="gotoLogin">
        <uni-icons type="person" :size="18" color="#fff" />
        <text>立即登录</text>
      </button>
    </view>

    

    <!-- 编辑信息弹框 -->
    <view v-if="showEditModal" class="modal-overlay">
      <view class="modal">
        <view class="modal-header">
          <text>编辑个人信息</text>
          <view class="modal-close" @click="showEditModal = false">
            <uni-icons type="closeempty" :size="22" color="#fff" />
          </view>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">姓名</text>
            <input class="form-input" v-model="editForm.name" placeholder="请输入姓名" />
          </view>
          <view class="form-item">
            <text class="form-label">手机号</text>
            <input class="form-input" type="number" v-model="editForm.phone" placeholder="请输入手机号" maxlength="11" />
          </view>
          <view class="form-item">
            <text class="form-label">所属支行</text>
            <picker class="form-picker" @change="onBranchChange" :value="selectedBranchIndex" :range="branchList">
              <view class="picker-content">
                {{ editForm.branch || '请选择所属支行' }}
                <uni-icons type="arrowdown" :size="16" color="#64748b" />
              </view>
            </picker>
          </view>
        </view>
        <view class="modal-footer">
          <button class="modal-btn ghost" @click="showEditModal = false">取消</button>
          <button class="modal-btn primary" @click="handleEditInfo">保存修改</button>
        </view>
      </view>
    </view>

    <!-- 修改密码弹框 -->
    <view v-if="showPasswordModal" class="modal-overlay">
      <view class="modal">
        <view class="modal-header">
          <text>修改密码</text>
          <view class="modal-close" @click="showPasswordModal = false">
            <uni-icons type="closeempty" :size="22" color="#fff" />
          </view>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">原密码</text>
            <input class="form-input" type="password" v-model="passwordForm.oldPassword" placeholder="请输入原密码" />
          </view>
          <view class="form-item">
            <text class="form-label">新密码</text>
            <input class="form-input" type="password" v-model="passwordForm.newPassword" placeholder="请输入新密码" />
          </view>
          <view class="form-item">
            <text class="form-label">确认新密码</text>
            <input class="form-input" type="password" v-model="passwordForm.confirmPassword" placeholder="请确认新密码" />
          </view>
        </view>
        <view class="modal-footer">
          <button class="modal-btn ghost" @click="showPasswordModal = false">取消</button>
          <button class="modal-btn primary" @click="handleChangePassword">确认修改</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { StoreService } from '../../services/store.js';
import { getUserRoleNames } from '../../services/permission-service.js';

export default {
  data() {
    return {
      user: null,
      // 编辑信息相关
      showEditModal: false,
      editForm: {
        name: '',
        phone: '',
        branch: ''
      },
      // 支行选择相关
      branches: [], // 支行列表
      selectedBranchIndex: 0,
      // 修改密码相关
      showPasswordModal: false,
      passwordForm: {
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      }
    };
  },
  async onShow() {
    this.user = StoreService.getCurrentUser();
    try {
      await StoreService.ensureReady();
      this.user = StoreService.reloadCurrentUser();
      this.branches = StoreService.getBranches();
      this.initEditForm();
    } catch (error) {
      console.error('[Profile] 刷新用户信息失败:', error);
    }
  },
  computed: {
    userRoleLabel() {
      if (!this.user) return '-';
      return getUserRoleNames(this.user) || '客户经理';
    },
    branchList() {
      return this.branches.map(branch => branch.name);
    }
  },
  methods: {
    // 初始化编辑表单数据
    initEditForm() {
      if (this.user) {
        this.editForm = {
          name: this.user.name,
          phone: this.user.phone,
          branch: this.user.branchName || this.user.branch
        };
        this.selectedBranchIndex = Math.max(
          this.branches.findIndex(b => b.id === this.user.branchId),
          0
        );
        if (this.selectedBranchIndex < 0) {
          this.selectedBranchIndex = Math.max(
            this.branchList.findIndex(name => name === (this.user.branchName || this.user.branch)),
            0
          );
        }
      }
    },
    gotoLogin() {
      uni.navigateTo({ url: '/pages/login/login' });
    },
    // 支行选择变化处理
    onBranchChange(e) {
      this.selectedBranchIndex = e.detail.value;
      const selected = this.branches[this.selectedBranchIndex];
      this.editForm.branchId = selected ? selected.id : '';
      this.editForm.branch = selected ? selected.name : '';
    },
    // 编辑信息
    async handleEditInfo() {
      if (!this.editForm.name || !this.editForm.phone || !this.editForm.branch) {
        uni.showToast({ title: '姓名、手机号和支行不能为空', icon: 'none' });
        return;
      }
      // 手机号格式验证
      const phoneReg = /^1\d{10}$/;
      if (!phoneReg.test(this.editForm.phone)) {
        uni.showToast({ title: '请输入正确的手机号', icon: 'none' });
        return;
      }
      try {
        await StoreService.updateUser(this.user.id, {
          name: this.editForm.name,
          phone: this.editForm.phone,
          branch: this.editForm.branch,
          branchId: this.editForm.branchId || ''
        });
        uni.showToast({ title: '信息已更新', icon: 'success' });
        this.showEditModal = false;
        await StoreService.ensureReady();
        this.user = StoreService.reloadCurrentUser();
        this.initEditForm();
      } catch (error) {
        uni.showToast({ title: error.message || '修改失败', icon: 'none' });
      }
    },
    // 修改密码
    async handleChangePassword() {
      if (!this.passwordForm.oldPassword || !this.passwordForm.newPassword || !this.passwordForm.confirmPassword) {
        uni.showToast({ title: '请完整填写', icon: 'none' });
        return;
      }
      if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
        uni.showToast({ title: '两次新密码不一致', icon: 'none' });
        return;
      }
      try {
        await StoreService.changePassword(
          this.user.id,
          this.passwordForm.oldPassword,
          this.passwordForm.newPassword
        );
        uni.showToast({ title: '密码已更新', icon: 'success' });
        this.showPasswordModal = false;
        // 重置密码表单
        this.passwordForm = {
          oldPassword: '',
          newPassword: '',
          confirmPassword: ''
        };
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
  height: 100vh;
  background: linear-gradient(135deg, #f0fdf4 0%, #f0f9ff 100%);
  padding: 32rpx;
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

/* 头部信息 */
.profile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 12rpx 32rpx rgba(15, 118, 110, 0.08);
}

.header-left {
  display: flex;
  align-items: center;
}

/* 退出登录图标 */
.logout-icon {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #fef2f2;
  cursor: pointer;
}

.logout-icon:active {
  background: #fee2e2;
}

.logout-icon-inner {
  transform: scaleX(-1);
}

.user-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #0f766e, #0ea5e9);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
  box-shadow: 0 8rpx 20rpx rgba(15, 118, 110, 0.2);
}

.avatar-text {
  font-size: 48rpx;
  font-weight: 700;
  color: #ffffff;
}

.user-info {
  flex: 1;
}

.user-name {
  font-size: 32rpx;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 8rpx;
  display: block;
}

.user-role {
  font-size: 24rpx;
  color: #0f766e;
  background: #ecfdf5;
  padding: 6rpx 16rpx;
  border-radius: 12rpx;
  margin-bottom: 8rpx;
  display: inline-block;
  font-weight: 600;
}

.user-branch {
  font-size: 26rpx;
  color: #64748b;
  display: block;
}

/* 功能按钮区 */
.action-buttons {
  display: flex;
  gap: 16rpx;
  margin-top: 32rpx;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 20rpx 32rpx;
  border-radius: 20rpx;
  font-size: 26rpx;
  font-weight: 600;
  border: none;
  min-width: 180rpx;
}

.action-btn.primary {
  background: linear-gradient(135deg, #0f766e, #0ea5e9);
  color: #fff;
  box-shadow: 0 8rpx 20rpx rgba(15, 118, 110, 0.2);
}

.action-btn.primary:active {
  box-shadow: 0 4rpx 12rpx rgba(15, 118, 110, 0.15);
}

.action-btn.secondary {
  background: #ffffff;
  color: #0f766e;
  border: 2rpx solid #0f766e;
  box-shadow: 0 4rpx 12rpx rgba(15, 118, 110, 0.08);
}

.action-btn.secondary:active {
  box-shadow: 0 2rpx 8rpx rgba(15, 118, 110, 0.06);
}

.action-btn.danger {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: #fff;
  box-shadow: 0 8rpx 20rpx rgba(239, 68, 68, 0.2);
}

.action-btn.danger:active {
  box-shadow: 0 4rpx 12rpx rgba(239, 68, 68, 0.15);
}

/* 信息区域 */
.info-section {
  flex: 1;
}

.info-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 12rpx 32rpx rgba(15, 118, 110, 0.08);
}

.info-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0;
  border-bottom: 2rpx solid #f1f5f9;
}

.info-item:last-child {
  border-bottom: none;
}

.info-item__label {
  display: flex;
  align-items: center;
  gap: 16rpx;
  font-size: 26rpx;
  color: #64748b;
  font-weight: 500;
}

.label-icon {
  font-size: 28rpx;
}

.info-item__value {
  font-size: 28rpx;
  font-weight: 600;
  color: #0f172a;
}

/* 退出登录按钮 */
.logout-btn {
  width: 100%;
  border: none;
  border-radius: 20rpx;
  padding: 20rpx 0;
  background: #fef2f2;
  color: #ef4444;
  font-size: 28rpx;
  font-weight: 600;
  margin-top: 32rpx;
  box-shadow: 0 4rpx 12rpx rgba(239, 68, 68, 0.08);
  transition: all 0.3s ease;
}

.logout-btn:active {
  transform: translateY(4rpx);
  box-shadow: 0 2rpx 8rpx rgba(239, 68, 68, 0.06);
}

/* 弹框样式 */
.modal-overlay {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 32rpx;
}

.modal {
  width: 100%;
  max-width: 640rpx;
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 24rpx 64rpx rgba(15, 23, 42, 0.2);
  animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-40rpx) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  background: linear-gradient(to right, #0f766e, #0ea5e9);
  color: #fff;
  padding: 28rpx 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 28rpx;
  font-weight: 600;
}

.modal-close {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 50%;
}

.modal-close:active {
  background: rgba(255, 255, 255, 0.2);
}

.modal-body {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.modal-footer {
  padding: 0 32rpx 32rpx;
  display: flex;
  gap: 16rpx;
}

.modal-btn {
  flex: 1;
  border-radius: 20rpx;
  padding: 20rpx 0;
  font-size: 26rpx;
  font-weight: 600;
  border: none;
  transition: all 0.3s ease;
}

.modal-btn:active {
  transform: translateY(4rpx);
}

.modal-btn.ghost {
  border: 2rpx solid rgba(15, 118, 110, 0.2);
  color: #0f766e;
  background: #fff;
  box-shadow: 0 4rpx 12rpx rgba(15, 118, 110, 0.08);
}

.modal-btn.ghost:active {
  box-shadow: 0 2rpx 8rpx rgba(15, 118, 110, 0.06);
}

.modal-btn.primary {
  background: linear-gradient(135deg, #0f766e, #0ea5e9);
  color: #fff;
  box-shadow: 0 8rpx 20rpx rgba(15, 118, 110, 0.2);
}

.modal-btn.primary:active {
  box-shadow: 0 4rpx 12rpx rgba(15, 118, 110, 0.15);
}

/* 表单样式 */
.form-item {
  margin-bottom: 24rpx;
}

.form-label {
  display: block;
  font-size: 24rpx;
  color: #6b7280;
  margin-bottom: 12rpx;
  font-weight: 600;
}

.form-input {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  background: #f8fafc;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 26rpx;
  color: #0f172a;
  box-sizing: border-box;
  border: 2rpx solid transparent;
  transition: all 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: #0f766e;
  background: #ffffff;
  box-shadow: 0 0 0 4rpx rgba(15, 118, 110, 0.1);
}

.form-input:disabled {
  background: #f1f5f9;
  color: #94a3b8;
  cursor: not-allowed;
}

/* 选择器样式 */
.form-picker {
  width: 100%;
  height: 80rpx;
  background: #f8fafc;
  border-radius: 16rpx;
  overflow: hidden;
  border: 2rpx solid transparent;
  transition: all 0.2s ease;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.form-picker:active {
  border-color: #0f766e;
  background: #ffffff;
  box-shadow: 0 0 0 4rpx rgba(15, 118, 110, 0.1);
}

.picker-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  height: 100%;
  width: 100%;
  font-size: 26rpx;
  color: #0f172a;
  line-height: 80rpx;
}


/* 登录区域 */
.login-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx 0;
}
</style>

