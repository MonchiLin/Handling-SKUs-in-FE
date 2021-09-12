export interface IGraphVertex<T = any> {
  value: T

  get key(): string

  getFriendlyName(): string

  compare(b: IGraphVertex<T>): boolean
}

export class GraphVertex<T> implements IGraphVertex<T> {
  get key() {
    return this.value + ""
  }

  value: T

  constructor(value: T) {
    this.value = value
  }

  getFriendlyName() {
    return this.value + ""
  }

  compare(b: IGraphVertex<T>): boolean {
    return this.value === b.value
  }
}

export class Graph<T = any> {
  protected _VertexCtor!: { new(value: T): IGraphVertex<T> }

  get VertexCtor() {
    if (this._VertexCtor) {
      return this._VertexCtor
    } else {
      return GraphVertex
    }
  }

  // 顶点集
  vertices: IGraphVertex<T>[] = []
  // 顶点到相邻顶点的关系列表
  adjList = new Map<string, IGraphVertex<T>[]>()

  indexOf(v: IGraphVertex<T>) {
    return this.vertices.findIndex(a => a.compare(v))
  }

  getVertexBy(v: IGraphVertex<T>, vertices: IGraphVertex<T>[]) {
    return vertices.find(a => a.compare(v))
  }

  hasVertexBy(v: IGraphVertex<T>, vertices: IGraphVertex<T>[]) {
    return vertices.some(a => a.compare(v))
  }

  getAdj(a: IGraphVertex<T>) {
    return this.adjList.get(a.key)
  }

  hasVertex(v: IGraphVertex<T>) {
    return this.vertices.some(a => a.compare(v))
  }

  addVertex(vertex: IGraphVertex<T>) {
    if (this.hasVertex(vertex)) {
      return
    }
    this.vertices.push(vertex)
    this.adjList.set(vertex.key, [])
  }

  addVertexUnWrapped(v: T) {
    const vertex = new this.VertexCtor(v)
    this.addVertex(vertex)
  }

  addEdge(a: IGraphVertex<T>, b: IGraphVertex<T>) {
    if (!this.hasVertex(a)) {
      this.addVertex(a)
    }
    if (!this.hasVertex(b)) {
      this.addVertex(b)
    }

    const vertexA = this.getAdj(a)!
    const AHasB = this.hasVertexBy(b, vertexA)
    if (!AHasB) {
      vertexA.push(b)
    }
    const vertexB = this.getAdj(b)!
    const BHasA = this.hasVertexBy(a, vertexB)
    if (!BHasA) {
      vertexB.push(a)
    }
  }

  addEdgeUnWrapped(a: T, b: T) {
    return this.addEdge(
      new this.VertexCtor(a),
      new this.VertexCtor(b),
    )
  }

  toString() {
    let s = '';
    this.vertices.forEach((v) => {
      s += `${v.getFriendlyName()} -> `;
      this.getAdj(v)!.forEach((n) => {
        s += `${n.getFriendlyName()} `;
      });
      s += '\n';
    });
    return s;
  }

  /**
   * 检测 vertex 是否和 target 相连
   * @param vertex
   * @param target
   */
  isConnected(vertex: IGraphVertex<T>, target: IGraphVertex<T>) {
    const adj = this.getAdj(vertex)!
    return this.hasVertexBy(target, adj)
  }
}
