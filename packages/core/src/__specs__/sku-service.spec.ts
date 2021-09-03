import { SKUService } from "../sku-service";

describe("SkuService", () => {
  const skuService = new SKUService()

  it("应该根据商品型号排序 Stock", () => {
    skuService.currentItemStocksWithItemModelAsc
  });
});
