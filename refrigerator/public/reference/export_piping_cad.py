"""FreeCAD: export proposed pipe centerlines and dimensions, not fabrication tubes."""
from pathlib import Path
import json
import FreeCAD as App
import Part
out=Path(__file__).resolve().parent
data=json.loads((out/'piping-layout.json').read_text(encoding='utf-8'))
doc=App.newDocument('ProposedPiping')
objs=[]
for pipe in data['routes']:
    obj=doc.addObject('PartDesign::Feature',pipe['id'])
    obj.Label=pipe['name']
    obj.Shape=Part.makePolygon([App.Vector(*p) for p in pipe['pointsMm']])
    assert obj.Shape.isValid()
    for key,value in [('OuterDiameter',pipe['outerDiameterMm']),('InnerDiameter',pipe['innerDiameterMm']),('RouteLength',pipe['lengthMm'])]:
        obj.addProperty('App::PropertyLength',key);setattr(obj,key,value)
    obj.addProperty('App::PropertyString','FromPort').FromPort=pipe['fromPort']
    obj.addProperty('App::PropertyString','ToPort').ToPort=pipe['toPort']
    objs.append(obj)
doc.recompute()
doc.saveAs(str(out/'proposed-piping.FCStd'))
Part.export(objs,str(out/'proposed-piping-centerlines.step'))
(out/'piping-cad-verification.json').write_text(json.dumps(dict(valid=all(o.Shape.isValid() for o in objs),routes=len(objs),representation='Centerline wires; diameters in FCStd properties and piping-layout.json; not a solid-wall fabrication model'),indent=2),encoding='utf-8')
print('PIPING CAD VERIFIED',len(objs))
