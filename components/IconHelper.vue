<template>
  <view class="icon-helper">
    <uni-icons :type="resolvedType" :size="size" :color="color" />
  </view>
</template>

<script>
export default {
  name: 'IconHelper',
  props: {
    name: {
      type: String,
      default: 'circle'
    },
    size: {
      type: Number,
      default: 30
    },
    color: {
      type: String,
      default: '#ffffff'
    }
  },
  computed: {
    resolvedType() {
      const map = {
        home: 'home',
        building: 'shop',
        building2: 'shop',
        cart: 'cart',
        wallet: 'wallet',
        compose: 'compose',
        shop: 'shop',
        redo: 'redo',
        flag: 'flag',
        gear: 'gear',
        circle: 'circle',
        medal: 'medal',
        trophy: 'trophy',
        branch: 'location'
      };
      return map[this.name] || this.name || 'circle';
    }
  }
};
</script>

<style scoped>
.icon-helper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>

