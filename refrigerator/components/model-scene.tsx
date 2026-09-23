'use client';
// Generic viewer for generator output. Give it `src` (folder with model.json + routes.json)
// or `data` (in-memory build result, e.g. from the editor). The camera is fitted to the model
// bounds when `fitKey` changes, and kept as-is while the same model is being edited.
import {useEffect,useRef,useState} from 'react';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
type Part={id:string;group?:string;kind?:string;spin?:{centerMm:number[];axisMm:number[]};color:number;positions:number[];indices:number[]};
type Route={id:string;points:number[][]};
type Door={id:string;pivotMm:number[];swing:number};
export type SceneData={model:{doorPivotMm:number[]|null;doors?:Door[];parts:Part[]};routes:{routes:Route[]}};
type V3=[number,number,number];
// pickTarget: while set, a click on that component's surface calls onPick with the point and outward normal (model mm) instead of selecting.
type Props={src?:string;data?:SceneData|null;fitKey?:string;selected:string;onSelect:(id:string)=>void;view:string;transparent:boolean;flow:boolean;door:boolean;
 pickTarget?:string|null;onPick?:(mm:V3,normal:V3)=>void;markers?:{mm:number[];label:string}[]};
const SHELL=['cabinet','door','shelves'];
const isShell=(id:string)=>SHELL.includes(id)||id.startsWith('door');
// Camera offsets in units of the model's largest dimension (rear-left three-quarter view by default).
const VIEWS:Record<string,[number,number,number]>={rear:[-1.49,.68,-1.86],front:[1.37,.62,1.86],back:[0,.06,-2.36],left:[-2.36,.06,0]};
const cadTo3=(a:number[])=>new T.Vector3(a[0]/1000,a[2]/1000,-a[1]/1000);
type Stage={scene:T.Scene;camera:T.PerspectiveCamera;controls:OrbitControls;content:T.Group|null;markers:T.Group;items:T.Mesh[];spinners:{pivot:T.Group;axis:T.Vector3}[];routes:{curve:T.CurvePath<T.Vector3>;len:number;dots:T.Mesh[]}[];hinges:{group:T.Group;swing:number}[];grid:T.GridHelper|null;
 fit:{center:T.Vector3;size:number;machine:T.Vector3|null;machineSize:number}|null;fittedKey:string;lastView:string};
function dispose(o:T.Object3D){o.traverse(x=>{if(x instanceof T.Mesh||x instanceof T.Line){x.geometry.dispose();for(const m of Array.isArray(x.material)?x.material:[x.material])m.dispose();}});}
function applyView(s:Stage,view:string){const f=s.fit;if(!f)return;s.lastView=view;
 if(view==='machine'&&f.machine){s.camera.position.copy(f.machine).add(new T.Vector3(-.69,.21,-.69).multiplyScalar(f.machineSize*4));s.controls.target.copy(f.machine);return;}
 s.camera.position.copy(f.center).add(new T.Vector3(...(VIEWS[view]||VIEWS.rear)).multiplyScalar(f.size));s.controls.target.copy(f.center);}
