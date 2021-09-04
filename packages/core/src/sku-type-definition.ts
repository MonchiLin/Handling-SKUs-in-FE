export namespace SKUTypeDefinition {
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


  export type Item = {
    itemId: number,
    name: string
  }

  export type ItemStock = {
    itemId: number;
    bundle: number;
    sales: number;
    quantity: number;
    unitPrice: number;
  }

  export type ItemModel = {
    itemId: number;
    modelId: number;
    modelKind: string;
    name: string;
  }

  export type ItemBundle = {
    itemId: number;
    bundle: number;
    modelId: number;
  }

}