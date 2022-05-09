//Floyd算法
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

function calculate_floyd(edge_all, node_all) {

    const graphA = new Graph(node_all.length);
    edge_all.map((f) => {
        graphA.addEdge(f[0], f[1], f[2]);
        graphA.addEdge(f[1], f[0], f[2])
    })
    graphA.floyd();
    return { access_res: graphA.showFloyf(node_all), shortest_path: graphA.dist }
}

onmessage = ({ data }) => {

    const edge_all = data[0]
    const node_all = data[1]
    const newaccess_res = calculate_floyd(edge_all, node_all)
    postMessage(newaccess_res);

}