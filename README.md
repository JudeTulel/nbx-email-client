# NBX Email Client

A fast, offline-first native desktop email client built with React, TailwindCSS, and Tauri (Rust). Designed entirely for the NBX Exchange team to deliver dynamic template-based emails reliably.

## Architectural Overview
This application shifts away from the generic Next.js/Node.js web paradigm. Since it is handled completely locally:
1. **Frontend (React/Vite)**: Runs totally inside the desktop frame without an external server dependency. Composition handles its state locally using `zustand`.
2. **Backend (Rust/Tauri)**: Provides safe OS-level native APIs, effectively embedding standard SMTP networking (`lettre`) straight into the lightweight bundled `.exe` executable.
3. **Storage**: Standard templates and historical data live right in Chromium/WebKit `localStorage`. Secure details belong squarely in OS Keychain.

### Security and Keychains
Storing SMTP passwords inside browser interfaces or web local storage is dangerous. This application leverages the Tauri `keyring` crate to automatically defer credentials to the host OS encrypted storage:
- **Windows**: Windows Credential Manager
- **macOS**: Keychain Access
- **Linux**: Secret Service API / gnome-keyring

## Requirements
To compile the desktop variants, you naturally need Node (`v20`+ suggested) alongside the standard [Tauri Prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites):
- Windows: Visual Studio C++ Build Tools
- Mac: XCode Command Line Tools
- Linux: standard `webkit2gtk` packages

## App Setup & Development
1. Clone down the repository
2. Install the node ecosystem bounds using standard `pnpm` or `npm`:
```bash
npm install
```
3. Initialize the Tauri development hot-reload window:
```bash
npm run tauri dev
```
*(Note: Because of native dependencies, the very first compilation round for Rust binary bridging will take 2-5 minutes)*

### Production Bundling
Ready to share it with the team? It builds instantly into roughly ~10-15MB completely standalone installers.

```bash
npm run tauri build
```
You can locate your fresh standard output installers under `src-tauri/target/release/bundle/msi` or `/dmg`.

## Azure Communication Services SMTP Setup

Sending emails through this client strictly uses Microsoft Azure Communication Services out-of-the-box. Configuration takes just a minute inside the app itself.

1. Launch your packaged NBX Email Client executable.
2. Select the **Settings** cog wheel from your sidebar.
3. Your native SMTP server will be permanently locked onto `smtp.azurecomm.net` using port `587`.
4. Enter your standard sender parameter inside the Username block: e.g., `marketing@nbx-exchange.co.ke`
5. Inside the Password block, neatly paste your specific **Azure Client Secret**. 
6. Click **Save Credentials**.
   *(At this precise moment, Tauri bridges the string into your underlying system's native encrypted Keychain, meaning the secret never ever idles within javascript configurations!)*

### Testing Connections
To verify that everything is solid, click **Test Connection** inside Settings. The system attempts a silent zero-payload TLS handshake with Azure to ensure the client credentials respond favorably.

If it spins and reads `✅ SMTP connection successful!`, you're good to compose! All your CC, BCC and attachment data from here on goes directly from the Rust handler upwards.
