import {
  availabilityKey,
  type Availability,
  type Settings,
} from "../domain/types";
export function AvailabilityGrid({
  settings,
  value,
  onChange,
}: {
  settings: Settings;
  value: Availability;
  onChange: (v: Availability) => void;
}) {
  const slots = settings.slots.filter((s) => !s.isBreak);
  return (
    <div className="availability">
      <div className="radio-options">
        <label>
          <input
            type="radio"
            name="availability"
            checked={value === null}
            onChange={() => onChange(null)}
          />{" "}
          Available for all teaching days and slots
        </label>
        <label>
          <input
            type="radio"
            name="availability"
            checked={value !== null}
            onChange={() =>
              onChange(
                settings.days.flatMap((d) =>
                  slots.map((s) => availabilityKey(d, s.id)),
                ),
              )
            }
          />{" "}
          Custom availability
        </label>
      </div>
      {value !== null && (
        <>
          <p className="muted small">
            Select available slots. Unselected slots are unavailable.
          </p>
          <div
            className="availability-grid"
            style={{
              gridTemplateColumns: `64px repeat(${slots.length},minmax(75px,1fr))`,
            }}
          >
            <span />
            {slots.map((s) => (
              <span key={s.id} className="small">
                {s.start}
                <br />
                {s.end}
              </span>
            ))}
            {settings.days.map((d) => (
              <div className="grid-contents" key={d}>
                <strong>{d}</strong>
                {slots.map((s) => {
                  const key = availabilityKey(d, s.id),
                    selected = value.includes(key);
                  return (
                    <button
                      type="button"
                      key={s.id}
                      aria-label={`${d} ${s.start} ${s.end}`}
                      aria-pressed={selected}
                      className={selected ? "available" : ""}
                      onClick={() =>
                        onChange(
                          selected
                            ? value.filter((v) => v !== key)
                            : [...value, key],
                        )
                      }
                    >
                      {selected ? "✓" : "—"}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
