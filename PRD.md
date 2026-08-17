# Product Requirements Document (PRD)

## Geotab Fleet Status Dashboard Add-in

**Product:** GoFleet / ZenduIT Geotab Add-in
**Add-in:** Fleet Status Dashboard
**Version:** 1.0
**Status:** Development
**Technology:** JavaScript, HTML, CSS
**Platform:** Geotab
**Primary API:** Geotab API

---

# 1. Product Overview

The Fleet Status Dashboard is a standalone Geotab add-in that provides users with a fleet-wide view of vehicle communication status.

Unlike the previous vehicle-specific add-ins, this add-in does **not require a vehicle to be selected**. When the user opens the dashboard, the add-in retrieves all vehicles in the fleet, sorts them by their most recent communication time, and displays them in a table.

The dashboard will show:

* Vehicle name
* Driver
* Time since last communication
* Current calculated status

Each vehicle will receive one of three status classifications:

* **Online** — last communication was less than 5 minutes ago.
* **Idle** — last communication was between 5 and 60 minutes ago.
* **Offline** — last communication was 60 minutes or more ago.

The source specification defines the fundamental product concept as:

> **No vehicle context → Fetch everything → Build a table.**

---

# 2. Problem Statement

Fleet managers need a quick way to understand the current communication status of their entire fleet.

A vehicle-specific view only answers:

> "What is happening with this vehicle?"

The Fleet Status Dashboard answers:

> "What is happening across my entire fleet?"

The user should not need to select individual vehicles or navigate through multiple screens to identify vehicles that are currently online, idle, or offline.

---

# 3. Product Goal

Create a simple fleet management dashboard that allows a Geotab user to open one page and immediately see the communication status of every vehicle in the fleet.

The dashboard should prioritize:

1. Fleet-wide visibility.
2. Simple status interpretation.
3. Most-recent vehicles first.
4. Clear visual status indicators.
5. Minimal user interaction.

---

# 4. Goals

## Primary Goals

The add-in must:

* Operate as a standalone Geotab page.
* Work without vehicle context.
* Retrieve all vehicles/devices available to the user.
* Sort vehicles by their most recent communication.
* Display one row per vehicle.
* Display the assigned driver or `Unassigned`.
* Display time since last communication.
* Calculate a status for every vehicle.
* Display status using visual badges.
* Handle an empty fleet.
* Load without requiring the user to select a vehicle.

The source specifically contrasts this with Add-ins 1 and 2, which were triggered by clicking a vehicle and fetched data for only one vehicle. Add-in 3 instead fetches all vehicles and renders a table.

---

# 5. Non-Goals

Version 1.0 will not include:

* Vehicle editing.
* Driver editing.
* Vehicle assignment.
* Driver assignment.
* Vehicle creation/deletion.
* Fleet filtering.
* Fleet search.
* Pagination.
* Charts.
* Maps.
* Historical reporting.
* Notifications.
* Alerts.
* Export functionality.
* Vehicle detail pages.
* Real-time WebSocket streaming.
* Automatic periodic refresh unless specifically required later.
* Advanced fleet analytics.

The objective of Version 1.0 is to establish the basic fleet-wide dashboard pattern.

---

# 6. Target Users

## Primary Users

* Fleet managers
* Fleet administrators
* Dispatchers
* Operations teams
* Customer support teams
* Service delivery teams

## User Context

The user opens the Fleet Status Dashboard from within Geotab.

No vehicle selection is required.

The page loads the fleet and displays the status table.

---

# 7. User Stories

## US-01 — View Entire Fleet

**As a fleet manager,**

I want to open a single dashboard and see every vehicle in my fleet,

**so that**

I can understand fleet status without selecting vehicles individually.

---

## US-02 — Identify Recent Communication

**As a fleet manager,**

I want vehicles sorted by their latest communication time,

**so that**

the most recently communicating vehicles appear first.

---

## US-03 — Identify Offline Vehicles

