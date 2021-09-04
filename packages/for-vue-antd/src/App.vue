<template>
  <manager/>
  <a-divider>我是分割线</a-divider>
  <selector/>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { SKUServiceProvide } from "./sku-service-vue";
import Manager from "./manager.vue";
import Selector from "./selector.vue";

export default defineComponent({
  name: 'App',
  components: {
    Selector,
    Manager
  },
  setup() {
    SKUServiceProvide()

    return {}
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
