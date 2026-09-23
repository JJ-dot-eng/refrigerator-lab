import FreeCAD as App
import Part
import json
from pathlib import Path
p=Path(__file__).resolve().parent  # one-door-120l.step sits next to this script
s=Part.Shape()
s.read(str(p/'one-door-120l.step'))
b=s.BoundBox
r=dict(valid=s.isValid(),solidCount=len(s.Solids),boundsMm=dict(x=b.XLength,y=b.YLength,z=b.ZLength))
assert r['valid'] and r['solidCount']==11
assert abs(b.XLength-550)<1e-5 and abs(b.ZLength-1000)<1e-5
(p/'cad-verification.json').write_text(json.dumps(r,indent=2),encoding='utf-8')
print('CAD VERIFIED',r)
