LIVE DAQ DASHBOARD --- Bridge Structural Health Monitoring System

Real-time structural health monitoring (SHM) dashboard for bridge
instrumentation, live sensor acquisition, telemetry persistence,
historical analysis, alerts, and engineering-data export.

1. What Is This Project?

LIVE DAQ DASHBOARD is a real-time Bridge Structural Health
Monitoring (SHM) system.

The project connects physical sensors installed on a bridge structure to
an Arduino DAQ, transfers the measured telemetry through a Python
hardware bridge, stores the measurements in Google Sheets, and presents
the data through a professional monitoring dashboard.

The system is designed around one central principle:

The dashboard must display real sensor data from the physical
acquisition system --- not random, simulated, or fabricated
telemetry.

The project supports two dashboard environments:

Local dashboard --- a React/Vite web application used as the
main reference implementation.

Global / Google Sites dashboard --- a standalone Google Apps
Script-compatible implementation that uses the same monitoring
concept and receives real telemetry through Google Sheets.

The current development goal is to make the global dashboard function
and look as close as possible to the local dashboard, while preserving
its Google Apps Script / Google Sheets data pipeline.

2. System Architecture

The complete production data path is:

┌─────────────────────┐
│ Physical Sensors    │
│ Force / Displacement│
│ Strain / etc.       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Arduino UNO DAQ     │
│                     │
│ Analog acquisition  │
│ Sequence numbers    │
│ DAQ heartbeat       │
│ Sensor telemetry    │
└──────────┬──────────┘
           │ USB Serial
           │ 115200 baud
           ▼
┌─────────────────────┐
│ daq_bridge.py       │
│                     │
│ PySerial receiver   │
│ Packet parser       │
│ Validation          │
│ Sequence tracking   │
│ Network forwarding  │
│ Offline retry queue │
└──────────┬──────────┘
           │ HTTP POST
           ▼
┌─────────────────────┐
│ Google Apps Script  │
│ Code.gs             │
│                     │
│ Live-state cache    │
│ Telemetry API       │
│ History API         │
│ Sensor registry     │
│ Alerts/settings     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Google Sheets       │
│                     │
│ TelemetryData       │
│ SensorRegistry      │
│ BridgeSettings      │
│ AlertsLog           │
└──────────┬──────────┘
           │
           ├──────────────────────┐
           │                      │
           ▼                      ▼
┌─────────────────────┐  ┌─────────────────────┐
│ Local React         │  │ Global Google Sites │
│ Dashboard           │  │ Dashboard           │
│                     │  │                     │
│ Live monitoring     │  │ Google Sites embed  │
│ Analytics           │  │ / Apps Script HTML  │
│ Sensors             │  │                     │
│ Alerts              │  │ Real telemetry      │
│ Administration      │  │ Historical data     │
│ Export              │  │ Monitoring UI       │
└─────────────────────┘  └─────────────────────┘

3. Main Engineering Purpose

The system is intended to monitor structural parameters such as:

Force / Load

Displacement

Strain

Stress

Temperature

Humidity

Other sensor types that can be registered in the dashboard

The current Arduino firmware demonstrates three real analog channels:

Arduino channel   Sensor            Engineering unit

A0                FORCE-01          kN
A1                DISPLACEMENT-01   mm
A2                STRAIN-01         µε

The firmware reads the Arduino ADC values and converts them into
engineering-unit values according to the configured sensor conversion
equations.

Important: The conversion constants in the current Arduino example
are project configuration values. They must be calibrated against the
actual physical sensors and signal-conditioning circuits before
engineering deployment.

4. Core Data Integrity Principle

This project is intentionally designed as a hardware-first system.

There must be no production dependence on:

random sensor values

fake telemetry

generated readings

simulated live packets

hard-coded changing measurements

browser-generated telemetry

The production data chain must originate from:

Physical sensor
      ↓
Arduino
      ↓
Serial packet
      ↓
daq_bridge.py
      ↓
Google Apps Script
      ↓
Google Sheets
      ↓
Dashboard

