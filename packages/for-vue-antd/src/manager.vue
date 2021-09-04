<template>
  <a-card title="SKU 管理" :bordered="false">
    <a-row>
      <a-button type="primary" @click="handleExportData">获取当前数据</a-button>
      <a-button type="primary" @click="handleClear">清空当前数据</a-button>
    </a-row>
    <a-row>
      <a-button v-for="(_, index) of samples" :key="index" style="margin-right: 10px;" @click="loadSample(index)">加载示例数据{{ index }}</a-button>
    </a-row>

    <a-form :model="item" style="margin-top: 10px;">

      <a-form-item label="选择商品">
        <a-select
            ref="select"
            :value="item.itemId"
            style="width: 120px"
            @change="handleChange"
        >
          <a-select-option
              v-for="item of items"
              :key="item.itemId"
              :value="item.itemId"
          >
            {{ item.name }}
          </a-select-option>
        </a-select>
      </a-form-item>
    </a-form>

    <item-model-manager/>

    <sku-table/>
  </a-card>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons-vue';
import { useSKUService } from './sku-service-vue'
import SkuTable from "./components/sku-table.vue";
import ItemModelManager from "./components/item-model-manager.vue";
import { SKUTypeDefinition } from "@sku/core/src/sku-type-definition";
import _ from 'lodash';
import { message } from "ant-design-vue";

/**
 * Model: 所有定义的型号，4G，红色，黄色，mini，SE 都是型号
 *
 * Stock:  通过 bundle 来关联型号，表示 SKU 的数量(quantity)，单价(unitPrice)，总销量(totalSales),月销量(monthSales)
 *
 * Bundle: 通过 bundle 字段来标识一组数据，如下列数据结构，通过 1,2,3,4 四个型号(model)来构成一个 sku
 * [
 *  { bundle: 1, model: 1 }.
 *  { bundle: 1, model: 2 }.
 *  { bundle: 1, model: 3 }.
 *  { bundle: 1, model: 4 }
 * ]
 *
 *
 */

export default defineComponent({
  components: {ItemModelManager, SkuTable, DeleteOutlined, PlusOutlined},
  props: {},
  setup: () => {
    const skuService = useSKUService();
    const item = computed(() => skuService.currentItem)
    const items = computed(() => skuService.db.items)

    const handleChange = (itemId: number) => {
      Object.assign(skuService.currentItem, items.value.find(i => i.itemId === itemId)!)
    }

    const handleModelRemove = (model: SKUTypeDefinition.ItemModel) => {
      skuService.db.models = skuService.db.models.filter(i => !(i.modelId === model.modelId && i.itemId === item.value.itemId && model.modelKind === i.modelKind))
    }

    const loadSample = (sampleIndex: number) => {
      skuService.loadSample(sampleIndex)
    }

    const handleExportData = () => {
      message.success("已输出至控制台，按 F12 查看，复制后可以直接给 SKUService 的 db 属性赋值")
      console.group("当前数据")
      console.log(_.cloneDeep(skuService.db))
      console.groupEnd()
    }

    const handleClear = () => {
      skuService.initialize()
    }

    return {
      samples: skuService.samples,
      item,
      items,
      handleChange,
      handleModelRemove,
      loadSample,
      handleExportData,
      handleClear,
    }
  }
})
</script>

<style scoped>
</style>
