import _ from "lodash/fp";
import { SKUTypeDefinition } from "./sku-type-definition";
import { itemModelEq } from "./_fn";
import { Graph, GraphVertex } from "./_internal/graph";

export class SkuGraphVertex extends GraphVertex<SKUTypeDefinition.ItemModel> {
  get key() {
    return this.value.modelId.toString()
  }

  getFriendlyName(): string {
    return this.value.name
  }

  compare(b: SkuGraphVertex): boolean {
    return itemModelEq(this.value, b.value)
  }
}

export class SkuGraph extends Graph<SKUTypeDefinition.ItemModel> {
  _VertexCtor = SkuGraphVertex

  static of<T>(
    {
      itemModels,
      itemStocks,
      itemBundles,
      linkSameModelKind = true
    }: {
      itemModels: SKUTypeDefinition.ItemModel[],
      itemStocks: SKUTypeDefinition.ItemStock[],
      itemBundles: SKUTypeDefinition.ItemBundle[],
      linkSameModelKind?: boolean
    }
  ): SkuGraph {
    const graph = new SkuGraph()
    // 添加顶点
    itemModels.forEach(itemModel => {
      graph.addVertexUnWrapped(itemModel)
    })

    // 添加边
    itemStocks.forEach((stock) => {
      if (_.isNil(stock)) {
        throw new Error("传入了错误的 itemModels 或者 itemStocks 或者 itemBundles，未找到 stock")
      }
      const currentItemBundles = itemBundles.filter(a => a.bundle === stock.bundle)
      const currentItemModels = itemModels.filter(a => currentItemBundles.find(b => a.modelId === b.modelId))
      if (stock.quantity <= 0) {
        return
      }

      currentItemModels.reduce((prev, itemModel) => {
        if (linkSameModelKind) {
          // 将同种类的商品型号关联起来，如果不关联则会出现选中“小”，无法选中"大"
          const itemModelWithSameModelKind = itemModels.filter(a => a.modelKind === itemModel.modelKind && a.modelId !== itemModel.modelId)
          itemModelWithSameModelKind.forEach(other => {
            graph.addEdgeUnWrapped(other, itemModel)
          })
        }

        prev.forEach(prevItemModel => {
          graph.addEdgeUnWrapped(prevItemModel, itemModel)
        })
        return [...prev, itemModel]
      }, <SKUTypeDefinition.ItemModel[]>[])
    })

    return graph
  }

}
