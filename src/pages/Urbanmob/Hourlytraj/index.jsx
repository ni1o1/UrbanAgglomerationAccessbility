import React, { useEffect, useState } from 'react'
import { Col, Card, Collapse, Tooltip, Row, Button, Descriptions, message } from 'antd';
import axios from 'axios';
import {
    InfoCircleOutlined
} from '@ant-design/icons';

import { useSubscribe, usePublish, useUnsubscribe } from '@/utils/usePubSub';

const { Panel } = Collapse;


/*
--------------Floyd-Warshall 算法----------------
*/

//Floyd算法
//使用邻接矩阵构建图，输入顶点数量
function Graph(v) {
    this.vertices = v;//顶点数
    this.edges = 0;//边数
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
        if (nodename[i] == '10-2.0') { console.log(res) }
    }
    return access_res
}



export default function Hourlytraj() {
    const unsubscribe = useUnsubscribe();//清除更新组件重复订阅的副作用
    const publish = usePublish();
    const [access_res, setaccess_res] = useState({})

    //订阅可达性
    unsubscribe('access_res')
    useSubscribe('access_res', function (msg: any, data: any) {
        setaccess_res(data)
        console.log(data)
    });
    const [vmin, setvmin] = useState(180)
    const [vmax, setvmax] = useState(300)

    //边
    const [edge_renumbered, setedge_renumbered] = useState([[0, 1, 2],
    [0, 2, 4], [1, 2, 2], [1, 3, 4], [1, 4, 2], [2, 4, 3], [3, 5, 2], [4, 3, 3], [4, 5, 2]])
    const [node_renumbered, setnode_renumbered] = useState(['a', 'b', 'c', 'd', 'e', 'f'])

    //计算可达性
    const calculateaccessbility = () => {
        const graphA = new Graph(node_renumbered.length);
        edge_renumbered.map((f) => { graphA.addEdge(f[0], f[1], f[2]); graphA.addEdge(f[1], f[0], f[2]) })
        graphA.floyd();
        const newaccess_res = graphA.showFloyf(node_renumbered);
        publish('access_res', newaccess_res);
        message.success('计算成功，可达性已更新！')
    }

    //获取网络并加载
    useState(() => {
        //加载边
        axios.get('data/edge_renumbered.json').then(response => {
            setedge_renumbered(response.data)
        }).then((rank2_reshape) => {
            axios.get('data/node_renumbered.json').then(response => {
                setnode_renumbered(response.data)
            })
        })
    }, [])
    return (
        <>
            <Col span={24}>
                <Card title="社区可达性"
                    bordered={false}>
                    <Collapse defaultActiveKey={['panel1', 'panel2']}>

                        <Panel header="社区可达性"
                            extra={<Tooltip title='平均出行时间计算方法：获得每个社区到其他所有社区的铁路+出租车交通方式出行时长，再计算平均值得到'><InfoCircleOutlined /></Tooltip>} key="panel1">
                            <Row>
                                【铁路+出租车】平均出行时间（分钟）
                            </Row>
                            <br />
                            <Row>
                                <Col span={3} style={{ textAlign: 'center' }}>
                                    {vmin}
                                </Col>
                                <Col span={18}>
                                    <div style={{ height: '20px', width: '100%', backgroundImage: "linear-gradient(to right,#9DCC42, #FFFE03, #F7941D, #E9420E, #FF0000)" }}></div>
                                </Col>
                                <Col span={3} style={{ textAlign: 'center' }}>
                                    {vmax}
                                </Col>
                            </Row>
                        </Panel>
                        <Panel header="可达性计算" key="panel2">
                            <Descriptions title="交通拓扑网络信息">
                                <Descriptions.Item label="节点数量">{node_renumbered.length}</Descriptions.Item>
                                <Descriptions.Item label="边数量"> {edge_renumbered.length}</Descriptions.Item>
                            </Descriptions>
                            <Button type="primary" onClick={calculateaccessbility}>计算可达性</Button>
                        </Panel>
                    </Collapse>
                </Card>
            </Col>
        </>
    )

}