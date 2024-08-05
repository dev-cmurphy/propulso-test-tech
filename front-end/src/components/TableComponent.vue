<template>
    <div class="table-container">
      <h2>Métriques (tableau)</h2>
      <table>
        <thead>
          <tr>
            <th>Métrique</th>
            <th>Valeur</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(value, key) in tableData" :key="key">
            <td>{{ key }}</td>
            <td>{{ value }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </template>
  
  <script>
  export default {
    name: 'TableComponent',
    props: {
      tableData: {
        type: Object,
        required: true
      }
    }
  };
  </script>
  
  <style scoped>
  .table-container {
    margin-top: 20px;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
  }
  
  th, td {
    border: 1px solid #ddd;
    padding: 8px;
  }
  
  th {
    background-color: #f2f2f2;
    text-align: left;
  }
  </style>
  