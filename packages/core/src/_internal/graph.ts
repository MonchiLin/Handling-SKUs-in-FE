export interface IVertex<T = any> {
  value: T

  get key(): string
}

export class Vertex<T> implements IVertex<T> {
  get key() {
    return this.value + ""
  }

  value: T

  constructor(value: T) {
    this.value = value
  }

}

export class Graph<T = any> {
  protected _VertexCtor!: { new(value: T): IVertex<T> }

  get VertexCtor() {
    if (this._VertexCtor) {
      return this._VertexCtor
    } else {
      return Vertex
    }
  }

  protected compare(a: IVertex<T>, b: IVertex<T>): boolean {
    return a === b
  }

  // 顶点集
  vertices: IVertex<T>[] = []
  // 顶点到相邻顶点的关系列表
  adjList = new Map<string, IVertex<T>[]>()

  indexOf(v: IVertex<T>) {
    return this.vertices.findIndex(a => this.compare(a, v))
  }

  getVertexBy(v: IVertex<T>, vertices: IVertex<T>[]) {
    return vertices.find(a => this.compare(a, v))
  }

  hasVertexBy(v: IVertex<T>, vertices: IVertex<T>[]) {
    return vertices.some(a => this.compare(a, v))
  }

  getAdj(a: IVertex<T>) {
    return this.adjList.get(a.key)
  }

  hasVertex(v: IVertex<T>) {
    return this.vertices.some(a => this.compare(a, v))
  }

  addVertex(vertex: IVertex<T>) {
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

  addEdge(a: IVertex<T>, b: IVertex<T>) {
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

  protected getFriendlyName(v: IVertex<T>) {
    return v.key
  }

  toString() {
    let s = '';
    this.vertices.forEach((v) => {
      s += `${this.getFriendlyName(v)} -> `;
      this.getAdj(v)!.forEach((n) => {
        s += `${this.getFriendlyName(n)} `;
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
  isConnected(vertex: IVertex<T>, target: IVertex<T>) {
    const adj = this.getAdj(vertex)!
    return this.hasVertexBy(target, adj)
  }
}
