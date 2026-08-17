/**
 * Fleet Status Dashboard — Geotab add-in
 *
 * No vehicle context. Fetch everything. Sort it. Render it.
 *
 * Note on data sources: the Geotab `Device` object carries the vehicle name but
 * has no last-communication or driver information. Those live on
 * `DeviceStatusInfo` (`dateTime` and `driver`), which references its device by
 * id only. So we fetch both and join them into a single normalized shape:
 *
 *   { name, driverName, lastCommunicationDate }
 *
 * Everything downstream — sorting, status, timeSince — reads only that shape.
 */
(function () {
  'use strict';

  var ONLINE_THRESHOLD_MINUTES = 5;
  var IDLE_THRESHOLD_MINUTES = 60;

  var UNKNOWN_DRIVER_ID = 'UnknownDriverId';
  var UNASSIGNED = 'Unassigned';
  var NEVER = 'Never';
  var UNNAMED_VEHICLE = '(unnamed vehicle)';

  // ---------------------------------------------------------------- UI state

  var STATES = ['loading', 'error', 'empty', 'table'];

  /**
   * Shows exactly one state container and hides the rest. Routing every
   * transition through here means the loading state can never survive a
   * failure, and no code path can leave the page blank.
   */
  function setState(name) {
    STATES.forEach(function (state) {
      var el = document.getElementById('state-' + state);
      if (el) {
        el.hidden = state !== name;
      }
    });
  }

  // ------------------------------------------------------------ derived data

  /**
   * Minutes elapsed since a timestamp, or null if the timestamp is missing or
   * unparseable. Callers must handle null — `new Date(undefined)` is NaN and
   * would poison both the sort comparator and the status thresholds.
   */
  function minutesSince(value) {
    if (!value) {
      return null;
    }
    var then = new Date(value).getTime();
    if (isNaN(then)) {
      return null;
    }
    return (Date.now() - then) / 60000;
  }

  /**
   * Status is always derived from the communication timestamp — never stored.
   *
   * A vehicle that has never communicated is reported Offline: the spec defines
   * only three statuses, and Offline is the only one of them that isn't a lie.
   */
  function calculateStatus(lastCommunicationDate) {
    var minutesAgo = minutesSince(lastCommunicationDate);
    if (minutesAgo === null) {
      return 'Offline';
    }
    if (minutesAgo < ONLINE_THRESHOLD_MINUTES) {
      return 'Online';
    }
    if (minutesAgo < IDLE_THRESHOLD_MINUTES) {
      return 'Idle';
    }
    return 'Offline';
  }

  function plural(count, unit) {
    return count + ' ' + unit + (count === 1 ? '' : 's') + ' ago';
  }

  /** Human-readable elapsed time. Readability over raw timestamps. */
  function timeSince(lastCommunicationDate) {
    var minutesAgo = minutesSince(lastCommunicationDate);
    if (minutesAgo === null) {
      return NEVER;
    }
    if (minutesAgo < 1) {
      return 'Just now';
    }
    if (minutesAgo < 60) {
      return plural(Math.floor(minutesAgo), 'minute');
    }
    var hoursAgo = minutesAgo / 60;
    if (hoursAgo < 24) {
      return plural(Math.floor(hoursAgo), 'hour');
    }
    return plural(Math.floor(hoursAgo / 24), 'day');
  }

  // ----------------------------------------------------------- normalization

  /**
   * DeviceStatusInfo.driver is either a driver object or the sentinel string
   * "UnknownDriverId". Returns null when there is no usable driver name.
   */
  function driverNameOf(driver) {
    if (!driver || driver === UNKNOWN_DRIVER_ID || driver.id === UNKNOWN_DRIVER_ID) {
      return null;
    }
    var name = [driver.firstName, driver.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    return name || driver.name || null;
  }

  /**
   * Joins the device list with its status records. The device list drives the
   * result, so a vehicle with no status record still gets a row rather than
   * silently vanishing from the fleet.
   */
  function normalize(devices, statusInfos) {
    var statusByDeviceId = {};

    (statusInfos || []).forEach(function (info) {
      if (info && info.device && info.device.id) {
        statusByDeviceId[info.device.id] = info;
      }
    });

    // A single malformed entry must cost us that one vehicle, not the fleet.
    return (devices || []).reduce(function (fleet, device) {
      if (!device || typeof device !== 'object') {
        console.error('Fleet Status Dashboard: skipped an invalid device record', device);
        return fleet;
      }
      var info = statusByDeviceId[device.id] || {};
      fleet.push({
        name: device.name || UNNAMED_VEHICLE,
        driverName: driverNameOf(info.driver),
        lastCommunicationDate: info.dateTime || null
      });
      return fleet;
    }, []);
  }

  // ------------------------------------------------------------------ render

  /** Missing dates sort to the bottom instead of scrambling the order. */
  function communicationTime(vehicle) {
    if (!vehicle.lastCommunicationDate) {
      return -Infinity;
    }
    var time = new Date(vehicle.lastCommunicationDate).getTime();
    return isNaN(time) ? -Infinity : time;
  }

  function sortByLastCommunication(vehicles) {
    return vehicles.slice().sort(function (a, b) {
      return communicationTime(b) - communicationTime(a);
    });
  }

  function cell(text, className) {
    var td = document.createElement('td');
    if (className) {
      td.className = className;
    }
    // textContent, not innerHTML: vehicle and driver names are user-editable
    // in Geotab and must never be interpreted as markup.
    td.textContent = text;
    return td;
  }

  function buildRow(vehicle) {
    var status = calculateStatus(vehicle.lastCommunicationDate);

    var badge = document.createElement('span');
    badge.className = 'badge badge--' + status.toLowerCase();
    badge.textContent = status;

    var statusCell = document.createElement('td');
    statusCell.className = 'col-status';
    statusCell.appendChild(badge);

    var row = document.createElement('tr');
    row.appendChild(cell(vehicle.name, 'col-vehicle'));
    row.appendChild(cell(vehicle.driverName || UNASSIGNED, 'col-driver'));
    row.appendChild(cell(timeSince(vehicle.lastCommunicationDate), 'col-comm'));
    row.appendChild(statusCell);
    return row;
  }

  function render(vehicles) {
    if (!vehicles || vehicles.length === 0) {
      setState('empty');
      return;
    }

    var tbody = document.getElementById('fleet-rows');
    var fragment = document.createDocumentFragment();

    sortByLastCommunication(vehicles).forEach(function (vehicle) {
      // One malformed vehicle must not take down the whole dashboard.
      try {
        fragment.appendChild(buildRow(vehicle));
      } catch (err) {
        console.error('Fleet Status Dashboard: skipped an invalid vehicle', err);
      }
    });

    tbody.textContent = '';
    tbody.appendChild(fragment);
    setState('table');
  }

  function fail(error) {
    console.error('Fleet Status Dashboard: failed to load fleet status', error);
    setState('error');
  }

  // -------------------------------------------------------------------- load

  /**
   * One multiCall: the fleet roster and its status records in a single round
   * trip. Nothing here reads state.device.id — the dashboard is fleet-wide and
   * requires no vehicle selection.
   */
  function load(api) {
    setState('loading');

    api.multiCall([
      ['Get', { typeName: 'Device', search: {} }],
      ['Get', { typeName: 'DeviceStatusInfo' }]
    ], function (results) {
      try {
        render(normalize(results[0], results[1]));
      } catch (err) {
        fail(err);
      }
    }, fail);
  }

  // ------------------------------------------------- local development fleet

  /**
   * Used only when the page is opened outside Geotab (no `geotab` global), so
   * the states and status thresholds can be checked in a plain browser.
   * Timestamps are relative to now, so the statuses stay correct whenever this
   * is opened.
   */
  function mockFleet() {
    var minutesAgo = function (n) {
      return new Date(Date.now() - n * 60000).toISOString();
    };

    return [
      { name: 'Truck 12', driverName: 'Sarah Chen', lastCommunicationDate: minutesAgo(18) },
      { name: 'Truck 3', driverName: 'John Alvarez', lastCommunicationDate: minutesAgo(2) },
      { name: 'Van 7', driverName: null, lastCommunicationDate: minutesAgo(180) },
      { name: 'Truck 21', driverName: 'Priya Raghunathan', lastCommunicationDate: minutesAgo(0.3) },
      { name: 'Flatbed 4', driverName: 'Marcus Webb', lastCommunicationDate: minutesAgo(59) },
      { name: 'Reefer 9', driverName: null, lastCommunicationDate: minutesAgo(2880) },
      {
        name: 'Long Haul Tractor Unit 4471 — Northern Regional Distribution',
        driverName: 'Bartholomew Vandenberg-Kowalczyk',
        lastCommunicationDate: minutesAgo(45)
      },
      { name: 'Yard Shunter 2', driverName: 'Dana Okafor', lastCommunicationDate: null }
    ];
  }

  // ------------------------------------------------------------- entry point

  if (typeof geotab !== 'undefined') {
    geotab.addin.fleetStatusDashboard = function () {
      return {
        initialize: function (api, state, callback) {
          load(api);
          callback();
        },
        focus: function () {},
        blur: function () {}
      };
    };
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      console.warn('Fleet Status Dashboard: Geotab API unavailable — rendering mock fleet.');
      render(mockFleet());
    });
  }
}());
