//#region Cesium地图构建
//import * as Cesium from './Build/Cesium'
//const gcoord = require('gcoord');
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2NGM4MDcxOS05Zjk3LTQ2YmMtYjAxYi0zYTczNWFkYzFlN2EiLCJpZCI6NzY0NTcsImlhdCI6MTYzOTQ2ODI2NH0.Zsp28WnnCpj4wlAIQwIwcSob228zSaz510QE3zKQN58';

// 建立地图界面
var viewer = new Cesium.Viewer("cesiumContainer", {
    animation: false, //是否显示动画工具
    timeline: true,  //是否显示时间轴工具
    fullscreenButton: false,  //是否显示全屏按钮工具
    //terrainProvider: Cesium.createWorldTerrain()
});

viewer.scene.globe.depthTestAgainstTerrain = true;

//设置每个阴影贴图的宽度和高度（以像素为单位）
viewer.shadowMap.softShadows  = true
viewer.shadowMap.size = 8192;//8192
viewer.shadowMap.darkness = 0.4;
//#endregion

//#region Cesium天气模块
class SnowEffect {
    constructor(viewer, options) {
        if (!viewer) throw new Error('no viewer object!');
        options = options || {};
        this.snowSize = Cesium.defaultValue(options.snowSize, 0.02); //最好小于0.02
        this.snowSpeed = Cesium.defaultValue(options.snowSpeed, 60.0);
        this.viewer = viewer;
        this.init();
    }
    init() {
        this.snowStage = new Cesium.PostProcessStage({
            name: 'czm_snow',
            fragmentShader: this.snow(),
            uniforms: {
                snowSize: () => {
                    return this.snowSize;
                },
                snowSpeed: () => {
                    return this.snowSpeed;
                }
            }
        });
        this.viewer.scene.postProcessStages.add(this.snowStage);
    }

    destroy() {
        if (!this.viewer || !this.snowStage) return;
        this.viewer.scene.postProcessStages.remove(this.snowStage);
        this.snowStage.destroy();
        delete this.snowSize;
        delete this.snowSpeed;
    }
 
    show(visible) {
        this.snowStage.enabled = visible;
    }
 
    snow() {
        return "uniform sampler2D colorTexture;\n\
            varying vec2 v_textureCoordinates;\n\
            uniform float snowSpeed;\n\
                    uniform float snowSize;\n\
            float snow(vec2 uv,float scale)\n\
            {\n\
                float time=czm_frameNumber/snowSpeed;\n\
                float w=smoothstep(1.,0.,-uv.y*(scale/10.));if(w<.1)return 0.;\n\
                uv+=time/scale;uv.y+=time*2./scale;uv.x+=sin(uv.y+time*.5)/scale;\n\
                uv*=scale;vec2 s=floor(uv),f=fract(uv),p;float k=3.,d;\n\
                p=.5+.35*sin(11.*fract(sin((s+p+scale)*mat2(7,3,6,5))*5.))-f;d=length(p);k=min(d,k);\n\
                k=smoothstep(0.,k,sin(f.x+f.y)*snowSize);\n\
                return k*w;\n\
            }\n\
            void main(void){\n\
                vec2 resolution=czm_viewport.zw;\n\
                vec2 uv=(gl_FragCoord.xy*2.-resolution.xy)/min(resolution.x,resolution.y);\n\
                vec3 finalColor=vec3(0);\n\
                //float c=smoothstep(1.,0.3,clamp(uv.y*.3+.8,0.,.75));\n\
                float c=0.;\n\
                c+=snow(uv,30.)*.0;\n\
                c+=snow(uv,20.)*.0;\n\
                c+=snow(uv,15.)*.0;\n\
                c+=snow(uv,10.);\n\
                c+=snow(uv,8.);\n\
                c+=snow(uv,6.);\n\
                c+=snow(uv,5.);\n\
                finalColor=(vec3(c));\n\
                gl_FragColor=mix(texture2D(colorTexture,v_textureCoordinates),vec4(finalColor,1),.5);\n\
                }\n\
                ";
    }
}
 
