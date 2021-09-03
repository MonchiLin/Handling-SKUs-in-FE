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
import { ItemModelKind, itemModelKinds, ItemModelKindZHMapper } from "@sku/core/src/sku-service";
import { SkuAdjoinMatrix } from "@sku/core/src/sku-matrix";
import { SkuGraph } from "@sku/core/src/sku-graph";

const notNil = _.negate(_.isNil)

export default defineComponent({
  components: {},
  props: {},
  setup: () => {
    const checkeds = ref<Record<string, number | null>>({})
    const skuService = useSKUService();
    const item = computed(() => skuService.currentItem)
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

      /**
       * 每个按钮都有五种情况
       * 1. 未选中任何型号，但是商品型号没有任何一个规格有库存    【不可选】
       * 2. 选中了其他商品型号，与改商品型号生成的规格无库存，    【不可选】
       * 3. 选中了其他商品型号，与改商品型号生成的规格有库存，    【可以】
       * 4. 选中了当前商品型号，可以选择，相当于反选            【可选】
       * 5. 未选中任何型号，并且该商品型号至少存在一个规格有库存  【可选】
       *
       * 第一种是一个特殊的情况，在这种情况下任何时候改商品型号都无法被选择
       *
       * 假设有如下商品型号
       * color: ['红色', '蓝色']
       * size: ['小', '中']
       * edition: ['lite']
       *
       * 可得出笛卡尔积如下
       * * [
       * { color: '红色', size: '小', edition: 'lite', quantity: 1 },
       * 注意，这一条也是一个有效的商品规格，但是它的库存是 0，所以在生成图的时候我们可以认为这条记录不计入图边的生成
       * { color: '红色', size: '中', edition: 'lite', quantity: 0 },
       * { color: '蓝色', size: '小', edition: 'lite', quantity: 1 },
       * { color: '蓝色', size: '中', edition: 'lite', quantity: 1 },
       * ]
       *
       * 通过笛卡尔积可以生成如下数据结构的图
       * { vertex: "红色", adj: ["小", "lite"] }
       * { vertex: "蓝色", adj: ["小", "中", "lite"] }
       * { vertex: "小", adj: ["红色", "蓝色", "lite"] }
       * { vertex: "中", adj: [蓝色", "lite"] }
       * { vertex: "lite", adj: ["红色", "蓝色", "小", "中"] }
       *
       *
       *
       * 由图转换为相邻矩阵
       *      红色 蓝色  小  中  Lite
       * 红色 | 0 | 0 | 1 | 0 | 1 |
       * 蓝色 | 0 | 0 | 1 | 1 | 1 |
       * 小   | 1 | 1 | 0 | 0 | 1 |
       * 中   | 0 | 1 | 0 | 0 | 1 |
       * Lite | 1 | 1 | 1 | 1 | 0 |
       *
       * Aasd6^*&%&^asd&(*
       *
       * 通过上面矩阵使用后会发现
       * 如果选中了红色，则无法在选择蓝色
       * 如果选中了小，则无法在选择中
       * 所以就意味着，我们还需要将上面的矩阵转换为下面这样（即，同种类的商品型号也要链接起来）
       * 那么这一步应该在哪里进行呢？根据从上至下的阅读方式，现在我们已经进展到了根据图生成相邻矩阵的步骤
       * 那么是否就应该在生成相邻矩阵的时候来处理呢？
       * 答案当然是：No
       * 相邻矩阵只从图中的顶点和边生成，否则整个逻辑将会非常复杂 AdjoinMatrix.of，还需要商品的 stocks(sku) 数据
       * 读者："那你他喵的为什么不早说？"
       * 作者："当然是为了等到问题在出现，再开始想解决方案(PS: 请已经先想到的小伙伴不要鄙视笔者hhhhh)"
       *
       *
       */

      const graph = SkuGraph.of({
        itemModels: skuService.currentItemModels,
        itemStocks: skuService.currentItemStocks,
        itemBundles: skuService.currentItemBundles,
      })

      const adjoinMatrix = SkuAdjoinMatrix.of(graph)
      // console.table(adjoinMatrix.toString())

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

    const getModelKindName = (modelKind: ItemModelKind) => {
      return ItemModelKindZHMapper[modelKind]
    }

    const initialize = () => {
      checkeds.value = Object.keys(skuService.itemModelGroupByModelKindUsed)
          .reduce((previousValue, currentValue) => {
            return {...previousValue, [currentValue]: null}
          }, {})
    }

    const onRadioClick = _.debounce(100, (itemModelKind: ItemModelKind, itemModel: SKUTypeDefinition.ItemModel, disabled: boolean) => {
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
      return itemModelKinds.some(key => _.isNil(checkeds.value[key]))
    })

    const handleOrder = () => {
      const stock = skuService.findStock(selectedItemModels.value, skuService.currentItemStocks)
      if (stock) {
        message.success("购买成功，请注意库存变化")
        skuService.updateStock(stock, {quantity: stock.quantity - 1})
        initialize()
      }
    }

    onBeforeMount(() => {
      initialize()
    })

    return {
      item,
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
