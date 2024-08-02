<template>
    <div class="home">
      <h1>Métriques</h1>
      <div class="graphs">
        <div v-if="loading" class="spinner"></div>
        <GraphComponent
          v-else
          v-for="(data, index) in graphs"
          :key="index"
          :chartData="data.chartData"
          :chartOptions="data.chartOptions"
          :chartType="data.chartType"
        />
      </div>
    </div>
  </template>
  

  <script>
  import GraphComponent from '@/components/GraphComponent.vue';
  
  export default {
    name: 'HomeView',
    components: {
      GraphComponent,
    },
    data() {
      return {
        graphs: [],
        loading: true, // Initialize loading state
      };
    },
    created() {
      this.fetchGraphData();
    },
    methods: {
      async fetchGraphData() {
        try {
          const response = await fetch('http://localhost:3000/graphs'); 
          const data = await response.json();
  
          this.graphs = data.map(item => ({
            chartData: {
              labels: item.labels,
              datasets: [{
                label: item.title,
                data: item.data,
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1,
              }]
            },
            chartOptions: {
              responsive: true,
              maintainAspectRatio: false
            },
            chartType: item.chartType,
          }));
  
          this.loading = false; 
        } catch (error) {
          console.error('Error fetching graph data:', error);
          this.loading = false; 
        }
      },
    },
  };
  </script>
  

  <style scoped>
  .home {
    padding: 20px;
  }
  
  .graphs {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
  
  .graphs > * {
    width: 100%;
    height: 300px;
  }
  
  .spinner {
    margin: auto;
    border: 8px solid #f3f3f3; /* Light grey */
    border-top: 8px solid #3498db; /* Blue */
    border-radius: 50%;
    width: 60px;
    height: 60px;
    animation: spin 2s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  </style>
  