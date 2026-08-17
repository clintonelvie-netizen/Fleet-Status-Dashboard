# Fleet-Status-Dashboard

A standalone Geotab add-in showing fleet-wide vehicle communication status. No vehicle
selection required: it fetches the whole fleet, sorts by most recent communication, and
renders a table with Online / Idle / Offline badges.

See [PRD.md](PRD.md) for the full specification.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure, table skeleton, loading/empty/error containers |
| `addin.js` | Geotab lifecycle, API call, normalization, sorting, status, rendering |
| `addin.css` | Layout, table, status badges, state styling, responsive behavior |
| `config.json` | Geotab add-in registration |

No build step, no dependencies, no backend.

## Status thresholds

| Last communication | Status | Badge |
| --- | --- | --- |
| < 5 minutes | Online | Green |
| 5 – 59 minutes | Idle | Yellow |
| ≥ 60 minutes, or never | Offline | Red |

Status is always derived from the communication timestamp — never stored.

## Data sources

The Geotab `Device` object carries the vehicle name but has **no** last-communication or
driver field. Those live on `DeviceStatusInfo` (`dateTime` and `driver`), which references
its device by id only. `addin.js` therefore issues a single `multiCall` for both and joins
them into one normalized shape:

```js
{ name, driverName, lastCommunicationDate }
```

The join is driven by the device list, so a vehicle with no status record still appears
(as `Never` / Offline) rather than silently vanishing from the fleet.

## Local development

Open `index.html` directly in a browser. With no `geotab` global present, the add-in
renders a mock fleet covering every case — Online, Idle, Offline, unassigned driver,
never-communicated, and an overlong vehicle/driver name for the responsive check.

## Deployment

1. Push to GitHub.
2. Deploy through Vercel.
3. Register the add-in in MyGeotab using `config.json`, pointing `url` at the deployed
   `index.html`.
4. Open the page with no vehicle selected and verify the full fleet renders.
