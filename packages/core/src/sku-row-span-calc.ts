import _ from "lodash/fp";
import { SKUTypeDefinition } from "./sku-type-definition";

/**
 *
 * 颜色：红色
 * 尺寸：小 中
 * 版本：A  B C
 * | 颜色 | 尺寸 | 版本 |              | 颜色 | 尺寸 | 版本 |
 * --------------------              --------------------
 * | 红色 | 小  |  A   |              |     |    |  A   |
 * | 红色 | 小  |  B   |              |     | 小 |  B   |
 * | 红色 | 小  |  C   |    合并后     | 红色 |    |  C   |
 * | 红色 | 中  |  A   |              |     |    |  A   |
 * | 红色 | 中  |  B   |              |     | 中  |  B   |
 * | 红色 | 中  |  C   |              |     |    |  C   |
 *
 * 颜色：红色 蓝色
 * 尺寸：小 中
 * 版本：A B C D
 * | 颜色 | 尺寸 | 版本 |               | 颜色 | 尺寸 | 版本 |
 * --------------------               --------------------
 * | 红色 | 小  |  A   |               |     |    |  A   |
 * | 红色 | 小  |  B   |               |     |    |  B   |
 * | 红色 | 小  |  C   |               |     | 小 |  C   |
 * | 红色 | 小  |  D   |               | 红色 |    |  D   |
 * | 红色 | 中  |  A   |               |     |    |  A   |
 * | 红色 | 中  |  B   |               |     | 中 |  B   |
 * | 红色 | 中  |  C   |               |     |    |  C   |
 * | 红色 | 中  |  D   |    合并后      |     |    |  D   |
 * | 蓝色 | 小  |  A   |               |     |    |  A   |
 * | 蓝色 | 小  |  B   |               |     | 小 |  B   |
 * | 蓝色 | 小  |  C   |               |     |    |  C   |
 * | 蓝色 | 小  |  D   |               | 蓝色 |    |  D   |
 * | 蓝色 | 中  |  A   |               |     |    |  A   |
 * | 蓝色 | 中  |  B   |               |     | 中 |  B   |
 * | 蓝色 | 中  |  C   |               |     |    |  C   |
 * | 蓝色 | 中  |  D   |               |     |    |  D   |
 *
 * 颜色：红色 蓝色
 * 尺寸：小 中 大
 * 版本：A B C D
 * | 颜色 | 尺寸 | 版本 |                 | 颜色 | 尺寸 | 版本 |
 * --------------------           --------------------
 * | 红色 | 小  |  A   |                 |     |    |  A   |
 * | 红色 | 小  |  B   |                 |     |    |  B   |
 * | 红色 | 小  |  C   |                 |     | 小 |  C   |
 * | 红色 | 小  |  D   |                 |     |    |  D   |
 * | 红色 | 中  |  A   |                 |     |    |  A   |
 * | 红色 | 中  |  B   |                 | 红色 |    |  B   |
 * | 红色 | 中  |  C   |                 |     | 中 |  C   |
 * | 红色 | 中  |  D   |                 |     |    |  D   |
 * | 红色 | 大  |  A   |                 |     |    |  A   |
 * | 红色 | 大  |  B   |                 |     |    |  B   |
 * | 红色 | 大  |  C   |     合并后->     |     | 大 |  C   |
 * | 红色 | 大  |  D   |                 |     |    |  D   |
 * | 蓝色 | 小  |  A   |                 |     |   |  A   |
 * | 蓝色 | 小  |  B   |                 |     |    |  B   |
 * | 蓝色 | 小  |  C   |                 |     | 小 |  C   |
 * | 蓝色 | 小  |  D   |                 |     |    |  D   |
 * | 蓝色 | 中  |  A   |                 |     |    |  A   |
 * | 蓝色 | 中  |  B   |                 | 蓝色 | 中 |  B   |
 * | 蓝色 | 中  |  C   |                 |     |    |  C   |
 * | 蓝色 | 中  |  D   |                 |     |    |  D   |
 * | 蓝色 | 大  |  A   |                 |     |    |  A   |
 * | 蓝色 | 大  |  B   |                 |     | 中 |  B   |
 * | 蓝色 | 大  |  C   |                 |     |    |  C   |
 * | 蓝色 | 大  |  D   |                 |     |    |  D   |
 *
 *
 * 观察上面三张图后，可以得出如下结论
 * 商品型号种类数量：同一种商品型号种类关联的商品型号的数量，下面简称为 ModelKindCount
 * 通过上面两种示例可知
 * 1. 拥有 ModelKindCount 最少的商品型号种类在第一列(Column)，并且列数为 Stock 的总数
 * 2. 拥有 ModelKindCount 第二少的商品型号种类在第二列(Column)，行数为拥有商品型号第三少的商品型号种类行数总和
 * .....
 * 3. 拥有商品型号最多的商品型号种类在最后一列(Column)，每个商品型号占一行
 *
 * 所以，当我们想要得知一个商品型号将要占用几行时，最好的办法就就是找到比他 ModelKindCount 大的第一个商品种类的数量，
 * 通过上面总结出的规律，我们要开始合并行了，结果应该如下
 *
 * 颜色：红色
 * 尺寸：小 中
 * 版本：A  B C D
 * | 颜色 | 尺寸 | 版本 |
 * --------------------
 * |     |     |  A  |
 * |     |     |  B  |
 * |     | 小   |  C  |
 * | 红色 |     |  D  |
 * |     |     |  A  |
 * |     |     |  B  |
 * |     | 中  |  C  |
 * |     |     |  D  |
 *
 * 观察上图，小和中的行数，为版本(itemModelKind)单条数
 * 接下来就开始实际处理行合并
 * 行合并的关键只有一个，就是该 modelKind 需要占用几行
 * 为此，我设计了一种简单的算法来计算，代码实现并非使用链表，实际这里用链表更合适，但是 JS 没有自带这个数据结构，就不额外写了
 * 假设 ItemModel 如下，将会得到 { color: 3, size:   }
 * [
 *  { name: 红色, modelKind: "color" },
 *  { name: 小, modelKind: "size" },
 *  { name: 大, modelKind: "size" },
 *  { name: A, modelKind: "edition" },
 *  { name: B, modelKind: "edition" },
 *  { name: C, modelKind: "edition" },
 * ]
 *
 *
 *
 *
 *
 *
 */

