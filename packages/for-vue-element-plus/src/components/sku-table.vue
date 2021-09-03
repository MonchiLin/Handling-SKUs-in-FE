<template>
  <a-table
      style="margin-top: 10px;"
      :data-source="dataSource"
      :columns="columns"
      row-key="rowKey"
      bordered
      :pagination="false"
  >
    <template #unitPrice="{record}">
      <a-input-number :min="0" @change="onUnitPriceChange(record, $event)" :value="record.unitPrice"/>
    </template>
    <template #quantity="{record}">
      <a-input-number :min="0" @change="onQuantityChange(record, $event)" :value="record.quantity"/>
    </template>
    <template #sales="{record}">
      <a-input-number :min="0" @change="onSalesChange(record, $event)" :value="record.sales"/>
    </template>
  </a-table>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import { useSKUService } from '../sku-service-vue'
import _ from 'lodash/fp'
import { SkuRowSpanCalc } from "@sku/core/src/sku-row-span-calc";
import { SKUTypeDefinition } from "@sku/core/src/sku-type-definition";
import { ItemModelKindZHMapper } from "@sku/core/src/sku-service";

export default defineComponent({
  props: {},
  setup: () => {
    const skuService = useSKUService();

    const dataSource = computed(() => {
      const itemStocks = skuService.currentItemStocksWithModelKindUsedCountAsc
      const itemBundles = skuService.currentItemBundles
      const itemModels = skuService.currentItemModels
      if (_.isEmpty(itemModels)) {
        return []
      }

      // 根据 itemModeKind 分组，并且根据 itemModeKind 使用次数从大到小排序
      const itemModelGroupByKindOrderByKindUsedCount: any = _.pipe(
          _.toPairs,
          _.orderBy(
              _.pipe(
                  _.last,
                  _.size,
              ), 'desc'),
      )(skuService.itemModelGroupByModelKindUsed)

      const otherModelKinds = _.map(_.last)(itemModelGroupByKindOrderByKindUsedCount.slice(1))

      if (_.isEmpty(otherModelKinds)) {
        return []
      }

      const skuRowSpanCalc = SkuRowSpanCalc.of(itemModels, skuService.kindUsedSortedCountAsc.map(i => i[0]))
      const skuRowSpanCalcMapper = skuRowSpanCalc.mapper
      const kindUsedSortedCountAsc = skuService.kindUsedSortedCountAsc

      // console.clear()
      // console.log("skuRowSpanCalc", skuRowSpanCalc)
      console.log("实际行合并结果", skuRowSpanCalcMapper)
      console.log("kindUsedSortedCountAsc", kindUsedSortedCountAsc)
      // console.log("skuService.cartesianProd", _.cloneDeep(skuService.cartesianProd))

      const dataSource = itemStocks.flatMap((stock, rowIndex) => {
        const bundles = itemBundles.filter(bundle => bundle.bundle === stock.bundle)
        // console.log(_.cloneDeep(bundles))
        console.group(stock.bundle)
        const cols = bundles.reduce((prev, bundle) => {
          const model = itemModels.find(i => i.modelId === bundle.modelId)!
          console.log("model.name", model.name)
          return {
            ...prev,
            [model.modelKind]: model.name,
            [`${model.modelKind}Model`]: model,
          }
        }, {})
        console.groupEnd()

        // console.log(_.cloneDeep(cols))

        const record: Record<any, any> = {
          ...stock,
          ...cols,
          rowKey: rowIndex
        }

        kindUsedSortedCountAsc.forEach(([itemKind]) => {
          const rowCount = skuRowSpanCalcMapper[itemKind]
          if (rowIndex % rowCount === 0) {
            record[`${itemKind}RowSpan`] = rowCount
            // record[`${itemKind}RowSpan`] = 1
          } else {
            record[`${itemKind}RowSpan`] = 0
            // record[`${itemKind}RowSpan`] = 1
          }
        })
        return record
      })

      console.log(_.cloneDeep(dataSource))
      return dataSource
    })


    const columns = computed(() => {

      return [
        ...skuService.kindUsedSortedCountAsc.map(([kind]) => {
          return {
            title: ItemModelKindZHMapper[kind],
            dataIndex: kind,
            customRender: ({record}: any) => {
              const obj = {
                children: record[kind],
                props: {rowSpan: record[`${kind}RowSpan`]},
                // props: {rowSpan: 1},
              };
              return obj
            }
          }
        }),
        {
          title: "价格（元）",
          dataIndex: "unitPrice",
          slots: {customRender: 'unitPrice'},
        },
        {
          title: "库存",
          dataIndex: "quantity",
          slots: {customRender: 'quantity'},
        },
        {
          title: "销量",
          dataIndex: "sales",
          slots: {customRender: 'sales'},
        },
        {
          title: "SKU",
          dataIndex: "bundle",
        }
      ]
    })

    const onUnitPriceChange = (record: SKUTypeDefinition.ItemStock & Record<string, unknown>, newValue: number) => {
      skuService.updateStock(record, {unitPrice: newValue})
    }

    const onQuantityChange = (record: SKUTypeDefinition.ItemStock & Record<string, unknown>, newValue: number) => {
      skuService.updateStock(record, {quantity: newValue})
    }

    const onSalesChange = (record: SKUTypeDefinition.ItemStock & Record<string, unknown>, newValue: number) => {
      skuService.updateStock(record, {sales: newValue})
    }

    return {
      dataSource,
      columns,
      onUnitPriceChange,
      onQuantityChange,
      onSalesChange,
    }
  }
})
</script>

<style scoped>
</style>
