import React, { useEffect, useState, } from 'react'
import { useSubscribe, usePublish, useUnsubscribe } from '@/utils/usePubSub';
import axios from 'axios';
import { PageHeader, Menu, Dropdown, Modal, message, Button } from 'antd';
import { DownOutlined, SettingOutlined, UpOutlined, SyncOutlined, LockOutlined, ExportOutlined, GlobalOutlined } from '@ant-design/icons';
import { publish } from 'pubsub-js';
import './index.css';


export default function Header(props) {

    //定义Hooks
    const [collapsed, setCollapsed] = useState(true);
    //缩小sidebar
    function toggleCollapsed() {
        setCollapsed(!collapsed);
        //导航至页面
        publish('showpanel',!collapsed)
    };

    return (
        <>
            {collapsed?<PageHeader
                className="site-page-header"
                key="site-page-header"
                title="城市群可达性分析系统"
                subTitle=''
                avatar={{ src: 'images/logodark_3durbanmob.png', shape: 'square' }}
                {...props}
                extra={<Button key='navicollapsed' type="text" onClick={toggleCollapsed}>
                {React.createElement(collapsed ? UpOutlined : DownOutlined)}
            </Button>}
            >
            </PageHeader>:<Button key='navicollapsed' type="text" onClick={toggleCollapsed}>
                            {React.createElement(collapsed ? UpOutlined : DownOutlined)}
                        </Button>}

        </>
    )
}

