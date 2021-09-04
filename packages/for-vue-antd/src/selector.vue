<template>
  <a-card title="SKU 选择" :bordered="false">
    <div
        style="display: flex; flex-direction: row; align-items: center;margin-top: 10px;"
        v-for="(value, name) of itemModelsGroupByKindForView"
        :key="name"
    >
      <a-tag>{{ getModelKindName(name) }}</a-tag>
      <a-radio-group
          v-for="itemModel of value"
          :key="itemModel.modelId"
          :value="checkeds[name]"
      >
        <a-radio-button
            @click="onRadioClick(name, itemModel, itemModel.disabled)"
            :disabled="itemModel.disabled"
            :value="itemModel.modelId"
        >
          {{ itemModel.name }}
        </a-radio-button>
      </a-radio-group>
    </div>
    <div style="margin-top: 10px;display: flex">
      <a-button :disabled="orderDisabled" @click="handleOrder">下单</a-button>
      <a-button danger @click="initialize">重置</a-button>
    </div>
  </a-card>
</template>

<script lang="ts">
import { computed, defineComponent, onBeforeMount, ref } from 'vue'
import { useSKUService } from './sku-service-vue'
import _ from 'lodash/fp'
import { message } from "ant-design-vue";
import { SKUTypeDefinition } from "@sku/core/src/sku-type-definition";
import { ModelKind } from "@sku/core/src/sku-service";

const notNil = _.negate(_.isNil)

export default defineComponent({
  components: {},
  props: {},
  setup: () => {
    const checkeds = ref<Record<string, number | null>>({})
    const skuService = useSKUService();
    const itemModels = computed(() => skuService.currentItemModels)
    const getItemModelsOf = (modelKind: string) => {
      return itemModels.value.filter(i => i.modelKind === modelKind)
    }

    const hasCheckedSomeOne = computed(() => {
      return Object.keys(checkeds.value)
          .some(key => notNil((checkeds.value[key])))
    })

    const hasChecked = (itemModel: SKUTypeDefinition.ItemModel) => {
      return Object.keys(checkeds.value)
          .some(key => checkeds.value[key] === itemModel.modelId)
    }

    const selectedItemModels = computed(() => {
      return Object.keys(checkeds.value!)
          .reduce((previousValue, currentValue) => {
            if (_.isNil(checkeds.value![currentValue])) {
              return previousValue
            }
            const itemModel = skuService.currentItemModels.find(a => a.modelId === checkeds.value![currentValue])!
            return [...previousValue, itemModel]
          }, <SKUTypeDefinition.ItemModel[]>[])
    })

    const itemModelsGroupByKindForView = computed(() => {
      const adjoinMatrix = skuService.adjoinMatrix
      const itemModelGroupByModelKindUsed = skuService.itemModelGroupByModelKindUsed

      if (!hasCheckedSomeOne.value) {
        return Object.keys(itemModelGroupByModelKindUsed)
            .reduce((prev, modelKind) => {
              const itemModels = itemModelGroupByModelKindUsed[modelKind]
              const itemModelsWithDisabled = itemModels.map(a => {
                return {
                  ...a,
                  disabled: false
                }
              })

              return {...prev, [modelKind]: itemModelsWithDisabled}
            }, {})
      }

      const matrixCalculateFlags = adjoinMatrix.calculateFlagByValues(...selectedItemModels.value);
      const {conjoint, disjunct} = adjoinMatrix.getValueFromCalculateFlags(...matrixCalculateFlags)

      return Object.keys(itemModelGroupByModelKindUsed)
          .reduce((prev, modelKind) => {
            const itemModels = itemModelGroupByModelKindUsed[modelKind]
            const itemModelsWithDisabled = itemModels.map(a => {
              const eq = conjoint.some((b: any) => a.modelId === b.modelId)
              let disabled = false

              if (hasChecked(a)) {
                disabled = false
              } else if (eq) {
                disabled = false
              } else {
                disabled = true
              }

              return {
                ...a,
                disabled
              }
            })

            return {...prev, [modelKind]: itemModelsWithDisabled}
          }, {})
    })

    const getModelKindName = (modelKind) => {
      return ModelKind.NameMapper.get(modelKind)
    }

    const initialize = () => {
      checkeds.value = Object.keys(skuService.itemModelGroupByModelKindUsed)
          .reduce((previousValue, currentValue) => {
            return {...previousValue, [currentValue]: null}
          }, {})
    }

    const onRadioClick = _.debounce(100, (itemModelKind: string, itemModel: SKUTypeDefinition.ItemModel, disabled: boolean) => {
      if (disabled) {
        return
      }

      const modelId = itemModel.modelId

      checkeds.value[itemModelKind] = _.isNil(checkeds.value[itemModelKind])
          ? modelId
          : checkeds.value[itemModelKind] === modelId
              ? null
              : modelId
    })

    const orderDisabled = computed(() => {
      return skuService.kindUsedSortedCountAsc.some(key => _.isNil(checkeds.value[key]))
    })

    const handleOrder = () => {
      const stock = skuService.findStock(selectedItemModels.value, skuService.currentItemStocks)
      if (stock) {
        skuService.updateStock(stock, {quantity: stock.quantity - 1})
        message.success("购买成功，请注意库存变化")
        initialize()
      }
    }

    onBeforeMount(() => {
      initialize()
    })

    return {
      itemModels,
      getItemModelsOf,
      getModelKindName,
      checkeds,
      initialize,
      itemModelsGroupByKindForView,
      onRadioClick,
      orderDisabled,
      handleOrder,
    }
  }
})
</script>

<style scoped>
</style>
