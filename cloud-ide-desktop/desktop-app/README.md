# Aethel Desktop App (Electron)

Este pacote empacota a **mesma IDE** que roda no browser (servida por `examples/browser-ide-app`) dentro de um shell desktop Electron.

## Dev (Windows)

```powershell
# do root do repo
npm install
npm --prefix examples/browser-ide-app install
npm --prefix cloud-ide-desktop/desktop-app install

npm run desktop:dev
```

## Build (Windows)

```powershell
npm --prefix cloud-ide-desktop/desktop-app run build
```

Por padrão, o app sobe o servidor local e abre `http://127.0.0.1:<porta>`.
