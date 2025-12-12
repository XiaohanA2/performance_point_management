<template>
  <view class="edit-overlay">
    <view class="edit-modal">
      <view class="edit-modal__header">
        <text>{{ title || '编辑提报记录' }}</text>
        <view class="edit-modal__close" @click="cancelEdit">
          <uni-icons type="closeempty" :size="28" color="#fff" />
        </view>
      </view>
      <view class="edit-modal__body">
        <view class="edit-summary">
          <view class="edit-info">
            <text class="edit-title">{{ getRuleName(editingSubmission?.ruleId) }}</text>
            <text class="edit-subtitle">
              {{ getRuleCategory(editingSubmission?.ruleId) }}
            </text>
          </view>
        </view>

        <view v-if="getRule(editingSubmission?.ruleId)?.hasStockOption" class="edit-segmented">
          <view
            class="edit-segment"
            :class="{ active: editForm.type === 'new' }"
            @click="editForm.type = 'new'"
          >
            新增
          </view>
          <view
            class="edit-segment"
            :class="{ active: editForm.type === 'stock' }"
            @click="editForm.type = 'stock'"
          >
            {{ getRule(editingSubmission?.ruleId)?.stockLabel || '存量' }}
          </view>
        </view>

        <view class="edit-form-grid">
          <view class="form-item">
            <text class="form-label">笔数</text>
            <input
              class="form-input"
              type="number"
              v-model="editForm.count"
              placeholder="输入业务笔数"
            />
          </view>
          <view class="form-item">
            <text class="form-label">授信金额（万元）</text>
            <input
              class="form-input"
              type="digit"
              v-model="editForm.amount"
              placeholder="输入授信金额"
            />
          </view>
        </view>

        <view class="preview-box">
          <text class="preview-label">修改后积分</text>
          <text class="preview-value">+{{ calculatePreviewScore() }} 分</text>
        </view>
      </view>
      <view class="edit-modal__delete-section">
        <button class="modal-btn danger" @click="handleDeleteSubmission">删除记录</button>
      </view>
      <view class="edit-modal__footer">
        <button class="modal-btn ghost" @click="cancelEdit">取消</button>
        <button class="modal-btn primary" @click="confirmEdit">确认修改</button>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'SubmissionEditModal',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    editingSubmission: {
      type: Object,
      default: null
    },
    rules: {
      type: Array,
      default: () => []
    },
    title: {
      type: String,
      default: ''
    }
  },
  emits: ['cancel', 'confirm', 'delete'],
  data() {
    return {
      editForm: {
        count: '',
        amount: '',
        type: 'new'
      }
    };
  },
  watch: {
    editingSubmission: {
      immediate: true,
      handler(newVal) {
        if (newVal) {
          this.editForm = {
            count: newVal.count,
            amount: newVal.amount,
            type: newVal.type
          };
        }
      }
    }
  },
  methods: {
    getRule(ruleId) {
      return this.rules.find(rule => rule.id === ruleId);
    },
    getRuleName(ruleId) {
      const rule = this.getRule(ruleId);
      return rule ? rule.name : '未知业务';
    },
    getRuleCategory(ruleId) {
      const rule = this.getRule(ruleId);
      if (!rule) return '其他';
      return rule.category === 'personal' ? '个贷' : '小微';
    },
    calculatePreviewScore() {
      if (!this.editingSubmission) return '0.00';
      const rule = this.getRule(this.editingSubmission.ruleId);
      const cfg = this.editForm.type === 'stock' && rule?.pointsStock ? rule.pointsStock : rule?.pointsNew;
      const itemPoints = (Number(this.editForm.count) || 0) * (cfg?.item || 0);
      const amountPoints = ((Number(this.editForm.amount) || 0) / 100) * (cfg?.million || 0);
      return (itemPoints + amountPoints).toFixed(2);
    },
    cancelEdit() {
      this.$emit('cancel');
    },
    confirmEdit() {
      if (!this.editForm.count || Number(this.editForm.count) <= 0) {
        uni.showToast({ title: '请输入有效的笔数', icon: 'none' });
        return;
      }
      if (Number(this.editForm.amount) < 0) {
        uni.showToast({ title: '请输入正确的金额', icon: 'none' });
        return;
      }
      this.$emit('confirm', {
        ...this.editForm,
        count: Number(this.editForm.count),
        amount: Number(this.editForm.amount) || 0
      });
    },
    handleDeleteSubmission() {
      this.$emit('delete');
    }
  }
};
</script>

<style scoped>
.edit-overlay {
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

.edit-modal {
  width: 100%;
  max-width: 640rpx;
  background: #ffffff;
  border-radius: 32rpx;
  overflow: hidden;
}

.edit-modal__header {
  background: linear-gradient(to right, #0f766e, #0ea5e9);
  color: #fff;
  padding: 28rpx 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 30rpx;
  font-weight: 600;
}

.edit-modal__close {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.edit-modal__body {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.edit-summary {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.edit-info {
  flex: 1;
}

.edit-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #0f172a;
}

.edit-subtitle {
  font-size: 24rpx;
  color: #94a3b8;
}

.edit-segmented {
  display: flex;
  background: #f1f5f9;
  border-radius: 16rpx;
  overflow: hidden;
}

.edit-segment {
  flex: 1;
  text-align: center;
  padding: 18rpx 0;
  font-size: 26rpx;
  color: #64748b;
}

.edit-segment.active {
  background: #ecfdf5;
  color: #0f766e;
  font-weight: 600;
}

.edit-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 24rpx;
  row-gap: 16rpx;
  box-sizing: border-box;
  padding: 0;
}

.form-item {
  box-sizing: border-box;
  min-width: 0;
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
  font-size: 26rpx;
  color: #111827;
  box-sizing: border-box;
  border: none;
}

.preview-box {
  background: #ecfdf5;
  border-radius: 20rpx;
  padding: 20rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preview-label {
  font-size: 24rpx;
  color: #0f766e;
}

.preview-value {
  font-size: 34rpx;
  font-weight: 700;
  color: #0f766e;
}

.edit-modal__delete-section {
  padding: 0 32rpx 24rpx;
  border-top: 2rpx solid rgba(15, 23, 42, 0.05);
  margin-top: 16rpx;
}

.edit-modal__delete-section .modal-btn {
  width: 100%;
  margin: 0;
  background: #fee2e2;
  color: #b91c1c;
  border: 2rpx solid rgba(239, 68, 68, 0.25);
}

.edit-modal__footer {
  padding: 0 32rpx 32rpx;
  display: flex;
  gap: 16rpx;
}

.modal-btn {
  flex: 1;
  border-radius: 20rpx;
  padding: 18rpx 0;
  font-size: 28rpx;
}

.modal-btn.ghost {
  border: 2rpx solid rgba(15, 118, 110, 0.2);
  color: #0f766e;
  background: #fff;
}

.modal-btn.primary {
  background: linear-gradient(135deg, #0f766e, #0ea5e9);
  color: #fff;
}

.modal-btn.danger {
  background: #fee2e2;
  color: #b91c1c;
  border: 2rpx solid rgba(239, 68, 68, 0.25);
}
</style>