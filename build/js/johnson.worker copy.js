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

function Dijkstra2(matrix, start = 0) {
    const rows = matrix.length, //rows和cols一样，其实就是顶点个数
        cols = matrix[0].length;
    if (rows !== cols || start >= rows) return new Error("邻接矩阵错误或者源点错误");
    //初始化distance
    let distance = new Array(rows).fill(Infinity);
    // 初始化访问节点
    let visited = new Array(rows).fill(false);
    distance[start] = 0;
    // 存在节点未访问则循环
    while (visited.some(item => !item)) {
        // 更新节点访问
        visited[start] = true
            // 达到不了的顶点不能作为中转跳点
        if (distance[start] < Infinity) {
            for (let j = 0; j < cols; j++) {
                //通过比较distance[start] + matrix[start][j]和distance[j]的大小来决定是否更新distance[j]。
                if (matrix[start][j] + distance[start] < distance[j]) {
                    distance[j] = matrix[start][j] + distance[start];
                }
            }
        }
        // 找到当前最短路径顶点作为中转跳点
        let minIndex = -1;
        let min = Infinity;
        for (let k = 0; k < rows; k++) {
            if (!visited[k] && distance[k] < min) {
                min = distance[k];
                minIndex = k;
            }
        }
        start = minIndex
    }
    return distance;
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
    for (let src = 0; src < this.dist.length; src++) {
        //console.log(this.dist, modifiedGraph, src)

        //const dijdist = Dijkstra(this.dist, modifiedGraph, src)
        const dijdist = Dijkstra2(this.dist, src)
            //console.log(dijdist)
        res.push(dijdist)

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
            const node_all = [1, 2, 3, 4]*/
    const newaccess_res = calculate_floyd(edge_all, node_all)
    postMessage(newaccess_res);

}