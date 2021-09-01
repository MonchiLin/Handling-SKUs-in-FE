import { SKUTypeDefinition } from "./sku-type-definition";

export class SkuMemoryDb {
  items: SKUTypeDefinition.Item[] = [
    {
      itemId: 1,
      name: "Windows"
    }
  ]
  bundles: SKUTypeDefinition.ItemBundle[] = []
  stocks: SKUTypeDefinition.ItemStock[] = []
  models: SKUTypeDefinition.ItemModel[] = []
}
