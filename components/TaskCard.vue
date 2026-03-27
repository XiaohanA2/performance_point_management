<template>
  <view class="task-card">
    <!-- 个金模式：简化版 -->
    <template v-if="rule.isPFMode">
      <view class="task-card__header">
        <view class="task-card__info">
          <text class="task-card__title">{{ rule.name }}</text>
        </view>
        <view class="task-card__score">
          <text class="task-card__score-label">{{ rule.pfScoreLabel || '单位分数' }}</text>
          <text class="task-card__score-value">{{ rule.unitPrice || 0 }}/{{ rule.unit }}</text>
        </view>
      </view>

      <view class="task-card__form pf-form">
        <view class="task-card__field">
          <text class="task-card__label">完成数量（{{ rule.unit }}）</text>
          <input
            class="task-card__input"
            type="digit"
            :value="pfForm.value"
            :placeholder="'输入' + rule.unit + '数'"
            placeholder-style="font-size:26rpx;color:#cbd5e1"
            @input="handlePFInput"
          />
        </view>
      </view>

      <view class="task-card__footer">
        <view class="task-card__preview">
          <text class="task-card__preview-label">{{ rule.pfPreviewLabel || '预计得分' }}</text>
          <text class="task-card__preview-value">+{{ pfPreviewScore }} 分</text>
        </view>
        <button class="task-card__btn" @click="handlePFSubmit">立即提报</button>
      </view>
    </template>

    <!-- 个贷模式：原版 -->
    <template v-else>
      <view class="task-card__header">
        <view class="task-card__icon" :style="{ backgroundColor: rule.color || '#0f766e' }">
          <IconHelper :name="rule.icon || 'circle'" :size="24" color="#ffffff" />
        </view>
        <view class="task-card__info">
          <text class="task-card__title">{{ rule.name }}</text>
        </view>
        <view class="task-card__score">
          <text class="task-card__score-label">笔数分</text>
          <text class="task-card__score-value">{{ currentPointConfig.item }}/笔</text>
        </view>
      </view>

    <view v-if="rule.hasStockOption" class="task-card__segmented">
      <view
        class="task-card__segment"
        :class="{ 'task-card__segment--active': form.type === 'new' }"
        @click="form.type = 'new'"
      >
        新增
      </view>
      <view
        class="task-card__segment"
        :class="{ 'task-card__segment--active': form.type === 'stock' }"
        @click="form.type = 'stock'"
      >
        {{ rule.stockLabel || '存量' }}
      </view>
    </view>

    <view class="task-card__form">
      <view class="task-card__field">
        <text class="task-card__label">笔数</text>
        <input
          class="task-card__input"
          type="number"
          :value="form.count"
          placeholder="输入业务笔数"
          placeholder-style="font-size:26rpx;color:#cbd5e1"
          @input="handleInput($event, 'count')"
        />
      </view>
      <view class="task-card__field">
        <text class="task-card__label">授信金额（万元）</text>
        <input
          class="task-card__input"
          type="digit"
          :value="form.amount"
          placeholder="输入授信金额"
          placeholder-style="font-size:26rpx;color:#cbd5e1"
          @input="handleInput($event, 'amount')"
        />
      </view>
    </view>

    <view class="task-card__footer">
      <view class="task-card__preview">
        <text class="task-card__preview-label">预计得分</text>
        <text class="task-card__preview-value">+{{ previewScore }} 分</text>
      </view>
      <button class="task-card__btn" @click="handleSubmit">立即提报</button>
    </view>
    </template>
  </view>
</template>

<script>
import IconHelper from './IconHelper.vue';

