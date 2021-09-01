import _ from "lodash/fp";
import { SKUTypeDefinition } from "./sku-type-definition";
import { itemModelEq } from "./_fn";
import { Graph } from "./graph";

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

enum AdjoinMatrixFlag {
  // 不相连
  Disjunct,
  // 相连
  Conjoint,
}

export type AdjoinMatrixCalculateFlag = {
  index: number,
  flag: AdjoinMatrixFlag
}

export class AdjoinMatrix<T> extends Matrix {
  matrices: AdjoinMatrixFlag[][] = []
  categories: T[] = []

  set(rowIndex: number, colIndex: number, flag: 0 | 1) {
    if (!this.matrices[rowIndex]) {
      this.matrices[rowIndex] = []
    }
    this.matrices[rowIndex][colIndex] = flag
  }

  calculateFlag(...indexes: number[]): AdjoinMatrixCalculateFlag[] {
    const indexesSorted = <number[]>_.sortBy(_.identity)(indexes)
    const cols = new Map<number, AdjoinMatrixFlag[]>()
    indexesSorted.forEach((index) => {
      const col = this.getCol(index)
      cols.set(index, col)
    })

    const colValues = [...cols.values()]
    const range = _.range(0, _.size(colValues[0]))

    const result = range.map((index) => {
      const row = colValues.map(col => col[index])
      const flag = row.reduce((previousValue, currentValue) => {
        return previousValue & currentValue
      }, AdjoinMatrixFlag.Conjoint)

      return {
        index: index,
        flag
      }
    })

    return result
  }

  calculateFlagByValues(...values: T[]) {
    const indexes = values
      .map(value => this.indexOf(value))
    return this.calculateFlag(...indexes)
  }

  getValueFromCalculateFlags(...flags: AdjoinMatrixCalculateFlag[]): { conjoint: T[], disjunct: T[] } {
    const conjoint = flags
      .filter(flag => flag.flag === AdjoinMatrixFlag.Conjoint)
      .map(flag => this.categories[flag.index])

    const disjunct = flags
      .filter(flag => flag.flag === AdjoinMatrixFlag.Disjunct)
      .map(flag => this.categories[flag.index])

    return {
      conjoint,
      disjunct,
    }
  }

  traver(callBack: (rowIndex: number, colIndex: number) => void) {
    for (let rowIndex = 0; rowIndex < this.categories.length; rowIndex++) {
      for (let colIndex = 0; colIndex < this.categories.length; colIndex++) {
        callBack(rowIndex, colIndex)
      }
    }
  }

  protected compare(a: T, b: T) {
    return a === b
  }

  protected getFriendlyName(a: T) {
    return a + ""
  }

  indexOf(value: T) {
    return this.categories.findIndex(i => this.compare(i, value))
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

export class SkuAdjoinMatrix extends AdjoinMatrix<SKUTypeDefinition.ItemModel> {
  getFriendlyName(a: SKUTypeDefinition.ItemModel): string {
    return a.name
  }

  compare(a: SKUTypeDefinition.ItemModel, b: SKUTypeDefinition.ItemModel): boolean {
    return itemModelEq(a, b)
  }

  static of(graph: Graph) {
    const adjoinMatrix = new this()
    adjoinMatrix.categories = graph.vertices.map(v => v.value)

    adjoinMatrix.traver((rowIndex, colIndex) => {
      const rowVertex = graph.vertices[rowIndex]
      graph.vertices.forEach((vertex, index) => {
        if (index === rowIndex) {
          return
        }
        if (!_.isEmpty(graph.getAdj(vertex))) {
          adjoinMatrix.set(rowIndex, colIndex, AdjoinMatrixFlag.Conjoint)
        }
      })
      if (rowIndex === colIndex) {
        adjoinMatrix.set(rowIndex, colIndex, AdjoinMatrixFlag.Disjunct)
      } else {
        const colVertex = graph.vertices[colIndex]
        const rowAdj = graph.getAdj(rowVertex)!
        if (graph.hasVertexBy(colVertex, rowAdj)) {
          adjoinMatrix.set(rowIndex, colIndex, AdjoinMatrixFlag.Conjoint)
        } else {
          adjoinMatrix.set(rowIndex, colIndex, AdjoinMatrixFlag.Disjunct)
        }
      }
    })

    return adjoinMatrix
  }

}
