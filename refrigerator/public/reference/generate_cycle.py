"""R290 steady-state PH paths; not True component performance data."""
from pathlib import Path
import json
import CoolProp
from CoolProp.CoolProp import PropsSI as P
F='R290'
def seq(a,b,n): return [a+(b-a)*i/(n-1) for i in range(n)]
def state(p,h,ident,stage,fraction=None):
    t=P('T','P',p,'H',h,F)-273.15
    q=P('Q','P',p,'H',h,F)
    hf=P('H','P',p,'Q',0,F); hg=P('H','P',p,'Q',1,F)
    if hf-1e-5<=h<=hg+1e-5:
        phase='two-phase'; q=max(0.,min(1.,(h-hf)/(hg-hf)))
    else:
        phase='subcooled' if h<hf else 'superheated'; q=None
    out=dict(id=ident,stage=stage,temperatureC=t,pressurePa=p,enthalpyJkg=h,quality=q,phase=phase)
    if fraction is not None: out['fraction']=fraction
    return out
def stage(ident,label,process,ps,hs):
    assert len(ps)==len(hs) and len(ps)>=2
    return dict(id=ident,label=label,process=process,samples=[state(p,h,f'{ident}_{i}',ident,i/(len(ps)-1)) for i,(p,h) in enumerate(zip(ps,hs))])
def iso(ident,label,process,p,a,b,n): return stage(ident,label,process,[p]*n,seq(a,b,n))
rows=[]
for te in range(-20,1,5):
    for tc in range(30,66,5):
        pe=P('P','T',te+273.15,'Q',1,F); pc=P('P','T',tc+273.15,'Q',0,F)
        h1=P('H','T',te+278.15,'P',pe,F); s1=P('S','T',te+278.15,'P',pe,F)
        h2=h1+(P('H','P',pc,'S',s1,F)-h1)/.6
        h3=P('H','T',tc+270.15,'P',pc,F); h4=h3
        hed=P('H','P',pe,'Q',1,F); heo=P('H','T',te+275.15,'P',pe,F)
        hcd=P('H','P',pc,'Q',1,F); hcb=P('H','P',pc,'Q',0,F)
        cp=seq(pe,pc,12); ch=[h1+(P('H','P',p,'S',s1,F)-h1)/.6 for p in cp]
        # Preserve defined endpoints despite small PS/TP flash round-trip error.
        ch[0]=h1; ch[-1]=h2
        circuit=[
            stage('compressor','압축기','Specified-efficiency compression path, not cylinder dynamics',cp,ch),
            iso('discharge','토출관','Adiabatic zero-pressure-loss approximation',pc,h2,h2,2),
            iso('condenser_desuperheat','응축기 과열 제거','Isobaric sensible heat rejection',pc,h2,hcd,8),
            iso('condenser_condense','응축기 응축','Isobaric latent heat rejection',pc,hcd,hcb,12),
            iso('condenser_subcool','응축기 과냉','Isobaric cooling to 3 K subcooling',pc,hcb,h3,5),
            iso('filter_drier','액관·필터 드라이어','Isenthalpic zero-pressure-loss approximation',pc,h3,h3,2),
            stage('capillary','모세관','Adiabatic isenthalpic prescribed pressure drop; mass flow not solved',seq(pc,pe,16),[h4]*16),
            iso('evaporator_boil','증발기 비등','Isobaric latent heat absorption',pe,h4,hed,12),
            iso('evaporator_superheat','증발기 출구 과열','Isobaric heat absorption to 2 K superheat',pe,hed,heo,5),
            iso('suction','흡입관','Ambient heat gain adds 3 K superheat; no capillary-suction HX',pe,heo,h1,6),
        ]
        ni=[('suction','compressor',pe,h1),('discharge','discharge',pc,h2),('condenser_dew','condenser_desuperheat',pc,hcd),('condenser_bubble','condenser_condense',pc,hcb),('liquid','condenser_subcool',pc,h3),('filter_out','filter_drier',pc,h3),('capillary_out','capillary',pe,h4),('evaporator_dew','evaporator_boil',pe,hed),('evaporator_out','evaporator_superheat',pe,heo)]
        nodes=[state(p,h,i,s) for i,s,p,h in ni]
        qe=heo-h4; qs=h1-heo; ws=h2-h1; we=ws/.85; qc=h2-h3
        assert abs(qc-qe-qs-ws)<1e-7
        rows.append(dict(te=te,tc=tc,pLowPa=pe,pHighPa=pc,h1=h1,h2=h2,h3=h3,h4=h4,qEvapJkg=qe,workElectricJkg=we,cop=qe/we,hEvapOut=heo,suctionHeatJkg=qs,shaftWorkJkg=ws,qCondenserJkg=qc,motorLossJkg=we-ws,nodes=nodes,circuit=circuit))
out=dict(refrigerant=F,library='CoolProp '+CoolProp.__version__,evaporatingC=list(range(-20,1,5)),condensingC=list(range(30,66,5)),points=rows,assumptions=dict(
    superheatK=5,evaporatorSuperheatK=2,suctionLineSuperheatK=3,subcoolingK=3,isentropicEfficiency=.6,motorEfficiency=.85,
    operatingPoint='Specified steady-state pressure levels and superheat, not measured True T-19-HC performance.',
    capillaryMassFlowSolved=False,
    capillaryPressureProfile='16 uniformly spaced prescribed pressure samples. Fraction is process progress, not physical pipe distance or residence time.',
    circuitSampleFractions='Within-stage interpolation coordinates are process progress, not geometric length or transient travel time.',
    qualityDefinition='Vapor mass fraction in equilibrium two-phase PH flash, not vapor volume fraction; null outside saturation.',
    capillarySuctionHeatExchangerIncluded=False,
    capillarySuctionHeatExchangerNote='Actual product arrangement unconfirmed. A coupled heat-transfer model is required for future support.',
    suctionHeatSource='Ambient heat gain, separate from useful cabinet evaporator cooling.',
    pressureLosses='Neglected outside prescribed capillary pressure drop.',
    condenserEnergyBalance='qCondenser=qEvap+suctionHeat+shaftWork; motor loss separate from refrigerant heat.',
    transientTwoPhaseFlowSolved=False),source='https://coolprop.org/fluid_properties/fluids/n-Propane.html')
Path(__file__).with_name('cycle-table.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Generated {len(rows)} R290 operating points with PH-flash samples.')