If hardware data is unavailable, the dashboard should represent the
appropriate offline/disconnected/empty state rather than inventing
measurements.

5. Repository Structure

LIVE_DAQ_DASHBOARD/
│
├── ardino/
│   └── bridge_data.ino
│
├── google-sites/
│   ├── Code.gs
│   ├── index.html
│   └── README_DEPLOYMENT.md
│
├── src/
│   ├── App.tsx
│   ├── App.css
│   ├── index.css
│   ├── main.tsx
│   │
│   ├── assets/
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   └── Sidebar.tsx
│   │   │
│   │   └── modals/
│   │       └── RegisterSensorModal.tsx
│   │
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── SHMContext.tsx
│   │
│   ├── data/
│   │   └── countries.ts
│   │
│   ├── pages/
│   │   ├── SignInPage.tsx
│   │   ├── LiveOverviewPage.tsx
│   │   ├── HistoricalAnalyticsPage.tsx
│   │   ├── SensorsDirectoryPage.tsx
│   │   ├── AlertsEventsPage.tsx
│   │   └── SystemAdminPage.tsx
│   │
│   ├── styles/
│   │   └── globals.css
│   │
│   └── types/
│       └── shm.ts
│
├── daq_bridge.py
├── index.html
├── package.json
├── package-lock.json
├── vite.config.ts
├── tsconfig.json
└── README.md

6. Local React Dashboard

The src/ directory contains the main local monitoring application.

Technology stack:

React

TypeScript

Vite

React Router

Recharts

Lucide React

XLSX

CSS

The local application is currently the primary UI/UX reference
implementation.

Main dashboard pages

Sign In

src/pages/SignInPage.tsx

Provides the user authentication interface, including sign-in and
sign-up workflows.

Live Overview

src/pages/LiveOverviewPage.tsx

This is the primary real-time SHM monitoring screen.

It handles concepts such as:

DAQ status

live sensor status

sensor readings

force/displacement/strain groups

current values

average values

minimum values

maximum values

warning/critical states

live telemetry

sensor connectivity

diagnostic information

sensor registration

The dashboard groups sensors by type and calculates same-instant
statistics for available online sensor readings.

Historical Analytics

src/pages/HistoricalAnalyticsPage.tsx

Provides historical analysis of collected telemetry.

It includes:

24-hour view

7-day view

30-day view

1-year view

custom time range

sensor selection

primary metric

secondary metric

chart visualization

CSV export

chart printing

Historical analysis is intended to operate on stored telemetry rather
than fabricated values.

Sensors Directory

src/pages/SensorsDirectoryPage.tsx

Provides a management view of registered sensors.

It includes:

sensor search

status filtering

subsystem filtering

sensor selection

sensor status

current values

sensor metadata

registration

administrative removal

XLSX export

CSV export

Alerts & Events

src/pages/AlertsEventsPage.tsx

Provides monitoring of system and sensor alerts.

It supports:

severity filtering

status filtering

active alerts

resolved alerts

acknowledgement

resolution

sensor-specific alert information

Threshold-based conditions can produce warning/critical events.

System Administration

src/pages/SystemAdminPage.tsx

Provides administrative configuration and system-management features.

It includes areas for:

bridge configuration

DAQ configuration

users

sensor types

safety limits

audit information

Apps Script connection testing

7. SHM Data Model

The main shared data and state architecture is located in:

src/context/SHMContext.tsx
src/types/shm.ts

The context manages concepts including:

registered sensors

sensor types

telemetry history

alerts

bridge settings

audit log

DAQ online/offline state

last packet timestamp

sequence number

incoming hardware packets

The system also maintains sensor states such as:

online
disconnected
offline
warning
critical

A critical distinction is maintained between:

DAQ connectivity

Whether the Arduino/data-acquisition path is communicating.

Sensor connectivity

Whether an individual sensor is producing a valid measurement.

Therefore:

Arduino ONLINE
+
Sensor A ONLINE
+
Sensor B DISCONNECTED

is a valid system state.

Arduino connectivity does not automatically mean that every sensor is
connected.

8. Arduino DAQ Firmware

File:

ardino/bridge_data.ino

