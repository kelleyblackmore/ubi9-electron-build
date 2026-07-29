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
| **Windows** (`NSIS .exe`) | [`Dockerfile.windows`](Dockerfile.windows) | ⚠️ experimental | Needs **Wine** from EPEL; RHEL 9 Wine is fussy. See fallback below. |
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

## Windows / Wine fallback

If Wine on UBI 9 doesn't cooperate in your environment, the **proven** container
path for Windows is **Debian + Wine** — Debian ships `wine64`/`wine32` in-repo,
which electron-builder's NSIS + winCodeSign steps expect. The GitHub Actions
`windows` job here is marked `continue-on-error` for exactly this reason; its
result tells you whether UBI 9 + Wine is viable on current EPEL. (Note that even
on Debian, a *signed* Windows installer needs a real code-signing setup — Azure
Trusted Signing or an OV/EV cert — which is a separate concern.)

## Applying to your own app

Replace `example-app/` with your app (or change the `COPY example-app/ ...` lines
to your source path) and make sure your `package.json` has an electron-builder
`build` block with `linux` / `win` targets. That's it — the images are otherwise
app-agnostic.

## What CI proves

The [`build`](.github/workflows/build.yml) workflow runs on every push: it builds
the example app with each image and uploads the Linux (and, if Wine cooperates,
Windows) installers as artifacts — so the images are never silently broken.
