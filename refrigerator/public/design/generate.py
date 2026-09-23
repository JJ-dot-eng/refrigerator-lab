from pathlib import Path
import json, math
import CoolProp
from CoolProp.CoolProp import PropsSI
import cadquery as cq

OUT=Path(__file__).parent
OUT.mkdir(parents=True,exist_ok=True)
rows=[]
for te in range(-25,1,5):
    for tc in range(30,66,5):
        pe=PropsSI('P','T',te+273.15,'Q',1,'R600a')
        pc=PropsSI('P','T',tc+273.15,'Q',0,'R600a')
        h1=PropsSI('H','T',te+273.15+5,'P',pe,'R600a')
        s1=PropsSI('S','T',te+273.15+5,'P',pe,'R600a')
        h2s=PropsSI('H','P',pc,'S',s1,'R600a')
        h2=h1+(h2s-h1)/.6
        h3=PropsSI('H','T',tc+273.15-3,'P',pc,'R600a')
        h4=h3
        q=h1-h4
        w=h2-h1
        qe=q*.00045
        wc=w*.00045
        qc=(h2-h3)*.00045
        assert abs(qc-qe-wc)<1e-8
        rows.append(dict(evaporatingC=te,condensingC=tc,pLowPa=pe,pHighPa=pc,
          h1Jkg=h1,h2Jkg=h2,h3Jkg=h3,h4Jkg=h4,s1JkgK=s1,
          qSpecificJkg=q,workSpecificJkg=w,coolingW=qe,shaftPowerW=wc,
          electricalPowerW=wc/.85,condenserHeatW=qc,
          motorLossW=wc/.85-wc,cop=qe/(wc/.85),
          dischargeC=PropsSI('T','P',pc,'H',h2,'R600a')-273.15))
cycle=dict(fluid='R600a',library='CoolProp',version=CoolProp.__version__,
 units='SI except temperatures suffixed C',superheatK=5,subcoolingK=3,
 isentropicEfficiency=.6,motorEfficiency=.85,massFlowKgS=.00045,
 assumption='Fixed mass flow is a design assumption, not a compressor map. Steady-state cycle; no refrigerant inventory or two-phase transient flow.',
 sources=['https://coolprop.org/fluid_properties/fluids/IsoButane.html','https://coolprop.org/coolprop/HighLevelAPI.html'],rows=rows)
(OUT/'r600a-cycle-grid.json').write_text(json.dumps(cycle,indent=2),encoding='utf-8')
table=dict(refrigerant='R600a',evaporatingC=list(range(-25,1,5)),condensingC=list(range(30,66,5)),
 points=[dict(te=r['evaporatingC'],tc=r['condensingC'],pLowPa=r['pLowPa'],pHighPa=r['pHighPa'],
 h1=r['h1Jkg'],h2=r['h2Jkg'],h3=r['h3Jkg'],h4=r['h4Jkg'],qEvapJkg=r['qSpecificJkg'],
 workElectricJkg=r['workSpecificJkg']/.85,cop=r['cop']) for r in rows],
 assumptions={k:v for k,v in cycle.items() if k!='rows'})
(OUT/'cycle-table.json').write_text(json.dumps(table,indent=2),encoding='utf-8')

def box(w,d,h,x=0,y=0,z=0):
    return cq.Workplane('XY').box(w,d,h).translate((x,y,z))
assembly=cq.Assembly(name='OneDoor120LConcept')
body=box(550,520,1000,z=500).cut(box(450,411,850,y=-55.5,z=525))
assembly.add(body,name='cabinet_insulated_envelope',color=cq.Color(.85,.88,.89))
assembly.add(box(550,60,1000,y=-290,z=500),name='door',color=cq.Color(.84,.86,.88))
assembly.add(box(450,50,850,y=-235,z=525),name='door_liner_usable_depth_allowance',color=cq.Color(.93,.94,.94))
assembly.add(box(450,180,220,y=60,z=210),name='machine_compartment_intrusion',color=cq.Color(.6,.65,.68))
assembly.add(cq.Workplane('XY').cylinder(150,85).translate((0,60,190)),name='compressor_schematic',color=cq.Color(.12,.15,.18))
assembly.add(box(420,12,540,y=143,z=650),name='evaporator_panel',color=cq.Color(.45,.65,.75))
assembly.add(box(450,15,780,y=270,z=550),name='condenser_envelope',color=cq.Color(.1,.12,.13))
for i,z in enumerate([350,550,750]):
    assembly.add(box(425,340,5,y=-30,z=z),name=f'shelf_{i+1}',color=cq.Color(.6,.8,.85,.4))
assembly.add(box(95,60,1.6,x=150,y=70,z=330),name='main_pcb_envelope',color=cq.Color(.05,.4,.2))
assembly.export(str(OUT/'one-door-120l.step'))
cq.exporters.export(assembly.toCompound(),str(OUT/'one-door-120l.stl'),tolerance=1,angularTolerance=.2)
pinmap=[
 dict(id='J1',purpose='virtual power input',pins=['5V','GND']),
 dict(id='J2',purpose='cabinet NTC divider',pins=['ADC_CABINET','GND']),
 dict(id='J3',purpose='evaporator NTC divider',pins=['ADC_EVAP','GND']),
 dict(id='J4',purpose='door switch',pins=['DOOR_GPIO_PULLUP','GND']),
 dict(id='J5',purpose='virtual inverter logic interface',pins=['3V3_LOGIC_REF','GND','UART_TX','UART_RX','ENABLE']),
 dict(id='J6',purpose='virtual EEPROM I2C',pins=['3V3','GND','SCL','SDA'])]
metadata=dict(name='1도어 120L 개념 설계',revision='simulation-concept-1',units='mm',
 dimensions=dict(width=550,depth=580,height=1000,wallMinimum=50,doorThickness=60),
 usableVolume=dict(cavityL=137.7,compartmentIntrusionL=17.82,shelvesDisplacementL=2.1675,
 beforeShelvesL=119.88,afterShelvesL=117.7125,note='Nominal 120 L concept; geometric air-space estimate, not standardized storage-volume certification. Evaporator and smaller fittings reduce it further.'),
 coordinateSystem='X width, Y rear positive, Z upward; floor Z=0. Cabinet front Y=-260, exterior door front Y=-320, cabinet rear Y=260; condenser envelope protrudes to Y=277.5.',
 pcb=dict(width=95,height=60,thickness=1.6,voltage='3.3V logic, 5V virtual supply',status='functional connector reference, not production-ready'),
 pinmap=pinmap,virtualMCU='Behavioral control state machine; not instruction-set or pin-electrical emulation',
 coolingNominal=dict(next(r for r in rows if r['evaporatingC']==-15 and r['condensingC']==40)),
 validation=dict(gridPoints=len(rows),cycleEnergyBalanceToleranceW=1e-8,cadSolidCount=len(assembly.toCompound().Solids())))
(OUT/'design-metadata.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(metadata,ensure_ascii=False,indent=2))