Cesium.SnowEffect = SnowEffect;

class RainEffect {
    constructor(viewer, options) {
        if (!viewer) throw new Error('no viewer object!');
        options = options || {};
        //倾斜角度，负数向右，正数向左
        this.tiltAngle = Cesium.defaultValue(options.tiltAngle, -.6);
        this.rainSize = Cesium.defaultValue(options.rainSize, 0.3);
        this.rainSpeed = Cesium.defaultValue(options.rainSpeed, 60.0);
        this.viewer = viewer;
        this.init();
    }
 
    init() {
        this.rainStage = new Cesium.PostProcessStage({
            name: 'czm_rain',
            fragmentShader: this.rain(),
            uniforms: {
                tiltAngle: () => {
                    return this.tiltAngle;
                },
                rainSize: () => {
                    return this.rainSize;
                },
                rainSpeed: () => {
                    return this.rainSpeed;
                }
            }
        });
        this.viewer.scene.postProcessStages.add(this.rainStage);
    }
 
    destroy() {
        if (!this.viewer || !this.rainStage) return;
        this.viewer.scene.postProcessStages.remove(this.rainStage);
        this.rainStage.destroy();
        delete this.tiltAngle;
        delete this.rainSize;
        delete this.rainSpeed;
    }
 
    show(visible) {
        this.rainStage.enabled = visible;
    }
 
    rain() {
        return "uniform sampler2D colorTexture;\n\
                varying vec2 v_textureCoordinates;\n\
                uniform float tiltAngle;\n\
                uniform float rainSize;\n\
                uniform float rainSpeed;\n\
                float hash(float x) {\n\
                    return fract(sin(x * 133.3) * 13.13);\n\
                }\n\
                void main(void) {\n\
                    float time = czm_frameNumber / rainSpeed;\n\
                    vec2 resolution = czm_viewport.zw;\n\
                    vec2 uv = (gl_FragCoord.xy * 2. - resolution.xy) / min(resolution.x, resolution.y);\n\
                    vec3 c = vec3(.6, .7, .8);\n\
                    float a = tiltAngle;\n\
                    float si = sin(a), co = cos(a);\n\
                    uv *= mat2(co, -si, si, co);\n\
                    uv *= length(uv + vec2(0, 4.9)) * rainSize + 1.;\n\
                    float v = 1. - sin(hash(floor(uv.x * 100.)) * 2.);\n\
                    float b = clamp(abs(sin(20. * time * v + uv.y * (5. / (2. + v)))) - .95, 0., 1.) * 20.;\n\
                    c *= v * b;\n\
                    gl_FragColor = mix(texture2D(colorTexture, v_textureCoordinates), vec4(c, 1), .5);\n\
                }\n\
                ";
    }
}
 
Cesium.RainEffect = RainEffect;

class FogEffect {
    constructor(viewer, options) {
        if (!viewer) throw new Error('no viewer object!');
        options = options || {};
        this.visibility = Cesium.defaultValue(options.visibility, 0.1);
        this.color = Cesium.defaultValue(options.color,
            new Cesium.Color(0.8, 0.8, 0.8, 0.5));
        this._show = Cesium.defaultValue(options.show, !0);
        this.viewer = viewer;
        this.init();
    }
 
    init() {
        this.fogStage = new Cesium.PostProcessStage({
            name: 'czm_fog',
            fragmentShader: this.fog(),
            uniforms: {
                visibility: () => {
                    return this.visibility;
                },
                fogColor: () => {
                    return this.color;
                }
            }
        });
        this.viewer.scene.postProcessStages.add(this.fogStage);
    }
 
    destroy() {
        if (!this.viewer || !this.fogStage) return;
        this.viewer.scene.postProcessStages.remove(this.fogStage);
        this.fogStage.destroy();
        delete this.visibility;
        delete this.color;
    }
 
    show(visible) {
        this._show = visible;
        this.fogState.enabled = this._show;
    }
 
