<template>
  <a-collapse v-model:activeKey="modelActiveKey">
    <a-collapse-panel v-for="kind of itemModelKinds" :key="kind" :header="getHeader(kind)">
      <div style="display: flex; flex-direction: row;flex-wrap: wrap;">
        <item-model-creator @create="handleModelKindCreate(kind, $event)"/>
        <a-card v-for="model of getModelKindOf(kind)" :title="model.name" style="width: 300px">
          <template #extra>
            <DeleteOutlined @click="handleModelRemove(model)"/>
          </template>
          <p>ModelId: {{ model.modelId }}</p>
        </a-card>
      </div>
    </a-collapse-panel>
  </a-collapse>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons-vue';
import ItemModelCreator from "./item-model-creator.vue";
import { useSKUService } from "../sku-service-vue";
import { ItemModelKind, itemModelKinds, ItemModelKindZHMapper } from "@sku/core/src/sku-service";
import { SKUTypeDefinition } from "@sku/core/src/sku-type-definition";

export default defineComponent({
  components: {ItemModelCreator, DeleteOutlined, PlusOutlined},
  props: {},
  setup: () => {
    const skuService = useSKUService();
    const item = computed(() => skuService.currentItem)
    const itemModels = computed(() => {
      return skuService.db.models.filter(model => model.itemId === item.value.itemId)
    })
    const modelActiveKey = ref(itemModelKinds)

    const handleModelRemove = (model: SKUTypeDefinition.ItemModel) => {
      skuService.modelDelete(model)
    }

    const handleModelKindCreate = (modelKind: string, name: string) => {
      skuService.modelUpsert({
        itemId: item.value.itemId,
        modelKind: modelKind,
        name: name
      })
    }

    const getModelKindOf = (kind: string) => {
      return itemModels.value.filter(model => model.modelKind === kind)
    }

    const getHeader = (kind: ItemModelKind) => {
      return ItemModelKindZHMapper[kind] + '(' + getModelKindOf(kind).length + ')'
    }

    return {
      item,
      getModelKindOf,
      modelActiveKey,
      handleModelRemove,
      handleModelKindCreate,
      ItemModelKindZHMapper,
      itemModelKinds,
      getHeader
    }
  }
})
</script>

<style scoped>
</style>
