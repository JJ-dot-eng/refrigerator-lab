"""Reconstructed reference CAD, not manufacturer-native CAD.
Run with installed FreeCAD freecadcmd.exe. All generated files remain here.
"""
import FreeCAD as App
import Part
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parent
INCH=25.4
W=27*INCH
D=24.5*INCH
H=75.5*INCH
RISE=(3+7/16)*INCH
TOTAL=H+RISE
DEPTH_ALL=(24+31/32)*INCH
FRONT=-D/2
REAR=D/2
DOOR_BOTTOM=RISE+250
DOOR_TOP=TOTAL-245
SHELF_W=(22+7/8)*INCH
SHELF_D=(18+1/4)*INCH
doc=App.newDocument('TrueT19HC_Reconstruction')
parts=[]
def box(w,d,h,x=0,y=0,z=0):
    return Part.makeBox(w,d,h,App.Vector(x-w/2,y-d/2,z-h/2))
def cyl(r,length,base,direction=(0,0,1)):
    return Part.makeCylinder(r,length,App.Vector(*base),App.Vector(*direction))
def add(ident,name,shape,group,source_class='estimated',note=''):
    assert shape.isValid(),ident
    obj=doc.addObject('PartDesign::Feature',ident)
    obj.Label=name
    obj.Shape=shape
    obj.addProperty('App::PropertyString','SourceClass').SourceClass=source_class
    obj.addProperty('App::PropertyString','ReconstructionNote').ReconstructionNote=note
    parts.append(dict(id=ident,name=name,object=obj,group=group,sourceClass=source_class,note=note))
    return obj

# Body envelope: 40 mm side/rear insulation is a visualization estimate.
outer=box(W,D-50,H,y=25,z=RISE+H/2)
cavity=box(W-80,D-89,DOOR_TOP-DOOR_BOTTOM+40,y=-19.5,z=(DOOR_BOTTOM+DOOR_TOP+40)/2)
equipment_void=box(W-80,D-89,190,y=-19.5,z=RISE+125)
body=outer.cut(cavity).cut(equipment_void)
fascia=box(W,50,245,y=FRONT+25,z=TOTAL-122.5)
fascia=fascia.cut(box(80,7,36,x=W*.29,y=FRONT+2,z=TOTAL-197))
body=body.fuse(fascia).removeSplitter()
add('cabinet','캐비닛 및 상부 헤더',body,'cabinet','mixed',
    'Outer dimensions sourced from page 2 inch dimensions. Wall 40 mm and fascia height 245 mm estimated.')

# Recessed handle cut leaves the outer front plane unchanged.
door_height=DOOR_TOP-DOOR_BOTTOM
door=box(W-8,45,door_height,y=FRONT+22.5,z=(DOOR_BOTTOM+DOOR_TOP)/2)
handle_x=-W/2+115
handle_z=RISE+H*.505
handle_cut=box(120,20,305,x=handle_x,y=FRONT+8,z=handle_z)
door=door.cut(handle_cut)
add('door','단열 도어',door,'door','mixed','Door hinge right; 4 mm side gaps and 45 mm thickness estimated.')
# Interior raised liner and perimeter gasket are part of the door assembly.
liner=box(W-82,14,door_height-80,y=FRONT+51,z=(DOOR_BOTTOM+DOOR_TOP)/2)
add('door_liner','도어 내측 라이너',liner,'door','estimated','Estimated liner shape; move with door hinge.')
gasket_outer=box(W-35,5,door_height-25,y=FRONT+47.5,z=(DOOR_BOTTOM+DOOR_TOP)/2)
gasket_inner=box(W-55,7,door_height-45,y=FRONT+47.5,z=(DOOR_BOTTOM+DOOR_TOP)/2)
add('door_gasket','도어 둘레 가스켓',gasket_outer.cut(gasket_inner),'door','estimated')
handle_floor=box(116,3,301,x=handle_x,y=FRONT+17,z=handle_z)
handle_grip=box(15,14,275,x=handle_x-42,y=FRONT+9,z=handle_z)
add('handle','매립 손잡이',Part.makeCompound([handle_floor,handle_grip]),'handle','mixed',
    'Recess length 305 mm per manufacturer text; width/depth/placement estimated. Recess does not protrude past door front.')

# Lower ventilation grille, opening visible through actual slats.
grille_h=225
grille_z=RISE+125
frame=box(W-30,16,grille_h,y=FRONT+8,z=grille_z).cut(box(W-64,18,grille_h-28,y=FRONT+8,z=grille_z))
slats=[frame]
for j in range(6):
    z=RISE+37+j*34
    slats.append(box(W-64,15,10,y=FRONT+8,z=z))
