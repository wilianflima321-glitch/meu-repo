import { NextRequest, NextResponse } from 'next/server';
import os from 'os';

export const dynamic = 'force-dynamic';

/**
 * GET /api/system/health
 * 
 * Retorna status de saúde do sistema para o hook useSystemHealth
 */
export async function GET(_request: NextRequest) {
  try {
    // Métricas de CPU
    const cpus = os.cpus();
    const cpuUsage = calculateCpuUsage(cpus);
    
    // Métricas de memória
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    // Load average (Unix only, Windows retorna [0,0,0])
    const loadAverage = os.loadavg() as [number, number, number];
    
    // Uptime
    const uptime = os.uptime();
    
    const healthData = {
      timestamp: new Date().toISOString(),
      cpu: {
        usage: cpuUsage,
        cores: cpus.length,
        temperature: null, // Requer acesso privilegiado
        frequency: cpus[0]?.speed || null,
      },
      memory: {
        used: usedMem,
        total: totalMem,
        percentage: Math.round((usedMem / totalMem) * 100),
        available: freeMem,
      },
      gpu: null, // Requer nvidia-smi ou similar
      disks: await getDiskUsage(),
      network: {
        bytesIn: 0,
        bytesOut: 0,
        packetsIn: 0,
        packetsOut: 0,
        latency: 0,
        connections: 0,
      },
      processes: [], // Pode ser expandido com uso de processos
      services: await checkServices(),
      uptime,
      loadAverage,
    };

    return NextResponse.json(healthData);
  } catch (error) {
    console.error('[system/health] Error:', error);
    return NextResponse.json(
      { error: 'health_check_failed' },
      { status: 500 }
    );
  }
}

/**
 * Calcula uso de CPU baseado em idle time
 */
function calculateCpuUsage(cpus: os.CpuInfo[]): number {
  let totalIdle = 0;
  let totalTick = 0;

  for (const cpu of cpus) {
    for (const type in cpu.times) {
      totalTick += cpu.times[type as keyof typeof cpu.times];
    }
    totalIdle += cpu.times.idle;
  }

  const idle = totalIdle / cpus.length;
  const total = totalTick / cpus.length;
  const usage = 100 - Math.round((idle / total) * 100);

  return Math.max(0, Math.min(100, usage));
}

/**
 * Obtém uso de disco (simplificado)
 */
async function getDiskUsage() {
  // Em produção, usar biblioteca como 'disk-space' ou 'node-disk-info'
  return [
    {
      name: 'Disco Principal',
      used: 0,
      total: 0,
      percentage: 0,
      readSpeed: 0,
      writeSpeed: 0,
    }
  ];
}

/**
 * Verifica status dos serviços
 */
async function checkServices() {
  const services = [
    { name: 'Database', url: process.env.DATABASE_URL ? 'prisma' : null },
    { name: 'Redis', url: process.env.REDIS_URL },
    { name: 'AI Backend', url: process.env.AI_API_URL },
    { name: 'Storage', url: process.env.S3_ENDPOINT || process.env.AWS_S3_BUCKET },
    { name: 'Stripe', url: process.env.STRIPE_SECRET_KEY ? 'stripe' : null },
  ];

  return services.map(service => ({
    name: service.name,
    status: service.url ? 'healthy' as const : 'unknown' as const,
    latency: null,
    lastCheck: new Date().toISOString(),
    message: service.url ? 'Configurado' : 'Não configurado',
  }));
}