    fog() {
        return "uniform sampler2D colorTexture;\n\
         uniform sampler2D depthTexture;\n\
         uniform float visibility;\n\
         uniform vec4 fogColor;\n\
         varying vec2 v_textureCoordinates; \n\
         void main(void) \n\
         { \n\
            vec4 origcolor = texture2D(colorTexture, v_textureCoordinates); \n\
            float depth = czm_readDepth(depthTexture, v_textureCoordinates); \n\
            vec4 depthcolor = texture2D(depthTexture, v_textureCoordinates); \n\
            float f = visibility * (depthcolor.r - 0.3) / 0.2; \n\
            if (f < 0.0) f = 0.0; \n\
            else if (f > 1.0) f = 1.0; \n\
            gl_FragColor = mix(origcolor, fogColor, f); \n\
         }\n";
    }
}
 
Cesium.FogEffect = FogEffect;

//#endregion

//#region 加载自己的数据
// 调整相机视角
viewer.scene.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(114.29964, 30.61214, 2000),
    //destination:Cesium.Cartesian3.fromDegrees(-74.0012351579127,40.715093849131,1000),
});

// 加载校园模型数据
var tileset = viewer.scene.primitives.add(
    new Cesium.Cesium3DTileset({
        url: "./source/terra_b3dms/tileset.json",//文件的路径
        maximumScreenSpaceError:1
    })
);
tileset.readyPromise.then((tileset) => {         
    // 模型加载后可能会有便宜和高度不对，需要对模型进行调整
    var boundingSphere = tileset.boundingSphere;
    var cartographic_original = Cesium.Cartographic.fromCartesian(boundingSphere.center);

    tileSet(tileset,114.61878, 30.45922, cartographic_original.height)
    viewer.zoomTo(tileset);
});

function tileSet(tileset,longitude, latitude, height)
{
    //3dtile模型的边界球体
    var boundingSphere = tileset.boundingSphere;
    //迪卡尔空间直角坐标=>地理坐标（弧度制）
    var cartographic_original = Cesium.Cartographic.fromCartesian(boundingSphere.center);
    //设置新的经度、纬度、高度
    var cartographic_offset  = Cesium.Cartographic.fromDegrees(longitude, latitude, height)
    //地理坐标（弧度制）=>迪卡尔空间直角坐标
    var Cartesian3_original = Cesium.Cartesian3.fromRadians(cartographic_original.longitude, cartographic_original.latitude, cartographic_original.height);
    var Cartesian3_offset  = Cesium.Cartesian3.fromRadians(cartographic_offset.longitude, cartographic_offset.latitude, cartographic_offset.height);
    //获得地面和offset的转换
    var translation = Cesium.Cartesian3.subtract(Cartesian3_offset, Cartesian3_original, new Cesium.Cartesian3());
    //修改模型矩阵
    tileset.modelMatrix = Cesium.Matrix4.fromTranslation(translation);
}

// json列表
var baskareaData = []

// 加载校园晾晒区域数据
// 读取 GeoJSON 文件
var baskarea = Cesium.GeoJsonDataSource.load('./source/baskarea2.geojson')
baskarea.then(function(dataSource){
    viewer.dataSources.add(dataSource)
    // 读取实体
    var entities = dataSource.entities.values
    var colorHash = {}
    for(var i = 0; i < entities.length; i++){
        // 添加一个属性
        //entity.addProperty("coupied")
        var entity = entities[i];
        //console.log(entity.properties)
        var area = entity.properties.组团号
        //console.log(area)
        //var building = entity.properties.省
        // 根据组团设置颜色
        var color = colorHash[area]
        if(!color){
            color = Cesium.Color.fromRandom({
                  alpha:1.0
            })
            colorHash[area] = color
        }
        // 设置显示参数
        entity.polygon.material = color
        entity.polygon.outline = true
        entity.polygon.extrudedHeight = (6)
        //console.log(entity.properties)

        var baskdata = {}
        baskdata['id'] = entity.properties.id
        baskdata['楼栋号'] = entity.properties.楼栋号
        baskdata['组团号'] = entity.properties.组团号
        baskdata['编号'] = entity.properties.编号
        baskdata['uniqueID'] = i
        if(entity.properties.已占用 == 0){
            baskdata['已占用'] = "空闲"
        }
        else{
            baskdata['已占用'] = "已占用"
            entity.polygon.material = Cesium.Color.GRAY
        }
        baskareaData.push(baskdata)
        //console.log(entity)
    }
})