add('grille','하부 통풍 루버',Part.makeCompound(slats),'grille','estimated','Louver count/spacing estimated from page 2 drawing.')

# Exterior temperature display in header. No undocumented MCU or control board.
display=box(74,3,30,x=W*.29,y=FRONT+1.5,z=TOTAL-197)
add('display','외부 온도 표시창',display,'display','mixed','External display existence sourced; exact size/location estimated.')

# Rear bumper extent fixes total depth exactly to page 2 dimension.
bumper_depth=DEPTH_ALL-D
bumpers=[]
for x in [-W/2+30,W/2-30]:
    bumpers.append(box(24,bumper_depth,300,x=x,y=REAR+bumper_depth/2,z=RISE+190))
add('rear_bumpers','후면 범퍼',Part.makeCompound(bumpers),'cabinet','mixed','Total depth sourced; individual bumper shapes estimated.')

# Three wire shelves. Outer rectangle dimensions follow manufacturer inches.
for level,z in enumerate([RISE+510,RISE+880,RISE+1250],1):
    rod=3.5
    sx=SHELF_W/2-rod/2
    sy=SHELF_D/2-rod/2
    cy=-10
    wires=[
      cyl(rod/2,SHELF_W-rod,(-sx,cy-sy,z),(1,0,0)),
      cyl(rod/2,SHELF_W-rod,(-sx,cy+sy,z),(1,0,0)),
      cyl(rod/2,SHELF_D-rod,(-sx,cy-sy,z),(0,1,0)),
      cyl(rod/2,SHELF_D-rod,(sx,cy-sy,z),(0,1,0))]
    for j in range(23):
        x=-sx+15+j*(2*sx-30)/22
        wires.append(cyl(1.2,SHELF_D-rod,(x,cy-sy,z),(0,1,0)))
    add('shelf_'+str(level),'와이어 선반 '+str(level),Part.makeCompound(wires),'shelves','mixed',
        '581.025 x 463.55 mm sourced from imperial shelf dimensions; rod gauge, spacing and installation heights estimated.')

# Manufacturer states bottom-mounted condensing unit. Internal component forms
# below are schematic envelopes only, not a part-number or certified assembly.
compressor=cyl(78,105,(130,115,RISE+32))
cap=Part.makeSphere(78,App.Vector(130,115,RISE+137),App.Vector(0,0,1),0,90,360)
compressor=compressor.fuse(cap)
feet=[box(45,24,6,x=x,y=y,z=RISE+33) for x in [65,195] for y in [58,172]]
add('compressor','압축기 개념 형상',Part.makeCompound([compressor]+feet),'compressor','estimated',
    'Bottom location sourced; hermetic shell form, dimensions, feet and exact placement are schematic.')
condenser_parts=[box(295,85,140,x=-140,y=-155,z=RISE+105)]
for i in range(24):
    condenser_parts.append(box(1,90,142,x=-280+i*12,y=-155,z=RISE+105))
add('condenser','하부 응축기 개념 형상',Part.makeCompound(condenser_parts),'condenser','estimated')
fan_ring=cyl(67,18,(-140,-214,RISE+110),(0,1,0)).cut(cyl(61,20,(-140,-215,RISE+110),(0,1,0)))
hub=cyl(17,20,(-140,-215,RISE+110),(0,1,0))
blades=[]
for angle in [0,90,180,270]:
    blade=box(14,4,47,x=-140,y=-216,z=RISE+150)
    blade.rotate(App.Vector(-140,-216,RISE+110),App.Vector(0,1,0),angle)
    blades.append(blade)
add('condenser_fan','응축기 팬 개념 형상',Part.makeCompound([fan_ring,hub]+blades),'condenser','estimated')

evap=box(490,190,90,y=110,z=TOTAL-295)
fins=[box(2,192,92,x=-235+i*15,y=110,z=TOTAL-295) for i in range(32)]
add('evaporator','상부 증발기 개념 형상',Part.makeCompound([evap]+fins),'evaporator','estimated',
    'Evaporator existence sourced; top location, size and fin representation estimated, not manufacturer CAD.')

# Castor diameter uses the printed rounded 64 mm, rise from imperial plan.
for index,(x,y) in enumerate([(x,y) for x in [-W/2+48,W/2-48] for y in [-D/2+58,D/2-58]],1):
    wheel=cyl(32,24,(x-12,y,32),(1,0,0))
    axle=cyl(7,38,(x-19,y,32),(1,0,0))
    fork=[box(5,22,45,x=x+sgn*16,y=y,z=52) for sgn in [-1,1]]
    stem=cyl(9,RISE-68,(x,y,68))
    plate=box(45,42,6,x=x,y=y,z=RISE-3)
    add('castor_'+str(index),'캐스터 '+str(index),Part.makeCompound([wheel,axle,stem,plate]+fork),'castors','mixed',
        '64 mm rounded manufacturer wheel diameter; 87.3125 mm plan rise; fork, stem and wheelbase estimated.')

