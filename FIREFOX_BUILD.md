# Firefox reviewer build instructions

MarkNest 3.0.0 is built from TypeScript and Vue source with WXT. The submitted
extension targets Firefox Manifest V3. No private dependencies, credentials,
environment variables, network-fetched runtime code, or proprietary build tools
are required.

## Build environment

- Ubuntu 24.04 LTS (the AMO default reviewer environment is supported)
- Node.js 24.14.0 (any Node.js version >= 22 is supported)
- pnpm 10.16.1, pinned by the `packageManager` field in `package.json`
- Network access is required only while pnpm installs the public npm packages

## Reproduce the submitted extension

From the root of this source archive, run:

```bash
corepack enable
corepack prepare pnpm@10.16.1 --activate
pnpm install --frozen-lockfile
pnpm release:firefox
```

The extension archive is generated at:

```text
.output/marknest-3.0.0-firefox.zip
```

The unpacked extension used to create that archive is generated at:

```text
.output/firefox-mv3/
```

`pnpm release:firefox` first runs the TypeScript/Vue type checker and then runs
`wxt zip -b firefox --mv3 --sources`. WXT performs the Vue, TypeScript, CSS, and
asset bundling and creates the ZIP. Do not run a formatter or modify the source
before comparing the generated files with the submitted add-on.
