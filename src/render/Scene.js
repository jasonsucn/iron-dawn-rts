import * as T from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { makeMap } from '../core/Map.js';
import { buildTerrain } from './Terrain.js';
const FogShader={
 uniforms:{tDiffuse:{value:null},tFog:{value:null},uProjInv:{value:new T.Matrix4()},uCamWorld:{value:new T.Matrix4()},uCamPos:{value:new T.Vector3()},uEnabled:{value:0}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
 fragmentShader:`
  uniform sampler2D tDiffuse;
  uniform sampler2D tFog;
  uniform mat4 uProjInv;
  uniform mat4 uCamWorld;
  uniform vec3 uCamPos;
  uniform float uEnabled;
  varying vec2 vUv;
  void main(){
    vec4 color=texture2D(tDiffuse,vUv);
    if(uEnabled>0.5){
      vec2 ndc=vUv*2.0-1.0;
      vec4 clip=vec4(ndc,1.0,1.0);
      vec4 view=uProjInv*clip;view/=view.w;
      vec3 world=(uCamWorld*view).xyz;
      vec3 dir=normalize(world-uCamPos);
      if(dir.y<-0.015){
        float t=-uCamPos.y/dir.y;
        vec2 p=uCamPos.xz+dir.xz*t;
        vec2 uv=p/160.0+0.5;
        if(uv.x>-0.02&&uv.x<1.02&&uv.y>-0.02&&uv.y<1.02){
          vec4 shroud=texture2D(tFog,clamp(uv,0.0,1.0));
          float a=clamp(shroud.a,0.0,0.985);
          vec3 ink=vec3(0.008,0.018,0.024);
          color.rgb=mix(color.rgb,ink,a);
        }
      }
    }
    gl_FragColor=color;
  }`
};
export function createScene(canvas){
 const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance',stencil:false});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.65));renderer.setSize(innerWidth,innerHeight);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.14;renderer.outputColorSpace=T.SRGBColorSpace;
 const scene=new T.Scene();scene.background=new T.Color('#7d8d88');scene.fog=new T.FogExp2('#9a8d77',.0055);
 const camera=new T.PerspectiveCamera(42,innerWidth/innerHeight,.2,500);camera.position.set(-37,50,57);camera.lookAt(0,0,0);
 scene.add(new T.HemisphereLight('#b9d7d8','#503f2d',1.35));
 const sun=new T.DirectionalLight('#ffc483',4.3);sun.position.set(-48,62,24);sun.castShadow=true;
 sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-88;sun.shadow.camera.right=88;sun.shadow.camera.top=88;sun.shadow.camera.bottom=-88;sun.shadow.camera.near=1;sun.shadow.camera.far=200;sun.shadow.bias=-.0004;sun.shadow.normalBias=.028;scene.add(sun);sun.target.position.set(0,0,0);scene.add(sun.target);
 const rim=new T.DirectionalLight('#67b8c4',1.6);rim.position.set(52,26,-40);scene.add(rim);
 const fill=new T.DirectionalLight('#ffb87a',.55);fill.position.set(-45,9,-20);scene.add(fill);
 const sky=new T.Mesh(new T.SphereGeometry(220,48,28),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,vertexShader:'varying vec3 vPos; void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`varying vec3 vPos;
 void main(){
  vec3 d=normalize(vPos);float h=d.y;
  vec3 zenith=vec3(.16,.27,.35);
  vec3 horizon=vec3(.86,.58,.36);
  vec3 low=vec3(.33,.31,.26);
  float k=smoothstep(-.06,.78,h);
  vec3 c=mix(low,mix(horizon,zenith,k),smoothstep(-.65,.12,h));
  float sunGlow=pow(max(dot(d,normalize(vec3(-.58,.33,-.72))),0.0),14.0);
  c+=vec3(1.0,.55,.23)*sunGlow*.7;
  gl_FragColor=vec4(c,1.0);
 }`}));scene.add(sky);
 const map=makeMap();const terrain=buildTerrain(scene,map);
 const composer=new EffectComposer(renderer);
 const renderPass=new RenderPass(scene,camera);composer.addPass(renderPass);
 const bloom=new UnrealBloomPass(new T.Vector2(innerWidth,innerHeight),.38,.55,.78);composer.addPass(bloom);
 const output=new OutputPass();composer.addPass(output);
 const fogPass=new ShaderPass(FogShader);fogPass.renderToScreen=false;composer.addPass(fogPass);
 const fxaa=new ShaderPass(FXAAShader);fxaa.uniforms.resolution.value.set(1/(innerWidth*renderer.getPixelRatio()),1/(innerHeight*renderer.getPixelRatio()));fxaa.renderToScreen=true;composer.addPass(fxaa);
 const cameraRig={target:new T.Vector3(0,0,0),yaw:0,zoom:1};
 let lowQuality=false;
 function setLowQuality(value){
  if(lowQuality===!!value)return;
  lowQuality=!!value;
  renderer.setPixelRatio(lowQuality?1:Math.min(devicePixelRatio||1,1.65));
  composer.setSize(innerWidth,innerHeight);
  fxaa.uniforms.resolution.value.set(1/(innerWidth*renderer.getPixelRatio()),1/(innerHeight*renderer.getPixelRatio()));
 }
 function setFogTexture(texture){fogPass.uniforms.tFog.value=texture;}
 function setFogEnabled(value){fogPass.uniforms.uEnabled.value=value?1:0;}
 function resize(){renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();fxaa.uniforms.resolution.value.set(1/(innerWidth*renderer.getPixelRatio()),1/(innerHeight*renderer.getPixelRatio()));}
 addEventListener('resize',resize);
 function render(){
  camera.updateMatrixWorld();
  fogPass.uniforms.uProjInv.value.copy(camera.projectionMatrixInverse);
  fogPass.uniforms.uCamWorld.value.copy(camera.matrixWorld);
  fogPass.uniforms.uCamPos.value.copy(camera.position);
  bloom.enabled=!lowQuality;
  fxaa.enabled=!lowQuality;
  composer.render();
 }
 function dispose(){removeEventListener('resize',resize);composer.dispose?.();scene.traverse(o=>{if(o.isInstancedMesh||o.isMesh){o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else if(o.material&&!o.material.userData.shared)o.material.dispose();}});renderer.dispose();}
 return {renderer,scene,camera,map,terrain,cameraRig,composer,bloom,setLowQuality,setFogTexture,setFogEnabled,render,resize,dispose};
}
