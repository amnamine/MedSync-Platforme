function parseSlot(horaire) {
  const [start, end] = horaire.split("-").map((t) => t.trim());
  const toMinutes = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  return { start: toMinutes(start), end: toMinutes(end) };
}

function slotsOverlap(a, b) {
  return a.start < b.end && b.start < a.end;
}

function hasPlanningConflict(existingRows, date, horaire) {
  const newSlot = parseSlot(horaire);
  return existingRows
    .filter((r) => r.date === date)
    .some((r) => slotsOverlap(parseSlot(r.horaire), newSlot));
}

module.exports = { parseSlot, slotsOverlap, hasPlanningConflict };
