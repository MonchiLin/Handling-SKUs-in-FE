import { inject, provide, reactive, ref } from "vue";
import { SKUService } from "@sku/core/src/sku-service";

export const SKUServiceProvide = () => {
  const skuService = new SKUService()
  provide("sku-service", reactive(skuService))
}

export const useSKUService = (): SKUService => {
  return inject<SKUService>("sku-service")!
}