**As a fleet manager,**

I want each vehicle to have a clear Online, Idle, or Offline status,

**so that**

I can quickly identify vehicles that may require attention.

---

## US-04 — Identify Driver

**As a fleet manager,**

I want to see the driver associated with each vehicle,

**so that**

I can understand who is currently associated with the vehicle.

---

## US-05 — Understand Last Communication

**As a fleet manager,**

I want to see how long ago each vehicle communicated,

**so that**

I can understand the freshness of the vehicle's connection.

---

# 8. Functional Requirements

## FR-01 — Standalone Page

The add-in must operate without requiring vehicle context.

### Requirements

* The page must load directly from the Geotab add-in menu/location.
* It must not depend on `state.device.id`.
* It must not require the user to select a vehicle.
* It must retrieve the fleet independently.

The source explicitly requires a standalone page with no vehicle context.

---

# 9. Fleet Data Retrieval

## FR-02 — Fetch All Vehicles

The add-in must retrieve all applicable fleet devices using the Geotab API.

The source implementation demonstrates:

```javascript
api.call("Get", {
  typeName: "Device",
  search: {}
}, function (devices) {
  ...
});
```

An empty search object means the API should return the available devices rather than filtering to one vehicle.

### Acceptance Criteria

* API request executes when the dashboard loads.
* Request uses `Device`.
* Request does not depend on a selected vehicle.
* All returned vehicles are processed.
* API errors do not result in an unexplained blank page.

---

# 10. Fleet Table

## FR-03 — Display One Row Per Vehicle

For every returned vehicle, the application must create one table row.

The source specification describes the table as a loop through the returned device array, creating one row for every device.

### Required Columns

| Column             | Description                   |
| ------------------ | ----------------------------- |
| Vehicle            | Vehicle/device name           |
| Driver             | Assigned driver               |
| Last Communication | Time since last communication |
| Status             | Calculated vehicle status     |

---

# 11. Vehicle Name

## FR-04 — Display Vehicle Name

The first column must display the vehicle/device name.

Conceptually:

```javascript
device.name
```

### Acceptance Criteria

* Every vehicle row displays its name.
* A missing name should not cause the table to fail.

---

# 12. Driver

## FR-05 — Display Driver

The dashboard must display the driver's name associated with each vehicle.

If no driver is available, the interface must display:

**Unassigned**

The source implementation explicitly uses the fallback:

```javascript
device.driverName || "Unassigned"
```

### Acceptance Criteria

* Assigned driver → display driver name.
* No assigned driver → display `Unassigned`.
* Missing driver data must not break the table.

---

# 13. Last Communication

## FR-06 — Display Time Since Last Communication

The dashboard must display a human-readable representation of how long ago the vehicle last communicated.

The source implementation references:

```javascript
timeSince(device.lastCommunicationDate)
```

### Examples

The exact formatting can be finalized during implementation, but acceptable patterns include:

* `1 minute ago`
* `12 minutes ago`
* `45 minutes ago`
* `2 hours ago`
* `1 day ago`

The dashboard should prioritize readability over displaying the raw timestamp.

---

# 14. Fleet Sorting

## FR-07 — Sort by Last Communication

The vehicle array must be sorted by `lastCommunicationDate`.

The most recently communicating vehicle must appear first.

The source implementation sorts using:

```javascript
devices.sort((a, b) =>
  new Date(b.lastCommunicationDate) -
  new Date(a.lastCommunicationDate)
);
```

### Acceptance Criteria

* Sorting occurs before rendering.
* Newest communication appears at the top.
* Oldest communication appears lower in the table.
* The table renders the already-sorted array.

---

# 15. Status Calculation

## FR-08 — Calculate Vehicle Status

Status must be **derived from the vehicle's last communication time**.

Status must not be treated as a stored value.

The source explicitly describes status as derived data calculated from `lastCommunicationDate`.

---

# 16. Status Rules

