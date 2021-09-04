import _ from "lodash/fp";
import { SkuMemoryDb } from "./sku-memory-db";
import { SKUTypeDefinition } from "./sku-type-definition";
import { cartesian, itemStockEq, replaceAt } from "./_fn";
import { SkuGraph } from "./sku-graph";
import { SkuAdjoinMatrix } from "./sku-matrix";

export class ModelKind {
  static initialize() {
    this.create("color", "颜色")
    this.create("shoeSize", "鞋码")
    this.create("size", "尺寸")
    this.create("edition", "版本")
  }

  // 所有的商品型号种类
  static Kinds: string[] = []
  static Kind: Record<string, string> = {}

  // 商品型号种类的名称（给人看的）
  static NameMapper = new Map()

  static create(value: string, name: string) {
    this.Kinds.push(value)
    this.NameMapper.set(value, name)
    this.Kind[value] = value
  }

}

ModelKind.initialize()

export class SKUService {
  db = new SkuMemoryDb()
  currentItem!: SKUTypeDefinition.Item

  constructor() {
    this.initialize()
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
        const itemModels: SKUTypeDefinition.ItemModel[] = []
        const bundles = this.db.bundles.filter(i => i.itemId === this.currentItem.itemId && i.bundle === stock.bundle)
          .map(bundle => {
            const model = this.currentItemModels.find(a => a.modelId === bundle.modelId)!
            itemModels.push(model)
            return {
              ...bundle,
              model,
            }
          })
        return {
          item,
          bundles,
          itemModels,
          itemModelIds: _.map(_.prop("modelId"), itemModels),
          ...stock
        }
      })
  }

  // 获取当前的 stock，根据商品型号的使用的次数从小到大排序
  /**
   * 商品型号如下
   * [
   *  { modelKind: "color", name: "红色", modelId: 0 },
   *  { modelKind: "color", name: "黑色", modelId: 1 },
   *  { modelKind: "size", name: "小", modelId: 2 },
   *  { modelKind: "size", name: "中", modelId: 3 },
   *  { modelKind: "edition", name: "A", modelId: 4 },
   *  { modelKind: "edition", name: "B", modelId: 5 },
   *  { modelKind: "edition", name: "C", modelId: 6 },
   * ]
   *
   * bundle 如下
   * [
   *  [
   *   { bundle: 0, modelId: 0 }, // 红
   *   { bundle: 0, modelId: 2 }, // 小
   *   { bundle: 0, modelId: 4 }, // A
   *  ],
   *  [
   *   { bundle: 1, modelId: 0 }, // 红
   *   { bundle: 1, modelId: 2 }, // 小
   *   { bundle: 1, modelId: 4 }, // B
   *  ],
   *  [
   *   { bundle: 2, modelId: 0 }, // 红
   *   { bundle: 2, modelId: 2 }, // 小
   *   { bundle: 2, modelId: 4 }, // C
   *  ],
   *  [
   *   { bundle: 3, modelId: 1 }, // 黑
   *   { bundle: 3, modelId: 2 }, // 小
   *   { bundle: 3, modelId: 4 }, // A
   *  ],
   *  [
   *   { bundle: 4, modelId: 1 }, // 黑
   *   { bundle: 4, modelId: 2 }, // 小
   *   { bundle: 4, modelId: 4 }, // B
   *  ],
   *  [
   *   { bundle: 5, modelId: 1 }, // 黑
   *   { bundle: 5, modelId: 2 }, // 小
   *   { bundle: 5, modelId: 4 }, // C
   *  ],
   *  ----------------------------------
   *  [
   *   { bundle: 6, modelId: 0 }, // 红
   *   { bundle: 6, modelId: 3 }, // 中
   *   { bundle: 6, modelId: 4 }, // A
   *  ],
   *  [
   *   { bundle: 7, modelId: 0 }, // 红
   *   { bundle: 7, modelId: 3 }, // 中
   *   { bundle: 7, modelId: 4 }, // B
   *  ],
   *  [
   *   { bundle: 8, modelId: 0 }, // 红
   *   { bundle: 8, modelId: 3 }, // 中
   *   { bundle: 8, modelId: 4 }, // C
   *  ],
   *  [
   *   { bundle: 9, modelId: 1 }, // 黑
   *   { bundle: 9, modelId: 3 }, // 中
   *   { bundle: 9, modelId: 4 }, // A
   *  ],
   *  [
   *   { bundle: 10, modelId: 1 }, // 黑
   *   { bundle: 10, modelId: 3 }, // 中
   *   { bundle: 10, modelId: 4 }, // B
   *  ],
   *  [
   *   { bundle: 11, modelId: 1 }, // 黑
   *   { bundle: 11, modelId: 2 }, // 小
   *   { bundle: 11, modelId: 4 }, // C
   *  ],
   *  ---------------------------------
   *  ...... 省略部分
   * ]
   *
   *
   * stock 初始数据为:
   *
   * [
   * { bundle: 0, ...},
   * { bundle: 1, ...},
   * { bundle: 2, ...},
   * { bundle: 3, ...},
   * { bundle: 4, ...},
   * { bundle: 5, ...},
   * { bundle: 6, ...},
   * { bundle: 7, ...},
   * { bundle: 8, ...},
   * { bundle: 9, ...},
   * { bundle: 10, ...},
   * { bundle: 11, ...},
   * ]
   *
   * 这时候在生成表格时就会产生问题，使用现有数据结构渲染顺序如下
   *  颜色|尺寸|版本             颜色|尺寸|版本
   * [
   *  0. 红 小 A               0.     小  A
   *  1. 红 小 B               1.     小  B
   *  2. 红 小 C               2.     小  C
   *  3. 黑 小 A               6.  红  中  A
   *  4. 黑 小 B               7.     中  B
   *  5. 黑 小 C               8.     中  C
   *  6. 红 中 A               3.     小  A
   *  7. 红 中 B   期望合并后->  4.     小  B
   *  8. 红 中 C               5.     小  C
   *  9. 黑 中 A               9.  黑 中  A
   *  10. 黑 中 B              10.    中  B
   *  11. 黑 中 C              11.    中  C
   * ]
   *
   *
   * 请看期望合并后的样式，因为作者渲染表格的方式是提前计算好合并行(rowSpan，这里颜色为 8 行)的来渲染表格，这样的话 View 层就不会太复杂
   * 但是在上图的示例中会发现本该渲染红色的 8 行中却出现了 4 个黑色，这就会出现问题，所以需要先排序 stock
   *
   * 先计算顺序
   *
   * [
   * { sizeModelOrder: 0, colorModelOrder: 0, editionOrder: 0,  bundle: 0, ...},
   * { sizeModelOrder: 0, colorModelOrder: 0, editionOrder: 1,  bundle: 1, ...},
   * { sizeModelOrder: 0, colorModelOrder: 0, editionOrder: 2,  bundle: 2, ...},
   * { sizeModelOrder: 1, colorModelOrder: 0, editionOrder: 0,  bundle: 3, ...},
   * { sizeModelOrder: 1, colorModelOrder: 0, editionOrder: 1,  bundle: 4, ...},
   * { sizeModelOrder: 1, colorModelOrder: 0, editionOrder: 2,  bundle: 5, ...},
   * { sizeModelOrder: 0, colorModelOrder: 1, editionOrder: 3,  bundle: 6, ...},
   * { sizeModelOrder: 0, colorModelOrder: 1, editionOrder: 4,  bundle: 7, ...},
   * { sizeModelOrder: 0, colorModelOrder: 1, editionOrder: 5,  bundle: 8, ...},
   * { sizeModelOrder: 1, colorModelOrder: 1, editionOrder: 3,  bundle: 9, ...},
   * { sizeModelOrder: 1, colorModelOrder: 1, editionOrder: 4,  bundle: 10, ...},
   * { sizeModelOrder: 1, colorModelOrder: 1, editionOrder: 5,  bundle: 11, ...},
   * ]
   *
   * // 然后排序
   *
   * [
   * { bundle: 0, ...},
   * { bundle: 1, ...},
   * { bundle: 2, ...},
   * { bundle: 6, ...},
   * { bundle: 7, ...},
   * { bundle: 8, ...},
   * { bundle: 3, ...},
   * { bundle: 4, ...},
   * { bundle: 5, ...},
   * { bundle: 9, ...},
   * { bundle: 10, ...},
   * { bundle: 11, ...},
   * ]
   *
   * 那么新的问题就来了，怎么排序呢？
   * 我们先按照理想的顺序写下啦（下面的数字表示 bundle 值）
   *                                                                                                                         排序过的数组                                      待处理                                     栈
   * 1. 处理 0，因为是第一条，直接略过                                                                                             0                                              1,2,3,4,5,6,7,8,9,10,11                   []
   * 2. 处理 1，和 0 对比，发现<颜色相同>，<尺寸相同>，<版本不同>，因为版本是最后一项，所以不相同不做任何处理                                   0, 1                                           2,3,4,5,6,7,8,9,10,11                     []
   * 3. 处理 2，和 1 对比，发现<颜色相同>，<尺寸相同>，<版本不同>，因为版本是最后一项，所以不相同不做任何处理                                   0, 1, 2                                        3,4,5,6,7,8,9,10,11                       []
   * 4. 处理 3，和 2 对比，发现<颜色不同>，<尺寸相同>，<版本不同>，因为是第一项不同，所以将 3 移动到最后                                      0, 1, 2                                        4,5,6,7,8,9,10,11                         3
   * 5. 处理 4，和 2 对比，发现<颜色不同>，<尺寸相同>，<版本不同>，因为是第一项不同，所以将 4 移动到最后                                      0, 1, 2                                        4,5,6,7,8,9,10,11                         3,4
   * 6. 处理 5，和 2 对比，发现<颜色不同>，<尺寸相同>，<版本相同>，因为是第一项不同，所以将 5 移动到最后                                      0, 1, 2                                        6,7,8,9,10,11                             3,4,5
   * 7. 处理 6，和 2 对比，发现<颜色相同>，<尺寸不同>，<版本不同>，因为是第一项相同，第二项不同，所以会排在 2 后面，                            0, 1, 2，6                                      7,8,9,10,11                               3,4,5
   * 8. 处理 7，和 6 对比，发现<颜色相同>，<尺寸相同>，<版本不同>，因为版本是最后一项，所以不相同不做任何处理                                  0, 1, 2，6，7                                    8,9,10,11                                 3,4,5
   * 9. 处理 8，和 7 对比，发现<颜色相同>，<尺寸相同>，<版本不同>，因为版本是最后一项，所以不相同不做任何处理                                  0, 1, 2，6，7，8                                 9,10,11                                    3,4,5
   * 10. 处理 9，和 8 对比，发现<颜色不同>，<尺寸相同>，<版本不同>，因为是第一项不同，所以将 9 移动到另一个栈                                 0, 1, 2，6，7，8                                 10,11                                      3,4,5,9
   * 11. 处理 10，和 8 对比，发现<颜色不同>，<尺寸相同>，<版本不同>，因为是第一项不同，所以将 10 移动到另一个栈                               0, 1, 2，6，7，8                                 11                                         3,4,5,9,10
   * 12. 处理 11，和 8 对比，发现<颜色不同>，<尺寸相同>，<版本不同>，因为是第一项不同，所以将 11 移动到另一个栈                               0, 1, 2，6，7，8                                 []                                         3,4,5,9,10,11
   * --------------------------
   * 因为待处理的数组已经没有了，把新的栈移动到待处理数组，然后如法炮制，接下来就省略了
   *                                                                                                                       0, 1, 2，6，7，8                                 3,4,5,9,10,11                              []
   *
   *
   *
   */
  get currentItemStocksWithItemModelAsc() {
    // 期望结果如下，这样才能排序
    // const data = [
    //   {sizeModelOrder: 0, colorModelOrder: 0, editionOrder: 0, bundle: 0},
    //   {sizeModelOrder: 0, colorModelOrder: 0, editionOrder: 1, bundle: 1},
    //   {sizeModelOrder: 0, colorModelOrder: 0, editionOrder: 2, bundle: 2},
    //   {sizeModelOrder: 1, colorModelOrder: 0, editionOrder: 0, bundle: 3},
    //   {sizeModelOrder: 1, colorModelOrder: 0, editionOrder: 1, bundle: 4},
    //   {sizeModelOrder: 1, colorModelOrder: 0, editionOrder: 2, bundle: 5},
    //   {sizeModelOrder: 0, colorModelOrder: 1, editionOrder: 3, bundle: 6},
    //   {sizeModelOrder: 0, colorModelOrder: 1, editionOrder: 4, bundle: 7},
    //   {sizeModelOrder: 0, colorModelOrder: 1, editionOrder: 5, bundle: 8},
    //   {sizeModelOrder: 1, colorModelOrder: 1, editionOrder: 3, bundle: 9},
    //   {sizeModelOrder: 1, colorModelOrder: 1, editionOrder: 4, bundle: 1},
    //   {sizeModelOrder: 1, colorModelOrder: 1, editionOrder: 5, bundle: 1},
    // ]

    const itemModels = this.currentItemModels
    const currentItemStocks = this.currentItemStocks
    const kindUsedSortedCountAsc = this.kindUsedSortedCountAsc
    const itemModelOrder = this.kindUsedSortedCountAsc.map(modelKind => {
      const itemModelsWithModelKind = itemModels.filter(a => a.modelKind === modelKind)
      return {
        modelKind: modelKind,
        itemModelIds: itemModelsWithModelKind.map(i => i.modelId),
      }
    })
    let map: Record<string, any[]> = {}

    itemModelOrder.forEach(({itemModelIds: currentItemModelIds, modelKind}, depth) => {
      if (depth === 0) {
        currentItemModelIds.forEach((itemModelId, idIndex) => {
          map[itemModelId] = currentItemStocks.filter(stock => {
            const itemModel = stock.itemModels.find(a => a.modelKind === modelKind)!
            return itemModel.modelId === itemModelId
          })
          map[itemModelId].forEach(item => {
            item[modelKind + "Order"] = idIndex
          })
        })
      } else {
        const currStockGroupByItemModelId = Object.keys(map)
          .reduce((previousValue, key) => {
            const keys = key.split("-")
            if (keys.length === depth) {
              return {...previousValue, [key]: map[key]}
            }
            return {...previousValue}
          }, <typeof map>{})
        Object.keys(currStockGroupByItemModelId)
          .forEach(itemModelIdJoin => {
            const currentStocks = currStockGroupByItemModelId[itemModelIdJoin]
            currentStocks.forEach((stock) => {
              const itemModelIdIndex = currentItemModelIds.findIndex(itemModelId => stock.itemModels.find((itemModel: any) => itemModel.modelId === itemModelId))
              const itemModelId = currentItemModelIds[itemModelIdIndex]
              const newKey = itemModelIdJoin + '-' + itemModelId
              stock[modelKind + "Order"] = itemModelIdIndex
              if (map[newKey]) {
                map[newKey].push(stock)
              } else {
                map[newKey] = [stock]
              }
            })
          })
      }
    })

    let datas = Object.keys(map)
      .filter(key => {
        const s = key.split("-")
        return s.length === kindUsedSortedCountAsc.length
      })
      .flatMap(key => {
        return map[key]
      })

    const datas2 = _.orderBy(
      [...kindUsedSortedCountAsc.map(kind => kind + "Order")],
      "asc",
      datas
    )

    return datas2
  }

  // 当前使用的所有商品型号，通过商品型号种类区分
  get itemModelGroupByModelKindUsed() {
    return _.groupBy(i => i.modelKind, this.currentItemModels)
  }

  // 当前使用的所有商品型号，通过商品型号种类区分
  get cartesianProd() {
    return cartesian(_.values(this.itemModelGroupByModelKindUsed))
  }

  get kindUsedSortedCountAsc(): string[] {
    return _.pipe(
      _.toPairs,
      _.orderBy(
        _.pipe(
          _.last,
          _.size,
        ), 'asc'),
      _.map(_.first)
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

  get graph() {
    return SkuGraph.of({
      itemModels: this.currentItemModels,
      itemStocks: this.currentItemStocks,
      itemBundles: this.currentItemBundles,
    })
  }

  get adjoinMatrix() {
    return SkuAdjoinMatrix.of(this.graph)
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

  samples = samples

  loadSample(sampleIndex: number) {
    this.samples[sampleIndex]?.(this)
  }
}

const samples: ((skuServce: SKUService) => void)[] = [
  (skuService) => {
    skuService.initialize()

    skuService.modelUpsert({
        itemId: skuService.currentItem.itemId,
        modelKind: ModelKind.Kind.size,
        name: "小",
      }
    )
    skuService.modelUpsert({
        itemId: skuService.currentItem.itemId,
        modelKind: ModelKind.Kind.color,
        name: "蓝色",
      }
    )
    skuService.modelUpsert({
        itemId: skuService.currentItem.itemId,
        modelKind: ModelKind.Kind.edition,
        name: "Lite",
      }
    )
    skuService.modelUpsert({
        itemId: skuService.currentItem.itemId,
        modelKind: ModelKind.Kind.color,
        name: "红色",
      }
    )
    skuService.modelUpsert({
        itemId: skuService.currentItem.itemId,
        modelKind: ModelKind.Kind.edition,
        name: "Plus",
      }
    )
    skuService.modelUpsert({
        itemId: skuService.currentItem.itemId,
        modelKind: ModelKind.Kind.edition,
        name: "Max",
      }
    )
    skuService.modelUpsert({
        itemId: skuService.currentItem.itemId,
        modelKind: ModelKind.Kind.edition,
        name: "Pro X",
      }
    )
  },
  (skuService) => {
    skuService.initialize()

    skuService.modelUpsert({
        itemId: skuService.currentItem.itemId,
        modelKind: ModelKind.Kind.size,
        name: "小",
      }
    )
    skuService.modelUpsert({
        itemId: skuService.currentItem.itemId,
        modelKind: ModelKind.Kind.size,
        name: "中",
      }
    )
    skuService.modelUpsert({
        itemId: skuService.currentItem.itemId,
        modelKind: ModelKind.Kind.color,
        name: "蓝色",
      }
    )
    skuService.modelUpsert({
        itemId: skuService.currentItem.itemId,
        modelKind: ModelKind.Kind.edition,
        name: "Lite",
      }
    )
    skuService.modelUpsert({
        itemId: skuService.currentItem.itemId,
        modelKind: ModelKind.Kind.color,
        name: "红色",
      }
    )
  },
  (skuService) => {
    skuService.initialize()

    skuService.db.models.push(
      {
        itemId: skuService.currentItem.itemId,
        modelId: 0,
        modelKind: ModelKind.Kind.color,
        name: "红色"
      },
      {
        itemId: skuService.currentItem.itemId,
        modelId: 1,
        modelKind: ModelKind.Kind.color,
        name: "蓝色"
      },
      {
        itemId: skuService.currentItem.itemId,
        modelId: 2,
        modelKind: ModelKind.Kind.size,
        name: "小"
      },
      {
        itemId: skuService.currentItem.itemId,
        modelId: 3,
        modelKind: ModelKind.Kind.size,
        name: "中"
      },
      {
        itemId: skuService.currentItem.itemId,
        modelId: 4,
        modelKind: ModelKind.Kind.edition,
        name: "Lite"
      },
    )
    skuService._updateBundlesAndStocks()
    skuService.db.stocks[0].quantity = 1
    skuService.db.stocks[1].quantity = 0
    skuService.db.stocks[2].quantity = 1
    skuService.db.stocks[3].quantity = 1
  },
  (skuService) => {
    skuService.initialize()

    skuService.db = {
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
  },
  (skuService) => {
    skuService.initialize()
    skuService.db = {
      "items": [{"itemId": 1, "name": "Windows"}],
      "bundles": [
        {"itemId": 1, "bundle": 0, "modelId": 0}, {"itemId": 1, "bundle": 0, "modelId": 1}, {
          "itemId": 1,
          "bundle": 0,
          "modelId": 4
        }, {"itemId": 1, "bundle": 1, "modelId": 0}, {"itemId": 1, "bundle": 1, "modelId": 1}, {
          "itemId": 1,
          "bundle": 1,
          "modelId": 5
        }, {"itemId": 1, "bundle": 2, "modelId": 0}, {"itemId": 1, "bundle": 2, "modelId": 2}, {
          "itemId": 1,
          "bundle": 2,
          "modelId": 4
        }, {"itemId": 1, "bundle": 3, "modelId": 0}, {"itemId": 1, "bundle": 3, "modelId": 2}, {
          "itemId": 1,
          "bundle": 3,
          "modelId": 5
        }, {"itemId": 1, "bundle": 4, "modelId": 0}, {"itemId": 1, "bundle": 4, "modelId": 6}, {
          "itemId": 1,
          "bundle": 4,
          "modelId": 4
        }, {"itemId": 1, "bundle": 5, "modelId": 0}, {"itemId": 1, "bundle": 5, "modelId": 6}, {
          "itemId": 1,
          "bundle": 5,
          "modelId": 5
        }, {"itemId": 1, "bundle": 6, "modelId": 3}, {"itemId": 1, "bundle": 6, "modelId": 1}, {
          "itemId": 1,
          "bundle": 6,
          "modelId": 4
        }, {"itemId": 1, "bundle": 7, "modelId": 3}, {"itemId": 1, "bundle": 7, "modelId": 1}, {
          "itemId": 1,
          "bundle": 7,
          "modelId": 5
        }, {"itemId": 1, "bundle": 8, "modelId": 3}, {"itemId": 1, "bundle": 8, "modelId": 2}, {
          "itemId": 1,
          "bundle": 8,
          "modelId": 4
        }, {"itemId": 1, "bundle": 9, "modelId": 3}, {"itemId": 1, "bundle": 9, "modelId": 2}, {
          "itemId": 1,
          "bundle": 9,
          "modelId": 5
        }, {"itemId": 1, "bundle": 10, "modelId": 3}, {"itemId": 1, "bundle": 10, "modelId": 6}, {
          "itemId": 1,
          "bundle": 10,
          "modelId": 4
        }, {"itemId": 1, "bundle": 11, "modelId": 3}, {"itemId": 1, "bundle": 11, "modelId": 6}, {
          "itemId": 1,
          "bundle": 11,
          "modelId": 5
        }],
      "stocks": [
        {"itemId": 1, "bundle": 0, "sales": 0, "quantity": 1, "unitPrice": 0}, {
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
        }],
      "models": [
        {
          "itemId": 1,
          "modelKind": "color",
          "name": "黑",
          "modelId": 0
        }, {
          "itemId": 1,
          "modelKind": "edition",
          "name": "A",
          "modelId": 1
        },
        {
          "itemId": 1,
          "modelKind": "edition",
          "name": "B",
          "modelId": 2
        }, {
          "itemId": 1,
          "modelKind": "color",
          "name": "红",
          "modelId": 3
        }, {
          "itemId": 1,
          "modelKind": "size",
          "name": "小",
          "modelId": 4
        }, {
          "itemId": 1,
          "modelKind": "size",
          "name": "大",
          "modelId": 5
        }, {
          "itemId": 1,
          "modelKind": "edition",
          "name": "C",
          "modelId": 6
        }
      ]
    }
  }
]
