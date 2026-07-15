import AdmZip from 'adm-zip'

export function addWebTemplate(zip: AdmZip, projectName: string) {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${projectName}</title>
    <style>body{margin:0;background:#0b0b0b;color:#fff;font-family:Inter,Segoe UI,Arial,sans-serif}#app{padding:24px}</style>
  </head>
  <body>
    <div id="app">
      <h1>${projectName}</h1>
      <p>Runtime Web exportado pelo Aethel Engine.</p>
      <p>Assets estao em <code>/assets</code>.</p>
      <script src="app.js"></script>
    </div>
  </body>
</html>`
  const js = `log.info('Aethel Web Runtime');`
  zip.addFile('index.html', Buffer.from(html, 'utf8'))
  zip.addFile('app.js', Buffer.from(js, 'utf8'))
}