The Arduino firmware is responsible for physical acquisition.

Current example configuration:

Arduino UNO
Serial: 115200 baud
Acquisition interval: approximately 1 second

A0 → FORCE-01
A1 → DISPLACEMENT-01
A2 → STRAIN-01

The firmware provides:

real ADC acquisition

Arduino identification

sequence numbers

DAQ status

sensor measurements

serial telemetry packets

PING/PONG handshake

Example packet structure:

DAQ:ONLINE,ARDUINO_ID=UNO-01,SEQ=123,FORCE-01:ONLINE:1420.50,DISPLACEMENT-01:ONLINE:14.20,STRAIN-01:ONLINE:480.00

The sequence number is important because downstream components can
reject duplicate or stale packets.

9. Python DAQ Bridge

File:

daq_bridge.py

This is the bridge between the physical Arduino and the cloud backend.

Its responsibilities include:

Open the Arduino serial port.

Establish the serial connection.

Perform a PING/PONG startup handshake.

Read telemetry packets.

Parse serial data.

Convert packets into structured JSON.

Forward telemetry to Google Apps Script.

Record sequence numbers.

Measure network POST latency.

Queue packets when the cloud connection temporarily fails.

Retry queued packets after connectivity returns.

Reconnect to the Arduino when necessary.

The bridge explicitly follows the project rule:

REAL HARDWARE ONLY --- NO SIMULATION / ZERO FAKE DATA

10. Serial Packet Formats

The Python bridge supports structured telemetry formats.

The canonical delimited format is conceptually:

DAQ:ONLINE,
ARDUINO_ID=UNO-01,
SEQ=123,
FORCE-01:ONLINE:1420.5,
DISPLACEMENT-01:ONLINE:14.2,
STRAIN-01:ONLINE:480.0

The bridge also contains parsing support for JSON-style packets and
raw-status/value packet variations.

11. Google Apps Script Backend

The global backend is located at:

google-sites/Code.gs

It acts as the cloud-side ingestion and retrieval layer.

Its responsibilities include:

receiving telemetry POST requests

normalizing telemetry

storing permanent telemetry

maintaining a fast live state

serving live dashboard data

serving historical data

serving the sensor registry

maintaining settings

maintaining alerts

The main HTTP entry points are:

doPost(e)
doGet(e)

The backend exposes data for the global dashboard without requiring the
browser to communicate directly with the Arduino.

12. Google Sheets Data Model

The Apps Script backend maintains several sheets.

TelemetryData

Permanent telemetry database.

The current schema includes:

Timestamp ISO
Local Time
Sequence Number
DAQ Status
Force
Stress
Strain
Displacement
Temperature
Humidity
Raw Serial Frame

This sheet is the historical source for telemetry.

SensorRegistry

Contains sensor metadata such as:

Sensor ID
Name
Type
Unit
Subsystem
Hardware Bus
Safety Threshold
Status
Last Value
Last Seen ISO

BridgeSettings

Stores bridge/system configuration such as:

bridge name

bridge code

bridge type

geographic information

design life

commissioning year

number of spans

material

serial baud rate

DAQ sampling rate

unit system

theme

AlertsLog

Stores alert information including:

alert ID

severity

sensor

subsystem

trigger value

safety threshold

unit

title

description

recommended action

timestamp

status

resolution time

13. Fast Live Telemetry Path

The Apps Script backend includes a live-state cache mechanism.

The purpose is to avoid unnecessarily reading the complete historical
spreadsheet every time the dashboard requests current telemetry.

Conceptually:

Arduino packet
      ↓
Apps Script doPost()
      ↓
Live-state cache
      ↓
Global dashboard

At the same time, the telemetry is permanently appended to:

TelemetryData

Therefore the architecture separates:

Live path

Fast current-state retrieval.

Historical path

Persistent Google Sheets telemetry.

This separation is important for reducing unnecessary dashboard latency.

14. Global Google Sites Dashboard

The global implementation is located in:

google-sites/index.html

and is intended to be embedded/deployed through Google Sites using
Google Apps Script.

