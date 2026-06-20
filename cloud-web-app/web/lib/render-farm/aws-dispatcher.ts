import type { RenderFarmJobSpec } from '@/lib/render-farm/queue/job-spec'
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'

/**
 * Dispatcher to AWS/Modal.com for Headless Render Jobs.
 * Instead of dying in the browser due to OOM, we send the Three.js scene state
 * to a g4dn.xlarge instance running Puppeteer & FFmpeg.
 */
export async function dispatchCloudRenderJob(jobId: string, spec: RenderFarmJobSpec) {
  // Simulate payload creation for AWS Lambda / Modal.com
  const payload = {
    jobId,
    sceneGraphUrl: \`s3://aethel-render-assets/\${spec.projectId}/scene.json\`,
    sceneGraphUrl: `s3://aethel-render-assets/${spec.projectId}/scene.json`,
    resolution: spec.output.resolution,
    fps: spec.output.framerate,
    codec: spec.output.codec,
    webhookUrl: `https://api.aethel.com/webhooks/render-farm/complete`,
  }

  // Send network dispatch to SQS Queue
  const sqs = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' })
  const command = new SendMessageCommand({
    QueueUrl: process.env.RENDER_FARM_SQS_QUEUE_URL,
    MessageBody: JSON.stringify(payload),
    MessageGroupId: spec.projectId, // Guarantee FIFO ordering per project
  })

  try {
    await sqs.send(command)
    console.log(`[Render Farm] Dispatched job ${jobId} to AWS SQS (Queue: ${process.env.RENDER_FARM_SQS_QUEUE_URL})`)
  } catch (error) {
    console.error(`[Render Farm] Failed to dispatch job ${jobId} to AWS SQS`, error)
    throw error
  }
  
  // Return early, the actual completion will hit the webhook
  return {
    status: 'dispatched',
    provider: 'aws-ec2-g4dn',
    estimatedQueueTimeMs: 15000,
  }
}

/**
 * Simulates the Webhook receiver from AWS when FFmpeg finishes compiling the .mp4
 */
export async function handleRenderWebhook(jobId: string, awsResult: any) {
  if (awsResult.status === 'success') {
    // 1. Update DB state
    console.log(\`[Render Farm] Job \${jobId} completed successfully. Artifact: \${awsResult.artifactUrl}\`)
    
    // 2. Trigger Billing Accumulator
    const durationSec = awsResult.computeDurationSec || 120
    await chargeUserForGPUCompute(jobId, durationSec)
  } else {
    console.error(\`[Render Farm] Job \${jobId} failed on AWS.\`, awsResult.error)
  }
}

async function chargeUserForGPUCompute(jobId: string, secondsUsed: number) {
  // Plugs into redis-billing-accumulator.ts logic
  const costPerSecond = 0.005 // $0.005 per sec of AWS GPU
  const totalCost = secondsUsed * costPerSecond
  console.log(\`[Billing] Charging \${totalCost.toFixed(3)} USD for Job \${jobId}\`)
}