The following rules are required.

### Online

If the vehicle communicated less than 5 minutes ago:

**Online**

### Idle

If the vehicle communicated at least 5 minutes ago but less than 60 minutes ago:

**Idle**

### Offline

If the vehicle communicated 60 minutes ago or more:

**Offline**

The source defines these exact thresholds.

### Conceptual Logic

```javascript
const minutesAgo =
  (Date.now() - new Date(device.lastCommunicationDate)) / 60000;

if (minutesAgo < 5) return "Online";
if (minutesAgo < 60) return "Idle";
return "Offline";
```

---

# 17. Status Badge

## FR-09 — Visual Status Indicators

Each row must display a status badge.

The required visual mapping is:

| Status  | Badge  |
| ------- | ------ |
| Online  | Green  |
| Idle    | Yellow |
| Offline | Red    |

The reference implementation specifies green, yellow, and red visual treatments for these states.

### Requirements

* Status text must be visible.
* Color must reinforce the status.
* Badge must be visually distinct from normal table text.
* The badge should remain readable.

---

# 18. Loading State

The dashboard should display a loading state while the fleet data is being retrieved.

Example:

**Loading fleet status…**

### Requirements

* Loading state appears while the API request is pending.
* Loading state disappears after the fleet is loaded.
* Loading state does not remain after an API failure.

---

# 19. Empty Fleet State

## FR-10 — Handle Empty Fleet

The add-in must handle the possibility that no devices are returned.

The exercise explicitly requires handling the empty fleet state.

### Expected Behavior

Instead of displaying an empty table with no explanation, display a clear message such as:

**No vehicles found in this fleet.**

### Acceptance Criteria

* Page does not crash.
* User understands that there are no vehicles to display.
* Empty table is not presented as an unexplained blank screen.

---

# 20. API Error State

If the Geotab API request fails, the dashboard must display a user-friendly error.

Example:

**Unable to load fleet status.**

**Please try again.**

The implementation should also log useful technical information for development/debugging.

The dashboard must never fail silently and leave the user with an unexplained blank page.

---

# 21. Data Flow

The intended data flow is:

```text
User opens Fleet Status Dashboard
            ↓
Standalone Geotab Add-in
            ↓
Geotab API
            ↓
Get Device
            ↓
Fetch all devices
            ↓
Sort by lastCommunicationDate
            ↓
Calculate status for each device
            ↓
Calculate time since last communication
            ↓
Create table rows
            ↓
Render fleet dashboard
```

This represents the core mechanism described in the source: fetch the whole fleet, sort the array, then render the table.

---

# 22. UI Structure

The dashboard should contain:

```text
Fleet Status Dashboard
────────────────────────────────────────────

Fleet Overview

┌──────────────────────────────────────────────┐
│ Vehicle │ Driver │ Last Communication │ Status │
├──────────────────────────────────────────────┤
│ Truck 1 │ John   │ 2 minutes ago       │ Online │
│ Truck 2 │ Sarah  │ 18 minutes ago      │ Idle   │
│ Truck 3 │ Unassigned │ 3 hours ago     │ Offline│
└──────────────────────────────────────────────┘
```

The final visual design should follow the product's existing GoFleet / ZenduIT styling conventions where available, while keeping the first implementation simple.

---

# 23. Responsive Behavior

The dashboard should remain usable within the available Geotab add-in viewport.

### Requirements

* Table should fit within the available page.
* Columns should remain readable.
* Long vehicle names should not destroy the layout.
* Long driver names should not break the table.
* On narrow viewports, horizontal scrolling may be used if required.

---

# 24. Technical Architecture

## Frontend

* HTML
* CSS
* JavaScript

## Platform

* Geotab Add-in framework

## Data Source

* Geotab API

## Backend

None required for Version 1.0.

## Database

None required for Version 1.0.

---

# 25. Suggested Repository Structure

The add-in should follow a simple structure:

