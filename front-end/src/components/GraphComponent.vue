<template>
    <div>
      <canvas ref="canvas"></canvas>
    </div>
  </template>
  
  <script>
  import { defineComponent, onMounted, ref } from 'vue';
  import { Chart, registerables } from 'chart.js';
  
  Chart.register(...registerables);
  
  export default defineComponent({
    name: 'GraphComponent',
    props: {
      chartData: {
        type: Object,
        required: true,
      },
      chartOptions: {
        type: Object,
        default: () => ({}),
      },
      chartType: {
        type: String,
        default: 'line',
      },
    },
    setup(props) {
      const canvas = ref(null);
  
      onMounted(() => {
        new Chart(canvas.value, {
          type: props.chartType,
          data: props.chartData,
          options: props.chartOptions,
        });
      });
  
      return {
        canvas,
      };
    },
  });
  </script>
  
  <style scoped>
  div {
    width: 100%;
    height: 100%;
  }
  </style>
  