<template>
  <a-card style="width: 300px">
    <template #title>
      <a-input style="width: 100px;" v-model:value="name" placeholder="请输入"/>
    </template>
    <template #extra>
      <check-outlined @click="handleCrated"/>
    </template>
    <p>输入型号名称，然后提交</p>
  </a-card>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { CheckOutlined } from '@ant-design/icons-vue';
import { message } from "ant-design-vue";

export default defineComponent({
  components: {
    CheckOutlined
  },
  setup(props, {emit}) {
    const name = ref("")
    const handleCrated = () => {
      if (!name.value) {
        return message.error("请输入名称")
      }
      emit("create", name.value)
      name.value = ""
    }

    return {
      name,
      handleCrated
    }
  }
})
</script>

<style>

</style>