doc.recompute()
collision_checks={}
for p in parts:
    if p['group'] in ['compressor','condenser','evaporator','shelves']:
        v=parts[0]['object'].Shape.common(p['object'].Shape).Volume
        collision_checks[p['id']]=v
        assert v<.01,('Cabinet collision',p['id'],v)
doc.saveAs(str(ROOT/'t-19-hc-reconstructed.FCStd'))
Part.export([p['object'] for p in parts],str(ROOT/'t-19-hc-reconstructed.step'))

meshes=[]
for p in parts:
    shape=p['object'].Shape
    vertices,triangles=shape.tessellate(.65)
    bb=shape.BoundBox
    meshes.append(dict(id=p['id'],name=p['name'],group=p['group'],sourceClass=p['sourceClass'],note=p['note'],
        positions=[round(v,6) for vertex in vertices for v in (vertex.x,vertex.y,vertex.z)],
        indices=[int(i) for tri in triangles for i in tri],
        boundsMm=dict(min=[bb.XMin,bb.YMin,bb.ZMin],max=[bb.XMax,bb.YMax,bb.ZMax]),
        triangleCount=len(triangles)))
payload=dict(units='mm',coordinateSystem='X width, Y rear positive, Z up; ground Z=0. THREE: x=X/1000, y=Z/1000, z=-Y/1000.',
 source='Manufacturer PDF page 2 dimensioned plan, reconstructed by FreeCAD; not manufacturer-native CAD.',
 doorPivotMm=[W/2,FRONT,0],parts=meshes)
(ROOT/'cad-meshes.json').write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
whole=Part.makeCompound([p['object'].Shape for p in parts]);bb=whole.BoundBox
assert abs(bb.XLength-W)<1e-6,(bb.XLength,W)
assert abs(bb.YLength-DEPTH_ALL)<1e-6,(bb.YLength,DEPTH_ALL)
assert abs(bb.ZLength-TOTAL)<1e-6,(bb.ZLength,TOTAL)
assert abs(bb.ZMin)<1e-6
for m in meshes:
    assert max(m['indices'])<len(m['positions'])//3
    assert len(m['indices'])%3==0
for p in parts:
    if p['group']=='shelves':
        sb=p['object'].Shape.BoundBox
        # Circular wires may use cached tessellation bounds after export.
        assert abs(sb.XLength-SHELF_W)<.01,(p['id'],sb.XLength,SHELF_W)
        assert abs(sb.YLength-SHELF_D)<.01,(p['id'],sb.YLength,SHELF_D)
verification=dict(valid=all(p['object'].Shape.isValid() for p in parts),
    partCount=len(parts),triangleCount=sum(m['triangleCount'] for m in meshes),
    measuredBoundsMm=dict(width=bb.XLength,depth=bb.YLength,height=bb.ZLength,zMin=bb.ZMin),
    cabinetBoundsMm=dict(width=W,depth=D,cabinetHeight=H,castorRise=RISE,totalHeight=TOTAL),
    shelfBoundsMm=dict(width=SHELF_W,depth=SHELF_D,tessellatedBoundToleranceMm=.01),
    sourceDiscrepancy='Page 1 H=75.25 in and castor allowance 3.25 in; page 2 H=75.5 in and castor rise 3 7/16 in. Reconstruction follows page 2 imperial plan dimensions. Printed rounded metric values also differ.',
    cabinetInterferenceVolumesMm3=collision_checks,noManufacturerNativeCAD=True)
(ROOT/'cad-verification.json').write_text(json.dumps(verification,ensure_ascii=False,indent=2),encoding='utf-8')
metadata=dict(model='True T-19-HC',sourceUrl='https://www.truemfg.com/wp-content/uploads/true-media/spec-sheets/T-19-HC.pdf',
    sourcePage=2,reconstructed=True,notManufacturerNativeCAD=True,dimensions=verification,
    sourced=['Overall width/cabinet depth/cabinet height/castor rise/bumper depth from page 2 inches','3 shelves and imperial shelf plan dimensions','305 mm recessed handle','External temperature display','Bottom mounted condensing unit','R290 refrigerant','64 mm rounded castor diameter'],
    estimated=['Insulation thickness','Door thickness and reveal','Fascia/grille heights and slat layout','Handle width/depth/placement','Shelf heights/wire spacing/rod sizes','All internal compressor/condenser/evaporator geometry','Castor fork and wheelbase'],
    excluded=['PCB','MCU','Harness','EEPROM','Undocumented manufacturer internal control circuitry'])
(ROOT/'source-metadata.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(verification,indent=2))
