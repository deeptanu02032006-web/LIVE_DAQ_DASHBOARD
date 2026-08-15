# Google Sites + Google Sheets + Apps Script SHM Deployment Guide

This guide details step-by-step instructions for deploying the **Bridge Structural Health Monitoring (SHM)** dashboard into **Google Sites** backed by **Google Sheets** and **Google Apps Script**.

---

## 1. Create and Configure the Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a **New Blank Spreadsheet**.
2. Name the spreadsheet: `Bridge_AI_SHM_Telemetry_DB`.
3. The database uses four dedicated sheet tabs which are created automatically upon script initialization:
   - `TelemetryData`: Permanent raw telemetry log (never automatically deleted or trimmed).
   - `SensorRegistry`: Dynamic inventory of registered hardware sensors and threshold configurations.
   - `BridgeSettings`: Metadata and bridge infrastructure properties.
   - `AlertsLog`: Rule-based structural anomaly and connectivity events.

---

## 2. Deploy Google Apps Script Web App

1. In your Google Sheet, click **Extensions** > **Apps Script**.
2. Rename the project to `Bridge_SHM_Backend`.
3. In the script editor:
   - Paste the contents of `google-sites/Code.gs` into `Code.gs`.
   - Click **+** next to Files > **HTML**, name the file `index` (making it `index.html`), and paste the contents of `google-sites/index.html`.
4. Click **Save** (Ctrl+S or Cmd+S).
5. Click **Deploy** > **New Deployment**:
   - **Select type**: Click gear icon ⚙️ > **Web App**.
   - **Description**: `Bridge SHM Production Release`
   - **Execute as**: `Me (your-email@gmail.com)`
   - **Who has access**: `Anyone` *(Crucial for Google Sites embedding and Python POST ingestion)*
6. Click **Deploy**.
7. Grant required Google account permissions when prompted:
   - Click **Authorize access**, select your Google Account.
   - Click **Advanced** > **Go to Bridge_SHM_Backend (unsafe)** > **Allow**.
8. Copy the generated **Web App URL** (e.g., `https://script.google.com/macros/s/AKfycb.../exec`).

---

## 3. Configure and Launch the Python Hardware DAQ Bridge

1. Open `daq_bridge.py` in your editor.
2. Set the `APPS_SCRIPT_URL` variable to your copied Web App URL:
   ```python
   APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxcRoP455oy9W7SAwEwO5mu9lGJLaJg2DvL2W2gz2a39g7qzWK5Y42BmJ8MEpx-8COY9w/exec"
   ```
3. Set your target hardware serial port:
   ```python
   SERIAL_PORT = "COM3"  # Windows COM port or '/dev/ttyUSB0' on Linux
   BAUD_RATE = 115200
   ```
4. Run the Python bridge:
   ```bash
   python daq_bridge.py
   ```
5. Confirm output shows:
   - `[SERIAL] Connected successfully to COM3.`
   - `[HANDSHAKE VERIFIED] Arduino response: 'PONG,UNO-01'`
   - `[SEQ:1001] POST OK -> {"status":"SUCCESS"...}`

---

## 4. Embed in Google Sites

1. Open [Google Sites](https://sites.google.com) and edit or create your site.
2. In the right panel, click **Insert** > **Embed**.
3. Select **By URL**, paste your **Google Apps Script Web App URL**.
4. Select **Whole Page** or **Preview**, then click **Insert**.
5. Drag and resize the embedded window to full-width.
6. Click **Publish** to publish your Google Site.

---

## 5. Dynamic Sensor Discovery & Expansion

To register another sensor (e.g. `FORCE-03` or `DISPLACEMENT-02`):
1. **Option A (UI Modal)**: Open the dashboard, click **Sensors Directory** > **+ Register Hardware Sensor**, enter the details and click Save.
2. **Option B (Google Sheets)**: Add a new row directly to the `SensorRegistry` sheet tab.
3. **Option C (Firmware)**: Send serial line `FORCE-03:ONLINE:1450.0` from Arduino. The system automatically discovers and registers the sensor dynamically!

---

## 6. Troubleshooting

- **DAQ Offline Banner**:
  - Verify `daq_bridge.py` is running and communicating with Arduino serial port.
  - Verify Apps Script URL is correct and deployed as "Who has access: Anyone".
- **Cross-Origin / Iframe Errors in Google Sites**:
  - Ensure `XFrameOptionsMode.ALLOWALL` is present in `doGet` inside `Code.gs`.
- **Offline Retry Buffer**:
  - If internet drops temporarily, `daq_bridge.py` buffers telemetry packets locally in `offline_retry_queue` and flushes them automatically when network connection resumes without fabricating numbers.
