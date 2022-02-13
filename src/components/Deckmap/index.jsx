/* global window */
import React, { useState, useEffect } from 'react';
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

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoibmkxbzEiLCJhIjoiY2t3ZDgzMmR5NDF4czJ1cm84Z3NqOGt3OSJ9.yOYP6pxDzXzhbHfyk3uORg';

export default function Deckmap() {
  const unsubscribe = useUnsubscribe();//清除更新组件重复订阅的副作用
  /*
  ---------------地图底图设置---------------
  */
  //#region
  //管理光强度
  const [lightintensity, setlightintensity] = useState(2)
  unsubscribe('lightintensity')
  useSubscribe('lightintensity', function (msg: any, data: any) {
    setlightintensity(data)
  });

  //管理光角度X
  const [lightx, setlightx] = useState(1554937300)
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
  const [vmin, setvmin] = useState(0)
  const [vmax, setvmax] = useState(1)
  const [rail, setrail] = useState([])
  //获取社区并加载
  useState(() => {
    axios.get('data/rank2_reshape.json').then(response => {
      const data = response.data
      setrank(data)
      setvmax(data.features.length)
    })
    axios.get('data/railway_rail_withname.json').then(response => {
      const data = response.data
      setrail(data)
    })
  }, [])
  //colormap的设置
  //cmap
  const COLOR_SCALE = scaleLinear()
    .domain([0, 0.25, 0.5, 0.75, 1])
    .range(['#9DCC42', '#FFFE03', '#F7941D', '#E9420E', '#FF0000']);
  //norm
  const WIDTH_SCALE = scaleLinear()
    .clamp(true)
    .domain([vmin, vmax])
    .range([0, 1]);
  const cmap = (v) => {
    return COLOR_SCALE(WIDTH_SCALE(v)).match(/\d+/g).map(f => parseInt(f))
  }

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
      stroked: true,
      getLineWidth: 200,
      opacity: 0.5,
      getFillColor: f => cmap(f.properties.index),
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 255, 0],
    }) : null,
    rail_isshow ? new GeoJsonLayer({//社区
      id: 'rail',
      data: rail,
      stroked: true,
      getLineWidth: 800,
      getLineColor: [165,42,42],
      opacity: 0.5,
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 255, 0],
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
        {layerTools}
      </div>


    </DeckGL>
  );
}
//#endregion