```text
fleet-status-dashboard/
│
├── index.html
├── addin.js
├── addin.css
└── config.json
```

### `index.html`

Responsible for:

* Page structure.
* Dashboard heading.
* Table structure.
* Table header.
* Table body.
* Loading state.
* Empty state.
* Error state.

### `addin.js`

Responsible for:

* Geotab initialization/context.
* API call.
* Fleet retrieval.
* Sorting.
* Status calculation.
* Time-since calculation.
* Row generation.
* Error handling.
* UI state changes.

### `addin.css`

Responsible for:

* Dashboard layout.
* Table styling.
* Status badges.
* Loading state.
* Empty state.
* Error state.
* Responsive behavior.

### `config.json`

Responsible for:

* Registering the add-in.
* Defining its Geotab location/configuration.
* Defining the add-in name.

---

# 26. API Requirements

## API Operation

**Operation:** `Get`

## Entity

**typeName:**

`Device`

## Search

Empty search:

```javascript
search: {}
```

This retrieves the fleet devices rather than limiting the request to one vehicle.

---

# 27. Required Data Fields

The implementation requires, at minimum, the following information:

| Data                           | Purpose                        |
| ------------------------------ | ------------------------------ |
| `device.name`                  | Vehicle name                   |
| `device.driverName`            | Driver                         |
| `device.lastCommunicationDate` | Sorting and status calculation |

These fields are directly represented in the source implementation.

---

# 28. Derived Data

Two UI values must be derived from `lastCommunicationDate`.

## Time Since Communication

Used for the **Last Communication** column.

Example:

`18 minutes ago`

## Status

Used for the **Status** badge.

Example:

`Idle`

The same underlying timestamp drives both values.

---

# 29. Business Rules

### BR-01

The dashboard must display all vehicles returned by the Geotab API.

### BR-02

Vehicles must be sorted by latest communication date.

### BR-03

Most recently communicating vehicles appear first.

### BR-04

Driver without a value displays `Unassigned`.

### BR-05

Communication less than 5 minutes ago = Online.

### BR-06

Communication from 5 to less than 60 minutes ago = Idle.

### BR-07

Communication 60 minutes or more ago = Offline.

### BR-08

Status must be calculated dynamically from the communication timestamp.

### BR-09

The dashboard must not require vehicle selection.

### BR-10

The dashboard must handle an empty fleet.

---

# 30. Error Handling

The following conditions must be handled:

| Condition                      | Expected Behavior                |
| ------------------------------ | -------------------------------- |
| API request pending            | Loading state                    |
| API success with vehicles      | Render table                     |
| API success with zero vehicles | Empty fleet state                |
| Missing driver                 | `Unassigned`                     |
| Missing communication date     | Graceful fallback/error handling |
| API failure                    | Error state                      |
| Invalid vehicle data           | Do not crash entire dashboard    |

---

# 31. Performance Requirements

The dashboard should:

* Make the minimum API requests required.
* Retrieve fleet data on page load.
* Sort data in memory before rendering.
* Avoid unnecessary API calls.
* Avoid unnecessary DOM manipulation.
* Render the table efficiently.

For the initial version, no formal performance SLA is specified by the source material.

---

# 32. Security Requirements

The add-in must:

* Use Geotab's authenticated API context.
* Never hard-code credentials.
* Never expose authentication credentials in source code.
* Not send fleet information to third-party services.
* Avoid unnecessary logging of sensitive information.

---

# 33. Testing Requirements

## Test Case 1 — Full Fleet

### Given

The fleet contains multiple vehicles.

### When

The user opens the dashboard.

### Then

All vehicles appear in the table.

---

## Test Case 2 — Sorting

### Given

Vehicles have different `lastCommunicationDate` values.

### When

The dashboard loads.

### Then

The vehicle with the most recent communication appears first.

---

## Test Case 3 — Online Vehicle

### Given

A vehicle communicated less than 5 minutes ago.

### When

The dashboard calculates status.