//viewer.zoomTo(tileset);

//#endregion

//#region 日照分析模块
// 手动开启深度检测
viewer.scene.depthTestAgainstTerrain = true;
// 日照分析（时间点）
function stratPlay() {
    viewer.shadows = true;//开启阴影
    viewer.clock.shouldAnimate = true
    //定义变量
    var text1 = document.getElementById("Date");
    var text2 = document.getElementById("Ktime");
    var e = text1.value,//日期
        t = new Date(e),
        i = text2.value,
        r = new Date(new Date(t).setHours(Number(i)))
    //设置参数
    viewer.scene.globe.enableLighting = true,
        viewer.shadows = true,
        viewer.clock.currentTime = Cesium.JulianDate.fromDate(r),
        viewer.clock.startTime = viewer.clock.currentTime,
        viewer.clock.stopTime = viewer.clock.currentTime
}
// 日照分析（时间段）
function startPlay2() {
    viewer.shadows = true;//开启阴影
    viewer.clock.shouldAnimate = true
    //定义变量
    var text1 = document.getElementById("Date");
    var text2 = document.getElementById("Ktime");
    var text3 = document.getElementById("Ttime");
    if(Number(text3.value) < Number(text2.value)){
        alert("停止时间不得小于开始时间！");
        return;
    }
    else{
        var e = text1.value,//日期
        t = new Date(e),
        i = text2.value,
        a = text3.value,
        r = new Date(new Date(t).setHours(Number(i))),
        o = new Date(new Date(t).setHours(Number(a)));
        //设置参数
        viewer.scene.globe.enableLighting = true,
            viewer.shadows = true,
            viewer.clock.startTime = Cesium.JulianDate.fromDate(r),
            viewer.clock.currentTime = Cesium.JulianDate.fromDate(r),
            viewer.clock.stopTime = Cesium.JulianDate.fromDate(o),
            //到达stopTime后时钟跳转到startTime
            viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP, 
            viewer.clock.clockStep = Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER,
            viewer.clock.multiplier = 1600
    }
}
// 点击确认按钮，开始分析
function start(){
    // 必要信息缺失
    if (document.getElementById("Date").value == "" || 
        document.getElementById("Ktime").value == "" ) 
    {
        alert("请输入有效参数！");
    }
    // 未输入停止时间
    else if(document.getElementById("Ttime").value == ""){
        // 时间点模拟
        stratPlay();
    }
    // 输入了停止时间
    else {
        // 动态模拟
        startPlay2();
    }
}
// 取消操作
function cancel() {
    document.getElementById("Date").value = ""
    document.getElementById("Ktime").value = ""
    document.getElementById("Ttime").value = ""
    viewer.scene.globe.enableLighting = false; //关闭光照
    viewer.shadows = false;//关闭阴影
}
//#endregion

//#region 晾晒管理模块
// 点击查询
// 动态添加数据
var table
layui.use('table', function(){
    table = layui.table;
	var inst = table.render({
		elem: '#ID-table-demo-data',
        id:'uniqueID',
		cols:[[
            {type: 'checkbox', fixed: 'left'},
			{field: 'uniqueID', title: 'ID', width: 100, sort: true},
            {field: '组团号', title: '组团号', width: 100, sort: false},
            {field: '楼栋号', title: '楼栋号', width: 100, sort: true},
            {field: '编号', title: '编号', width: 100, sort: true},
            {field: '已占用', title: '状态', width: 100, sort: true},
		]],
        data:baskareaData,
        even: true,
        skin: 'line', // 表格风格
        page: true, // 是否显示分页
        limits: [5, 10, 15],
        limit: 5, // 每页默认显示的数量
	})
})

