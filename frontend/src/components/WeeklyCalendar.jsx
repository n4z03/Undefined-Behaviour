// code written by Rupneet (ID: 261096653)

import { useMemo } from 'react'
import CalendarBlock from './CalendarBlock'
import {
  OWNER_CALENDAR_END_MIN,
  OWNER_CALENDAR_START_MIN,
  addMinutes,
  ownerCalendarEndTimeLabel,
} from '../utils/ownerSlotAdapters'
import '../styles/WeeklyCalendar.css'

const ROW_HEIGHT_PX = 64
const PX_PER_MINUTE = ROW_HEIGHT_PX / 30
const MIN_EVENT_HEIGHT_PX = 24

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

function LegacyWeeklyCalendar({ days, timeRows, slots, selectedSlotId, selectedEmptyCell, onSelectSlot, onSelectEmptyCell }) {
  const skipRows = useMemo(() => buildSkipRowIndexByDay(days, timeRows, slots), [days, timeRows, slots])

  function findSlot(day, time) {
    return slots.find((s) => s.day === day && s.time === time)
  }

  return (
    <section className="weekly-calendar">
      <div
        className="weekly-calendar__grid"
        style={{ gridTemplateColumns: `72px repeat(${days.length}, minmax(0, 1fr))` }}
      >
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
            const isSelectedEmpty = !slot && selectedEmptyCell?.day === day && selectedEmptyCell?.time === time

            return (
              <div
                key={`${day}-${time}`}
                className={`weekly-calendar__cell${isSelected ? ' weekly-calendar__cell--selected' : ''}${isSelectedEmpty ? ' weekly-calendar__cell--selected' : ''}${span > 1 ? ' weekly-calendar__cell--span' : ''}${isLastDay ? ' weekly-calendar__cell--last-col' : ''}`}
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

function start24FromRowIndex(rowIdx) {
  const m = OWNER_CALENDAR_START_MIN + rowIdx * 30
  const hh = Math.floor(m / 60)
  const mm = m % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function clampEventToCalendar(startMin, endMin) {
  let s = startMin
  let e = endMin
  if (e <= OWNER_CALENDAR_START_MIN || s >= OWNER_CALENDAR_END_MIN) return null
  if (s < OWNER_CALENDAR_START_MIN) s = OWNER_CALENDAR_START_MIN
  if (e > OWNER_CALENDAR_END_MIN) e = OWNER_CALENDAR_END_MIN
  if (e <= s) return null
  return { s, e }
}

function OwnerWeekCalendar({
  weekColumns,
  timeRows,
  timeEndLabel,
  slots,
  selectedSlotId,
  selectedEmptyCell,
  onSelectSlot,
  onSelectEmptyCell,
}) {
  const slotsByDate = useMemo(() => {
    const map = {}
    for (const col of weekColumns) {
      map[col.dateStr] = []
    }
    for (const slot of slots) {
      const key = slot.fullDate || slot.dateInput
      if (!key || !map[key]) continue
      map[key].push(slot)
    }
    return map
  }, [slots, weekColumns])

  const bodyHeightPx = (OWNER_CALENDAR_END_MIN - OWNER_CALENDAR_START_MIN) * PX_PER_MINUTE

  return (
    <section className="weekly-calendar weekly-calendar--owner-week">
      <div
        className="weekly-calendar__grid weekly-calendar__grid--owner"
        style={{ gridTemplateColumns: `64px repeat(${weekColumns.length}, minmax(0, 1fr))` }}
      >
        <div className="weekly-calendar__time-head" style={{ gridColumn: 1, gridRow: 1 }}>
          Time
        </div>
        {weekColumns.map((col, i) => (
          <div
            key={col.dateStr}
            className={`weekly-calendar__day-head${i === weekColumns.length - 1 ? ' weekly-calendar__day-head--last' : ''}`}
            style={{ gridColumn: i + 2, gridRow: 1 }}
          >
            <span className="weekly-calendar__day-head-line">{col.headerLabel}</span>
          </div>
        ))}

        <div
          className="weekly-calendar__time-rail"
          style={{ gridColumn: 1, gridRow: 2, height: `${bodyHeightPx}px` }}
        >
          {timeRows.map((time) => (
            <div key={time} className="weekly-calendar__time-label weekly-calendar__time-label--owner">
              {time}
            </div>
          ))}
          <div className="weekly-calendar__time-rail-end">{timeEndLabel || ownerCalendarEndTimeLabel()}</div>
        </div>

        {weekColumns.map((col, dayIdx) => (
          <div
            key={col.dateStr}
            className={`weekly-calendar__day-column${dayIdx === weekColumns.length - 1 ? ' weekly-calendar__day-column--last' : ''}`}
            style={{ gridColumn: dayIdx + 2, gridRow: 2 }}
          >
            <div className="weekly-calendar__day-column-inner" style={{ height: `${bodyHeightPx}px` }}>
              <div className="weekly-calendar__day-grid-bg" aria-hidden="true">
                {timeRows.map((time, rowIdx) => {
                  const startTime24 = start24FromRowIndex(rowIdx)
                  const selectedDate = selectedEmptyCell?.slotDate || selectedEmptyCell?.fullDate
                  const selectedStart = selectedEmptyCell?.startTime24
                  const isSelectedEmpty =
                    selectedDate === col.dateStr &&
                    (selectedStart ? selectedStart === startTime24 : selectedEmptyCell?.time === time)
                  return (
                    <button
                      key={`${col.dateStr}-${time}`}
                      type="button"
                      className={`weekly-calendar__empty-button weekly-calendar__empty-button--owner${isSelectedEmpty ? ' weekly-calendar__empty-button--selected' : ''}`}
                      style={{ height: `${ROW_HEIGHT_PX}px` }}
                      onClick={() => {
                        onSelectEmptyCell({
                          slotDate: col.dateStr,
                          fullDate: col.dateStr,
                          day: col.headerLabel,
                          time,
                          startTime24,
                          endTime24: addMinutes(startTime24, 30),
                        })
                      }}
                      aria-label={`Create slot on ${col.headerLabel} at ${time}`}
                    >
                      +
                    </button>
                  )
                })}
              </div>
              <div className="weekly-calendar__day-events">
                {(slotsByDate[col.dateStr] || []).map((slot) => {
                  const rawStart = slot.startMinutes
                  const rawEnd = slot.endMinutes
                  const clipped = clampEventToCalendar(rawStart, rawEnd)
                  if (!clipped) return null
                  const top = (clipped.s - OWNER_CALENDAR_START_MIN) * PX_PER_MINUTE
                  const height = Math.max((clipped.e - clipped.s) * PX_PER_MINUTE, MIN_EVENT_HEIGHT_PX)
                  const isSelected = selectedSlotId === slot.id
                  return (
                    <div
                      key={slot.id}
                      className={`weekly-calendar__event${isSelected ? ' weekly-calendar__event--selected' : ''}`}
                      style={{ top: `${top}px`, height: `${height}px` }}
                    >
                      <CalendarBlock slot={slot} onSelect={onSelectSlot} />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/**
 * Owner dashboard: pass "weekColumns" (Mon–Sun) + "timeRows" from owner helpers.
 * Student / legacy view: pass "days" (weekday names) without "weekColumns".
 */
export default function WeeklyCalendar({
  days,
  timeRows,
  slots,
  selectedSlotId,
  selectedEmptyCell,
  onSelectSlot,
  onSelectEmptyCell,
  weekColumns,
  timeEndLabel,
}) {
  if (weekColumns && weekColumns.length) {
    return (
      <OwnerWeekCalendar
        weekColumns={weekColumns}
        timeRows={timeRows}
        timeEndLabel={timeEndLabel}
        slots={slots}
        selectedSlotId={selectedSlotId}
        selectedEmptyCell={selectedEmptyCell}
        onSelectSlot={onSelectSlot}
        onSelectEmptyCell={onSelectEmptyCell}
      />
    )
  }

  return (
    <LegacyWeeklyCalendar
      days={days}
      timeRows={timeRows}
      slots={slots}
      selectedSlotId={selectedSlotId}
      selectedEmptyCell={selectedEmptyCell}
      onSelectSlot={onSelectSlot}
      onSelectEmptyCell={onSelectEmptyCell}
    />
  )
}
