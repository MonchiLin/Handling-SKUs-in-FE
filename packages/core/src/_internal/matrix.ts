import { identity, range, size, sortBy, forOwn } from "lodash/fp";

const _ = {
  sortBy,
  identity,
  range,
  size,
  forOwn,
}

export class Matrix {
  matrices: number[][] = []

  getRow(rowIndex: number) {
    return this.matrices[rowIndex]
  }

  getCol(colIndex: number) {
    return this.matrices.map(row => row[colIndex])
  }

  get(rowIndex: number, colIndex: number) {
    return this.matrices[rowIndex][colIndex]
  }
}

export enum AdjoinMatrixFlag {
  // 不相连
  Disjunct,
  // 相连
  Conjoint,
}

export type AdjoinMatrixCalculateFlag = Record<string, AdjoinMatrixFlag>

export class AdjoinMatrix<T> extends Matrix {
  static and(value: number[]) {
    return value.reduce((previousValue, currentValue) => previousValue & currentValue, AdjoinMatrixFlag.Conjoint)
  }

  // 矩阵
  matrices: AdjoinMatrixFlag[][] = []
  /**
   * 矩阵长度(traver 方法依赖该属性)
   * 在 SKU 选择器中作为商品型号储存
   */
  categories: T[] = []

  /**
   * 设置矩某个点的 flag 值，这个相当于安全设置
   * 因为直接 matrices[rowIndex][colIndex] = flag 可能会出现 matrices[rowIndex] 还没设置赋值的情况
   *
   * @param rowIndex
   * @param colIndex
   * @param flag
   */
  set(rowIndex: number, colIndex: number, flag: AdjoinMatrixFlag) {
    if (!this.matrices[rowIndex]) {
      this.matrices[rowIndex] = []
    }
    this.matrices[rowIndex][colIndex] = flag
  }

  traver(callBack: (rowIndex: number, colIndex: number) => void) {
    for (let rowIndex = 0; rowIndex < this.categories.length; rowIndex++) {
      for (let colIndex = 0; colIndex < this.categories.length; colIndex++) {
        callBack(rowIndex, colIndex)
      }
    }
  }

  get valid() {
    return this.matrices.length === this.categories.length && this.matrices.every(i => i.length === this.categories.length)
  }

  /**
   * 假设矩阵数据如下
   *    A   B   C
   * A | 0 | 1 | 1 |
   * B | 1 | 0 | 1 |
   * C | 1 | 1 | 0 |
   * 即 B - A - C ，A 链接 B 和 C
   * 即 A - B - C ，B 链接 A 和 C
   * 即 A - C - B ，C 链接 A 和 B
   *
   * 这时我想知道如果选中了 A 之后，还有哪些点可以和 A 连接        期望为 B，C
   *          或者选中了 A，B 之后，还有哪些点可以和 A，B 连接   期望为 C
   *
   * 算法如下：
   * 假设矩阵数据如下
   *    A   B   C
   * A | 0 | 1 | 1 |
   * B | 1 | 0 | 1 |
   * C | 1 | 1 | 0 |
   * 选中了 A，则判断 colIndex: 0 这一列的为 1 的 category
   * 选中了 A，B，则判断 colIndex: 0, colIndex: 1 这两列 & 结果为 1 的值
   * 。。。选中更多列过程都同第二步一样
   *
   * @param categoryIndexes - 它的值为已经被选中的 category 的索引
   * @return {AdjoinMatrixCalculateFlag}
   */
  calculateFlag(categoryIndexes: number[]): AdjoinMatrixCalculateFlag {
    if (categoryIndexes.length === 0) {
      return {}
    }

    // 1. 获取
    const cols = categoryIndexes.reduce((previousValue, colIndex) => {
      const col = this.getCol(colIndex)
      for (let i = 0; i < col.length; i++) {
        if (previousValue[i]) {
          previousValue[i].push(col[i])
        } else {
          previousValue[i] = [col[i]]
        }
      }
      return previousValue
    }, <number[][]>[])

    const result = cols.reduce((previousValue, currentValue, index) => {
      const col = cols[index]
      return {...previousValue, [index]: AdjoinMatrix.and(col)}
    }, <AdjoinMatrixCalculateFlag>{})

    return result
  }

  calculateFlagByCategories(values: T[]) {
    const indexes = values
      .map(value => this.indexOfCategories(value))
    return this.calculateFlag(indexes)
  }

  /**
   * 根据计算好的 flag 获取相连和不相连的 category
   * @param flags
   */
  getCategoryFromCalculateFlags(flags: AdjoinMatrixCalculateFlag): { conjoint: T[], disjunct: T[] } {
    const conjoint: T[] = []
    const disjunct: T[] = []

    Object.keys(flags)
      .forEach(categoryIndex => {
        const flag = flags[categoryIndex]
        const category = (<any>this.categories)[categoryIndex]
        if (flag === AdjoinMatrixFlag.Conjoint) {
          conjoint.push(category)
        } else {
          disjunct.push(category)
        }
      })

    return {
      conjoint,
      disjunct,
    }
  }

  indexOfCategories(value: T) {
    return this.categories.findIndex(i => this.compare(i, value))
  }

  protected compare(a: T, b: T) {
    return a === b
  }

  protected getFriendlyName(a: T) {
    return a + ""
  }

  toString() {
    const values = this.matrices.map((row, rowIndex) => {
      return [
        this.getFriendlyName(this.categories[rowIndex]),
        ...row,
      ]
    })
    const d = [
      ["Empty", ...this.categories.map(value => this.getFriendlyName(value))],
      ...values,
    ]

    return d
  }
}
