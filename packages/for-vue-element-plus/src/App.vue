<template>
  <sku :sku-info="data"/>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import Sku from "./sku.vue";

export default defineComponent({
  name: 'App',
  components: {
    Sku,
  },
  setup() {
    const data = [['red', 'yellow'], ["33", "34"]]
    return {
      data
    }
  }
})
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}
</style>