function setContent(s:Stage,data:SceneData,key:string,view:string){
 if(s.content){s.scene.remove(s.content);dispose(s.content);}
 const content=new T.Group(),items:T.Mesh[]=[],spinners:Stage['spinners']=[],routes:Stage['routes']=[];
 // One hinge group per door (older model files only carry doorPivotMm for "door").
 const doors:Door[]=data.model.doors??(data.model.doorPivotMm?[{id:'door',pivotMm:data.model.doorPivotMm,swing:1}]:[]);
 const hinges:Stage['hinges']=[],hingeOf:Record<string,T.Group>={};
 for(const d of doors){const g=new T.Group();g.position.copy(cadTo3(d.pivotMm));content.add(g);hinges.push({group:g,swing:d.swing});hingeOf[d.id]=g;}
 for(const part of data.model.parts){const id=part.group||part.id,hinge=hingeOf[id]??null;const pivot=part.spin?cadTo3(part.spin.centerMm):null;const positions:number[]=[];
  for(let i=0;i<part.positions.length;i+=3){const v=cadTo3(part.positions.slice(i,i+3));if(hinge)v.sub(hinge.position);if(pivot)v.sub(pivot);positions.push(v.x,v.y,v.z);}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(part.indices);geo.computeVertexNormals();
  const pipe=part.kind==='pipe',mesh=new T.Mesh(geo,new T.MeshStandardMaterial({color:part.color,metalness:pipe?.6:.35,roughness:pipe?.35:.5,side:T.DoubleSide}));mesh.userData.id=id;items.push(mesh);
  if(pivot&&part.spin){const g=new T.Group();g.position.copy(pivot);g.add(mesh);content.add(g);const a=part.spin.axisMm;spinners.push({pivot:g,axis:new T.Vector3(a[0],a[2],-a[1]).normalize()});}else (hinge??content).add(mesh);}
 for(const route of data.routes.routes){const pts=route.points.map(cadTo3),curve=new T.CurvePath<T.Vector3>();for(let i=1;i<pts.length;i++)curve.add(new T.LineCurve3(pts[i-1],pts[i]));
  const len=curve.getLength(),dots:T.Mesh[]=[],count=Math.max(3,Math.round(len/.12));for(let i=0;i<count;i++){const dot=new T.Mesh(new T.SphereGeometry(.0045,8,8),new T.MeshBasicMaterial({color:0xffffff}));content.add(dot);dots.push(dot);}routes.push({curve,len,dots});}
 s.scene.add(content);Object.assign(s,{content,items,spinners,routes,hinges});
 if(s.fittedKey!==key||!s.fit){
  content.updateMatrixWorld(true);const all=new T.Box3(),comp=new T.Box3();for(const m of items){all.expandByObject(m);if(m.userData.id==='compressor')comp.expandByObject(m);}
  const size=all.getSize(new T.Vector3());s.fit={center:all.getCenter(new T.Vector3()),size:Math.max(size.x,size.y,size.z),machine:comp.isEmpty()?null:comp.getCenter(new T.Vector3()),machineSize:comp.isEmpty()?0:Math.max(...comp.getSize(new T.Vector3()).toArray())};
  s.camera.far=s.fit.size*20;s.camera.updateProjectionMatrix();s.controls.maxDistance=s.fit.size*4;
  if(s.grid){s.scene.remove(s.grid);dispose(s.grid);}s.grid=new T.GridHelper(Math.max(2,Math.ceil(s.fit.size*1.5)),20,0x58717b,0x314a56);s.scene.add(s.grid);
  s.fittedKey=key;applyView(s,view);}
}
export default function ModelScene(p:Props){
 const host=useRef<HTMLDivElement>(null),live=useRef(p),stage=useRef<Stage|null>(null);useEffect(()=>{live.current=p;},[p]);const [error,setError]=useState('');
 // Renderer, controls and animation loop live for the whole component lifetime.
 useEffect(()=>{const el=host.current!;let renderer:T.WebGLRenderer;try{renderer=new T.WebGLRenderer({antialias:true,alpha:true});}catch{queueMicrotask(()=>setError('WebGL을 사용할 수 없습니다.'));return;}
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));el.appendChild(renderer.domElement);renderer.outputColorSpace=T.SRGBColorSpace;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(38,1,.01,40);camera.position.set(-1.2,.95,-1.5);const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.4,0);controls.enableDamping=true;controls.minDistance=.15;controls.maxDistance=8;
 scene.add(new T.HemisphereLight(0xffffff,0x536672,2.6));const light=new T.DirectionalLight(0xffffff,2.6);light.position.set(-2,3,-3);scene.add(light);const fill=new T.DirectionalLight(0xffffff,1.2);fill.position.set(2,1.5,2);scene.add(fill);
 const markers=new T.Group();scene.add(markers);
 const s:Stage={scene,camera,controls,content:null,markers,items:[],spinners:[],routes:[],hinges:[],grid:null,fit:null,fittedKey:'',lastView:''};stage.current=s;
 const resize=new ResizeObserver(()=>{camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix();renderer.setSize(el.clientWidth,el.clientHeight);});resize.observe(el);
 const ray=new T.Raycaster(),mouse=new T.Vector2();let down=[0,0];const pd=(e:PointerEvent)=>{down=[e.clientX,e.clientY]},pu=(e:PointerEvent)=>{if(Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const b=el.getBoundingClientRect();mouse.set((e.clientX-b.left)/b.width*2-1,1-(e.clientY-b.top)/b.height*2);camera.updateMatrixWorld();ray.setFromCamera(mouse,camera);const v=live.current;
  if(v.pickTarget){const hit=ray.intersectObjects(s.items.filter(m=>m.userData.id===v.pickTarget))[0];
   if(hit&&v.onPick){const p=hit.point,n=(hit.face?.normal??new T.Vector3(0,1,0)).clone().transformDirection(hit.object.matrixWorld);if(n.dot(ray.ray.direction)>0)n.negate();
    v.onPick([p.x*1000,-p.z*1000,p.y*1000],[n.x,-n.z,n.y]);}return;}
  const hit=ray.intersectObjects(s.items.filter(m=>m.visible&&!(v.transparent&&isShell(m.userData.id))))[0];if(hit)v.onSelect(hit.object.userData.id);};el.addEventListener('pointerdown',pd);el.addEventListener('pointerup',pu);
 let raf=0,phase=0,fanSpeed=0,fanAngle=0,last=performance.now();const loop=()=>{const now=performance.now(),dt=Math.min(.1,(now-last)/1000);last=now;const v=live.current;
 if(s.fit&&v.view!==s.lastView)applyView(s,v.view);
 for(const h of s.hinges)h.group.rotation.y=v.door?h.swing*Math.PI/2:0;
 for(const m of s.items){const id=m.userData.id;const shell=isShell(id),mat=m.material as T.MeshStandardMaterial;mat.transparent=shell&&v.transparent;mat.opacity=shell&&v.transparent?.08:1;mat.depthWrite=!mat.transparent;mat.emissive.setHex(id===v.selected?0x1d5550:0);}
 // Fans run with the circuit; they stop while the door is open (evaporator fan cut-out on door switch).
 fanSpeed+=((v.flow&&!v.door?9:0)-fanSpeed)*Math.min(1,dt*1.5);fanAngle+=fanSpeed*dt;for(const sp of s.spinners)sp.pivot.quaternion.setFromAxisAngle(sp.axis,fanAngle);
 if(v.flow)phase+=dt*.06;for(const r of s.routes)for(let i=0;i<r.dots.length;i++){const dot=r.dots[i];dot.visible=v.flow;dot.position.copy(r.curve.getPointAt((phase/r.len+i/r.dots.length)%1));}
 controls.update();renderer.render(scene,camera);raf=requestAnimationFrame(loop);};loop();
 return()=>{cancelAnimationFrame(raf);resize.disconnect();controls.dispose();el.removeEventListener('pointerdown',pd);el.removeEventListener('pointerup',pu);dispose(scene);renderer.dispose();renderer.domElement.remove();stage.current=null;};
 },[]);
 // A new fitKey only marks the camera fit stale; it is refitted when the matching content arrives
 // (the old content may still be on screen while the new model is loading or broken).
 useEffect(()=>{if(stage.current)stage.current.fittedKey='';},[p.fitKey]);
 // Content: fetched from `src`, or taken from `data`.
 useEffect(()=>{const key=live.current.fitKey??p.src??'';
  if(p.data){if(stage.current)setContent(stage.current,p.data,key,live.current.view);return;}
  if(!p.src)return;let alive=true;
  Promise.all([fetch(`${p.src}/model.json`).then(r=>{if(!r.ok)throw Error();return r.json() as Promise<SceneData['model']>;}),fetch(`${p.src}/routes.json`).then(r=>{if(!r.ok)throw Error();return r.json() as Promise<SceneData['routes']>;})])
   .then(([model,routes])=>{if(alive&&stage.current){setError('');setContent(stage.current,{model,routes},key,live.current.view);}}).catch(()=>{if(alive)setError('모델 또는 배관 파일을 읽지 못했습니다.');});
  return()=>{alive=false;};},[p.src,p.data]);
 // Port markers (model mm), sized to the model.
 useEffect(()=>{const s=stage.current;if(!s)return;dispose(s.markers);s.markers.clear();const r=(s.fit?.size??1)*.007;
  for(const m of p.markers??[]){const dot=new T.Mesh(new T.SphereGeometry(r,16,12),new T.MeshBasicMaterial({color:0xffd36b,depthTest:false}));dot.renderOrder=10;dot.position.copy(cadTo3(m.mm));dot.userData.label=m.label;s.markers.add(dot);}},[p.markers,p.data]);
 return <div className={`hr-scene${p.pickTarget?' hr-pick':''}`} ref={host}>{error&&<p className="hr-error" role="alert">{error}</p>}</div>;
}
