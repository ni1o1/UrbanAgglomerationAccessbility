/*
--------------图构建---------------
*/
//#region
//使用邻接矩阵构建图，输入顶点数量
function Graph(v) {
    this.vertices = v; //顶点数
    this.edges = 0; //边数
    this.adj = [];
    //通过 for 循环为矩阵的每一个元素赋值0。
    for (let i = 0; i < this.vertices; i++) {
        this.adj[i] = [];
        for (let j = 0; j < this.vertices; j++)
            this.adj[i][j] = Infinity;
    }
    //添加一个数组用于存储路径长度
    this.dist = [];
    this.addEdge = addEdge;
    this.floyd = floyd;
    this.showFloyf = showFloyf;
    this.johnson = johnson;
}

//添加边
function addEdge(v, w, k) {
    this.adj[v][w] = k;
    this.edges++;
}

function floyd() {
    for (let i = 0; i < this.vertices; i++) {
        this.dist[i] = [];
        for (let j = 0; j < this.vertices; j++) {
            if (i === j) {
                this.dist[i][j] = 0;
            } else if (!isFinite(this.adj[i][j])) {
                this.dist[i][j] = 10000;
            } else {
                this.dist[i][j] = this.adj[i][j];
            }
        }
    }
    for (let k = 0; k < this.vertices; k++) {
        for (let i = 0; i < this.vertices; i++) {
            for (let j = 0; j < this.vertices; j++) {
                if ((this.dist[i][k] + this.dist[k][j]) < this.dist[i][j]) {
                    this.dist[i][j] = this.dist[i][k] + this.dist[k][j];
                }
            }
        }
    }
}

function showFloyf(nodename) {
    let access_res = {}
    for (let i = 0; i < this.vertices; i++) {
        let res = []
        for (let j = 0; j < this.vertices; j++) {
            let value = this.dist[i][j] >= 10000 ? this.dist[j][i] : this.dist[i][j]
            if (value < 10000) {
                res.push(value)
            }
        }

        access_res[nodename[i]] = parseInt(res.reduce((a, b) => { return a + b }, 0) / (res.length))
    }
    return access_res
}
//#endregion
/*
---------------johnson算法---------------
*/
//#region
const MAX_INT = 10000

function minDistance(dist, visited) {

    let minimum = MAX_INT
    let minVertex = 0
    for (let vertex = 0; vertex < dist.length; vertex++) {
        if ((minimum > dist[vertex]) & (visited[vertex] == false)) {
            minimum = dist[vertex]
            minVertex = vertex
        }
    }
    return minVertex
}

function Dijkstra(graph, modifiedGraph, src) {
    const num_vertices = graph.length
    let sptSet = {}
    let dist = []
    for (let i = 0; i < num_vertices; i++) {
        sptSet[i] = false
        dist.push(MAX_INT)
    }
    dist[src] = 0

    for (let count = 0; count < num_vertices; count++) {
        let curVertex = minDistance(dist, sptSet)
        sptSet[curVertex] = true
        for (let vertex = 0; vertex < num_vertices; vertex++) {
            if ((sptSet[vertex] == false) & (dist[vertex] > (dist[curVertex] +
                    modifiedGraph[curVertex][vertex])) & (graph[curVertex][vertex] != 0)) {
                dist[vertex] = (dist[curVertex] +
                    modifiedGraph[curVertex][vertex]);
            }
        }
    }

    return dist
}

//dijdist
class Node {
    constructor(val, priority) {
        this.val = val;
        this.priority = priority;
    }
}

class PriorityQueue {
    constructor() {
        this.values = [];
    }
    enqueue(val, priority) {
        let newNode = new Node(val, priority);
        this.values.push(newNode);
        this.bubbleUp();
    }
    bubbleUp() {
        let idx = this.values.length - 1;
        const element = this.values[idx];
        while (idx > 0) {
            let parentIdx = Math.floor((idx - 1) / 2);
            let parent = this.values[parentIdx];
            if (element.priority >= parent.priority) break;
            this.values[parentIdx] = element;
            this.values[idx] = parent;
            idx = parentIdx;
        }
    }
    dequeue() {
        const min = this.values[0];
        const end = this.values.pop();
        if (this.values.length > 0) {
            this.values[0] = end;
            this.sinkDown();
        }
        return min;
    }
    sinkDown() {
        let idx = 0;
        const length = this.values.length;
        const element = this.values[0];
        while (true) {
            let leftChildIdx = 2 * idx + 1;
            let rightChildIdx = 2 * idx + 2;
            let leftChild, rightChild;
            let swap = null;

            if (leftChildIdx < length) {
                leftChild = this.values[leftChildIdx];
                if (leftChild.priority < element.priority) {
                    swap = leftChildIdx;
                }
            }
            if (rightChildIdx < length) {
                rightChild = this.values[rightChildIdx];
                if (
                    (swap === null && rightChild.priority < element.priority) ||
                    (swap !== null && rightChild.priority < leftChild.priority)
                ) {
                    swap = rightChildIdx;
                }
            }
            if (swap === null) break;
            this.values[idx] = this.values[swap];
            this.values[swap] = element;
            idx = swap;
        }
    }
}

//Dijkstra's algorithm only works on a weighted graph.

