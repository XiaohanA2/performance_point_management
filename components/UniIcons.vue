<template>
  <view class="uni-icon-wrapper">
    <image
      class="uni-icon"
      :src="iconSrc"
      mode="aspectFit"
      :style="{ width: size + 'rpx', height: size + 'rpx' }"
    />
  </view>
</template>

<script>
const ICONS = {
  clock: {
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20z' },
      { d: 'M12 6v6l4 2' }
    ]
  },
  time: { alias: 'clock' },
  help: {
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20z' },
      { d: 'M9.5 9a2.5 2.5 0 1 1 3.5 2.2c-.8.4-1.5 1-1.5 2v1.3' },
      { d: 'M12 17.5h.01', stroke: false, fill: true }
    ]
  },
  closeempty: {
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M6 6l12 12' },
      { d: 'M18 6l-12 12' }
    ]
  },
  compose: {
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M4 15.5V20h4.5L20 8.5l-4.5-4.5L4 15.5z', stroke: false, fill: true },
      { d: 'M12 5l4.5 4.5' }
    ]
  },
  trash: {
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M5 7h14' },
      { d: 'M9 7V5h6v2' },
      { d: 'M9 7v10' },
      { d: 'M15 7v10' },
      { d: 'M7 7v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7' }
    ]
  },
  medal: {
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M12 2a7 7 0 1 1 0 14 7 7 0 0 1 0-14z' },
      { d: 'M8.5 13.5L7 22l5-3 5 3-1.5-8.5' }
    ]
  },
  trophy: {
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M7 4h10v3a5 5 0 0 1-5 5 5 5 0 0 1-5-5V4z' },
      { d: 'M9 4H5v3a4 4 0 0 0 4 4' },
      { d: 'M15 4h4v3a4 4 0 0 1-4 4' },
      { d: 'M10 15h4v3H10z' },
      { d: 'M8 21h8' }
    ]
  },
  wallet: {
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M4 7h16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z' },
      { d: 'M16 7V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v4' },
      { d: 'M16 12h2' }
    ]
  },
  shop: {
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M3 10l2-6h14l2 6' },
      { d: 'M5 10v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8' },
      { d: 'M10 14h4v6h-4z' }
    ]
  },
  home: {
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M4 11l8-7 8 7' },
      { d: 'M5 10v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9' },
      { d: 'M10 14h4v7h-4z' }
    ]
  },
  cart: {
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M4 6h2l2.5 9h9l1.5-6H7' },
      { d: 'M10 20a1 1 0 1 1-2 0 1 1 0 0 1 2 0z', stroke: false, fill: true },
      { d: 'M17 20a1 1 0 1 1-2 0 1 1 0 0 1 2 0z', stroke: false, fill: true }
    ]
  },
  redo: {
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M17 7h4v4' },
      { d: 'M21 11a8 8 0 1 1-2.34-5.66L21 7' }
    ]
  },
  flag: {
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M6 3v18' },
      { d: 'M6 4h11l-2 5 2 5H6' }
    ]
  },
  gear: {
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M12 15a3 3 0 1 1 0-6 3 3 0 0 1 0 6z' },
      {
        d: 'M12 4l1 2 2.2.3 1.5-1.5 2 2-1.5 1.5.3 2.2 2 1v3l-2 1-.3 2.2 1.5 1.5-2 2-1.5-1.5-2.2.3-1 2h-2l-1-2-2.2-.3-1.5 1.5-2-2 1.5-1.5L4.7 15l-2-1v-3l2-1 .3-2.2L3.5 6.3l2-2 1.5 1.5L9.2 5l1-2z'
      }
    ]
  },
  circle: {
    viewBox: '0 0 24 24',
    paths: [{ d: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z' }]
  },
  branch: {
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M12 2a6 6 0 0 1 6 6c0 4.5-6 11-6 11s-6-6.5-6-11a6 6 0 0 1 6-6z' },
      { d: 'M12 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4z', stroke: false, fill: true }
    ]
  },
  chevron: {
    viewBox: '0 0 24 24',
    paths: [{ d: 'M8 10l4 4 4-4' }]
  },
  trophybadge: { alias: 'trophy' }
};

function resolveIcon(type) {
  const icon = ICONS[type];
  if (!icon) {
    return ICONS.circle;
  }
  if (icon.alias) {
    return resolveIcon(icon.alias);
  }
  return icon;
}

export default {
  name: 'UniIcons',
  props: {
    type: {
      type: String,
      default: 'circle'
    },
    size: {
      type: [Number, String],
      default: 44
    },
    color: {
      type: String,
      default: '#1f2933'
    }
  },
  computed: {
    iconSrc() {
      const icon = resolveIcon(this.type);
      const paths = icon.paths
        .map(path => {
          const strokeColor = path.stroke === false ? 'none' : this.color;
          const fillColor = path.fill ? this.color : 'none';
          const strokeWidth = path.stroke === false ? 0 : (icon.strokeWidth || 1.8);
          return `<path d="${path.d}"
            fill="${fillColor}"
            stroke="${strokeColor}"
            stroke-width="${strokeWidth}"
            stroke-linecap="${icon.linecap || 'round'}"
            stroke-linejoin="${icon.linejoin || 'round'}" />`;
        })
        .join('');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${icon.viewBox}" fill="none">${paths}</svg>`;
      return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    }
  }
};
</script>

<style scoped>
.uni-icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.uni-icon {
  display: block;
  vertical-align: middle;  /* 解决块级元素的垂直对齐问题 */
}
</style>