// 查询高亮
function search(){
    console.log("查询晾晒点")
    var checkStatus = table.checkStatus('uniqueID').data    
    // 清除高亮效果
    var entities = viewer.dataSources._dataSources[0].entities.values
    entities.forEach(function(entity) {
        // 关闭实体的高亮效果
        entity.polygon.outlineColor = Cesium.Color.YELLOW; // 设置轮廓颜色为透明
        entity.polygon.outlineWidth = 20; // 设置轮廓宽度为0
        entity.polygon.extrudedHeight = (6)
        //entity.polygon.fill = true; // 关闭填充效果
    });

    console.log(viewer.dataSources._dataSources[0])
    // 查询实体
    var myentities = []
    for(var i = 0; i < entities.length; i++){
        var entity = entities[i];
        var zutuan = entity.properties.组团号
        var bianhao = entity.properties.编号
        // 查找
        for(var j = 0;j < checkStatus.length;j++){
            // 设置高亮
            if(checkStatus[j].组团号 == zutuan && checkStatus[j].编号 == bianhao){
                entity.polygon.outlineColor = Cesium.Color.RED; // 设置轮廓颜色为黄色
                entity.polygon.outlineWidth = 100; // 设置轮廓宽度为4
                entity.polygon.extrudedHeight = (7)
                //entity.polygon.fill = false; // 关闭填充效果
                console.log(entity)
                entity.polygon.silhouetteColor = Cesium.Color.RED
                entity.polygon.silhouetteSize = 20
                console.log("已找到"+j)
                myentities.push(entity)
            }
        }
    }
    viewer.zoomTo(myentities)
}

// 晾晒
function liangShai(){
    console.log("晾晒")
    var entities = viewer.dataSources._dataSources[0].entities.values
    var checkStatus = table.checkStatus('uniqueID').data    
    console.log(entities)
    // 遍历所有的选中点
    for(var i = 0;i < checkStatus.length;i++){
        // 若不空闲则显示
        if(checkStatus[i].已占用 == "已占用"){
            alert("晾晒点已占用，请重新选择！");
            return;
        }
        // 若空闲
        else{
            // 修改晾晒点属性和显示
            for(var j = 0; j < entities.length; j++){
                var entity = entities[j];
                var zutuan = entity.properties.组团号
                var bianhao = entity.properties.编号
                // 找到对应实体
                if(checkStatus[i].组团号 == zutuan && checkStatus[i].编号 == bianhao){
                    entity.properties.编号 = 1
                    entity.polygon.material = Cesium.Color.GRAY
                }
            }
            // 修改数据
            for(var j = 0;j < baskareaData.length;j++){
                if(checkStatus[i].组团号 == baskareaData[j].组团号 && checkStatus[i].编号 == baskareaData[j].编号){
                    baskareaData[j].已占用 = "已占用"
                    console.log(baskareaData[j].已占用)
                }
            }
        }
    }
    //console.log(table)
    table.renderData("uniqueID");
}

// 撤下
function cheXia(){
    console.log("取消晾晒")
    var entities = viewer.dataSources._dataSources[0].entities.values
    var checkStatus = table.checkStatus('uniqueID').data    
    console.log(entities)
    // 遍历所有的选中点
    for(var i = 0;i < checkStatus.length;i++){
        // 若空闲则不处理
        if(checkStatus[i].已占用 == "空闲"){
        }
        // 若空闲
        else{
            // 修改晾晒点属性和显示
            for(var j = 0; j < entities.length; j++){
                var entity = entities[j];
                var zutuan = entity.properties.组团号
                var bianhao = entity.properties.编号
                // 找到对应实体
                if(checkStatus[i].组团号 == zutuan && checkStatus[i].编号 == bianhao){
                    entity.properties.编号 = 0
                    entity.polygon.material = Cesium.Color.Yellow
                }
            }
            // 修改数据
            for(var j = 0;j < baskareaData.length;j++){
                if(checkStatus[i].组团号 == baskareaData[j].组团号 && checkStatus[i].编号 == baskareaData[j].编号){
                    baskareaData[j].已占用 = "空闲"
                    console.log(baskareaData[j].已占用)
                }
            }
        }
    }
    //console.log(table)
    table.renderData("uniqueID");
}