Its data source is the Apps Script backend rather than direct browser
access to the Arduino.

The global architecture is therefore:

Arduino
  ↓
daq_bridge.py
  ↓
Google Apps Script
  ↓
Google Sheets
  ↓
google-sites/index.html
  ↓
Google Sites

15. Local vs Global Dashboard

There are two implementations of the dashboard.

Local

src/

The local version is a React/TypeScript application and is the primary
reference for:

UI

UX

charts

navigation

statistics

sensor management

alerts

historical analytics

export workflows

administrative screens

Global

google-sites/

The global version is designed for Google Sites / Apps Script
deployment.

Its major architectural constraint is that it must continue using:

Google Apps Script
+
Google Sheets

for cloud-side data flow.

Development objective

The global dashboard should become a faithful implementation of the
local dashboard, while keeping the global Google Apps Script / Google
Sheets data architecture.

In other words:

LOCAL
    ↓
Reference for appearance and behavior

GLOBAL
    ↓
Same dashboard experience
    +
Google Sheets / Apps Script data source

16. Real-Time Monitoring Requirements

A correct production data path should behave like:

Sensor measurement
      ↓
Arduino ADC
      ↓
Engineering-unit conversion
      ↓
Serial packet
      ↓
daq_bridge.py
      ↓
HTTP POST
      ↓
Apps Script
      ↓
Live cache + TelemetryData
      ↓
Dashboard

The dashboard should use sequence numbers and timestamps to avoid
treating stale packets as new measurements.

17. Sensor Disconnection Considerations

The current Arduino firmware reads analog ADC channels.

An important engineering limitation is documented in the firmware:

An unconnected analog input can float and produce arbitrary ADC
values.

Therefore, simply seeing a non-zero ADC value does not prove that a
physical sensor is connected.

Reliable physical sensor-presence detection requires an appropriate
electrical interface, such as:

defined pull-up/pull-down state

sensor excitation monitoring

dedicated presence signal

interface-specific fault detection

calibrated electrical fault thresholds

Until such hardware detection exists, the system should distinguish:

Arduino communication status

from:

Physical sensor presence

rather than claiming that every ADC value proves a sensor is connected.

18. Safety and Engineering Disclaimer

This is a monitoring and data-acquisition project.

Before using the system for real structural safety decisions:

calibrate each sensor

verify signal conditioning

verify engineering-unit conversion

validate thresholds

validate sampling requirements

validate time synchronization

validate communication reliability

test failure modes

verify sensor disconnection detection

verify data persistence

independently validate results against appropriate engineering
standards

The current repository contains demonstration/configuration values that
should not automatically be treated as certified structural limits.

19. Running the Local Dashboard

Install Node.js dependencies:

npm install

Start the local development server:

npm run dev

Create a production build:

npm run build

Preview the production build:

npm run preview

Run linting:

npm run lint

20. Running the Python DAQ Bridge

The Python bridge requires Python and PySerial.

Install PySerial:

pip install pyserial

Then configure:

SERIAL_PORT = "COM6"
BAUD_RATE = 115200
APPS_SCRIPT_URL = "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL"

Run:

python daq_bridge.py

The bridge should then:

connect to the Arduino

perform the PING/PONG handshake

receive telemetry

parse packets

forward packets to Apps Script

retry failed cloud uploads

21. Google Apps Script Deployment

The deployment instructions are also available in:

google-sites/README_DEPLOYMENT.md

General process:

Create/open the Google Sheet.

Open Extensions → Apps Script.

Deploy the Apps Script backend.

Configure it as a Web App.

Execute as the appropriate owner/account.

Allow the required access.

Obtain the Web App URL.

Configure that URL in daq_bridge.py.

Deploy/embed the global dashboard through Google Sites.

The Apps Script code automatically initializes the required spreadsheet
structures when necessary.

22. Project Configuration

Important configuration currently exists in several places.

Arduino

ard​ino/bridge_data.ino

Contains:

Arduino ID

serial baud rate

acquisition interval

analog channel assignments

engineering-unit conversion

Python

daq_bridge.py

Contains:

serial port

baud rate

