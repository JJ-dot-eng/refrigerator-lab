from pathlib import Path
import pcbnew as p
OUT=Path(__file__).parent
libdir=OUT/'ReferenceHeaders.pretty'
libdir.mkdir(exist_ok=True)
(OUT/'fp-lib-table').write_text('(fp_lib_table (lib (name "ReferenceHeaders") (type "KiCad") (uri "${KIPRJMOD}/ReferenceHeaders.pretty") (options "") (descr "Generated through-hole reference headers")))',encoding='utf-8')
b=p.BOARD()
def pt(x,y): return p.VECTOR2I(p.FromMM(x),p.FromMM(y))
def segment(x1,y1,x2,y2,layer,net=None):
 if net is None:
  s=p.PCB_SHAPE();s.SetShape(p.SHAPE_T_SEGMENT);s.SetWidth(p.FromMM(.05))
 else:
  s=p.PCB_TRACK(b);s.SetWidth(p.FromMM(.3));s.SetNetCode(net.GetNetCode())
 s.SetStart(pt(x1,y1));s.SetEnd(pt(x2,y2));s.SetLayer(layer);b.Add(s)
for a,c in [((0,0),(95,0)),((95,0),(95,60)),((95,60),(0,60)),((0,60),(0,0))]:segment(*a,*c,p.Edge_Cuts)
pins=[('J1',['5V','GND']),('J2',['ADC_CABINET','GND']),('J3',['ADC_EVAP','GND']),('J4',['DOOR_GPIO_PULLUP','GND']),('J5',['3V3','GND','UART_TX','UART_RX','ENABLE']),('J6',['3V3','GND','SCL','SDA'])]
names=[n for _,ns in pins for n in ns]
nets={}
for n in set(names):
 net=p.NETINFO_ITEM(b,n);b.Add(net);nets[n]=net
def header(ref,value,x,y,signals):
 f=p.FOOTPRINT(b);f.SetReference(ref);f.SetValue(value);f.SetPosition(pt(x,y));f.SetFPID(p.LIB_ID('ReferenceHeaders',ref))
 f.Reference().SetPosition(pt(x-4,y));f.Reference().SetTextSize(pt(1,1));f.Reference().SetLayer(p.F_SilkS)
 f.Value().SetVisible(False)
 for i,n in enumerate(signals):
  pad=p.PAD(f);pad.SetNumber(str(i+1));pad.SetAttribute(p.PAD_ATTRIB_PTH);pad.SetShape(p.PAD_SHAPE_CIRCLE)
  pad.SetSize(pt(1.7,1.7));pad.SetDrillSize(pt(1,1));pad.SetLayerSet(p.PAD.PTHMask());pad.SetPosition(pt(x,y+i*2.54));pad.SetNet(nets[n]);f.Add(pad)
 b.Add(f)
 p.PCB_IO_MGR.FindPlugin(p.PCB_IO_MGR.KICAD_SEXP).FootprintSave(str(libdir.resolve()),f)
header('J0','VIRTUAL MCU I/O CARRIER',20,8,names)
i=0
for ref,ns in pins:
 header(ref,'SIMULATION INTERFACE',75,8+i*2.54,ns)
 for n in ns:
  y=8+i*2.54
  segment(20,y,75,y,p.F_Cu,nets[n])
  if n in ['GND','3V3']:
   x=40 if n=='GND' else 50
   via=p.PCB_VIA(b);via.SetPosition(pt(x,y));via.SetWidth(p.FromMM(.7));via.SetDrill(p.FromMM(.35));via.SetViaType(p.VIATYPE_THROUGH);via.SetLayerPair(p.F_Cu,p.B_Cu);via.SetNetCode(nets[n].GetNetCode());b.Add(via)
  i+=1
for n,x in [('GND',40),('3V3',50)]:
 ys=[8+i*2.54 for i,a in enumerate(names) if a==n]
 segment(x,min(ys),x,max(ys),p.B_Cu,nets[n])
t=p.PCB_TEXT(b);t.SetText('VIRTUAL I/O CARRIER / 3.3V LOGIC');t.SetPosition(pt(47.5,54));t.SetTextSize(pt(1,1));t.SetLayer(p.F_SilkS);b.Add(t)
p.SaveBoard(str(OUT/'virtual-io-carrier.kicad_pcb'),b)
print('Saved real KiCad board: 95 x 60 mm, 7 connectors, 17 I/O positions. Carrier only; no MCU/power/inverter circuitry.')