### Then

The vehicle displays:

**Online**

with a green badge.

---

## Test Case 4 — Idle Vehicle

### Given

A vehicle communicated 5–59 minutes ago.

### When

The dashboard calculates status.

### Then

The vehicle displays:

**Idle**

with a yellow badge.

---

## Test Case 5 — Offline Vehicle

### Given

A vehicle communicated 60+ minutes ago.

### When

The dashboard calculates status.

### Then

The vehicle displays:

**Offline**

with a red badge.

---

## Test Case 6 — Unassigned Vehicle

### Given

A vehicle has no driver.

### When

The dashboard renders the row.

### Then

The driver column displays:

**Unassigned**

---

## Test Case 7 — Empty Fleet

### Given

The API returns zero devices.

### When

The dashboard loads.

### Then

The empty fleet message is displayed.

---

## Test Case 8 — API Failure

### Given

The Geotab API request fails.

### When

The failure callback executes.

### Then

A user-friendly error message is displayed.

---

## Test Case 9 — No Vehicle Selected

### Given

The user has not selected a vehicle.

### When

The user opens the Fleet Status Dashboard.

### Then

The dashboard still loads and displays the full fleet.

---

# 34. Acceptance Criteria

The add-in is functionally acceptable when:

### Fleet Retrieval

* [ ] Dashboard works without vehicle context.
* [ ] All fleet devices are retrieved.
* [ ] No vehicle selection is required.

### Table

* [ ] One row is created per vehicle.
* [ ] Vehicle name is displayed.
* [ ] Driver is displayed.
* [ ] Last communication is displayed.
* [ ] Status is displayed.

### Sorting

* [ ] Vehicles are sorted by `lastCommunicationDate`.
* [ ] Most recent communication appears first.

### Status

* [ ] `< 5 minutes` = Online.
* [ ] `5–59 minutes` = Idle.
* [ ] `≥ 60 minutes` = Offline.
* [ ] Online uses green badge.
* [ ] Idle uses yellow badge.
* [ ] Offline uses red badge.

### Driver

* [ ] Assigned driver is displayed.
* [ ] Missing driver displays `Unassigned`.

### Empty/Error States

* [ ] Loading state is implemented.
* [ ] Empty fleet state is implemented.
* [ ] API error state is implemented.
* [ ] No scenario results in an unexplained blank screen.

---

# 35. Development Milestones

## Milestone 1 — Standalone Add-in

* Create Geotab standalone page.
* Configure add-in.
* Verify page opens without vehicle context.

## Milestone 2 — HTML Table

* Build table structure.
* Add column headers.
* Add empty table body.

The source exercise specifically recommends building the HTML table structure before connecting data.

## Milestone 3 — API Integration

* Implement `Device` API call.
* Retrieve all devices.
* Handle API response.

## Milestone 4 — Sorting

* Sort devices by `lastCommunicationDate`.
* Verify newest vehicle appears first.

## Milestone 5 — Row Rendering

* Loop through devices.
* Create one row per device.
* Display vehicle name.
* Display driver.
* Display last communication.

## Milestone 6 — Status Logic

* Calculate minutes since communication.
* Implement Online.
* Implement Idle.
* Implement Offline.

## Milestone 7 — Visual Design

* Implement status badges.
* Style table.
* Implement loading state.
* Implement empty state.
* Implement error state.

## Milestone 8 — Testing

* Test multiple vehicles.
* Test sorting.
* Test all three statuses.
* Test unassigned drivers.
* Test empty fleet.
* Test API failure.

## Milestone 9 — Deployment

* Push to GitHub.
* Deploy through Vercel.
* Register/update Geotab add-in.
* Test in Geotab.

The source exercise explicitly follows the sequence of testing, pushing, and deploying after implementation.

---

# 36. Definition of Done

The Fleet Status Dashboard is considered complete when:

