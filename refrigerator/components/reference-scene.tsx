'use client';
import {useEffect,useRef,useState} from 'react';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {asset} from '@/lib/asset';
type Props={door:boolean;exploded:boolean;section:boolean;selected:string;view:string;onSelect:(id:string)=>void};
export default function ReferenceScene(props:Props){
 const host=useRef<HTMLDivElement>(null),live=useRef(props);useEffect(()=>{live.current=props;},[props]);const [error,setError]=useState('');
 useEffect(()=>{
  const el=host.current!;let renderer:T.WebGLRenderer;
  try{renderer=new T.WebGLRenderer({antialias:true,alpha:true});}catch{queueMicrotask(()=>setError('WebGL을 사용할 수 없습니다. 원본 도면 탭에서 설계를 확인하세요.'));return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.shadowMap.enabled=true;el.appendChild(renderer.domElement);
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(35,1,.01,30);camera.position.set(2.7,2.1,3.7);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1,0);controls.enableDamping=true;controls.minDistance=1;controls.maxDistance=7;
  scene.add(new T.HemisphereLight(0xeef8ff,0x33414d,3));const sun=new T.DirectionalLight(0xffffff,4);sun.position.set(3,4,4);scene.add(sun);
  const root=new T.Group();scene.add(root);const hinge=new T.Group();hinge.position.set(.3429,0,.31115);root.add(hinge);
  const meshes:T.Mesh[]=[];const offsets:{mesh:T.Mesh;offset:T.Vector3}[]=[];
  const grid=new T.GridHelper(5,25,0x596970,0x26383f);scene.add(grid);
  let alive=true;
  fetch(asset('/reference/cad-meshes.json')).then(r=>{if(!r.ok)throw Error('CAD 파일을 불러오지 못했습니다.');return r.json() as Promise<{parts:{id:string;group:string;positions:number[];indices:number[]}[]}>;}).then(data=>{
   if(!alive)return;
   for(const p of data.parts){
    const id=p.group||p.id;const isDoor=id==='door'||id==='handle';const pos:number[]=[];
    for(let i=0;i<p.positions.length;i+=3)pos.push(p.positions[i]/1000-(isDoor?.3429:0),p.positions[i+2]/1000,-p.positions[i+1]/1000-(isDoor?.31115:0));
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(p.indices);g.computeVertexNormals();
    const color=id==='compressor'||id==='castors'||id==='handle'||id==='display'?0x17252c:id==='evaporator'?0x7abcc8:id==='condenser'?0xb98862:0xc7d2d5;
    const m=new T.Mesh(g,new T.MeshStandardMaterial({color,metalness:.65,roughness:.32,side:T.DoubleSide}));m.userData.id=id;(isDoor?hinge:root).add(m);meshes.push(m);
    const offset=id==='shelves'?new T.Vector3(0,0,.65):id==='compressor'||id==='condenser'?new T.Vector3(.6,0,-.25):id==='evaporator'?new T.Vector3(0,.3,-.3):id==='grille'?new T.Vector3(0,0,.55):new T.Vector3();offsets.push({mesh:m,offset});
   }
  }).catch(e=>{if(alive)setError(String(e.message));});
  const resize=new ResizeObserver(()=>{renderer.setSize(el.clientWidth,el.clientHeight);camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix();});resize.observe(el);
  const ray=new T.Raycaster(),pointer=new T.Vector2();let down=[0,0];
  const start=(e:PointerEvent)=>{down=[e.clientX,e.clientY]};
  const pick=(e:PointerEvent)=>{if(Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const b=el.getBoundingClientRect();pointer.set((e.clientX-b.left)/b.width*2-1,1-(e.clientY-b.top)/b.height*2);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(meshes.filter(m=>m.visible))[0];if(hit)live.current.onSelect(hit.object.userData.id);};
  el.addEventListener('pointerdown',start);el.addEventListener('pointerup',pick);
  let frame=0,lastView='iso';const loop=()=>{
   const p=live.current;if(p.view!==lastView){lastView=p.view;camera.position.set(...(p.view==='front'?[0,1,4.6]:p.view==='side'?[4.6,1,0]:p.view==='top'?[0,5,.001]:[2.7,2.1,3.7]) as [number,number,number]);controls.target.set(0,1,0);}
   hinge.rotation.y=p.door?Math.PI/2:0;hinge.position.z=p.exploded?.95:.31115;
   for(const {mesh,offset} of offsets){mesh.position.copy(p.exploded?offset:new T.Vector3());const id=mesh.userData.id;mesh.visible=!(p.section&&id==='cabinet');const mat=mesh.material as T.MeshStandardMaterial;mat.emissive.setHex(id===p.selected?0x17433f:0);mat.emissiveIntensity=.65;}
   controls.update();renderer.render(scene,camera);frame=requestAnimationFrame(loop);
  };loop();
  return()=>{alive=false;cancelAnimationFrame(frame);resize.disconnect();el.removeEventListener('pointerdown',start);el.removeEventListener('pointerup',pick);controls.dispose();scene.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});grid.geometry.dispose();(grid.material as T.Material).dispose();renderer.dispose();renderer.domElement.remove();};
 },[]);
 return <div className="ref-scene" ref={host}>{error&&<p role="alert" className="ref-error">{error}</p>}</div>;
}