Apps Script endpoint

network timeout/retry behavior

Apps Script

google-sites/Code.gs

Contains:

sheet names

live-state cache configuration

watchdog timeout

telemetry normalization

API behavior

React

src/context/SHMContext.tsx

Contains the local dashboard state/data model and monitoring logic.

23. Important Development Rules

When modifying this project:

Rule 1 --- Never introduce fake production telemetry

Do not use random values to make the dashboard appear alive.

Rule 2 --- Preserve the hardware data path

Do not bypass:

Arduino → Python → Apps Script

for production telemetry.

Rule 3 --- Preserve historical data

Do not delete or overwrite TelemetryData merely to reset the
dashboard.

Rule 4 --- Preserve sequence numbers

Sequence numbers are used to identify fresh packets and reject stale
data.

Rule 5 --- Separate live and historical retrieval

Live telemetry should use the fast live-state mechanism.

Historical analysis should use persistent telemetry.

Rule 6 --- Treat the local dashboard as the UI reference

When implementing the global dashboard, the local React implementation
is the source of truth for visual and behavioral details.

Rule 7 --- Do not confuse Arduino status with sensor status

Arduino online does not automatically mean every sensor is physically
connected.

24. Current Project Status

The repository contains a working foundation for:

Arduino-based data acquisition

Python serial telemetry bridging

Google Apps Script cloud ingestion

Google Sheets persistence

real-time dashboard concepts

historical telemetry

sensor registry

alerts/events

administration

CSV/XLSX export

local React dashboard

Google Sites/global dashboard

The main ongoing development direction is:

Bring the global Google Sites dashboard to the same level of
functionality, visual fidelity, graph behavior, data presentation, and
export capability as the local React dashboard, without changing the
global Google Sheets/Apps Script data flow.

25. One-Sentence Project Summary

LIVE DAQ DASHBOARD is a real-time bridge Structural Health Monitoring
platform that acquires physical sensor measurements through Arduino,
transports them through a Python DAQ bridge, persists them using Google
Apps Script and Google Sheets, and presents live/historical structural
data, sensor status, alerts, analytics, and engineering exports through
local and globally deployable dashboards.

Project Flow at a Glance

                    BRIDGE STRUCTURAL HEALTH
                       MONITORING SYSTEM

                            Sensors
                               │
              ┌────────────────┼────────────────┐
              │                │                │
            Force        Displacement        Strain
              │                │                │
              └────────────────┼────────────────┘
                               ▼
                        ┌──────────────┐
                        │ Arduino UNO  │
                        │   DAQ        │
                        └──────┬───────┘
                               │
                          USB Serial
                          115200 baud
                               │
                               ▼
                        ┌──────────────┐
                        │ daq_bridge.py│
                        │              │
                        │ Parse        │
                        │ Validate     │
                        │ Sequence     │
                        │ Retry        │
                        └──────┬───────┘
                               │
                              HTTP
                               │
                               ▼
                    ┌────────────────────┐
                    │ Google Apps Script │
                    │                    │
                    │ Live API           │
                    │ History API        │
                    │ Registry           │
                    │ Alerts             │
                    └─────────┬──────────┘
                              │
                    ┌─────────┴──────────┐
                    ▼                    ▼
             Google Sheets          Live Cache
                    │                    │
                    └─────────┬──────────┘
                              ▼
                   ┌──────────────────────┐
                   │ Monitoring Dashboard │
                   │                      │
                   │ Live Overview        │
                   │ Historical Analytics │
                   │ Sensors Directory    │
                   │ Alerts & Events      │
                   │ System Administration│
                   │ Excel / CSV Export   │
                   └──────────────────────┘

Repository

Project: LIVE_DAQ_DASHBOARD

Primary purpose: Real-time Bridge Structural Health Monitoring /
Data Acquisition / Telemetry Dashboard

Primary hardware: Arduino UNO + analog structural sensors

Local frontend: React + TypeScript + Vite

Global backend: Google Apps Script + Google Sheets

Hardware bridge: Python + PySerial

Production data principle: Real hardware data only --- no fake
telemetry.
