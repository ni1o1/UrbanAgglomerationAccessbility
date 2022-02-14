import React, { useEffect, useState } from 'react'
import { Col, Card, Collapse, Slider, Tooltip, Row, Switch, Button, Descriptions, message } from 'antd';
import axios from 'axios';
import {
    InfoCircleOutlined
} from '@ant-design/icons';

import { useSubscribe, usePublish, useUnsubscribe } from '@/utils/usePubSub';
import { length } from '@turf/turf'
import useWebWorker from "react-webworker-hook";

const { Panel } = Collapse;




export default function Hourlytraj() {
    const unsubscribe = useUnsubscribe();//清除更新组件重复订阅的副作用
    const publish = usePublish();
    const [access_res, setaccess_res] = useState({})

    //订阅可达性
    unsubscribe('access_res')
    useSubscribe('access_res', function (msg: any, data: any) {
        setaccess_res(data)
    });
    const [vmin, setvmin] = useState(180)
    const [vmax, setvmax] = useState(300)

    //边
    const [edge_renumbered, setedge_renumbered] = useState([])
    const [node_renumbered, setnode_renumbered] = useState([])

    //边
    const [edge_new, setedge_new] = useState([])
    const [node_new, setnode_new] = useState([])

    //计算可达性
    const [data=0 , postData] = useWebWorker({
        url: "./js/floyd.worker.js"
      });

    const calculateaccessbility = () => {
        const edge_all = edge_renumbered.concat(edge_new)
        const node_all = node_renumbered.concat(node_new)
        //发布计算指令
        postData([edge_all,node_all])
        message.loading({content:'可达性计算中',key:'cal'})
        //publish('access_res', newaccess_res);
        //message.success('计算成功，可达性已更新！')
    }
    useEffect(() => { 
        if (data!=0){
            publish('kedaxing', data)
        
        message.destroy('cal')
        message.success('计算成功，可达性已更新！')
    }
    },[data])

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
    //车速km/h
    const [travelspeed, settravelspeed] = useState(180)
    //自定义线路站点信息
    const [linkCollection, setlinkCollection] = useState({
        type: 'FeatureCollection',
        features: []
    });
    const [stationCollection, setstationCollection] = useState({
        type: 'FeatureCollection',
        features: []
    });
    unsubscribe('stationCollection')
    useSubscribe('stationCollection', function (msg: any, data: any) {
        setstationCollection(data)
        if (data.features.length > 0) {
            //处理节点
            setnode_new(data.features.map(f => '自定义' + f.properties.stationid))
            //处理边
            const newedge = []
            //添加点与社区的边
            data.features.map(f => {
                if (f.properties.groupname != null) {
                    //此点的id
                    const newpointid = node_renumbered.length - 1 + f.properties.stationid
                    //社区的id
                    const communityid = node_renumbered.indexOf(f.properties.groupname)
                    //添加双向边
                    newedge.push([newpointid, communityid, 0])
                    newedge.push([communityid, newpointid, 0])
                }
            }
            )
            //添加点与点之间的边
            //获取线路数
            const numberlines = linkCollection.features.length
            for (let i = 0; i < numberlines; i++) {
                let thislinestation = data.features.filter((a) => a.properties.index == i)
                thislinestation = thislinestation.sort(function (a, b) {
                    return a.properties.location - b.properties.location
                })
                for (let j = 0; j < thislinestation.length - 1; j++) {
                    //此点的id
                    const newpointid1 = node_renumbered.length - 1 + thislinestation[j].properties.stationid
                    //下一点的id
                    const newpointid2 = node_renumbered.length - 1 + thislinestation[j + 1].properties.stationid
                    //距离
                    const distance = Math.abs(thislinestation[j + 1].properties.location - thislinestation[j].properties.location)
                    //出行时长
                    const traveltime = 60 * distance / travelspeed
                    //添加双向边
                    newedge.push([newpointid1, newpointid2, traveltime])
                    newedge.push([newpointid2, newpointid1, traveltime])
                }
            }
            setedge_new(newedge)
        } else {
            setnode_new([])
            setedge_new([])
        }
    });
    unsubscribe('linkCollection')
    useSubscribe('linkCollection', function (msg: any, data: any) {
        setlinkCollection(data)

    });
    return (
        <>
            <Col span={24}>
                <Card title="社区可达性"
                    bordered={false}>
                    <Collapse defaultActiveKey={['panel1', 'panel2', 'panel3']}>

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
                        <Panel header="自定义交通网络" key="panel2">

                            <Row gutters={4}>
                                <Col>
                                    <Button type='primary' onClick={() => {
                                        publish('startedit', true)
                                    }}>添加线路</Button>
                                </Col>
                                <Col>
                                    <Button onClick={() => { publish('deletefeature', true) }}>清空线路</Button>
                                    <Button onClick={() => { publish('deletefeature_station', true) }}>清空站点</Button>
                                </Col>
                            </Row>
                            <br />
                            <Row>
                                <Col span={10}>
                                    运行速度:{travelspeed}km/h
                                </Col>
                                <Col span={14}>
                                    <Slider
                                        min={30}
                                        max={400}
                                        onChange={(v) => {
                                            settravelspeed(v)
                                        }}
                                        value={typeof travelspeed === 'number' ? travelspeed : 0}
                                        step={5}
                                    />

                                </Col>

                            </Row>
                            <Descriptions title="">
                                <Descriptions.Item label="线路数" span={2}>{linkCollection.features.length}条</Descriptions.Item>
                                <Descriptions.Item label="线路总长" span={2}>{length(linkCollection).toFixed(2)}km</Descriptions.Item>
                            </Descriptions>
                        </Panel>
                        <Panel header="可达性计算" key="panel3">
                            <Descriptions title="交通拓扑网络信息">
                                <Descriptions.Item label="内置节点数量" span={2}>{node_renumbered.length}</Descriptions.Item>
                                <Descriptions.Item label="内置边数量" span={2}> {edge_renumbered.length}</Descriptions.Item>
                                <Descriptions.Item label="自定义节点数量" span={2}>{node_new.length}</Descriptions.Item>
                                <Descriptions.Item label="自定义边数量" span={2}> {edge_new.length}</Descriptions.Item>
                            </Descriptions>


                            <Button type="primary" onClick={calculateaccessbility}>计算可达性</Button>
                        </Panel>
                    </Collapse>
                </Card>
            </Col>
        </>
    )

}