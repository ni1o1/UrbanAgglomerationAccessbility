import React, { useEffect, useState } from 'react'
import { Col, Card, Collapse, Select, Menu, Dropdown, Table, Tooltip, Row, Switch, Button, Descriptions, message, Upload, InputNumber } from 'antd';
import axios from 'axios';
import {
    InfoCircleOutlined, DownOutlined, DownloadOutlined
} from '@ant-design/icons';
import { downloadFile } from '@/utils/downloadFile';
import { useSubscribe, usePublish, useUnsubscribe } from '@/utils/usePubSub';
import { length } from '@turf/turf'
import useWebWorker from "react-webworker-hook";

const { Panel } = Collapse;


const { Option } = Select;

export default function Hourlytraj() {
    const unsubscribe = useUnsubscribe();//清除更新组件重复订阅的副作用
    const publish = usePublish();


    const [lineinfo, setlineinfo] = useState([])

    //边
    const [edge_renumbered, setedge_renumbered] = useState([])
    const [node_renumbered, setnode_renumbered] = useState([])

    //自定义边
    const [edge_new, setedge_new] = useState([])
    const [node_new, setnode_new] = useState([])

    //计算可达性
    const [data = 0, postData] = useWebWorker({
        url: "./js/floyd.worker.js"
    });

    const calculateaccessbility = () => {
        const edge_all = edge_renumbered.concat(edge_new)
        const node_all = node_renumbered.concat(node_new)
        //发布计算指令
        postData([edge_all, node_all])
        message.loading({ content: '可达性计算中', key: 'cal', duration: 0 })
        //publish('access_res', newaccess_res);
        //message.success('计算成功，可达性已更新！')
    }
    useEffect(() => {
        if (data != 0) {
            publish('kedaxing', data)
            console.log(1)
            message.destroy('cal')
            message.success('计算成功，可达性已更新！')
        }
    }, [data])

    //获取网络并加载
    useState(() => {
        //加载边
        axios.get('data/edge_renumbered_rank2.json').then(response => {
            setedge_renumbered(response.data)
        }).then(() => {
            axios.get('data/node_renumbered_rank2.json').then(response => {
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

    const transfernode = (data, lineinfo) => {
        setstationCollection(data)
        //重新编号站点
        data.features.map((v, index) => { data.features[index].properties.stationid = index + 1 })
        let stationcount = {}
        data.features.map(v => stationcount[v.properties.index] = stationcount[v.properties.index] == undefined ? 1 : stationcount[v.properties.index] + 1)

        Object.keys(stationcount).forEach(key => lineinfo[key].stations = stationcount[key])

        setlineinfo(lineinfo)
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
                    const traveltime = 60 * distance / lineinfo[i].speed

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
    }
    //地图编辑时发布的站点信息
    unsubscribe('stationCollection')
    useSubscribe('stationCollection', function (msg: any, data: any) {
        transfernode(data, lineinfo)
    });
    //地图编辑时发布的线路信息
    unsubscribe('linkCollection')
    useSubscribe('linkCollection', function (msg: any, data: any) {
        setlinkCollection(data)
        setlineinfo(data.features.map((f, index) => {
            if (lineinfo[index] == undefined) {
                return { lineid: f.properties.lineid, length: length(f), speed: travelspeed }
            } else {
                return { lineid: f.properties.lineid, length: length(f), speed: lineinfo[index].speed }
            }
        }))
        setlinewithstation(data.features.length)
    });
    const [showdiff, setshowdiff] = useState(false)
    const ondiffChange = (v) => {
        setshowdiff(v)
        publish('showdiff', v)
    }
    const [importline, setimportline] = useState(true)
    const [importstation, setimportstation] = useState(false)
    //上传的线路信息
    const handleupload_line = (file) => {
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.readAsText(file)
            reader.onload = function (f) {
                const data = JSON.parse(f.target.result)
                //已有的线路数量
                linkCollection.features = linkCollection.features.concat(data.features.map((f) => { f.properties.lineid = f.properties.lineid + lineinfo.length; return f }))
                setlinkCollection(linkCollection)
                publish('uploadlinedata', linkCollection)
                setlineinfo(linkCollection.features.map((f, index) => {
                    if (lineinfo[index] == undefined) {
                        return { lineid: f.properties.lineid, length: length(f), speed: travelspeed }
                    } else {
                        return { lineid: f.properties.lineid, length: length(f), speed: lineinfo[index].speed }
                    }
                }))
                setimportline(false)
                setimportstation(true)
                message.info('请导入该线路的站点或点击线路以添加站点')
            }
        })
    }
    const [linewithstation, setlinewithstation] = useState(0)
    //上传的站点信息
    const handleupload_station = (file) => {
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.readAsText(file)
            reader.onload = function (f) {
                const data = JSON.parse(f.target.result)
                //判断现在stationCollection有没有，有就加，没有就不加？
                stationCollection.features = stationCollection.features.concat(data.features.map((f) => { f.properties.index = f.properties.index + linewithstation; return f }))
                setlinewithstation(lineinfo.length)
                publish('uploadstationdata', stationCollection)
                transfernode(stationCollection, lineinfo)
                setimportline(true)
                setimportstation(false)
            }
        })
    }
    //更改每条线路的速度
    const onlinespeedChange = (lineid) => {
        return (v) => {
            lineinfo[lineid - 1].speed = v
            setlineinfo(lineinfo)
            transfernode(stationCollection, lineinfo)
        }
    }
    //下载每条线路的线路站点
    const ondownloadline = (lineid) => {
        return (v) => {
            downloadFile({
                type: 'FeatureCollection',
                features: linkCollection.features.filter(v => v.properties.lineid == lineid)
            }, 'line' + lineid)
        }
    }
    const ondownloadstation = (lineid) => {
        return (v) => {
            downloadFile({
                type: 'FeatureCollection',
                features: stationCollection.features.filter(v => v.properties.index == lineid - 1)
            }, 'station' + lineid)
        }
    }
    const [vmin, setvmin] = useState(180)
    const [vmax, setvmax] = useState(300)
    const handlerankChange = ({ key }) => {
        const data = key
        if (data == 'rank1') {
            setvmin(300)
            setvmax(500)
        } else if (data == 'rank2') {
            setvmin(180)
            setvmax(300)
        } else if (data == 'rank3') {
            setvmin(120)
            setvmax(300)
        }else if(data=='tokyo'){
            setvmin(30)
            setvmax(60)
          }else if(data=='tokyo_all'){
            setvmin(90)
            setvmax(180)
          }
        axios.get(`data/edge_renumbered_${data}.json`).then(response => {
            setedge_renumbered(response.data)
        }).then(() => {
            axios.get(`data/node_renumbered_${data}.json`).then(response => {
                setnode_renumbered(response.data)
            })

        })
        publish('rank', data)
    }


    return (
        <>
            <Col span={24}>
                <Card title="城市群交通可达性" extra={<Dropdown overlay={<Menu onClick={handlerankChange}>
                    {/* <Menu.Item key="rank1">1层社区</Menu.Item> */}
                    <Menu.Item key="rank2">2层社区</Menu.Item>
                    <Menu.Item key="rank3">3层社区</Menu.Item>
                    <Menu.Item key="tokyo">东京</Menu.Item>
                    <Menu.Item key="tokyo_all">东京都市圈</Menu.Item>
                </Menu>}>
                    <Button type='text' onClick={e => e.preventDefault()}>
                        切换场景<DownOutlined />
                    </Button>
                </Dropdown>}
                    bordered={false}>
                    <Collapse defaultActiveKey={['panel1', 'panel2', 'panel3']}>
                        <Panel header="可达性计算" key="panel3"
                            extra={<Tooltip title='平均出行时间计算方法：获得每个社区到其他所有社区的铁路+出租车交通方式出行时长，再计算平均值得到'><InfoCircleOutlined /></Tooltip>} >

                            <Descriptions size="small" bordered title="交通拓扑网络信息">
                                <Descriptions.Item label="内置节点数量" span={2}>{node_renumbered.length}</Descriptions.Item>
                                <Descriptions.Item label="内置边数量" span={2}> {edge_renumbered.length}</Descriptions.Item>
                                <Descriptions.Item label="自定义节点数量" span={2}>{node_new.length}</Descriptions.Item>
                                <Descriptions.Item label="自定义边数量" span={2}> {edge_new.length}</Descriptions.Item>
                            </Descriptions>
                            <br />
                            <Row>
                                {showdiff ? '【铁路+出租车】平均出行时间减少（分钟）' : '【铁路+出租车】平均出行时间（分钟）'}
                            </Row>
                            <br />
                            <Row>
                                <Col span={3} style={{ textAlign: 'center' }}>
                                    {showdiff ? 0 : vmin}
                                </Col>
                                <Col span={18}>
                                    <div style={{ height: '20px', width: '100%', backgroundImage: "linear-gradient(to right,#9DCC42, #FFFE03, #F7941D, #E9420E, #FF0000)" }}></div>
                                </Col>
                                <Col span={3} style={{ textAlign: 'center' }}>
                                    {showdiff ? 60 : vmax}
                                </Col>
                            </Row>
                            <br />
                            <Row>
                                <Col span={12}>
                                    <Button type="primary" onClick={calculateaccessbility}>计算可达性</Button>
                                    <Button onClick={() => {
                                        publish('download_access_res', true)
                                    }}>导出可达性</Button>
                                </Col>
                                <Col span={12}>
                                    显示平均出行时间差异:<Switch onChange={ondiffChange} />
                                </Col>
                            </Row>
                        </Panel>
                        <Panel header="自定义交通网络" key="panel2">
                            <Row gutters={4}>
                                <Col>
                                    <Button type='primary' onClick={() => {
                                        message.info('已打开编辑模式，请在地图上绘制以添加线路')
                                        publish('startedit', true)
                                    }}>添加线路</Button>
                                    <Button onClick={() => {
                                        publish('deletefeature', true)
                                        publish('deletefeature_station', true)
                                        setlinewithstation(0)
                                        setlineinfo([])
                                        setimportline(true)
                                        setimportstation(false)
                                    }} disabled={linkCollection.features.length==0}>清空线路</Button>
                                    <Button onClick={() => {
                                        publish('deletefeature_station', true)
                                        setlinewithstation(0)
                                    }} disabled={stationCollection.features.length==0}>清空站点</Button>
                                    <Upload showUploadList={false} beforeUpload={handleupload_line}><Button disabled={!importline}>导入线路</Button></Upload>
                                    <Upload showUploadList={false} beforeUpload={handleupload_station}><Button disabled={!importstation}>导入站点</Button></Upload>

                                </Col>
                            </Row>
                            <Row gutters={4}>
                                <Col>
                                </Col>
                            </Row>
                            <br />
                            {linkCollection.features.length >= 1 ? <Table size='small' footer={() => {
                                return <>{`共计${linkCollection.features.length}条线路，总长度${length(linkCollection).toFixed(2)}km`}                                    <Button onClick={() => { publish('download_line', true) }} disabled={lineinfo.length === 0}>导出全部线路</Button>
                                    <Button onClick={() => { publish('download_station', true) }} disabled={lineinfo.length === 0}>导出全部站点</Button></>
                            }} dataSource={lineinfo.map(f => {
                                return {
                                    lineid: f.lineid,
                                    stations: f.stations == undefined ? 0 : f.stations,
                                    length: f.length.toFixed(2),
                                    speed: <InputNumber style={{ width: '100px' }} min={1} size="small" defaultValue={f.speed} onChange={onlinespeedChange(f.lineid)} step={10} />,
                                    output: <><Button onClick={ondownloadline(f.lineid)}>线路</Button><Button onClick={ondownloadstation(f.lineid)}>站点</Button></>
                                }
                            })} columns={[
                                {
                                    title: '线路ID',
                                    dataIndex: 'lineid',
                                    key: 'lineid',
                                },
                                {
                                    title: '站点数',
                                    dataIndex: 'stations',
                                    key: 'stations',
                                },
                                {
                                    title: '线路长度(km)',
                                    dataIndex: 'length',
                                    key: 'length',
                                }, {
                                    title: '运营速度(km/h)',
                                    dataIndex: 'speed',
                                    key: 'speed',
                                }, {
                                    title: '导出',
                                    dataIndex: 'output',
                                    key: 'output',
                                },
                            ]} /> : <></>}
                        </Panel>

                    </Collapse>
                </Card>
            </Col>
        </>
    )

}