export default {
  name: 'TaskCard',
  components: { IconHelper },
  props: {
    rule: {
      type: Object,
      required: true
    }
  },
  emits: ['submit'],
  data() {
    return {
      form: {
        count: '',
        amount: '',
        type: 'new'
      },
      pfForm: {
        value: ''
      }
    };
  },
  watch: {
    rule: {
      immediate: true,
      handler(val) {
        if (!val?.hasStockOption) {
          this.form.type = 'new';
        }
      }
    }
  },
  computed: {
    currentPointConfig() {
      if (this.form.type === 'stock' && this.rule.pointsStock) {
        return this.rule.pointsStock;
      }
      return this.rule.pointsNew || { item: 0, million: 0 };
    },
    previewScore() {
      const cfg =
        this.form.type === 'stock' && this.rule.pointsStock
          ? this.rule.pointsStock
          : this.rule.pointsNew;
      const itemScore = (Number(this.form.count) || 0) * (cfg?.item || 0);
      const amountScore = ((Number(this.form.amount) || 0) / 100) * (cfg?.million || 0);
      return (itemScore + amountScore).toFixed(2);
    },
    pfPreviewScore() {
      const value = Number(this.pfForm.value) || 0;
      const unitPrice = this.rule.unitPrice || 0;

      if (this.rule.isRequired && this.rule.benchmarkValue) {
        // 必选业务：标杆公式计算
        const benchmark = this.rule.benchmarkValue;
        if (value >= benchmark) {
          return unitPrice.toFixed(2);
        } else {
          return (unitPrice * (value / benchmark)).toFixed(2);
        }
      } else {
        // 加分业务：线性公式
        return (value * unitPrice).toFixed(2);
      }
    }
  },
  methods: {
    handleInput(event, key) {
      const value = event.detail.value;
      this.form[key] = value;
    },
    resetForm() {
      this.form.count = '';
      this.form.amount = '';
      this.form.type = 'new';
    },
    handleSubmit() {
      if (!this.form.count) {
        uni.showToast({ title: '请输入笔数', icon: 'none' });
        return;
      }
      if (Number(this.form.count) <= 0) {
        uni.showToast({ title: '笔数需大于0', icon: 'none' });
        return;
      }
      this.$emit('submit', {
        count: Number(this.form.count),
        amount: Number(this.form.amount) || 0,
        type: this.rule.hasStockOption ? this.form.type : 'new'
      });
      this.resetForm();
    },
    handlePFInput(event) {
      this.pfForm.value = event.detail.value;
    },
    handlePFSubmit() {
      if (!this.pfForm.value) {
        uni.showToast({ title: '请输入数量', icon: 'none' });
        return;
      }
      if (Number(this.pfForm.value) <= 0) {
        uni.showToast({ title: '数量需大于0', icon: 'none' });
        return;
      }
      this.$emit('submit', {
        value: Number(this.pfForm.value)
      });
      this.pfForm.value = '';
    }
  }
};
</script>

<style scoped>
.task-card {
  background: #ffffff;
  border-radius: 28rpx;
  padding: 32rpx;
  box-shadow: 0 20rpx 60rpx rgba(15, 118, 110, 0.08);
  margin-bottom: 32rpx;
}

.task-card__header {
  display: flex;
  align-items: center;
  margin-bottom: 28rpx;
}

.task-card__icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}

.task-card__info {
  flex: 1;
}

.task-card__title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2937;
}

.task-card__score {
  text-align: right;
}

.task-card__score-label {
  font-size: 22rpx;
  color: #9ca3af;
}

.task-card__score-value {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #0f766e;
  margin-top: 4rpx;
}

.task-card__segmented {
  display: flex;
  background: #f8fafc;
  border-radius: 16rpx;
  overflow: hidden;
  margin-bottom: 24rpx;
  border: 2rpx solid #e2e8f0;
}

.task-card__segment {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  font-size: 26rpx;
  color: #6b7280;
}

.task-card__segment--active {
  background: #ecfdf5;
  color: #0f766e;
  font-weight: 600;
}

.task-card__form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 24rpx;
  row-gap: 16rpx;
  margin-bottom: 24rpx;
}

.task-card__field {
  min-width: 0;
}

.task-card__label {
  display: block;
  font-size: 24rpx;
  color: #6b7280;
  margin-bottom: 12rpx;
}

.task-card__input {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: #f8fafc;
  border-radius: 18rpx;
  padding: 0 24rpx;
  font-size: 26rpx;
  color: #111827;
  box-sizing: border-box;
}

.task-card__footer {
  display: flex;
  align-items: flex-end;
  gap: 16rpx;
  margin-top: 16rpx;
}

.task-card__preview {
  flex: 1;
}

.task-card__preview-label {
  font-size: 24rpx;
  color: #6b7280;
}

.task-card__preview-value {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #0f766e;
  margin-top: 6rpx;
}

.task-card__btn {
  background: linear-gradient(to right, #0f766e, #0ea5e9);
  color: #fff;
  border: none;
  border-radius: 32rpx;
  padding: 16rpx 40rpx;
  font-size: 24rpx;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 200rpx;
  margin-left: auto;
  box-shadow: 0 10rpx 24rpx rgba(14, 165, 233, 0.25);
}

.task-card__desc {
  display: block;
  font-size: 24rpx;
  color: #9ca3af;
  margin-top: 8rpx;
}

.pf-form {
  display: block;
}

.pf-form .task-card__field {
  width: 100%;
}
</style>

