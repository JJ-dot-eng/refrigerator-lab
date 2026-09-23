'use client';
// Generic viewer for generator output (public/models/<id>/model.json + routes.json).
// Camera presets are fitted to the model bounds, so any spec renders without per-model tuning.
import {useEffect,useRef,useState} from 'react';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
type Part={id:string;group?:string;kind?:string;spin?:{centerMm:number[];axisMm:number[]};color:number;positions:number[];indices:number[]};
type Route={id:string;points:number[][]};
type Props={src:string;selected:string;onSelect:(id:string)=>void;view:string;transparent:boolean;flow:boolean;door:boolean};
const SHELL=['cabinet','door','shelves'];
// Camera offsets in units of the model's largest dimension (rear-left three-quarter view by default).
const VIEWS:Record<string,[number,number,number]>={rear:[-1.49,.68,-1.86],front:[1.37,.62,1.86],back:[0,.06,-2.36],left:[-2.36,.06,0]};
export default function ModelScene(p:Props){
 const host=useRef<HTMLDivElement>(null),live=useRef(p);useEffect(()=>{live.current=p;},[p]);const [error,setError]=useState('');
 useEffect(()=>{const el=host.current!;let renderer:T.WebGLRenderer;try{renderer=new T.WebGLRenderer({antialias:true,alpha:true});}catch{queueMicrotask(()=>setError('WebGL을 사용할 수 없습니다.'));return;}
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));el.appendChild(renderer.domElement);renderer.outputColorSpace=T.SRGBColorSpace;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(38,1,.01,40);camera.position.set(-1.2,.95,-1.5);const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.4,0);controls.enableDamping=true;controls.minDistance=.15;controls.maxDistance=8;
 scene.add(new T.HemisphereLight(0xffffff,0x536672,2.6));const light=new T.DirectionalLight(0xffffff,2.6);light.position.set(-2,3,-3);scene.add(light);const fill=new T.DirectionalLight(0xffffff,1.2);fill.position.set(2,1.5,2);scene.add(fill);
 const items:T.Mesh[]=[],spinners:{pivot:T.Group;axis:T.Vector3}[]=[],routes:{curve:T.CurvePath<T.Vector3>;dots:T.Mesh[]}[]=[];
 const hinge=new T.Group();scene.add(hinge);
 let alive=true,fit:{center:T.Vector3;size:number;machine:T.Vector3|null;machineSize:number}|null=null,lastView='';
 const cadTo3=(a:number[])=>new T.Vector3(a[0]/1000,a[2]/1000,-a[1]/1000);
 const applyView=(view:string)=>{if(!fit)return;lastView=view;
  if(view==='machine'&&fit.machine){const d=fit.machineSize*4;camera.position.copy(fit.machine).add(new T.Vector3(-.69,.21,-.69).multiplyScalar(d));controls.target.copy(fit.machine);return;}
  const o=VIEWS[view]||VIEWS.rear;camera.position.copy(fit.center).add(new T.Vector3(...o).multiplyScalar(fit.size));controls.target.copy(fit.center);};
 Promise.all([fetch(`${p.src}/model.json`).then(r=>{if(!r.ok)throw Error();return r.json() as Promise<{doorPivotMm:number[]|null;parts:Part[]}>;}),fetch(`${p.src}/routes.json`).then(r=>{if(!r.ok)throw Error();return r.json() as Promise<{routes:Route[]}>;})]).then(([model,pipes])=>{if(!alive)return;
 if(model.doorPivotMm)hinge.position.copy(cadTo3(model.doorPivotMm));
 for(const part of model.parts){const id=part.group||part.id,isDoor=id==='door'&&!!model.doorPivotMm;const pivot=part.spin?cadTo3(part.spin.centerMm):null;const positions:number[]=[];for(let i=0;i<part.positions.length;i+=3){const v=cadTo3(part.positions.slice(i,i+3));if(isDoor)v.sub(hinge.position);if(pivot)v.sub(pivot);positions.push(v.x,v.y,v.z);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(part.indices);geo.computeVertexNormals();
 const pipe=part.kind==='pipe',mesh=new T.Mesh(geo,new T.MeshStandardMaterial({color:part.color,metalness:pipe?.6:.35,roughness:pipe?.35:.5,side:T.DoubleSide}));mesh.userData.id=id;items.push(mesh);if(pivot&&part.spin){const g=new T.Group();g.position.copy(pivot);g.add(mesh);scene.add(g);const a=part.spin.axisMm;spinners.push({pivot:g,axis:new T.Vector3(a[0],a[2],-a[1]).normalize()});}else (isDoor?hinge:scene).add(mesh);}
 for(const route of pipes.routes){const pts=route.points.map(cadTo3),curve=new T.CurvePath<T.Vector3>();for(let i=1;i<pts.length;i++)curve.add(new T.LineCurve3(pts[i-1],pts[i]));
 const dots:T.Mesh[]=[],count=Math.max(3,Math.round(curve.getLength()/.12));for(let i=0;i<count;i++){const dot=new T.Mesh(new T.SphereGeometry(.0045,8,8),new T.MeshBasicMaterial({color:0xffffff}));scene.add(dot);dots.push(dot);}routes.push({curve,dots});}
 scene.updateMatrixWorld(true);const all=new T.Box3(),comp=new T.Box3();for(const m of items){all.expandByObject(m);if(m.userData.id==='compressor')comp.expandByObject(m);}
 const size=all.getSize(new T.Vector3());fit={center:all.getCenter(new T.Vector3()),size:Math.max(size.x,size.y,size.z),machine:comp.isEmpty()?null:comp.getCenter(new T.Vector3()),machineSize:comp.isEmpty()?0:Math.max(...comp.getSize(new T.Vector3()).toArray())};
 camera.far=fit.size*20;camera.updateProjectionMatrix();controls.maxDistance=fit.size*4;
 const grid=new T.GridHelper(Math.max(2,Math.ceil(fit.size*1.5)),20,0x58717b,0x314a56);scene.add(grid);applyView(live.current.view);
 }).catch(()=>{if(alive)setError('모델 또는 배관 파일을 읽지 못했습니다.');});
 const resize=new ResizeObserver(()=>{camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix();renderer.setSize(el.clientWidth,el.clientHeight);});resize.observe(el);
 const ray=new T.Raycaster(),mouse=new T.Vector2();let down=[0,0];const pd=(e:PointerEvent)=>{down=[e.clientX,e.clientY]},pu=(e:PointerEvent)=>{if(Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const b=el.getBoundingClientRect();mouse.set((e.clientX-b.left)/b.width*2-1,1-(e.clientY-b.top)/b.height*2);ray.setFromCamera(mouse,camera);const hit=ray.intersectObjects(items.filter(m=>m.visible&&!(live.current.transparent&&SHELL.includes(m.userData.id))))[0];if(hit)live.current.onSelect(hit.object.userData.id);};el.addEventListener('pointerdown',pd);el.addEventListener('pointerup',pu);
 let raf=0,phase=0,fanSpeed=0,fanAngle=0,last=performance.now();const loop=()=>{const now=performance.now(),dt=Math.min(.1,(now-last)/1000);last=now;const v=live.current;
 if(fit&&v.view!==lastView)applyView(v.view);
 hinge.rotation.y=v.door?Math.PI/2:0;
 for(const m of items){const id=m.userData.id;const shell=SHELL.includes(id),mat=m.material as T.MeshStandardMaterial;mat.transparent=shell&&v.transparent;mat.opacity=shell&&v.transparent?.08:1;mat.depthWrite=!mat.transparent;mat.emissive.setHex(id===v.selected?0x1d5550:0);}
 // Fans run with the circuit; they stop while the door is open (evaporator fan cut-out on door switch).
 fanSpeed+=((v.flow&&!v.door?9:0)-fanSpeed)*Math.min(1,dt*1.5);fanAngle+=fanSpeed*dt;for(const s of spinners)s.pivot.quaternion.setFromAxisAngle(s.axis,fanAngle);
 if(v.flow)phase+=dt*.06;for(const r of routes){const len=r.curve.getLength();for(let i=0;i<r.dots.length;i++){const dot=r.dots[i];dot.visible=v.flow;dot.position.copy(r.curve.getPointAt((phase/len+i/r.dots.length)%1));}}
 controls.update();renderer.render(scene,camera);raf=requestAnimationFrame(loop);};loop();
 return()=>{alive=false;cancelAnimationFrame(raf);resize.disconnect();controls.dispose();el.removeEventListener('pointerdown',pd);el.removeEventListener('pointerup',pu);scene.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});renderer.dispose();renderer.domElement.remove();};
 },[p.src]);
 return <div className="hr-scene" ref={host}>{error&&<p className="hr-error" role="alert">{error}</p>}</div>;
}
