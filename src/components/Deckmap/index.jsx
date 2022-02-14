/* global window */
import React, { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { _MapContext as MapContext, StaticMap, NavigationControl, ScaleControl, FlyToInterpolator } from 'react-map-gl';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { _SunLight as SunLight } from '@deck.gl/core';
import { AmbientLight, LightingEffect } from '@deck.gl/core';
import DeckGL from '@deck.gl/react';
import { useSubscribe, usePublish, useUnsubscribe } from '@/utils/usePubSub';
import { useInterval } from 'ahooks';
import axios from 'axios';
import { GeoJsonLayer } from '@deck.gl/layers';
import { scaleLinear } from 'd3-scale';
import { EditableGeoJsonLayer, ViewMode, DrawLineStringMode, DrawPointMode } from 'nebula.gl';
import { tag, nearestPointOnLine } from '@turf/turf'

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoibmkxbzEiLCJhIjoiY2t3ZDgzMmR5NDF4czJ1cm84Z3NqOGt3OSJ9.yOYP6pxDzXzhbHfyk3uORg';

export default function Deckmap() {
  const unsubscribe = useUnsubscribe();//清除更新组件重复订阅的副作用
  /*
  ---------------地图底图设置---------------
  */
  //#region
  //管理光强度
  const [lightintensity, setlightintensity] = useState(5)
  unsubscribe('lightintensity')
  useSubscribe('lightintensity', function (msg: any, data: any) {
    setlightintensity(data)
  });

  //管理光角度X
  const [lightx, setlightx] = useState(1555957300)
  unsubscribe('lightx')
  useSubscribe('lightx', function (msg: any, data: any) {
    setlightx(data)
  });

  //地图光效
  const ambientLight = new AmbientLight({
    color: [255, 255, 255],
    intensity: 1.0
  });


  const sunLight = new SunLight({
    timestamp: lightx,
    color: [255, 255, 255],
    intensity: lightintensity
  });
  const lightingEffect = new LightingEffect({ ambientLight, sunLight });

  const material = {
    ambient: 0.1,
    diffuse: 0.6,
    shininess: 22,
    specularColor: [60, 64, 70]
  };

  const theme = {
    buildingColor: [255, 255, 255],
    trailColor0: [253, 128, 93],
    trailColor1: [23, 184, 190],
    material,
    effects: [lightingEffect]
  };

  //设定默认地图中心点
  const [viewState, setViewState] = React.useState({
    longitude: 116.691,
    latitude: 30.6011,
    zoom: 6.5,
    pitch: 30,
    bearing: 0
  });

  //默认地图底图
  const [mapStyle, setMapStyle] = React.useState('mapbox://styles/ni1o1/ckj9bhq7s9mvj19mq3e3fye35');
  const publish = usePublish();

  //订阅地图样式
  unsubscribe('mapstyle')
  useSubscribe('mapstyle', function (msg: any, data: any) {
    setMapStyle(data)
  });


  useEffect(() => {
    //允许右键旋转视角
    document.getElementById("deckgl-wrapper").addEventListener("contextmenu", evt => evt.preventDefault());
  }, [])
  //#endregion
  /*
  ---------------地图旋转按钮---------------
  */
  //#region
  //旋转的函数
  function rotate(pitch, bearing, duration) {
    setViewState({
      ...viewState,
      pitch: pitch,
      bearing: bearing,
      transitionDuration: duration,
      transitionInterpolator: new FlyToInterpolator(),
    });
  }
  const [angle, setangle] = useState(120);
  const [interval, setInterval] = useState(undefined);
  useInterval(() => {
    rotate(viewState.pitch, angle, 2000)
    setangle(angle => angle + 30)
  }, interval, { immediate: true });
  //旋转的按钮
  function rotatecam() {
    setangle(viewState.bearing + 30)
    if (interval != 2000) {
      setInterval(2000)
    } else {
      setInterval(undefined)
      setViewState(viewState)
    }
  };
  //镜头旋转工具
  const cameraTools = (
    <div className="mapboxgl-ctrl-group mapboxgl-ctrl">
      <button
        title="Rotatecam"
        onClick={rotatecam}
        style={{ opacity: interval == 2000 ? 1 : 0.2 }}
      > <span className="iconfont icon-camrotate" /></button>
    </div>
  );
  //#endregion
  /*
---------------社区设置---------------
*/
  //#region
  const [rank, setrank] = useState([])
  const [vmin, setvmin] = useState(180)
  const [vmax, setvmax] = useState(300)
  const [rail, setrail] = useState([])
  const [railstation, setrailstation] = useState([])
  const [origin_access_res, setorigin_access_res] = useState({})
  const [access_res, setaccess_res] = useState({})
  const [diff, setdiff] = useState({})
  const [showdiff, setshowdiff] = useState(false)

  unsubscribe('showdiff')
  useSubscribe('showdiff', function (msg: any, data: any) {
    setshowdiff(data)
    if (data) {
      regeneraterank(rank, diff, 0, 60)
    } else {
      regeneraterank(rank, access_res, 180, 300)
    }
  })
  //导出
  const downloadFile = async (myData, fileName) => {
    const json = JSON.stringify(myData);
    const blob = new Blob([json], { type: 'application/json' });
    const href = await URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = fileName + ".json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  unsubscribe('download_access_res')
  useSubscribe('download_access_res', function (msg: any, data: any) {
    downloadFile(access_res, "access_res")
  })
  unsubscribe('download_line')
  useSubscribe('download_line', function (msg: any, data: any) {
    downloadFile(linkCollection, "line")
  })
  unsubscribe('download_station')
  useSubscribe('download_station', function (msg: any, data: any) {
    downloadFile(stationCollection, "station")
  })
  //订阅可达性
  unsubscribe('kedaxing')
  useSubscribe('kedaxing', function (msg: any, data: any) {
    setaccess_res(data)

    //计算差异
    const diff = {}
    Object.keys(data).forEach(key => {
      diff[key] = origin_access_res[key] - data[key]
    })
    setdiff(diff)
    if (!showdiff) {
      regeneraterank(rank, data, 180, 300)
    } else {
      regeneraterank(rank, diff, 0, 60)
    }
  });

  //由可达性获得社区
  const regeneraterank = (rank, access_res, vmin, vmax) => {

    const tmp = rank.features.map(f => {
      let v = f
      v.properties.access = parseInt(access_res[f.properties.groupname])
      v.properties.color = cmap(parseInt(access_res[f.properties.groupname]), vmin, vmax)
      return v
    })
    setrank({ type: "FeatureCollection", features: tmp })
  }
  const [isextrude, setisextrude] = useState(false)
  const extrudeTools = (
    <div className="mapboxgl-ctrl-group mapboxgl-ctrl">
      <button
        title="communitycontrol"
        onClick={() => { setisextrude(!isextrude) }}
        style={{ opacity: isextrude ? 1 : 0.2 }}
      >
        <span className="iconfont icon-3d" /></button>
    </div>
  );


  //获取社区并加载
  useState(() => {
    //加载社区
    axios.get('data/rank2_reshape_simplify.json').then(response => {
      const rank2_reshape = response.data
      setrank(rank2_reshape)
      //加载可达性
      return rank2_reshape
    }).then((rank2_reshape) => {
      axios.get('data/access_res.json').then(response => {
        setorigin_access_res(response.data)
        regeneraterank(rank2_reshape, response.data, 180, 300)
      })
    })
    //加载铁路线
    axios.get('data/railway_rail_withname.json').then(response => {
      const data = response.data
      setrail(data)
    })
    //加载铁路站点
    axios.get('data/trainstation.json').then(response => {
      const data = response.data
      setrailstation(data)
    })
  }, [])


  //colormap的设置
  //cmap

  const cmap = (v, vmin, vmax) => {
    const COLOR_SCALE = scaleLinear()
      .domain([0, 0.25, 0.5, 0.75, 1])
      .range(['#9DCC42', '#FFFE03', '#F7941D', '#E9420E', '#FF0000']);
    //norm
    const WIDTH_SCALE = scaleLinear()
      .clamp(true)
      .domain([vmin, vmax])
      .range([0, 1]);
    try {
      return COLOR_SCALE(WIDTH_SCALE(v)).match(/\d+/g).map(f => parseInt(f))
    } catch { return null }
  }
  //#endregion
  /*
  ---------------绘制铁路图层的设置---------------
  */
  //#region
  const [linkCollection, setlinkCollection] = useState({
    type: 'FeatureCollection',
    features: []
  });
  const [drawmode, setdrawmode] = useState(1)

  //删除要素时清空要素并设定为ViewMode
  function deletefeature() {
    setlinkCollection({
      type: 'FeatureCollection',
      features: [],
    })
    publish('linkCollection', {
      type: 'FeatureCollection',
      features: [],
    })
    setstationCollection({
      type: 'FeatureCollection',
      features: [],
    })
    publish('stationCollection', {
      type: 'FeatureCollection',
      features: [],
    })
    setrailstation_nearest([])
  }
  unsubscribe('deletefeature')
  useSubscribe('deletefeature', function (msg: any, data: any) {
    deletefeature()
  });



  //开始编辑要素时，清空要素并设定为绘制模式
  function startedit() {
    setdrawmode(2)
  }
  unsubscribe('startedit')
  useSubscribe('startedit', function (msg: any, data: any) {
    startedit()
  });
  //编辑成功时，发布选中面信息
  function handleonedit(e) {
    let updatedData = e.updatedData
    const editType = e.editType
    if ((editType == 'addFeature')) {
      //为线路添加id
      message.info('线路创建成功！创建线路后需要点击线路以添加站点，创建2个以上站点才能生效')
      const lineid = linkCollection.features.length + 1
      updatedData.features[updatedData.features.length - 1].properties['lineid'] = lineid
      setdrawmode(1)
      setlinkCollection(updatedData)
      publish('linkCollection', updatedData)
    }
  }
  //#endregion
  /*
  ---------------绘制站点图层的设置---------------
  */
  //#region
  const [stationCollection, setstationCollection] = useState({
    type: 'FeatureCollection',
    features: []
  });
  const [drawmode_station, setdrawmode_station] = useState(1)

  //删除要素时清空要素并设定为ViewMode
  function deletefeature_station() {
    setstationCollection({
      type: 'FeatureCollection',
      features: [],
    })
    setrailstation_nearest([])
    publish('stationCollection', {
      type: 'FeatureCollection',
      features: [],
    })
  }
  unsubscribe('deletefeature_station')
  useSubscribe('deletefeature_station', function (msg: any, data: any) {
    deletefeature_station()
  });
  //开始编辑要素时，清空要素并设定为绘制模式
  unsubscribe('startedit_station')
  useSubscribe('startedit_station', function (msg: any, data: any) {
    setdrawmode_station(data)
    setrailstation_nearest([])
  });

  const [railstation_nearest, setrailstation_nearest] = useState([])
  //编辑成功时，发布选中面信息
  function handleonstationedit(e) {
    const updatedData = e.updatedData
    const editType = e.editType
    const pointpos = e.editContext.feature
    if ((editType == 'addFeature')) {
      const pointpos1 = updatedData.features[updatedData.features.length - 1]
      const snapped = nearestPointOnLine(linkCollection, pointpos1)
      if (snapped.properties.dist < 2) {
        //计算点处于哪条线上
        const s = linkCollection.features.map(l => nearestPointOnLine(l, snapped).properties.dist)
        const index = s.indexOf(Math.min.apply(Math, s))
        //计算点处于哪个小区上
        const a = tag(snapped, rank, 'groupname', 'groupname').properties.groupname
        //计算点id
        const stationid = stationCollection.features.length + 1
        updatedData.features[updatedData.features.length - 1] = snapped
        updatedData.features[updatedData.features.length - 1].properties['stationid'] = stationid
        updatedData.features[updatedData.features.length - 1].properties['index'] = index
        updatedData.features[updatedData.features.length - 1].properties['groupname'] = a
        setstationCollection(updatedData)
        publish('stationCollection', updatedData)
      }
    } else {
      //判断是否在线附近，如果是，则显示线上最近点
      const snapped = nearestPointOnLine(linkCollection, pointpos)
      if (snapped.properties.dist < 2) {
        setrailstation_nearest(snapped)
      }
    }
  }

  //#endregion
  /*
  ---------------Tooltip设置---------------
  */
  //#region
  function getTooltipText(info) {
    if (!info.layer) {
      return null;
    } else if (info.layer.id == 'rail') {
      if (info.index != -1) {
        const { name } = info.object.properties
        return { text: `铁路名称:${name}`, "style": { "color": "white" } }
      }
      return null;
    } else if (info.layer.id == 'community') {
      if (info.index != -1) {
        const { groupname, index, access } = info.object.properties
        return { text: showdiff ? `社区名称:${groupname}\n社区编号:${index}\n平均出行时间减少:${access}分钟` : `社区名称:${groupname}\n社区编号:${index}\n平均出行时间:${access}分钟`, "style": { "color": "white" } }
      }
      return null;
    } else if (info.layer.id == 'railstation') {
      if (info.index != -1) {
        const { name, cityname } = info.object.properties
        return { text: `站点名称:${name}\n所在城市:${cityname}`, "style": { "color": "white" } }
      }
      return null;
    } else if (info.layer.id == 'addedtrain') {
      if (info.index != -1) {
        const { lineid } = info.object.properties
        return { text: `自定义线路\n线路ID:${lineid}`, "style": { "color": "white" } }
      }
      return null;
    } else if (info.layer.id == 'addedstation') {
      if (info.index != -1) {
        const { location, stationid, index, groupname } = info.object.properties
        return { text: `自定义站点\n站点ID:${stationid}\n距线路起点距离:${location.toFixed(2)}km\n所属线路ID:${index + 1}\n所在社区ID:${groupname}`, "style": { "color": "white" } }
      }
      return null;
    }
  }
  const getTooltip = useCallback(info => getTooltipText(info));

  //#endregion
  /*
  ---------------地图图层设置---------------
  */
  //#region
  const [community_isshow, setcommunity_isshow] = useState(true)
  const [rail_isshow, setrail_isshow] = useState(true)
  const layerTools = (
    <div className="mapboxgl-ctrl-group mapboxgl-ctrl">
      <button
        title="communitycontrol"
        onClick={() => { setcommunity_isshow(!community_isshow) }}
        style={{ opacity: community_isshow ? 1 : 0.2 }}
      >
        <span className="iconfont icon-selectarea" /></button>
      <button
        title="railcontrol"
        onClick={() => { setrail_isshow(!rail_isshow) }}
        style={{ opacity: rail_isshow ? 1 : 0.2 }}
      >
        <span className="iconfont icon-rail" /></button>
    </div>
  );
  const layers = [
    community_isshow ? new GeoJsonLayer({//社区
      id: 'community',
      data: rank,
      stroked: false,
      getLineWidth: 200,
      opacity: 0.5,
      getFillColor: f => f.properties.color,
      getElevation: f => (500 / f.properties.access) ** 10,
      extruded: isextrude,
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 255, 0],
    }) : null,
    rail_isshow ? new GeoJsonLayer({//高铁线路
      id: 'rail',
      data: rail,
      stroked: true,
      getLineWidth: 600,
      getLineColor: [165, 42, 42],
      opacity: 0.5,
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 255, 0],
    }) : null,
    rail_isshow ? new GeoJsonLayer({//高铁站点
      id: 'railstation',
      data: railstation,
      getFillColor: [0, 0, 0],
      getPointRadius: 1000,
      opacity: 1,
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 255, 0],
    }) : null,
    rail_isshow ? new EditableGeoJsonLayer({//Draw线路图层
      id: 'addedtrain',
      data: linkCollection,
      mode: drawmode == 1 ? ViewMode : DrawLineStringMode,
      onEdit: handleonedit,
      getLineColor: [0, 0, 247],
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 255, 0],
    }) : null,
    rail_isshow ? new EditableGeoJsonLayer({//Draw车站图层
      id: 'addedstation',
      data: stationCollection,
      mode: DrawPointMode,
      onEdit: handleonstationedit,
      getLineColor: [0, 0, 247],
      getLineWidth: 20,
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 255, 0],
    }) : null,
    rail_isshow ? new GeoJsonLayer({//Draw车站图层（离线路最近点）
      id: 'railstation_nearest',
      data: railstation_nearest,
      getFillColor: [0, 0, 247],
      getLineColor: [0, 0, 247],
      getPointRadius: 600,
      opacity: 0.3,
    }) : null
  ];
  //#endregion
  /*
  ---------------渲染地图---------------
  */
  //#region
  return (
    <DeckGL
      layers={layers}
      effects={theme.effects}
      initialViewState={viewState}
      controller={{ doubleClickZoom: false, inertia: true, touchRotate: true }}
      style={{ zIndex: 0 }}
      getTooltip={getTooltip}
      ContextProvider={MapContext.Provider}
      onViewStateChange={vs => { setViewState(vs.viewState) }}
    >
      <StaticMap reuseMaps
        mapboxApiAccessToken={MAPBOX_ACCESS_TOKEN}
        mapStyle={`${mapStyle}`} preventStyleDiffing={true} >
        <div className='mapboxgl-ctrl-bottom-left' style={{ bottom: '20px' }}>
          <ScaleControl maxWidth={100} unit="metric" />
        </div>
      </StaticMap>
      <div className='mapboxgl-ctrl-bottom-right' style={{ bottom: '80px' }}>
        <NavigationControl onViewportChange={viewport => setViewState(viewport)} />
        {cameraTools}
        {extrudeTools}
        {layerTools}
      </div>


    </DeckGL>
  );
}
//#endregion