//#endregion

//#region 天气查询&地理编码
var rainEffect
var smallrainEffect
var snowEffect
var fogEffect

var position = document.getElementById("position");
position.value = "洪山区"
var weatherInfoDiv =  document.getElementById('weatherInfo');
function weather(){
    console.log("开始查询天气")
    // 使用高德的天气API查询天气信息
    var location = position.value
    var apiKey = '5d351cc8a31ea33b2149020c39396bd4'; 
    var url = 'https://restapi.amap.com/v3/weather/weatherInfo?city=' + location + '&key=' + apiKey;

    // 发送请求并处理返回的天气数据
    fetch(url)
    .then(function(response) {
    return response.json();
    })
    .then(function(data){
        // 清空之前的查询结果
        weatherInfoDiv.innerHTML = '';
        // 解析天气数据并显示
        if (data.status === '1' && data.lives && data.lives.length > 0) {
            var weatherInfo = data.lives[0];
            console.log(weatherInfo)

            // 创建天气信息元素
            var weatherElement = document.createElement('div');
            weatherElement.classList.add('item');
            weatherElement.innerHTML = `
            <p>地点：${weatherInfo.adcode}</p>
            <p>天气：${weatherInfo.weather}</p>
            <p>温度：${weatherInfo.temperature}℃</p>
            <p>风向：${weatherInfo.winddirection}</p>
            <p>风力：${weatherInfo.windpower}</p>
            <p>湿度：${weatherInfo.humidity}%</p>
            <p>报告时间：${weatherInfo.reporttime}</p>
            `;
            // 将天气信息添加到页面中
            weatherInfoDiv.appendChild(weatherElement);
            console.log('天气查询结果:');
            console.log(data);
            if (weatherInfo.weather === '雨') {
                rainEffect = new Cesium.RainEffect(viewer, {
                    tiltAngle: -.6,
                    rainSize: 0.3,
                    rainSpeed: 60.0
                });
                rainEffect.show(true);
            }
            else if (weatherInfo.weather === '小雨') {
                smallrainEffect = new Cesium.RainEffect(viewer, {
                    tiltAngle: -.5,
                    rainSize: 0.2,
                    rainSpeed: 300.0
                });
                smallrainEffect.show(true);
            }
            else if (weatherInfo.weather === '雪') {
                snowEffect = new Cesium.SnowEffect(viewer, {
                    tiltAngle: -.6,
                    snowSize: 0.01,
                    snowSpeed: 60.0
                });
                snowEffect.show(true);
            }
            else if (weatherInfo.weather === '霾') {
                fogEffect = new Cesium.FogEffect(viewer, {
                    visibility: 0.25,
                    color: new Cesium.Color(0.8, 0.8, 0.8, 0.5),
                    show: true
                });
                fogEffect.show(true);
            }
        } else {
            var errorElement = document.createElement('p');
            errorElement.textContent = '未找到天气信息';
            weatherInfoDiv.appendChild(errorElement);
          }
    });
}
// 默认查询武汉洪山区天气
weather()

// 地理编码
function geocodeLocation(location) {
    var apiKey = '5d351cc8a31ea33b2149020c39396bd4'; 
    var url = 'https://restapi.amap.com/v3/geocode/geo?address=' + encodeURIComponent(location) + '&key=' + apiKey;
    return fetch(url)
      .then(function(response) {
        return response.json();
      })
      .then(function(data) {
        if (data.status === '1' && data.geocodes && data.geocodes.length > 0) {
          var geocode = data.geocodes[0];
          return {
            location: geocode.location,
            formattedAddress: geocode.formatted_address
          };
        } else {
          throw new Error('无法解析地名');
        }
      });
}

// 开启可视化
function openWeather(){
    weather()
}

/*测试小雨
smallrainEffect = new Cesium.RainEffect(viewer, {
    tiltAngle: -.5,
    rainSize: 0.2,
    rainSpeed: 300.0
});
smallrainEffect.show(true);
*/

