"""Proposed continuous circuit routing in CAD coordinates (mm).
Not a recovered True production pipe drawing. Rounded corners are sampled
quadratic bends; bore, bend radius and routing are explicit design assumptions.
"""
from pathlib import Path
import json, math
OUT=Path(__file__).resolve().parent
def rounded(points,radius=18):
    points=[p for i,p in enumerate(points) if not i or math.dist(p,points[i-1])>1e-8]
    out=[points[0]]
    for a,b,c in zip(points,points[1:],points[2:]):
        da=math.dist(a,b);dc=math.dist(b,c)
        r=min(radius,da*.35,dc*.35)
        p=[b[i]+(a[i]-b[i])*r/da for i in range(3)]
        q=[b[i]+(c[i]-b[i])*r/dc for i in range(3)]
        out.append(p)
        for n in range(1,9):
            t=n/8
            out.append([(1-t)**2*p[i]+2*t*(1-t)*b[i]+t*t*q[i] for i in range(3)])
    out.append(points[-1]);return out
routes=[]
def add(id,name,start,end,points,od,bore,stages,**extra):
    path=rounded(points,extra.pop('bendRadiusMm',18))
    routes.append(dict(id=id,name=name,fromPort=start,toPort=end,pointsMm=path,outerDiameterMm=od,innerDiameterMm=bore,lengthMm=sum(math.dist(a,b) for a,b in zip(path,path[1:])),stages=stages,sourceClass='proposed',**extra))
# Ports coincide exactly at shared joints. Compressor ports lie on its shell.
dis=[190,115,270];cin=[-275,-165,245]
add('discharge','토출관 · 진동 완화 루프','compressor_out','condenser_in',[dis,[235,115,270],[250,65,270],[250,15,230],[205,-20,230],[130,-20,270],[-295,-20,270],[-295,-165,270],cin],6.35,4.75,['discharge'])
# Two passes through depth, each serpentine with physical U-bends, not a box.
coil=[cin]
for row,y in enumerate([-165,-125]):
    if row:coil.append([-275,y,135])
    for k in range(6):
        z=(245-k*22) if row==0 else (135+k*22)
        x=-15 if k%2==0 else -275
        coil.extend([[coil[-1][0],y,z],[x,y,z]])
coil=[p for i,p in enumerate(coil) if not i or p!=coil[i-1]]
add('condenser','응축기 · 2열 사행 유로','condenser_in','condenser_out',coil,6.35,4.75,['condenser_desuperheat','condenser_condense','condenser_subcool'],bendRadiusMm=10)
cout=coil[-1];din=[-240,15,165];dout=[-130,15,165]
add('liquid_line','액관','condenser_out','drier_in',[cout,[-295,-125,245],[-295,15,245],[-270,15,165],din],6.35,4.75,['filter_drier'])
add('filter_drier','필터드라이어','drier_in','capillary_in',[din,dout],22,16,['filter_drier'])
# Capillary reserve coil then a dedicated rear service chase, separate from suction.
cap=[dout,[-90,15,165],[-90,65,170]]
for j in range(97):
    angle=j/96*6*math.pi
    cap.append([-90+24*math.sin(angle),89-24*math.cos(angle),170+j/96*24])
cap.extend([[-90,65,230],[-80,245,255],[-80,335,290],[-80,335,1670],[-260,335,1670],[-260,210,1670],[-230,190,1680]])
add('capillary','모세관 · 코일 및 후면 상승관','capillary_in','evaporator_in',cap,2,0.8,['capillary'],bendRadiusMm=10,displayScale=2.5)
evap=[cap[-1]]
for k in range(8):
    y=190-k*22
    x=230 if k%2==0 else -230
    evap.extend([[evap[-1][0],y,1680],[x,y,1680]])
evap=[p for i,p in enumerate(evap) if not i or p!=evap[i-1]]
add('evaporator','증발기 · 사행 유로','evaporator_in','evaporator_out',evap,8,6.4,['evaporator_boil','evaporator_superheat'],bendRadiusMm=10)
suc=[evap[-1],[-260,36,1680],[-275,230,1680],[-275,350,1680],[-275,350,305],[-220,350,285],[55,350,285],[55,235,285],[70,160,255]]
add('suction','흡입관 · 단열 복귀관','evaporator_out','compressor_in',suc,8,6.4,['suction'],insulationOuterMm=22)
add('compressor','압축기 내부 · 개략 연결','compressor_in','compressor_out',[suc[-1],[130,115,240],dis],8,6.4,['compressor'],internal=True)
ports={}
for r in routes:
    for key,p in [(r['fromPort'],r['pointsMm'][0]),(r['toPort'],r['pointsMm'][-1])]:
        if key in ports:assert math.dist(ports[key],p)<1e-7,key
        ports[key]=p
assert len(ports)==len(routes)
out=dict(coordinates='CAD mm: X width, Y toward rear, Z up',routes=routes,ports=ports,
 assumptions=['Proposed routing, not manufacturer piping coordinates','Rear service chase increases overall depth beyond original cabinet bumper','Condenser/evaporator lengths, bores, tube rows and bend radii assumed','Filter drier added as conventional capillary-system component, model-specific part unverified','Capillary is adiabatic: no capillary-suction heat exchange assumed','Compressor internal path only schematic; sealed shell is not a flow passage','Pipe flow speed glyphs are slowed explanatory tracers, not a measured velocity'],
 sources=['https://www.secop.com/fileadmin/user_upload/technical-literature/danfoss-lectures/operational_defects_in_hermetic_compressors_and_refrigerating_systems.pdf'])
(OUT/'piping-layout.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print('Continuous loop',len(routes),'segments; lengths mm:',{r['id']:round(r['lengthMm']) for r in routes})
