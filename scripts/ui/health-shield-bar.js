importPackage(Packages.arc.util.pooling);

const settings = require("extended-ui/settings");
const iterationTools = require("extended-ui/utils/iteration-tools");
const barBuilder = require("extended-ui/utils/bar-builder");
const renderUtils = require("extended-ui/utils/render");

const unitBarSize = settings.unitBarSize;

const unitBarDisplayTime = settings.unitBarDisplayTime;
const unitBarFadeTime = settings.unitBarFadeTime;
const unitBarTotalDisplayTime = unitBarDisplayTime + unitBarFadeTime;

const damaged = new Map();

const force = false;

Events.on(WorldLoadEvent, (event) => {
    damaged.clear();
})

Events.run(Trigger.draw, () => {
    Groups.unit.each((unit) => {
        if (drawUnitHealthBar(unit, force)) {
            drawUnitShieldBar(unit, true, force);
        } else {
            drawUnitShieldBar(unit, false, force);
        }
    });
});

function drawUnitShieldBar(unit, offset, force) {
    if (!settings.showUnitShield) return;

    let prevStatus = damaged.get(unit.id);

    let maxShield = 0;
    if (prevStatus && prevStatus.maxShield) {
        maxShield = prevStatus.maxShield
    } else {
        const shieldFinder = (ability) => {
            if (ability.max > maxShield) {
                maxShield = ability.max;
            }
        }
    
        iterationTools.iterateSeq(shieldFinder, unit.abilities.iterator());
        if (!maxShield) {
            maxShield = 40;
        }
    }

    let value = unit.shield / maxShield;

    if (!prevStatus) {
        damaged.set(unit.id, {shield: value, maxShield: Math.max(unit.shield, maxShield), time: Date.now()});
    } else if (prevStatus.shield != value) {
        prevStatus.shield = value;
        prevStatus.time = Date.now();
        prevStatus.time = Date.now();
    } 
    if (!prevStatus.maxShield) {
        prevStatus.maxShield = Math.max(unit.shield, maxShield);
    }

    const unitX = unit.x;
    const unitY = offset ? unit.y + unitBarSize - 1 : unit.y;

    if (!isBarNecessary(unitX, unitY, value, prevStatus, force)) return;
    const alpha = getBarAlpha(prevStatus, force);

    // let text = barBuilder.buildPercentLabel(value); not sure about it.
    Draw.draw(Layer.overlayUI+0.01, run(()=>{
        barBuilder.draw(
            unitX, unitY+2, value, unit.hitSize/6, unitBarSize, "", Pal.accent, alpha
        )
    }));
}

function drawUnitHealthBar(unit, force) {
    if (!settings.showUnitHealth) return;

    let value = unit.health / unit.maxHealth;
    let prevStatus = damaged.get(unit.id);

    if (!prevStatus) {
        damaged.set(unit.id, {health: value, time: Date.now()});
    } else if (prevStatus.health != value) {
        prevStatus.health = value;
        prevStatus.time = Date.now();
    }

    const unitX = unit.x;
    const unitY = unit.y;

    if (!isBarNecessary(unitX, unitY, value, prevStatus, force)) return;
    const alpha = getBarAlpha(prevStatus, force);

    // let text = barBuilder.buildPercentLabel(value); not sure about it.
    Draw.draw(Layer.overlayUI+0.01, run(()=>{
        barBuilder.draw(
            unitX, unitY+2, value, unit.hitSize/6, unitBarSize, "", Color.scarlet, alpha
        )
    }));

    return true;
}

function isBarNecessary(x, y, value, prevStatus, force) {
    if (!renderUtils.inCamera(Core.camera, x, y)) return false;
    if (value <= 0) return false;
    if (force) return true;
    if (value >= 1) return false;
    if (!prevStatus) return true;

    if (Date.now() - prevStatus.time < unitBarTotalDisplayTime ) {
        return true;
    } else {
        return false;
    }
}

function getBarAlpha(prevStatus, force) {
    if (!prevStatus || force) return 1;

    return 1 - (Date.now() - prevStatus.time - unitBarDisplayTime)/unitBarFadeTime;
}
