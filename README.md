# ubi9-electron-build

Container images for building **Electron** desktop apps on **Red Hat UBI 9**
(`registry.access.redhat.com/ubi9/nodejs-22`) — one Dockerfile per build target.

A tiny example Electron app (`example-app/`) is included so the images
demonstrably produce real installers in CI. Point the same Dockerfiles at your
own app (private or otherwise) by swapping the `example-app/` copy for your source.

## Why UBI 9

UBI 9 is Red Hat's freely redistributable, enterprise-grade base — a natural fit
for regulated / RHEL shops and air-gapped environments where the base image has
to be a known, supportable quantity. Linux builds even emit an **`.rpm`**, which
slots straight into RHEL-family distribution.

## The builds

| Target | File | Status | Notes |
|---|---|---|---|
| **Linux** (`tar.gz` + `rpm`) | [`Dockerfile.linux`](Dockerfile.linux) | ✅ reliable | Fully native, no emulation. |
| **CI** (lint / test / parse) | [`Dockerfile.ci`](Dockerfile.ci) | ✅ reliable | Swap the `RUN` line for `npm run lint && npm test`. |
| **Windows** (`NSIS .exe`) | [`Dockerfile.windows`](Dockerfile.windows) | ✅ reliable | Uses `electronuserland/builder:wine` (Debian + Wine) — **not** UBI 9; see below. |
| **macOS** (`.dmg`) | — | ❌ **not possible** | See below. |

### macOS cannot be containerized — at all

There is deliberately no macOS Dockerfile. Building a macOS `.dmg` (and any
signing/notarization) requires Apple's toolchain — `hdiutil`, `lipo`,
`codesign`, `notarytool` — which runs **only on macOS**, and Apple's license
forbids running macOS on non-Apple hardware. A Linux/UBI container physically
cannot produce a Mac build. Do the macOS build on a Mac or a macOS CI runner
(e.g. GitHub Actions `macos-latest`); everything else here is container-friendly.

## Usage

Requires Docker/Podman with BuildKit (for `--output`).

```bash
# Linux distributables -> ./out-linux/  (tar.gz + rpm)
docker build -f Dockerfile.linux  --target export -o type=local,dest=./out-linux .

# Windows installer    -> ./out-win/    (experimental)
docker build -f Dockerfile.windows --target export -o type=local,dest=./out-win .

# CI check (no artifact)
docker build -f Dockerfile.ci -t electron-ci-ubi9 .
```

Podman works the same (`podman build ...`), which is handy on RHEL hosts.

## Why Windows isn't on UBI 9

Windows builds need **Wine**, and Wine on RHEL/UBI 9 is out-of-repo (EPEL) and
historically fussy with its 32-bit dependency set. So the Windows target uses
**`electronuserland/builder:wine`** — the maintained Debian + Wine + Node image
that electron-builder itself targets — which is the reliable path. UBI 9 stays
the base for the **Linux** and **CI** images, where it's native and the right
call for RHEL-family environments. Use the best tool per target rather than
forcing one base everywhere.

(Even in a container, a *signed* Windows installer still needs a real
code-signing setup — Azure Trusted Signing or an OV/EV cert — which is separate.)

## Applying to your own app

Replace `example-app/` with your app (or change the `COPY example-app/ ...` lines
to your source path) and make sure your `package.json` has an electron-builder
`build` block with `linux` / `win` targets. That's it — the images are otherwise
app-agnostic.

## What CI proves

The [`build`](.github/workflows/build.yml) workflow runs on every push: it builds
the example app with each image and uploads the Linux (and, if Wine cooperates,
Windows) installers as artifacts — so the images are never silently broken.
