import React, { useEffect, useState } from 'react'
import { Col, Card, Collapse, Tooltip } from 'antd';
import {
    InfoCircleOutlined
} from '@ant-design/icons';



const { Panel } = Collapse;


export default function Hourlytraj() {


    return (
        <>
            <Col span={24}>
                <Card title="层次社区" extra={<Tooltip title='Click on the bars to show trajectories.'><InfoCircleOutlined /></Tooltip>}
                    bordered={false}>
                    <Collapse defaultActiveKey={['panel1','panel2']}>
                        <Panel header="功能测试中" key="panel1">
                        </Panel>
                        <Panel header="功能测试中" key="panel2">
                        </Panel>
                    </Collapse>
                </Card>
            </Col>
        </>
    )

}