1. The dashboard opens as a standalone Geotab page.
2. No vehicle selection is required.
3. Every vehicle in the fleet is displayed.
4. Vehicles are sorted by last communication.
5. Most recently communicating vehicles appear at the top.
6. Every row displays the vehicle name.
7. Every row displays the driver or `Unassigned`.
8. Every row displays time since last communication.
9. Every row displays a status badge.
10. Status is correctly calculated using the defined thresholds.
11. Online vehicles have green badges.
12. Idle vehicles have yellow badges.
13. Offline vehicles have red badges.
14. Empty fleet is handled.
15. API failure is handled.
16. The dashboard does not crash or display an unexplained blank screen.

---

# 37. Product Success Criteria

The source defines the primary completion bar as:

> The dashboard loads and shows every vehicle in the fleet, sorted by last ping, with the most recent at the top, and each row has the correct green/yellow/red status badge.

It must also be possible to open the page in Geotab and see the full fleet without selecting a vehicle.

Therefore, the primary success metric for Version 1.0 is:

**100% of returned fleet vehicles are rendered with correctly calculated status and correct sort order.**

---

# 38. Future Enhancements

The following should be considered for future versions, not Version 1.0:

### Fleet Filtering

* Show Online only.
* Show Idle only.
* Show Offline only.
* Filter by group.

### Search

* Search by vehicle name.
* Search by driver.

### Sorting

* Sort by vehicle name.
* Sort by driver.
* Sort by status.
* Sort by last communication.

### Dashboard Summary

Potential future summary cards:

```text
TOTAL VEHICLES     ONLINE     IDLE     OFFLINE
     125              92       18        15
```

### Refresh

* Manual refresh button.
* Automatic refresh interval.

### Vehicle Interaction

* Click a vehicle to open vehicle details.
* Navigate to the selected vehicle in Geotab.

### Fleet Analytics

* Communication trends.
* Offline duration.
* Historical availability.
* Fleet health metrics.

These enhancements should be evaluated only after the core fleet-wide table is stable.

---

# 39. Product Principle

The guiding principle for this add-in is:

> **No vehicle context. Fetch everything. Sort it. Render it.**

The conceptual progression is:

```text
Add-in 1
Vehicle → One API call → One card

Add-in 2
Vehicle → Vehicle-specific data → One card

Add-in 3
No vehicle → Entire fleet → Sorted table
```

The uploaded specification describes this as the first transition from vehicle-specific add-ins to a broader fleet-management tool.

The implementation should therefore prioritize **understanding fleet-wide data retrieval, array sorting, derived status logic, and table rendering** over adding additional functionality.

---

# 40. Final Release Checklist

* [ ] Standalone Geotab page created.
* [ ] No vehicle context required.
* [ ] HTML table created.
* [ ] Geotab `Device` API implemented.
* [ ] Entire fleet retrieved.
* [ ] Fleet sorted by `lastCommunicationDate`.
* [ ] Most recent vehicle appears first.
* [ ] Vehicle name displayed.
* [ ] Driver displayed.
* [ ] `Unassigned` fallback implemented.
* [ ] Last communication displayed.
* [ ] Online logic implemented.
* [ ] Idle logic implemented.
* [ ] Offline logic implemented.
* [ ] Green Online badge implemented.
* [ ] Yellow Idle badge implemented.
* [ ] Red Offline badge implemented.
* [ ] Loading state implemented.
* [ ] Empty fleet state implemented.
* [ ] API error state implemented.
* [ ] GitHub deployment completed.
* [ ] Vercel deployment completed.
* [ ] Geotab deployment completed.
* [ ] Full fleet verified in Geotab.
* [ ] Sorting verified.
* [ ] All three status states verified.
* [ ] No-vehicle-selection requirement verified.

## Final Release Standard

**The dashboard loads in Geotab, requires no vehicle selection, displays every vehicle in the fleet, sorts vehicles by most recent communication, and shows the correct Online/Idle/Offline status badge for every row.**
