// code written by Rupneet (ID: 261096653)

import { useMemo } from 'react'
import CalendarBlock from './CalendarBlock'
import '../styles/WeeklyCalendar.css'

function buildSkipRowIndexByDay(days, timeRows, slots) {
  const skip = {}
  days.forEach((d) => {
    skip[d] = new Set()
  })
  for (const slot of slots) {
    const span = slot.rowSpan || 1
    const startIdx = timeRows.indexOf(slot.time)
    if (startIdx === -1) continue
    for (let k = 1; k < span; k++) {
      const idx = startIdx + k
      if (idx < timeRows.length) skip[slot.day].add(idx)
    }
  }
  return skip
}

export default function WeeklyCalendar({ days, timeRows, slots, selectedSlotId, onSelectSlot, onSelectEmptyCell }) {
  const skipRows = useMemo(() => buildSkipRowIndexByDay(days, timeRows, slots), [days, timeRows, slots])

  function findSlot(day, time) {
    return slots.find((s) => s.day === day && s.time === time)
  }

  return (
    <section className="weekly-calendar">
      <div className="weekly-calendar__grid">
        <div className="weekly-calendar__time-head" style={{ gridColumn: 1, gridRow: 1 }}>
          Time
        </div>
        {days.map((day, i) => (
          <div
            key={day}
            className={`weekly-calendar__day-head${i === days.length - 1 ? ' weekly-calendar__day-head--last' : ''}`}
            style={{ gridColumn: i + 2, gridRow: 1 }}
          >
            {day}
          </div>
        ))}

        {timeRows.map((time, rowIdx) => (
          <div key={`label-${time}`} className="weekly-calendar__time-label" style={{ gridColumn: 1, gridRow: rowIdx + 2 }}>
            {time}
          </div>
        ))}

        {timeRows.flatMap((time, rowIdx) =>
          days.map((day, dayIdx) => {
            if (skipRows[day].has(rowIdx)) return null

            const slot = findSlot(day, time)
            const span = slot?.rowSpan || 1
            const isSelected = slot && selectedSlotId === slot.id

            const isLastDay = dayIdx === days.length - 1

            return (
              <div
                key={`${day}-${time}`}
                className={`weekly-calendar__cell${isSelected ? ' weekly-calendar__cell--selected' : ''}${span > 1 ? ' weekly-calendar__cell--span' : ''}${isLastDay ? ' weekly-calendar__cell--last-col' : ''}`}
                style={{
                  gridColumn: dayIdx + 2,
                  gridRowStart: rowIdx + 2,
                  gridRowEnd: `span ${span}`,
                }}
              >
                {slot ? (
                  <CalendarBlock slot={slot} onSelect={onSelectSlot} />
                ) : (
                  <button
                    type="button"
                    className="weekly-calendar__empty-button"
                    onClick={() => onSelectEmptyCell({ day, time })}
                    aria-label={`Create slot on ${day} at ${time}`}
                  >
                    +
                  </button>
                )}
              </div>
            )
          }),
        )}
      </div>
    </section>
  )
}
