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
import { ModelKind } from "@sku/core/src/sku-service";

export default defineComponent({
  props: {},
  setup: () => {
    const skuService = useSKUService();

    const dataSource = computed(() => {
      const itemStocks = skuService.currentItemStocksWithItemModelAsc
      const itemBundles = skuService.currentItemBundles
      const itemModels = skuService.currentItemModels
      const skuRowSpanCalc = SkuRowSpanCalc.of(itemModels)
      const skuRowSpanCalcMapper = skuRowSpanCalc.mapper
      const kindUsedSortedCountAsc = skuService.kindUsedSortedCountAsc
      const dataSource = itemStocks.flatMap((stock, rowIndex) => {
        const bundles = itemBundles.filter(bundle => bundle.bundle === stock.bundle)
        const cols = bundles.reduce((prev, bundle) => {
          const model = itemModels.find(i => i.modelId === bundle.modelId)!
          return {
            ...prev,
            [model.modelKind]: model.name,
            [`${model.modelKind}Model`]: model,
          }
        }, {})

        const record: Record<any, any> = {
          ...stock,
          ...cols,
          rowKey: rowIndex
        }

        kindUsedSortedCountAsc.forEach((itemKind) => {
          const rowCount = skuRowSpanCalcMapper[itemKind]
          if (rowIndex % rowCount === 0) {
            record[`${itemKind}RowSpan`] = rowCount
          } else {
            record[`${itemKind}RowSpan`] = 0
          }
        })
        return record
      })

      return dataSource
    })


    const columns = computed(() => {

      return [
        ...skuService.kindUsedSortedCountAsc.map((modelKind) => {
          return {
            title: ModelKind.NameMapper.get(modelKind),
            dataIndex: modelKind,
            customRender: ({record}: any) => {
              const obj = {
                children: record[modelKind],
                props: {rowSpan: record[`${modelKind}RowSpan`]},
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
