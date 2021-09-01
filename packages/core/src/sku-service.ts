import _ from "lodash/fp";
import { SkuMemoryDb } from "./sku-memory-db";
import { SKUTypeDefinition } from "./sku-type-definition";
import { cartesian, itemStockEq, replaceAt } from "./_fn";

// 预定义的 itemModelKind
export enum ItemModelKind {
  color = "color",
  edition = "edition",
  size = "size",
}

export const itemModelKinds = [
  ItemModelKind.color,
  ItemModelKind.edition,
  ItemModelKind.size,
] as const


export enum ItemModelKindZHMapper {
  color = "颜色",
  edition = "版本",
  size = "尺寸",
}


/**
 * Model: 4G，红色，黄色，mini，SE 都是型号
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


export class SKUService {
  db = new SkuMemoryDb()
  currentItem!: SKUTypeDefinition.Item

  constructor() {
    this.initialize()
    this.loadSample1()
  }

  public initialize() {
    this.db = {
      items: [
        {
          itemId: 1,
          name: "Windows"
        }
      ],
      bundles: [],
      stocks: [],
      models: []
    }
    this.currentItem = this.db.items[0]
  }

  get currentItemModels() {
    return this.db.models.filter(i => i.itemId === this.currentItem.itemId)
      .map(itemModel => {
        const item = this.db.items.find(i => i.itemId === this.currentItem.itemId)
        return {
          item,
          ...itemModel
        }
      })
  }

  get currentItemBundles() {
    return this.db.bundles.filter(i => i.itemId === this.currentItem.itemId)
      .map(bundle => {
        const item = this.db.items.find(i => i.itemId === this.currentItem.itemId)
        const model = this.db.models.find(i => i.itemId && this.currentItem.itemId && i.modelId === bundle.modelId)
        return {
          item,
          model,
          ...bundle
        }
      })
  }

  get currentItemStocks() {
    return this.db.stocks.filter(i => i.itemId === this.currentItem.itemId)
      .map(stock => {
        const item = this.db.items.find(i => i.itemId === this.currentItem.itemId)
        const bundles = this.db.bundles.filter(i => i.itemId === this.currentItem.itemId && i.bundle === stock.bundle)
        return {
          item,
          bundles,
          ...stock
        }
      })
  }

  // 当前使用的所有商品型号，通过商品型号种类区分
  get itemModelGroupByModelKindUsed() {
    return _.groupBy(i => i.modelKind, this.currentItemModels)
  }

  // 当前使用的所有商品型号，通过商品型号种类区分
  get cartesianProd() {
    return cartesian(_.values(this.itemModelGroupByModelKindUsed))
  }

  get kindUsedSortedCountAsc(): [ItemModelKind, SKUTypeDefinition.ItemModel[]][] {
    return _.pipe(
      _.toPairs,
      _.orderBy(
        _.pipe(
          _.last,
          _.size,
        ), 'asc')
    )(this.itemModelGroupByModelKindUsed) as any
  }

  _updateBundlesAndStocks(): void {
    const itemId = this.currentItem.itemId
    this.db.bundles = this.db.bundles.filter(bundle => bundle.itemId !== itemId)
    this.db.stocks = this.db.stocks.filter(stock => stock.itemId !== itemId)
    const cartesianProd = this.cartesianProd
    const bundles = cartesianProd.flatMap((itemModelGroup, index) => {
      return itemModelGroup.map(itemModel => {
        return <SKUTypeDefinition.ItemBundle>{
          itemId: itemId,
          bundle: index,
          modelId: itemModel.modelId
        }
      })
    })
    this.db.bundles.push(...bundles)

    const stocks = cartesianProd.flatMap((itemModelGroup, index) => {
      return <SKUTypeDefinition.ItemStock>{
        itemId: itemId,
        bundle: index,
        sales: 0,
        quantity: 1,
        unitPrice: 0,
      }
    })

    this.db.stocks.push(...stocks)
  }

  updateStockByIndex(newStock: Partial<Pick<SKUTypeDefinition.ItemStock, "quantity" | "unitPrice">>, index: number) {
    const oldStock = this.db.stocks[index]
    this.db.stocks = replaceAt(
      index,
      {...oldStock, ...newStock},
      this.db.stocks,
    )
  }

  updateStock(stock: SKUTypeDefinition.ItemStock, newStock: Partial<Pick<SKUTypeDefinition.ItemStock, "sales" | "quantity" | "unitPrice">>) {
    const index = this.db.stocks.findIndex((a) => itemStockEq(a, stock))
    const newData: SKUTypeDefinition.ItemStock = {...stock, ...newStock}
    this.db.stocks = replaceAt(index, newData, this.db.stocks)
  }

  modelUpsert(model: Omit<SKUTypeDefinition.ItemModel, "modelId">) {
    const index = this.db.models.findIndex(i => i.modelKind === model.modelKind && i.itemId === model.itemId && i.name === model.name)
    if (index === -1) {
      const prev = _.last(this.db.models)
      const modelId = _.isNil(prev) ? 0 : prev.modelId + 1
      this.db.models.push({...model, modelId: modelId})
      this._updateBundlesAndStocks()
    } else {
      const theModel = this.db.models[index]
      theModel.name = model.name
    }
    this.db.models
  }

  modelDelete(model: SKUTypeDefinition.ItemModel) {
    const index = this.db.models.findIndex(i => i.modelId === model.modelId && i.modelKind === model.modelKind && i.itemId === model.itemId)
    if (index !== -1) {
      this.db.models = _.pullAt([index], this.db.models)
      this._updateBundlesAndStocks()
    }
    return this.db.models
  }

  findStockIndex(itemModels: SKUTypeDefinition.ItemModel[], stocks: SKUTypeDefinition.ItemStock[]) {
    const itemModelIds = itemModels.map(i => i.modelId)
    return stocks.findIndex(stock => {
      const bundles = this.db.bundles.filter(a => a.bundle === stock.bundle && a.itemId === a.itemId)
      const itemModelIdsCopy = _.cloneDeep(itemModelIds)

      for (const bundle of bundles) {
        for (let i = 0; i < itemModelIdsCopy.length; i++) {
          if (bundle.modelId === itemModelIdsCopy[i]) {
            itemModelIdsCopy.splice(i, 1)
            break
          }
        }

        if (_.isEmpty(itemModelIdsCopy)) {
          return true
        }
      }

      return false
    })
  }

  findStock(itemModels: SKUTypeDefinition.ItemModel[], stocks: SKUTypeDefinition.ItemStock[]) {
    const stockIndex = this.findStockIndex(itemModels, stocks)
    return stockIndex > -1 ? stocks[stockIndex] : undefined
  }

  loadSample1() {
    this.initialize()

    this.modelUpsert({
        itemId: this.currentItem.itemId,
        modelKind: ItemModelKind.size,
        name: "小",
      }
    )
    this.modelUpsert({
        itemId: this.currentItem.itemId,
        modelKind: ItemModelKind.color,
        name: "蓝色",
      }
    )
    this.modelUpsert({
        itemId: this.currentItem.itemId,
        modelKind: ItemModelKind.edition,
        name: "Lite",
      }
    )
    this.modelUpsert({
        itemId: this.currentItem.itemId,
        modelKind: ItemModelKind.color,
        name: "红色",
      }
    )
    this.modelUpsert({
        itemId: this.currentItem.itemId,
        modelKind: ItemModelKind.edition,
        name: "Plus",
      }
    )
    this.modelUpsert({
        itemId: this.currentItem.itemId,
        modelKind: ItemModelKind.edition,
        name: "Max",
      }
    )
    this.modelUpsert({
        itemId: this.currentItem.itemId,
        modelKind: ItemModelKind.edition,
        name: "Pro X",
      }
    )
  }

  loadSample2() {
    this.initialize()

    this.modelUpsert({
        itemId: this.currentItem.itemId,
        modelKind: ItemModelKind.size,
        name: "小",
      }
    )
    this.modelUpsert({
        itemId: this.currentItem.itemId,
        modelKind: ItemModelKind.size,
        name: "中",
      }
    )
    this.modelUpsert({
        itemId: this.currentItem.itemId,
        modelKind: ItemModelKind.color,
        name: "蓝色",
      }
    )
    this.modelUpsert({
        itemId: this.currentItem.itemId,
        modelKind: ItemModelKind.edition,
        name: "Lite",
      }
    )
    this.modelUpsert({
        itemId: this.currentItem.itemId,
        modelKind: ItemModelKind.color,
        name: "红色",
      }
    )
  }

  // 用于测试 SKU 选择
  loadSample3() {
    this.initialize()

    this.db.models.push(
      {
        itemId: this.currentItem.itemId,
        modelId: 0,
        modelKind: ItemModelKind.color,
        name: "红色"
      },
      {
        itemId: this.currentItem.itemId,
        modelId: 1,
        modelKind: ItemModelKind.color,
        name: "蓝色"
      },
      {
        itemId: this.currentItem.itemId,
        modelId: 2,
        modelKind: ItemModelKind.size,
        name: "小"
      },
      {
        itemId: this.currentItem.itemId,
        modelId: 3,
        modelKind: ItemModelKind.size,
        name: "中"
      },
      {
        itemId: this.currentItem.itemId,
        modelId: 4,
        modelKind: ItemModelKind.edition,
        name: "Lite"
      },
    )
    this._updateBundlesAndStocks()
    this.db.stocks[0].quantity = 1
    this.db.stocks[1].quantity = 0
    this.db.stocks[2].quantity = 1
    this.db.stocks[3].quantity = 1
  }

  // 用于测试 Table 渲染
  loadSample4() {
    this.initialize()

    this.db = {
      "items": [{"itemId": 1, "name": "Windows"}],
      "bundles": [{"itemId": 1, "bundle": 0, "modelId": 0}, {"itemId": 1, "bundle": 0, "modelId": 1}, {
        "itemId": 1,
        "bundle": 0,
        "modelId": 2
      }, {"itemId": 1, "bundle": 1, "modelId": 0}, {"itemId": 1, "bundle": 1, "modelId": 1}, {
        "itemId": 1,
        "bundle": 1,
        "modelId": 4
      }, {"itemId": 1, "bundle": 2, "modelId": 0}, {"itemId": 1, "bundle": 2, "modelId": 1}, {
        "itemId": 1,
        "bundle": 2,
        "modelId": 5
      }, {"itemId": 1, "bundle": 3, "modelId": 0}, {"itemId": 1, "bundle": 3, "modelId": 1}, {
        "itemId": 1,
        "bundle": 3,
        "modelId": 6
      }, {"itemId": 1, "bundle": 4, "modelId": 0}, {"itemId": 1, "bundle": 4, "modelId": 3}, {
        "itemId": 1,
        "bundle": 4,
        "modelId": 2
      }, {"itemId": 1, "bundle": 5, "modelId": 0}, {"itemId": 1, "bundle": 5, "modelId": 3}, {
        "itemId": 1,
        "bundle": 5,
        "modelId": 4
      }, {"itemId": 1, "bundle": 6, "modelId": 0}, {"itemId": 1, "bundle": 6, "modelId": 3}, {
        "itemId": 1,
        "bundle": 6,
        "modelId": 5
      }, {"itemId": 1, "bundle": 7, "modelId": 0}, {"itemId": 1, "bundle": 7, "modelId": 3}, {
        "itemId": 1,
        "bundle": 7,
        "modelId": 6
      }, {"itemId": 1, "bundle": 8, "modelId": 7}, {"itemId": 1, "bundle": 8, "modelId": 1}, {
        "itemId": 1,
        "bundle": 8,
        "modelId": 2
      }, {"itemId": 1, "bundle": 9, "modelId": 7}, {"itemId": 1, "bundle": 9, "modelId": 1}, {
        "itemId": 1,
        "bundle": 9,
        "modelId": 4
      }, {"itemId": 1, "bundle": 10, "modelId": 7}, {"itemId": 1, "bundle": 10, "modelId": 1}, {
        "itemId": 1,
        "bundle": 10,
        "modelId": 5
      }, {"itemId": 1, "bundle": 11, "modelId": 7}, {"itemId": 1, "bundle": 11, "modelId": 1}, {
        "itemId": 1,
        "bundle": 11,
        "modelId": 6
      }, {"itemId": 1, "bundle": 12, "modelId": 7}, {"itemId": 1, "bundle": 12, "modelId": 3}, {
        "itemId": 1,
        "bundle": 12,
        "modelId": 2
      }, {"itemId": 1, "bundle": 13, "modelId": 7}, {"itemId": 1, "bundle": 13, "modelId": 3}, {
        "itemId": 1,
        "bundle": 13,
        "modelId": 4
      }, {"itemId": 1, "bundle": 14, "modelId": 7}, {"itemId": 1, "bundle": 14, "modelId": 3}, {
        "itemId": 1,
        "bundle": 14,
        "modelId": 5
      }, {"itemId": 1, "bundle": 15, "modelId": 7}, {"itemId": 1, "bundle": 15, "modelId": 3}, {
        "itemId": 1,
        "bundle": 15,
        "modelId": 6
      }, {"itemId": 1, "bundle": 16, "modelId": 8}, {"itemId": 1, "bundle": 16, "modelId": 1}, {
        "itemId": 1,
        "bundle": 16,
        "modelId": 2
      }, {"itemId": 1, "bundle": 17, "modelId": 8}, {"itemId": 1, "bundle": 17, "modelId": 1}, {
        "itemId": 1,
        "bundle": 17,
        "modelId": 4
      }, {"itemId": 1, "bundle": 18, "modelId": 8}, {"itemId": 1, "bundle": 18, "modelId": 1}, {
        "itemId": 1,
        "bundle": 18,
        "modelId": 5
      }, {"itemId": 1, "bundle": 19, "modelId": 8}, {"itemId": 1, "bundle": 19, "modelId": 1}, {
        "itemId": 1,
        "bundle": 19,
        "modelId": 6
      }, {"itemId": 1, "bundle": 20, "modelId": 8}, {"itemId": 1, "bundle": 20, "modelId": 3}, {
        "itemId": 1,
        "bundle": 20,
        "modelId": 2
      }, {"itemId": 1, "bundle": 21, "modelId": 8}, {"itemId": 1, "bundle": 21, "modelId": 3}, {
        "itemId": 1,
        "bundle": 21,
        "modelId": 4
      }, {"itemId": 1, "bundle": 22, "modelId": 8}, {"itemId": 1, "bundle": 22, "modelId": 3}, {
        "itemId": 1,
        "bundle": 22,
        "modelId": 5
      }, {"itemId": 1, "bundle": 23, "modelId": 8}, {"itemId": 1, "bundle": 23, "modelId": 3}, {
        "itemId": 1,
        "bundle": 23,
        "modelId": 6
      }],
      "stocks": [{"itemId": 1, "bundle": 0, "sales": 0, "quantity": 1, "unitPrice": 0}, {
        "itemId": 1,
        "bundle": 1,
        "sales": 0,
        "quantity": 1,
        "unitPrice": 0
      }, {"itemId": 1, "bundle": 2, "sales": 0, "quantity": 1, "unitPrice": 0}, {
        "itemId": 1,
        "bundle": 3,
        "sales": 0,
        "quantity": 1,
        "unitPrice": 0
      }, {"itemId": 1, "bundle": 4, "sales": 0, "quantity": 1, "unitPrice": 0}, {
        "itemId": 1,
        "bundle": 5,
        "sales": 0,
        "quantity": 1,
        "unitPrice": 0
      }, {"itemId": 1, "bundle": 6, "sales": 0, "quantity": 1, "unitPrice": 0}, {
        "itemId": 1,
        "bundle": 7,
        "sales": 0,
        "quantity": 1,
        "unitPrice": 0
      }, {"itemId": 1, "bundle": 8, "sales": 0, "quantity": 1, "unitPrice": 0}, {
        "itemId": 1,
        "bundle": 9,
        "sales": 0,
        "quantity": 1,
        "unitPrice": 0
      }, {"itemId": 1, "bundle": 10, "sales": 0, "quantity": 1, "unitPrice": 0}, {
        "itemId": 1,
        "bundle": 11,
        "sales": 0,
        "quantity": 1,
        "unitPrice": 0
      }, {"itemId": 1, "bundle": 12, "sales": 0, "quantity": 1, "unitPrice": 0}, {
        "itemId": 1,
        "bundle": 13,
        "sales": 0,
        "quantity": 1,
        "unitPrice": 0
      }, {"itemId": 1, "bundle": 14, "sales": 0, "quantity": 1, "unitPrice": 0}, {
        "itemId": 1,
        "bundle": 15,
        "sales": 0,
        "quantity": 1,
        "unitPrice": 0
      }, {"itemId": 1, "bundle": 16, "sales": 0, "quantity": 1, "unitPrice": 0}, {
        "itemId": 1,
        "bundle": 17,
        "sales": 0,
        "quantity": 1,
        "unitPrice": 0
      }, {"itemId": 1, "bundle": 18, "sales": 0, "quantity": 1, "unitPrice": 0}, {
        "itemId": 1,
        "bundle": 19,
        "sales": 0,
        "quantity": 1,
        "unitPrice": 0
      }, {"itemId": 1, "bundle": 20, "sales": 0, "quantity": 1, "unitPrice": 0}, {
        "itemId": 1,
        "bundle": 21,
        "sales": 0,
        "quantity": 1,
        "unitPrice": 0
      }, {"itemId": 1, "bundle": 22, "sales": 0, "quantity": 1, "unitPrice": 0}, {
        "itemId": 1,
        "bundle": 23,
        "sales": 0,
        "quantity": 1,
        "unitPrice": 0
      }],
      "models": [{"itemId": 1, "modelKind": "size", "name": "小", "modelId": 0}, {
        "itemId": 1,
        "modelKind": "color",
        "name": "蓝色",
        "modelId": 1
      }, {"itemId": 1, "modelKind": "edition", "name": "Lite", "modelId": 2}, {
        "itemId": 1,
        "modelKind": "color",
        "name": "红色",
        "modelId": 3
      }, {"itemId": 1, "modelKind": "edition", "name": "Plus", "modelId": 4}, {
        "itemId": 1,
        "modelKind": "edition",
        "name": "Max",
        "modelId": 5
      }, {"itemId": 1, "modelKind": "edition", "name": "Pro X", "modelId": 6}, {
        "itemId": 1,
        "modelKind": "size",
        "name": "中",
        "modelId": 7
      }, {"itemId": 1, "modelKind": "size", "name": "大", "modelId": 8}]
    }
  }
}