export class SkuRowSpanCalc {
  getTableRowCountByIndex(mapperIndex: number, modelKindIndex: number) {
    let count = 1
    for (let i = mapperIndex; i < this._mapperArray.length; i++) {
      const item = this._mapperArray[i]

      if (_.isEmpty(item.kinds)) {
        continue
      }

      if (mapperIndex === i) {
        if (item.kinds.length === 1) {
          continue
        } else {
          const remainingKinds = item.kinds.slice(modelKindIndex + 1)
          const mul = _.isEmpty(remainingKinds) ? 1 : remainingKinds.length * item.count
          count *= mul
        }
      } else {
        count *= item.kinds.length * item.count
      }
    }
    return count
  }

  getTableRowCount(modelKind: string): number {
    const _mapperArray = this._mapperArray
    for (let index = 0; index < _mapperArray.length; index++) {
      const item = _mapperArray[index]
      if (_.isEmpty(item.kinds)) {
        continue
      }
      const modelKindIndex = item.kinds.findIndex(m => m === modelKind)
      if (modelKindIndex !== -1) {
        const count = this.getTableRowCountByIndex(index, modelKindIndex)
        return count
      }
    }
    throw new Error("未找到 ModelKind，请确认是否调用了 Push 方法")
  }

  getCountIndex(count: number): number {
    return this._mapperArray.findIndex(map => map.count === count)
  }

  public get mapper() {
    const kinds = this._mapperArray.flatMap(i => i.kinds)
    const d = kinds.reduce((previousValue, currentValue) => {
      return {...previousValue, [currentValue]: this.getTableRowCount(currentValue)}
    }, <Record<string, number>>{})

    return d
  }

  private _mapperArray: { count: number, kinds: string[] }[] = []

  push(modelKind: string) {
    for (let i = 0; i < this._mapperArray.length; i++) {
      const item = this._mapperArray[i]
      const oldModelKindIndex = item.kinds.findIndex(m => m === modelKind)
      if (oldModelKindIndex !== -1) {
        item.kinds.splice(oldModelKindIndex, 1)
        const newCount = item.count + 1
        const countIndex = this.getCountIndex(newCount)
        if (countIndex !== -1) {
          this._mapperArray[countIndex].kinds.push(modelKind)
        } else {
          this._mapperArray.push({
            count: newCount,
            kinds: [modelKind]
          })
        }
        return
      }
    }
    if (this._mapperArray[0]) {
      this._mapperArray[0].kinds.push(modelKind)
    } else {
      this._mapperArray[0] = {
        count: 1,
        kinds: [modelKind]
      }
    }
  }

  static of(itemModels: SKUTypeDefinition.ItemModel[]): SkuRowSpanCalc {
    const o = new this()
    itemModels.forEach(itemModel => {
      o.push(itemModel.modelKind)
    })
    return o
  }

}
