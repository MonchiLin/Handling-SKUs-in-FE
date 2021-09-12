import { SkuGraphVertex } from "../sku-graph";

describe("SkuGraphVertex", () => {

  it("compare 函数", () => {
    const a = new SkuGraphVertex({
      itemId: 0,
      modelId: 0,
      modelKind: "color",
      name: "商品A"
    })

    const b = new SkuGraphVertex({
      itemId: 1,
      modelId: 0,
      modelKind: "color",
      name: "商品B"
    })

    expect(a.compare(b)).toBe(false)
    expect(a.compare(a)).toBe(true)
  });

  it("getFriendlyName 函数", () => {
    const a = new SkuGraphVertex({
      itemId: 0,
      modelId: 0,
      modelKind: "color",
      name: "商品A"
    })

    expect(a.getFriendlyName()).toBe("商品A")
  });

});
