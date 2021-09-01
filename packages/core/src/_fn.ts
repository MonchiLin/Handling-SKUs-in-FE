import { SKUTypeDefinition } from "./sku-type-definition";

/**
 * 输入：
 *    颜色： 红色
 *    型号: ip12,1p13
 *    尺寸：小,中
 * -----------------------------------
 * 输出：
 *    红色 ip12 小
 *    红色 ip12 中
 *    黄色 ip12 小
 *    黄色 ip12 中
 *
 *    红色 ip13 小
 *    红色 ip13 中
 *    黄色 ip13 小
 *    黄色 ip13 中
 *
 *
 *
 */
export function cartesian<T>(arr: T[][]) {
  return arr.reduce((prev, curr) => {
    const temp: T[][] = []

    prev.forEach(prevItem => {
      curr.forEach(current => {
        const newRow = [...prevItem, current]
        temp.push(newRow)
      })
    })
    return temp
  }, <T[][]>[[]])
}

export const replaceAt = <A>(index: number, replacement: A, array: A[]): A[] => {
  return array.slice(0, index).concat([replacement]).concat(array.slice(index + 1))
}

export const itemBundleEq = (a: Pick<SKUTypeDefinition.ItemBundle, "itemId" | "bundle" | "modelId">, b: Pick<SKUTypeDefinition.ItemBundle, "itemId" | "bundle" | "modelId">) => {
  return a.modelId === b.modelId
    && a.bundle === b.bundle
    && a.itemId === b.itemId
}

export const itemStockEq = (a: Pick<SKUTypeDefinition.ItemStock, "itemId" | "bundle">, b: Pick<SKUTypeDefinition.ItemStock, "itemId" | "bundle">) => {
  return a.itemId === b.itemId
    && a.bundle === b.bundle
}

export const itemModelEq = (a: Pick<SKUTypeDefinition.ItemModel, "itemId" | "modelKind" | "modelId">, b: Pick<SKUTypeDefinition.ItemModel, "itemId" | "modelKind" | "modelId">) => {
  return a.itemId === b.itemId
    && a.modelId === b.modelId
    && a.modelKind === b.modelKind
}