const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');
const { OpenAI } = require('openai'); // Utilizando o SDK já instalado no monorepo

// O "Agente de Consciência": Valida a semântica quando os pixels mudam
async function semanticVisionCheck(baselinePath, currentPath, diffPixels) {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('[QA-Agent] AVISO: OPENAI_API_KEY ausente. Usando fallback estúpido de pixels.');
    return diffPixels < 500; // Hard fallback
  }

  const openai = new OpenAI();
  
  // Lê imagens como Base64 para a Vision API
  const base64Baseline = fs.readFileSync(baselinePath).toString('base64');
  const base64Current = fs.readFileSync(currentPath).toString('base64');

  try {
    console.log('[QA-Agent] Abismo Semântico detectado (Pixels mudaram). Invocando LLM Vision...');
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Você é o Agente Crítico de Testes (Aesthetic Reward Discriminator) da Aethel Engine. Analise as duas imagens: Baseline e Current (Estado Atual gerado pela IA). A intenção semântica foi mantida? IMPORTANTE: Inspecione a 'Consistência do Barro'. Se a IA gerou um material paramétrico, ele respeita a física orgânica solicitada? Rejeite materiais que pareçam 'plásticos' se a intenção for úmida, orgânica ou viscosa. A estética e o fluxo material importam tanto quanto a geometria."
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Baseline:" },
            { type: "image_url", image_url: { url: `data:image/png;base64,${base64Baseline}` } },
            { type: "text", text: "Current:" },
            { type: "image_url", image_url: { url: `data:image/png;base64,${base64Current}` } }
          ]
        }
      ],
      functions: [
        {
          name: "report_semantic_verdict",
          description: "Relata se o estado visual cumpre a intenção do motor.",
          parameters: {
            type: "object",
            properties: {
              semantically_valid: { type: "boolean" },
              reasoning: { type: "string" }
            },
            required: ["semantically_valid", "reasoning"]
          }
        }
      ],
      function_call: { name: "report_semantic_verdict" }
    });

    const args = JSON.parse(response.choices[0].message.function_call.arguments);
    console.log(`[QA-Agent] Veredito Semântico: ${args.semantically_valid} | Motivo: ${args.reasoning}`);
    return args.semantically_valid;
  } catch (err) {
    console.error('[QA-Agent] Falha na Vision API:', err);
    return false;
  }
}

function readPNG(file) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(file)
      .pipe(new PNG())
      .on('parsed', function() { resolve(this); })
      .on('error', reject);
  });
}

async function compare({ baselineDir, currentDir, outDir, perPageThreshold = 100, totalThreshold = 500 }) {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const pages = fs.readdirSync(baselineDir).filter(f => f.endsWith('.png'));
  const report = [];
  let totalDiff = 0;
  let semanticFailures = 0;

  for (const file of pages) {
    const basePath = path.join(baselineDir, file);
    const curPath = path.join(currentDir, file);
    
    if (!fs.existsSync(curPath)) {
      report.push({ file, error: 'missing-current', semanticallyValid: false });
      semanticFailures++;
      continue;
    }
    
    const img1 = await readPNG(basePath);
    const img2 = await readPNG(curPath);
    const { width, height } = img1;
    
    if (width !== img2.width || height !== img2.height) {
      report.push({ file, error: 'size-mismatch', semanticallyValid: false });
      semanticFailures++;
      continue;
    }

    const diff = new PNG({ width, height });
    const diffPixels = pixelmatch(img1.data, img2.data, diff.data, width, height, { threshold: 0.12 });
    totalDiff += diffPixels;
    
    const outPath = path.join(outDir, file.replace('.png', '-diff.png'));
    diff.pack().pipe(fs.createWriteStream(outPath));

    let semanticallyValid = true;
    
    // Se a regressão de pixel passar do limite, avaliamos semanticamente!
    if (diffPixels > perPageThreshold) {
      semanticallyValid = await semanticVisionCheck(basePath, curPath, diffPixels);
      if (!semanticallyValid) {
        semanticFailures++;
      }
    }

    report.push({ file, diffPixels, diffPath: outPath, semanticallyValid });
  }

  const summary = { totalDiff, semanticFailures, pages: report };
  fs.writeFileSync(path.join(outDir, 'compare-report.json'), JSON.stringify(summary, null, 2));

  // A falha agora é determinada pela SEMÂNTICA, não apenas por pixels.
  const fail = semanticFailures > 0;
  return { summary, fail };
}

// CLI
if (require.main === module) {
  const argv = require('minimist')(process.argv.slice(2));
  const baselineDir = argv.baseline || argv.b || path.join(__dirname, 'baseline');
  const currentDir = argv.current || argv.c || path.join(__dirname, 'output', 'current');
  const outDir = argv.out || path.join(__dirname, 'output', 'diffs');
  const perPageThreshold = parseInt(argv.per || 100, 10);
  const totalThreshold = parseInt(argv.total || 500, 10);

  compare({ baselineDir, currentDir, outDir, perPageThreshold, totalThreshold }).then(res => {
    console.log('Compare summary:', res.summary);
    if (res.fail) {
      console.log('CRÍTICO: Teste Reprovado pelo Agente de Consciência Semântica.');
      process.exit(2);
    } else {
      console.log('SUCESSO: Assets validados semanticamente.');
      process.exit(0);
    }
  }).catch(err => { console.error(err); process.exit(1); });
}
