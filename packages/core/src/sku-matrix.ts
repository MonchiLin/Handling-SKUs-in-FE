import _ from "lodash/fp";
import { SKUTypeDefinition } from "./sku-type-definition";
import { itemModelEq } from "./_fn";
import { AdjoinMatrix, AdjoinMatrixFlag } from "./_internal/matrix";
import { Graph } from "./_internal/graph";

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
