import React, { useEffect, useState } from 'react'
import { Col, Card, Collapse, Tooltip, Row } from 'antd';
import {
    InfoCircleOutlined
} from '@ant-design/icons';

import { useSubscribe, usePublish, useUnsubscribe } from '@/utils/usePubSub';

const { Panel } = Collapse;


export default function Hourlytraj() {
    const unsubscribe = useUnsubscribe();//清除更新组件重复订阅的副作用
    const [access_res, setaccess_res] = useState({})

    //订阅可达性
    unsubscribe('access_res')
    useSubscribe('access_res', function (msg: any, data: any) {
        setaccess_res(data)
        console.log(data)
    });
    const [vmin, setvmin] = useState(180)
    const [vmax, setvmax] = useState(300)

    return (
        <>
            <Col span={24}>
                <Card title="层次社区" 
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
                        <Panel header="功能测试中" key="panel2">
                        </Panel>
                    </Collapse>
                </Card>
            </Col>
        </>
    )

}