// 关闭可视化
function closeWeather(){
    if(rainEffect){
        rainEffect.destroy()
    }
    if(smallrainEffect){
        smallrainEffect.destroy()
    }
    if(snowEffect){
        snowEffect.destroy()
    }
    if(fogEffect){
        fogEffect.destroy()
    }
}
//#endregion

//#region 键鼠交互事件
// 路径规划起点终点
var startEntity = null
var endEntity = null
// 监听键盘、鼠标事件
var handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
// 鼠标移动，显示坐标
handler.setInputAction(function(movement) {
    var cartesian = viewer.scene.pickPosition(movement.endPosition);
    if (cartesian) {
      var cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      var longitudeString = Cesium.Math.toDegrees(cartographic.longitude).toFixed(2);
      var latitudeString = Cesium.Math.toDegrees(cartographic.latitude).toFixed(2);
      document.getElementById('coords').textContent = '当前经度: ' + longitudeString + ', 当前纬度: ' + latitudeString;
    } else {
      document.getElementById('coords').textContent = '';
    }
}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

handler.setInputAction(function (event) {
    console.log('alt+鼠标左键点击：', event.position);
}, Cesium.ScreenSpaceEventType.LEFT_CLICK,Cesium.KeyboardEventModifier.ALT);

var addPointMode = 0; // 初始状态为关闭添加点模式
var pointPosition
// 点选位置
function choosePosition(){
    addPointMode = 1
    document.body.style.cursor = 'crosshair'; // 设置鼠标样式为十字光标
}

// 点击事件
viewer.screenSpaceEventHandler.setInputAction(function(click) {
    // 加点模式
    if(addPointMode == 1){
        // 获取点坐标
        var pointPosition = viewer.scene.pickPosition(click.position);
        // 成功获取坐标
        if (pointPosition) {
            // 先删除已有点
            viewer.entities.removeAll()
            var point = viewer.entities.add({
              position : pointPosition,
              point : {
                pixelSize : 10,
                color : Cesium.Color.RED,
                outlineColor : Cesium.Color.WHITE,
                outlineWidth : 2
              }
            });
            document.body.style.cursor = 'default'; // 恢复默认鼠标样式
            // 地理编码
            // 关闭
            addPointMode = 0
        }
    }
    // 路径规划模式
    else if(addPointMode == 2){
        var pointPosition = viewer.scene.pickPosition(click.position);
        // 开始添加第一个点
        if(startEntity == null){
            startEntity = pointPosition
            // 建立实体
            var point = viewer.entities.add({
                name: "start",
                position: pointPosition,
                billboard: {
                  image: "source/地点点击.png",
                  scale: 0.3,
                  verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                },
            });
            // 转为经纬度
            var entityPosition = Cesium.Cartographic.fromCartesian(startEntity);
            startEntity = [Cesium.Math.toDegrees(entityPosition.longitude),Cesium.Math.toDegrees(entityPosition.latitude)]
        }
        // 添加第二个点
        else if(endEntity == null){ 
            endEntity = pointPosition
            // 建立实体
            var end = viewer.entities.add({
                name: "start",
                position: pointPosition,
                billboard: {
                  image: "source/地点点击.png",
                  scale: 0.3,
                  verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                },
            });
            /// 转为经纬度
            var entityPosition = Cesium.Cartographic.fromCartesian(endEntity);
            endEntity = [Cesium.Math.toDegrees(entityPosition.longitude),Cesium.Math.toDegrees(entityPosition.latitude)]
            // 开始分析
            Planing(startEntity,endEntity)
            // 结束
            addPointMode = 0
            startEntity = null
            endEntity = null
            document.body.style.cursor = 'default'; // 恢复默认鼠标样式
        }
    }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

//#endregion

//#region 路径规划 模块
// 开启：点击进行路径规划
function beginCal(){
    viewer.entities.removeAll()
    addPointMode = 2
    document.body.style.cursor = 'crosshair'; // 设置鼠标样式为十字光标
}

// 路径规划计算
function Planing(startEntity,endEntity){
    // 设置参数
    var url='https://restapi.amap.com/v3/direction/walking';
    var apiKey = '374d6174cd92187743bc7a1372e4bfcb';
    // WGS84转为高德
    var start = gcoord.transform(startEntity, gcoord.WGS84,  gcoord.GCJ02);
    var end = gcoord.transform(endEntity, gcoord.WGS84,  gcoord.GCJ02);
    // 发送请求
    var requestUrl = `${url}?origin=${start[0]},${start[1]}&destination=${end[0]},${end[1]}&extensions=base&output=json&key=${apiKey}`;
    fetch(requestUrl)
    .then(response=>response.json())
    .then(data=>{
        var route=data.route;
        var paths = route.paths;
        for(var i=0;i<paths.length;i++){
            var path = paths[i];
            var steps = path.steps;
            // 提取路径坐标
            var coordinates = [];
            for (var j = 0; j < steps.length; j++) {
                var step = steps[j];
                var polylineCoordinates = step.polyline.split(';');
                for (var k = 0; k < polylineCoordinates.length; k++) {
                    var coordinate = polylineCoordinates[k];
                    console.log(coordinate)
                    coordinate = coordinate.split(',');
                    // 高德转WGS84
                    coordinate = gcoord.transform(coordinate, gcoord.GCJ02, gcoord.WGS84);
                    var cartesian = Cesium.Cartesian3.fromDegrees(parseFloat(coordinate[0]), parseFloat(coordinate[1]));
                    coordinates.push(cartesian);
                }
            }
            console.log("steps:",coordinates);
            drawPath(coordinates, viewer);
        }
    });
}

// 绘制路径
function drawPath(polyLine,viewer){
    var pathEntity=viewer.entities.add({
        name:"path",
        polyline:{
            positions:polyLine,
            width: 3,
            material: Cesium.Color.RED,
            extrudedHeight: 3,
            clampToGround: true
        }
    });
    viewer.flyTo(pathEntity);
}

// 关闭路径规划
function endCal(){
    addPointMode = 0
    startEntity = null
    endEntity = null
    document.body.style.cursor = 'default'; // 恢复默认鼠标样式
    viewer.entities.removeAll()
}
//#endregion 

//#region 元素
// 按钮事件
// 获取元素
var shadow = document.getElementById("shadow");
var manage = document.getElementById("manage");
var route = document.getElementById("route");
var shadowMenu = document.getElementById("shadowMenu");
var manageMenu = document.getElementById("manageMenu");
var routeMenu = document.getElementById("routeMenu");

// 打开阴影分析界面
shadow.addEventListener("click", function() {
    // 检查菜单的显示状态
    if (shadowMenu.style.display === 'none') {
        // 如果菜单是隐藏的，则显示菜单
        shadowMenu.style.display = 'block';
      } else {
        // 如果菜单是显示的，则隐藏菜单
        shadowMenu.style.display = 'none';
      }
    // 将其他开着的关闭
    manageMenu.style.display = 'none'
    routeMenu.style.display = 'none'
});

// 打开坑位管理界面
manage.addEventListener("click", function() {
    // 检查菜单的显示状态
    if (manageMenu.style.display === 'none') {
        // 如果菜单是隐藏的，则显示菜单
        manageMenu.style.display = 'block';
    } else {
        // 如果菜单是显示的，则隐藏菜单
        manageMenu.style.display = 'none';
    }
    // 将其他开着的关闭
    shadowMenu.style.display = 'none'
    routeMenu.style.display = 'none'
});

// 打开路径规划界面
route.addEventListener("click", function() {
    // 检查菜单的显示状态
    if (routeMenu.style.display === 'none') {
        // 如果菜单是隐藏的，则显示菜单
        routeMenu.style.display = 'block';
      } else {
        // 如果菜单是显示的，则隐藏菜单
        routeMenu.style.display = 'none';
      }
    // 将其他开着的关闭
    shadowMenu.style.display = 'none'
    manageMenu.style.display = 'none'
});
//#endregion