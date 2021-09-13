import { SkuGraph, SkuGraphVertex } from "../sku-graph";
import { Graph, GraphVertex, IGraphVertex } from "../_internal/graph";
import { SKUTypeDefinition } from "../sku-type-definition";

/**
 * 这里处理下数据结构，更好做测试代码判断
 * 处理完之后数据结构大概如下，key 为 modelId，值为 modelId 关联的顶点的集合
 * {
 *   modelId: modelId[]
 * }
 */
const getAdjListForTest = (adjList: Map<string, IGraphVertex<SKUTypeDefinition.ItemModel>[]>) => {
  return [...adjList.entries()]
    .reduce((prev, [key, value]) => {
      return {...prev, [key]: value.map(s => s.key).sort()}
    }, <Record<string, string[]>>{})
}

const exceptAdjListSort = (o: Record<string, string[]>) => {
  return Object.keys(o)
    .reduce((previousValue, currentValue) => {
      return {...previousValue, [currentValue]: o[currentValue].sort()}
    }, <typeof o>{})
}


describe("SkuGraph", () => {

  it("Graph 应该使用正确的顶点构造器", () => {
    const skuGraph = new SkuGraph()
    expect(skuGraph.VertexCtor).toBe(SkuGraphVertex)

    const graph = new Graph()
    expect(graph.VertexCtor).toBe(GraphVertex)
  });

  it("矩阵数据判断测试零", () => {
    const skuGraph = SkuGraph.of({
      itemModels: [],
      itemStocks: [],
      itemBundles: []
    });

    expect(skuGraph.vertices.length).toBe(0)
  });

  describe('矩阵数据判断测试一', function () {
    const data = {
      "items": [
        {"itemId": 1, "name": "Windows"}
      ],
      "bundles": [
        {"itemId": 1, "bundle": 0, "modelId": 0},
        {"itemId": 1, "bundle": 0, "modelId": 1},
        {"itemId": 1, "bundle": 0, "modelId": 2},
        {"itemId": 1, "bundle": 1, "modelId": 0},
        {"itemId": 1, "bundle": 1, "modelId": 1},
        {"itemId": 1, "bundle": 1, "modelId": 4}
      ],
      "stocks": [
        {
          "itemId": 1,
          "bundle": 0,
          "sales": 0,
          "quantity": 1,
          "unitPrice": 0
        },
        {
          "itemId": 1,
          "bundle": 1,
          "sales": 0,
          "quantity": 1,
          "unitPrice": 0
        }
      ],
      "models": [
        {"itemId": 1, "modelKind": "size", "name": "小", "modelId": 0},
        {"itemId": 1, "modelKind": "color", "name": "蓝色", "modelId": 1},
        {"itemId": 1, "modelKind": "edition", "name": "Lite", "modelId": 2},
        {"itemId": 1, "modelKind": "edition", "name": "Plus", "modelId": 4}
      ]
    }

    it("不连接相同种类的商品型号", () => {

      const skuGraph = SkuGraph.of({
        itemModels: data.models,
        itemStocks: data.stocks,
        itemBundles: data.bundles,
        linkSameModelKind: false
      });

      expect(skuGraph.vertices.length).toBe(data.models.length)
      expect(skuGraph.vertices.map(v => v.key)).toEqual(expect.arrayContaining(["0", "1", "2", "4"]))

      /**
       * 这里处理下数据结构，更好做测试代码判断
       * 处理完之后数据结构大概如下，key 为 modelId，值为 modelId 关联的顶点的集合
       * {
       *   modelId: modelId[]
       * }
       */
      const adjList = getAdjListForTest(skuGraph.adjList)

      expect(adjList).toEqual(exceptAdjListSort({
        "0": ["1", "2", "4"],
        "1": ["0", "2", "4"],
        "2": ["0", "1"],
        "4": ["0", "1"],
      }))
    });

    it("连接相同种类的商品型号", () => {
      const skuGraph = SkuGraph.of({
        itemModels: data.models,
        itemStocks: data.stocks,
        itemBundles: data.bundles,
        linkSameModelKind: true
      });

      const adjList = getAdjListForTest(skuGraph.adjList)

      expect(adjList).toEqual(exceptAdjListSort({
        "0": ["1", "2", "4"],
        "1": ["0", "2", "4"],
        "2": ["0", "1", "4"],
        "4": ["0", "1", "2"],
      }))
    });
  });

  describe('矩阵数据判断测试二', function () {
    const data = {
      "items": [{"itemId": 1, "name": "Windows"}],
      "bundles": [
        {"itemId": 1, "bundle": 0, "modelId": 0},
        {"itemId": 1, "bundle": 0, "modelId": 1},
        {"itemId": 1, "bundle": 0, "modelId": 2},

        {"itemId": 1, "bundle": 1, "modelId": 0},
        {"itemId": 1, "bundle": 1, "modelId": 3},
        {"itemId": 1, "bundle": 1, "modelId": 2},

        {"itemId": 1, "bundle": 2, "modelId": 7},
        {"itemId": 1, "bundle": 2, "modelId": 1},
        {"itemId": 1, "bundle": 2, "modelId": 2},

        {"itemId": 1, "bundle": 3, "modelId": 7},
        {"itemId": 1, "bundle": 3, "modelId": 3},
        {"itemId": 1, "bundle": 3, "modelId": 2},

        {"itemId": 1, "bundle": 4, "modelId": 8},
        {"itemId": 1, "bundle": 4, "modelId": 1},
        {"itemId": 1, "bundle": 4, "modelId": 2},

        {"itemId": 1, "bundle": 5, "modelId": 8},
        {"itemId": 1, "bundle": 5, "modelId": 3},
        {"itemId": 1, "bundle": 5, "modelId": 2}
      ],
      "stocks": [
        {"itemId": 1, "bundle": 0, "sales": 0, "quantity": 1, "unitPrice": 0},
        {"itemId": 1, "bundle": 1, "sales": 0, "quantity": 1, "unitPrice": 0},
        {"itemId": 1, "bundle": 2, "sales": 0, "quantity": 1, "unitPrice": 0},
        {"itemId": 1, "bundle": 3, "sales": 0, "quantity": 1, "unitPrice": 0},
        {"itemId": 1, "bundle": 4, "sales": 0, "quantity": 1, "unitPrice": 0},
        {"itemId": 1, "bundle": 5, "sales": 0, "quantity": 1, "unitPrice": 0}
      ],
      "models": [
        {"itemId": 1, "modelKind": "size", "name": "小", "modelId": 0},
        {"itemId": 1, "modelKind": "color", "name": "蓝色", "modelId": 1},
        {"itemId": 1, "modelKind": "edition", "name": "Lite", "modelId": 2},
        {"itemId": 1, "modelKind": "color", "name": "红色", "modelId": 3},
        {"itemId": 1, "modelKind": "size", "name": "中", "modelId": 7},
        {"itemId": 1, "modelKind": "size", "name": "大", "modelId": 8}
      ]
    }

    it("不连接相同种类的商品型号", () => {
      const skuGraph = SkuGraph.of({
        itemModels: data.models,
        itemStocks: data.stocks,
        itemBundles: data.bundles,
        linkSameModelKind: false
      });
      expect(skuGraph.vertices.length).toBe(data.models.length)
      expect(skuGraph.vertices.map(v => v.key)).toEqual(expect.arrayContaining(["0", "1", "2", "3", "7", "8"]))
      const adjList = getAdjListForTest(skuGraph.adjList)

      expect(adjList).toEqual(exceptAdjListSort({
        "0": ["1", "2", "3"],
        "1": ["0", "2", "7", "8"],
        "2": ["0", "1", "3", "7", "8"],
        "3": ["0", "2", "7", "8"],
        "7": ["1", "2", "3"],
        "8": ["1", "2", "3"]
      }))
    });

    it("连接相同种类的商品型号", () => {
      const skuGraph = SkuGraph.of({
        itemModels: data.models,
        itemStocks: data.stocks,
        itemBundles: data.bundles,
        linkSameModelKind: true
      });

      const adjList = getAdjListForTest(skuGraph.adjList)

      expect(adjList).toEqual(exceptAdjListSort({
        "0": ["1", "2", "3", "7", "8"],
        "1": ["0", "2", "7", "8", "3"],
        "2": ["0", "1", "3", "7", "8"],
        "3": ["0", "2", "7", "8", "1"],
        "7": ["1", "2", "3", "0", "8"],
        "8": ["1", "2", "3", "0", "7"]
      }))
    });
  });

  describe('传入错误的商品数据', function () {
    const data = {
      "items": [{"itemId": 1, "name": "Windows"}],
      "bundles": [{"itemId": 1, "bundle": 0, "modelId": 3}, {"itemId": 1, "bundle": 0, "modelId": 6}],
      "stocks": [{"itemId": 1, "bundle": 0, "sales": 0, "quantity": -1, "unitPrice": 0}, null as any],
      "models": [{"itemId": 1, "modelKind": "color", "name": "红色", "modelId": 3}, {
        "itemId": 1,
        "modelKind": "edition",
        "name": "Pro X",
        "modelId": 6
      }]
    }

    it("应该抛出错误", () => {
      expect(
        () => SkuGraph.of({
          itemModels: data.models,
          itemStocks: data.stocks,
          itemBundles: data.bundles,
          linkSameModelKind: false
        })
      ).toThrow(Error)
    });

  });

});