class WeightedGraph {
    constructor() {
        this.adjacencyList = {};
    }
    addVertex(vertex) {
        if (!this.adjacencyList[vertex]) this.adjacencyList[vertex] = [];
    }
    addEdge(vertex1, vertex2, weight) {
        this.adjacencyList[vertex1].push({ node: vertex2, weight });
        this.adjacencyList[vertex2].push({ node: vertex1, weight });
    }
    Dijkstra(start) {
        const nodes = new PriorityQueue();
        const distances = {};
        const previous = {};
        let path = []; //to return at end
        let smallest;
        //build up initial state
        for (let vertex in this.adjacencyList) {
            if (vertex === start) {
                distances[vertex] = 0;
                nodes.enqueue(vertex, 0);
            } else {
                distances[vertex] = Infinity;
                nodes.enqueue(vertex, Infinity);
            }
            previous[vertex] = null;
        }
        // as long as there is something to visit
        while (nodes.values.length) {
            smallest = nodes.dequeue().val;
            if (smallest || distances[smallest] !== Infinity) {
                for (let neighbor in this.adjacencyList[smallest]) {
                    //find neighboring node
                    let nextNode = this.adjacencyList[smallest][neighbor];
                    //calculate new distance to neighboring node
                    let candidate = distances[smallest] + nextNode.weight;
                    let nextNeighbor = nextNode.node;
                    if (candidate < distances[nextNeighbor]) {
                        //updating new smallest distance to neighbor
                        distances[nextNeighbor] = candidate;
                        //updating previous - How we got to neighbor
                        previous[nextNeighbor] = smallest;
                        //enqueue in priority queue with new priority
                        nodes.enqueue(nextNeighbor, candidate);
                    }
                }
            }
        }
        return distances;
    }
}




function BellmanFord(edges, graph, num_vertices) {
    let dist = []
    for (let i = 0; i < num_vertices + 1; i++) {
        dist.push(MAX_INT)
    }

    dist[num_vertices] = 0

    for (let i = 0; i < num_vertices; i++) {
        edges.push([num_vertices, i, 0])
    }
    for (let i = 0; i < num_vertices; i++) {
        for (let j = 0; j < edges.length; j++) {
            let src = edges[j][0]
            let des = edges[j][1]
            let weight = edges[j][2]
            if ((dist[src] != MAX_INT) &
                (dist[src] + weight < dist[des])) {
                dist[des] = dist[src] + weight
            }
        }
    }

    return dist.slice(0, num_vertices)
}


function johnson(edges) {
    let modifiedGraph = new Array(this.vertices); //表格有10行
    for (let i = 0; i < modifiedGraph.length; i++) {
        modifiedGraph[i] = new Array(this.vertices); //每行有10列
    }
    for (let i = 0; i < this.vertices; i++) {
        this.dist[i] = [];
        for (let j = 0; j < this.vertices; j++) {
            if (i === j) {
                this.dist[i][j] = 0;
            } else if (!isFinite(this.adj[i][j])) {
                this.dist[i][j] = 10000;
            } else {
                this.dist[i][j] = this.adj[i][j];
            }
        }
    }
    const modifyWeights = BellmanFord(edges, this.dist, this.dist.length)
    for (let i = 0; i < this.dist.length; i++) {
        for (let j = 0; j < this.dist[i].length; j++) {
            if (this.dist[i][j] != 0) {
                modifiedGraph[i][j] = (this.dist[i][j] + modifyWeights[i] - modifyWeights[j])
            }
        }
    }

    let res = []

    let graph = new WeightedGraph();
    for (let i = 0; i < modifiedGraph.length; i++) {
        graph.addVertex('node' + i.toString());
    }
    for (let i = 0; i < modifiedGraph.length; i++) {
        for (let j = 0; j < modifiedGraph.length; j++) {
            if ((modifiedGraph[i][j] != undefined) & (modifiedGraph[i][j] != MAX_INT)) {
                graph.addEdge('node' + i.toString(), 'node' + j.toString(), modifiedGraph[i][j])
            }
        }
    }

    for (let src = 0; src < this.dist.length; src++) {
        //console.log(this.dist, modifiedGraph, src)
        /*
            var graph = new WeightedGraph();
            graph.addVertex("A");
            graph.addVertex("B");
            graph.addVertex("C");
            graph.addVertex("D");
            graph.addVertex("E");
            graph.addVertex("F");

            graph.addEdge("A", "B", 4);
            graph.addEdge("A", "C", 2);
            graph.addEdge("B", "E", 3);
            graph.addEdge("C", "D", 2);
            graph.addEdge("C", "F", 4);
            graph.addEdge("D", "E", 3);
            graph.addEdge("D", "F", 1);
            graph.addEdge("E", "F", 1);

            console.log(graph.Dijkstra("A"));
        */
        const dijdist = graph.Dijkstra('node' + src.toString())

        dijdist2 = []
        Object.keys(dijdist).forEach(key => {
                dijdist2.push(dijdist[key])
            })
            //const dijdist = Dijkstra(this.dist, modifiedGraph, src)
            //console.log(dijdist)
        res.push(dijdist2)

    }
    return res
}

function calculate_floyd(edge_all, node_all) {
    const graphA = new Graph(node_all.length);
    edge_all.map((f) => {
        graphA.addEdge(f[0], f[1], f[2]);
        graphA.addEdge(f[1], f[0], f[2])
    })

    const res = graphA.johnson(edge_all);
    graphA.dist = res
    const newaccess_res = graphA.showFloyf(node_all);
    return newaccess_res
}


//#endregion
/*
---------------对接---------------
*/
//#region
onmessage = ({ data }) => {

    const edge_all = data[0]
    const node_all = data[1]
        /*
            const edge_all = [
                [0, 1, 1],
                [0, 2, 1],
                [1, 3, 2],
                [2, 3, 1]
            ]
            const node_all = [0, 1, 2, 3]
        */
    const newaccess_res = calculate_floyd(edge_all, node_all)

    postMessage(newaccess_res);

}