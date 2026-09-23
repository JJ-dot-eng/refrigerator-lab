import assert from 'node:assert/strict';
import fs from 'node:fs';

const table = JSON.parse(fs.readFileSync(new URL('../public/reference/cycle-table.json', import.meta.url), 'utf8'));
const near = (actual, expected, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
assert.equal(table.refrigerant, 'R290');
assert.equal(table.points.length, table.evaporatingC.length * table.condensingC.length);
assert.equal(table.assumptions.capillaryMassFlowSolved, false);
assert.equal(table.assumptions.capillarySuctionHeatExchangerIncluded, false);
for (const point of table.points) {
  const stages = Object.fromEntries(point.circuit.map(stage => [stage.id, stage]));
  const nodes = Object.fromEntries(point.nodes.map(node => [node.id, node]));
  assert.equal(point.circuit.length, 10);
  assert.equal(stages.capillary.samples.length, 16);
  assert.equal(stages.capillary.samples[0].phase, 'subcooled');
  near(point.qEvapJkg, point.hEvapOut - point.h4);
  near(point.suctionHeatJkg, point.h1 - point.hEvapOut);
  near(point.qCondenserJkg, point.qEvapJkg + point.suctionHeatJkg + point.shaftWorkJkg);
  near(point.workElectricJkg, point.shaftWorkJkg + point.motorLossJkg);
  near(point.cop, point.qEvapJkg / point.workElectricJkg);
  assert.ok(point.suctionHeatJkg > 0 && point.qEvapJkg > 0);
  near(nodes.evaporator_out.temperatureC, point.te + 2);
  near(nodes.suction.temperatureC, point.te + 5);
  near(nodes.liquid.temperatureC, point.tc - 3);
  assert.equal(nodes.discharge.phase, 'superheated');
  assert.equal(nodes.liquid.phase, 'subcooled');
  assert.equal(nodes.capillary_out.phase, 'two-phase');
  assert.ok(nodes.capillary_out.quality > 0 && nodes.capillary_out.quality < 1);
  near(nodes.condenser_dew.quality, 1);
  near(nodes.condenser_bubble.quality, 0);
  near(nodes.evaporator_dew.quality, 1);
  near(nodes.capillary_out.temperatureC, point.te);
  for (const [index, stage] of point.circuit.entries()) {
    const first = stage.samples[0];
    const last = stage.samples.at(-1);
    const next = point.circuit[(index + 1) % point.circuit.length].samples[0];
    near(last.pressurePa, next.pressurePa);
    near(last.enthalpyJkg, next.enthalpyJkg);
    near(first.fraction, 0);
    near(last.fraction, 1);
    for (const sample of stage.samples) {
      for (const key of ['temperatureC', 'pressurePa', 'enthalpyJkg', 'fraction']) assert.ok(Number.isFinite(sample[key]));
      if (sample.phase === 'two-phase') assert.ok(sample.quality >= 0 && sample.quality <= 1);
      else assert.equal(sample.quality, null);
    }
  }
  for (const [index, sample] of stages.capillary.samples.entries()) {
    near(sample.enthalpyJkg, point.h4);
    if (index > 0) assert.ok(sample.pressurePa < stages.capillary.samples[index - 1].pressurePa);
    const previous = stages.capillary.samples[index - 1];
    if (previous?.quality != null && sample.quality != null) assert.ok(sample.quality >= previous.quality);
  }
  for (const sample of stages.condenser_condense.samples) near(sample.temperatureC, point.tc);
  for (const sample of stages.evaporator_boil.samples) near(sample.temperatureC, point.te);
}
console.log(`Circuit PH properties, phase transitions, stage continuity and separate suction heat verified at ${table.points.length} operating points.`);
