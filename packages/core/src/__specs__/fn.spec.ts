import { cartesian, replaceAt, itemBundleEq, itemModelEq, itemStockEq } from "../_fn";

describe("_fn", () => {

  it("cartesian-生成笛卡尔卷积测试", () => {
    expect(cartesian(
      [
        ["红色", "黄色"],
        ["小", "中"],
        ["Pro", "Plus"],
      ]
    )).toEqual([
      ["红色", "小", "Pro"],
      ["红色", "小", "Plus"],
      ["红色", "中", "Pro"],
      ["红色", "中", "Plus"],
      ["黄色", "小", "Pro"],
      ["黄色", "小", "Plus"],
      ["黄色", "中", "Pro"],
      ["黄色", "中", "Plus"],
    ])

    expect(cartesian(
      [
        ["Intel", "AMD"],
        ["中端", "高端", "发烧级"],
      ]
    )).toEqual([
      ["Intel", "中端"],
      ["Intel", "高端"],
      ["Intel", "发烧级"],
      ["AMD", "中端"],
      ["AMD", "高端"],
      ["AMD", "发烧级"],
    ])
  });

  it("replaceAt-应该生成一个新的数组而不是改变原来的", () => {
    const originArr = [{index: 0}, {index: 1}, {index: 2}]
    const newArr = replaceAt(
      0,
      {index: 999},
      originArr
    )
    expect(originArr[0]).toEqual({index: 0})
    expect(newArr[0]).toEqual({index: 999})
  });

  it("itemBundleEq-相等判断", () => {
    expect(
      itemBundleEq(
        {itemId: 0, bundle: 0, modelId: 0},
        {itemId: 0, bundle: 0, modelId: 0},
      )
    ).toEqual(true)

    expect(
      itemBundleEq(
        {itemId: 0, bundle: 0, modelId: 0},
        {itemId: 1, bundle: 0, modelId: 0},
      )
    ).toEqual(false)

    expect(
      itemBundleEq(
        {itemId: 0, bundle: 0, modelId: 0},
        {itemId: 0, bundle: 1, modelId: 0},
      )
    ).toEqual(false)

    expect(
      itemBundleEq(
        {itemId: 0, bundle: 0, modelId: 0},
        {itemId: 0, bundle: 0, modelId: 1},
      )
    ).toEqual(false)
  });

  it("itemStockEq-相等判断", () => {
    expect(
      itemStockEq(
        {itemId: 1, bundle: 0},
        {itemId: 1, bundle: 0},
      )
    ).toEqual(true)

    expect(
      itemStockEq(
        {itemId: 1, bundle: 0},
        {itemId: 0, bundle: 0},
      )
    ).toEqual(false)

    expect(
      itemStockEq(
        {itemId: 1, bundle: 0},
        {itemId: 0, bundle: 1},
      )
    ).toEqual(false)

    expect(
      itemStockEq(
        {itemId: 1, bundle: 0},
        {itemId: 1, bundle: 1},
      )
    ).toEqual(false)

  });

  it("itemModelEq-相等判断", () => {

    expect(
      itemModelEq(
        {itemId: 0, modelKind: "size", modelId: 0},
        {itemId: 0, modelKind: "size", modelId: 0}
      )
    ).toEqual(true)

    expect(
      itemModelEq(
        {itemId: 0, modelKind: "size", modelId: 0},
        {itemId: 0, modelKind: "color", modelId: 0}
      )
    ).toEqual(false)

    expect(
      itemModelEq(
        {itemId: 0, modelKind: "size", modelId: 0},
        {itemId: 1, modelKind: "size", modelId: 0}
      )
    ).toEqual(false)

    expect(
      itemModelEq(
        {itemId: 0, modelKind: "size", modelId: 0},
        {itemId: 0, modelKind: "size", modelId: 1}
      )
    ).toEqual(false)

    expect(
      itemModelEq(
        {itemId: 0, modelKind: "size", modelId: 0},
        {itemId: 0, modelKind: "瓶", modelId: 0}
      )
    ).toEqual(false)


  });
});
