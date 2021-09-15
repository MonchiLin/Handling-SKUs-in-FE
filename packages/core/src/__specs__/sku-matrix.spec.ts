import { SkuGraph } from "../sku-graph";
import { AdjoinMatrix, AdjoinMatrixFlag } from "../_internal/matrix";
import { SkuAdjoinMatrix } from "../sku-adjoin-matrix";

describe("SkuMatrix", () => {

  it("valid 应该正确判断", () => {
    const matrix1 = new SkuAdjoinMatrix()
    matrix1.categories = [
      {modelId: 1, modelKind: "color", itemId: 0, name: "红色"},
      {modelId: 2, modelKind: "size", itemId: 0, name: "小"},
      {modelId: 3, modelKind: "ml", itemId: 0, name: "毫升"},
    ]

    matrix1.matrices = [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1]
    ]
    expect(matrix1.valid).toBe(true)

    const matrix2 = new SkuAdjoinMatrix()
    matrix2.categories = [
      {modelId: 1, modelKind: "color", itemId: 0, name: "红色"},
      {modelId: 2, modelKind: "size", itemId: 0, name: "小"},
      {modelId: 3, modelKind: "ml", itemId: 0, name: "毫升"}
    ]
    matrix2.matrices = [
      [1, 1, 1],
      [1, 1, 1],
    ]

    // 行数错误
    expect(matrix2.valid).toBe(false)

    matrix2.matrices = [
      [1, 1],
      [1, 1, 1],
      [1, 1, 1]
    ]

    // 第一行列数错误
    expect(matrix2.valid).toBe(false)
  });

  it("valid 应该正确判断", () => {
    const matrix1 = new SkuAdjoinMatrix()
    expect(matrix1.getFriendlyName({modelId: 1, modelKind: "color", itemId: 0, name: "红色"}))
      .toBe("红色")
    expect(matrix1.getFriendlyName({modelId: 2, modelKind: "size", itemId: 0, name: "小"}))
      .toBe("小")
    expect(matrix1.getFriendlyName({modelId: 3, modelKind: "ml", itemId: 0, name: "毫升"}))
      .not
      .toBe("小")
  });

  it("compare 应该正确判断", () => {
    const matrix1 = new SkuAdjoinMatrix()
    expect(matrix1.compare(
      {
        modelId: 1,
        modelKind: "color",
        itemId: 0,
        name: "红色"
      },
      {
        modelId: 1,
        modelKind: "color",
        itemId: 0,
        name: "红色"
      }
    )).toBe(true)

    expect(matrix1.compare(
      {
        modelId: 1,
        modelKind: "color",
        itemId: 0,
        name: "红色"
      },
      {
        modelId: 1,
        modelKind: "color",
        itemId: 1,
        name: "红色"
      }
    )).not.toBe(true)

  });

  it("使用 set 方法规避手动赋值导致的 TypeError", () => {
    const matrix = new AdjoinMatrix()
    expect(() => matrix.set(1, 1, AdjoinMatrixFlag.Conjoint)).not.toThrow()
    expect(() => matrix.matrices[5][5] = AdjoinMatrixFlag.Conjoint).toThrow(TypeError)
  });

  it("使用 traver 方法代替手动遍历矩阵", () => {
    const matrix = new AdjoinMatrix()
    matrix.matrices = [
      [1, 1, 1],
      [1, 1, 1]
    ]

    matrix.traver((rowIndex, colIndex) => {
      expect(matrix.matrices[rowIndex][colIndex]).toBe(1)
    })
  });

  it("使用 traver 方法代替手动遍历矩阵", () => {
    const matrix = new AdjoinMatrix()
    matrix.matrices = [
      [1, 1, 1],
      [1, 1, 1]
    ]

    matrix.traver((rowIndex, colIndex) => {
      expect(matrix.matrices[rowIndex][colIndex]).toBe(1)
    })
  });

  it("indexOfCategories 应该返回正确的索引", () => {
    const matrix = new AdjoinMatrix()
    matrix.categories = ["A", "B", "C"]
    expect(matrix.indexOfCategories("A")).toBe(0)
    expect(matrix.indexOfCategories("B")).toBe(1)
    expect(matrix.indexOfCategories("C")).toBe(2)
  });

  it("calculateFlagByCategories 应该返回正确的计算 flag", () => {
    const matrix = new AdjoinMatrix()
    matrix.categories = ["A", "B", "C"]

    matrix.matrices = [
      [0, 1, 1],
      [1, 0, 1],
      [1, 1, 0]
    ]

    expect(matrix.calculateFlagByCategories(["A"])).toEqual({
      "0": 0,
      "1": 1,
      "2": 1,
    })

    expect(matrix.calculateFlagByCategories(["A", "B"])).toEqual({
      "0": 0,
      "1": 0,
      "2": 1,
    })

    expect(matrix.calculateFlagByCategories(["A", "B", "C"])).toEqual({
      "0": 0,
      "1": 0,
      "2": 0,
    })

    matrix.categories = ["A", "B", "C", "D"]

    /**
     *     A  B  C  D
     *  A [0, 1, 1, 1],
     *  B [1, 0, 1, 1],
     *  C [1, 1, 0, 1],
     *  D [0, 1, 1, 0],
     *
     * A 相连: B,C
     * B 相连: A,C,D
     * C 相连: A,B,D
     * D 相连: A,B,C
     *
     */

    matrix.matrices = [
      [0, 1, 1, 1],
      [1, 0, 1, 1],
      [1, 1, 0, 1],
      [0, 1, 1, 0],
    ]

    expect(matrix.calculateFlagByCategories(["A"])).toEqual({
      "0": 0,
      "1": 1,
      "2": 1,
      "3": 0,
    })

    expect(matrix.calculateFlagByCategories(["A", "B"])).toEqual({
      "0": 0,
      "1": 0,
      "2": 1,
      "3": 0,
    })

    expect(matrix.calculateFlagByCategories(["A", "B", "C"])).toEqual({
      "0": 0,
      "1": 0,
      "2": 0,
      "3": 0,
    })

    expect(matrix.calculateFlagByCategories(["B", "C"])).toEqual({
      "0": 1,
      "1": 0,
      "2": 0,
      "3": 1,
    })

    expect(matrix.calculateFlagByCategories(["A", "C"])).toEqual({
      "0": 0,
      "1": 1,
      "2": 0,
      "3": 0,
    })


  });


});
