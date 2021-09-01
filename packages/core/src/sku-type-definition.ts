export namespace SKUTypeDefinition {
  export type Item = {
    itemId: number,
    name: string
  }

  export type ItemStock = {
    itemId: number;
    bundle: number;
    sales: number;
    quantity: number;
    unitPrice: number;
  }

  export type ItemModel = {
    itemId: number;
    modelId: number;
    modelKind: string;
    name: string;
  }

  export type ItemBundle = {
    itemId: number;
    bundle: number;
    modelId: number;
  }

}