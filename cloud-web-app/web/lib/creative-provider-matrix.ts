/**
 * Creative + LLM capability matrix — canonical entitlements and provider routing.
 * @see docs/architecture/AETHEL_AI_PROVIDER_CAPABILITY_MATRIX.md
 * @see docs/architecture/contracts_planning.md §6.4–§6.7
 */

import type { PlanId } from './plans';
import { AI_EXPENSIVE_IMAGE_RATE_LIMIT, AI_EXPENSIVE_3D_RATE_LIMIT, AI_EXPENSIVE_MUSIC_RATE_LIMIT, AI_EXPENSIVE_VIDEO_RATE_LIMIT, AI_EXPENSIVE_VOICE_RATE_LIMIT } from './server/ai-core-rate-limit';

export type CreativeModality = 'llm' | 'image' | 'model3d' | 'video' | 'music' | 'voice' | 'voiceTranscribe';

export type ProviderShipStatus = 'live' | 'partial' | 'planned' | 'byok_only';

export type CreativeProviderSpec = {
	id: string;
	name: string;
	modality: CreativeModality;
	status: ProviderShipStatus;
	envKeys: string[];
	bestFor: string[];
	avoidFor: string[];
	notes?: string;
};

/** Weighted-token debit estimates — mirror `estimateExpensiveAiGenerationCost`. */
export const CREATIVE_WEIGHTED_TOKEN_ESTIMATES = {
	imageStandard: 12_000,
	imageHd: 20_000,
	model3dDraft: 20_000,
	model3dStandard: 35_000,
	model3dHigh: 60_000,
	musicPerMinute: 900,
	musicMin: 15_000,
	videoPerSecond720p: 38_000,
	videoPerSecond1080p: 55_000,
	videoMinJob: 80_000,
	voicePer1kChars: 500,
} as const;

/** Block 6F.2 — 1000 weighted ≈ 1 creative credit */
export const CREATIVE_CREDITS_PER_WEIGHTED_K = 1_000;

export function creativeCreditsFromWeighted(weightedTokens: number): number {
	if (!Number.isFinite(weightedTokens) || weightedTokens <= 0) return 0;
	return Math.max(1, Math.ceil(weightedTokens / CREATIVE_CREDITS_PER_WEIGHTED_K));
}

/** Itemized price table (educational + debit source). */
export const CREATIVE_MODALITY_CREDIT_TABLE = {
	image_standard: creativeCreditsFromWeighted(CREATIVE_WEIGHTED_TOKEN_ESTIMATES.imageStandard),
	image_hd: creativeCreditsFromWeighted(CREATIVE_WEIGHTED_TOKEN_ESTIMATES.imageHd),
	model3d_draft: creativeCreditsFromWeighted(CREATIVE_WEIGHTED_TOKEN_ESTIMATES.model3dDraft),
	model3d_standard: creativeCreditsFromWeighted(CREATIVE_WEIGHTED_TOKEN_ESTIMATES.model3dStandard),
	model3d_high: creativeCreditsFromWeighted(CREATIVE_WEIGHTED_TOKEN_ESTIMATES.model3dHigh),
	video_min_job: creativeCreditsFromWeighted(CREATIVE_WEIGHTED_TOKEN_ESTIMATES.videoMinJob),
	music_min: creativeCreditsFromWeighted(CREATIVE_WEIGHTED_TOKEN_ESTIMATES.musicMin),
	voice_1k_chars: creativeCreditsFromWeighted(CREATIVE_WEIGHTED_TOKEN_ESTIMATES.voicePer1kChars),
} as const;

export const CREATIVE_HOURLY_RATE_LIMITS = {
	image: AI_EXPENSIVE_IMAGE_RATE_LIMIT.maxRequests,
	model3d: AI_EXPENSIVE_3D_RATE_LIMIT.maxRequests,
	music: AI_EXPENSIVE_MUSIC_RATE_LIMIT.maxRequests,
	video: AI_EXPENSIVE_VIDEO_RATE_LIMIT.maxRequests,
	voice: AI_EXPENSIVE_VOICE_RATE_LIMIT.maxRequests,
} as const;

export const LLM_PROVIDERS: CreativeProviderSpec[] = [
	{
		id: 'openrouter',
		name: 'OpenRouter',
		modality: 'llm',
		status: 'live',
		envKeys: ['OPENROUTER_API_KEY'],
		bestFor: ['chat', 'code', 'planning', 'tool-use', 'vision-analysis'],
		avoidFor: ['pixel-generation', 'mesh-export', 'video-render'],
		notes: 'Routed by Aethel Fusion (`intelligent-model-router.ts`), not OpenRouter Auto.',
	},
];

export const IMAGE_PROVIDERS: CreativeProviderSpec[] = [
	{ id: 'flux', name: 'Flux', modality: 'image', status: 'live', envKeys: ['FLUX_API_KEY'], bestFor: ['textures', 'concept-art', 'PBR-ref'], avoidFor: ['typography-heavy UI'] },
	{ id: 'dalle', name: 'DALL-E 3', modality: 'image', status: 'live', envKeys: ['OPENAI_API_KEY'], bestFor: ['marketing stills', 'key art'], avoidFor: ['tileable textures at scale'] },
	{ id: 'stable-diffusion', name: 'Stable Diffusion', modality: 'image', status: 'live', envKeys: ['STABILITY_API_KEY'], bestFor: ['sprites', 'style exploration'], avoidFor: ['legal-sensitive likeness'] },
];

export const MODEL3D_PROVIDERS: CreativeProviderSpec[] = [
	{ id: 'meshy', name: 'Meshy', modality: 'model3d', status: 'live', envKeys: ['MESHY_API_KEY'], bestFor: ['hero props', 'textured characters', 'image-to-3d'], avoidFor: ['final USD without S7 cook'] },
	{ id: 'tripo3d', name: 'Tripo3D', modality: 'model3d', status: 'live', envKeys: ['TRIPO_API_KEY'], bestFor: ['blockout', 'rapid iteration'], avoidFor: ['production rigged hero without cleanup'] },
];

export const VIDEO_PROVIDERS: CreativeProviderSpec[] = [
	{ id: 'google-veo', name: 'Google Veo (planned)', modality: 'video', status: 'planned', envKeys: ['GOOGLE_VEO_API_KEY'], bestFor: ['opt-in B-roll / moodboard only'], avoidFor: ['default cutscene path — use engine Director capture (Decision #63)'], notes: 'Primary cinematics = Sequencer + GPU capture, not Veo' },
	{ id: 'sora', name: 'Sora', modality: 'video', status: 'partial', envKeys: ['SORA_API_KEY', 'SORA_VIDEO_ENDPOINT'], bestFor: ['opt-in short B-roll'], avoidFor: ['default game cinematic — Decision #63'] },
	{ id: 'runway', name: 'Runway', modality: 'video', status: 'partial', envKeys: ['RUNWAY_API_KEY', 'RUNWAY_VIDEO_ENDPOINT'], bestFor: ['opt-in B-roll'], avoidFor: ['default cutscene — Decision #63'] },
	{ id: 'pika', name: 'Pika', modality: 'video', status: 'partial', envKeys: ['PIKA_API_KEY', 'PIKA_VIDEO_ENDPOINT'], bestFor: ['opt-in social shorts'], avoidFor: ['long-form cutscenes — Decision #63'] },
	{ id: 'custom-webhook', name: 'Custom Webhook', modality: 'video', status: 'live', envKeys: ['AETHEL_VIDEO_GENERATION_WEBHOOK_URL'], bestFor: ['external Veo/Luma/Kling when wired'], avoidFor: ['default cinematic; unaudited endpoints'] },
];

export const MUSIC_PROVIDERS: CreativeProviderSpec[] = [
	{ id: 'suno', name: 'Suno', modality: 'music', status: 'live', envKeys: ['SUNO_API_KEY'], bestFor: ['exclusive sung OST / lyrics — Plan B (#64)'], avoidFor: ['Foley, footsteps, gunshots, rain — use library + MetaSounds'] },
	{ id: 'musicgen', name: 'MusicGen (Replicate)', modality: 'music', status: 'live', envKeys: ['REPLICATE_API_TOKEN'], bestFor: ['rare stinger when library miss + user confirm'], avoidFor: ['default world SFX (#64)'] },
];

export const VOICE_PROVIDERS: CreativeProviderSpec[] = [
	{ id: 'elevenlabs', name: 'ElevenLabs', modality: 'voice', status: 'live', envKeys: ['ELEVENLABS_API_KEY'], bestFor: ['speech / say player name — Plan B (#64)'], avoidFor: ['Foley replacement'] },
	{ id: 'openai-tts', name: 'OpenAI TTS', modality: 'voice', status: 'live', envKeys: ['OPENAI_API_KEY'], bestFor: ['draft VO'], avoidFor: ['world SFX'] },
	{ id: 'azure-speech', name: 'Azure Speech', modality: 'voice', status: 'live', envKeys: ['AZURE_SPEECH_KEY'], bestFor: ['enterprise SSML'], avoidFor: ['indie Foley path'] },
];

export type PlanCreativeEntitlements = {
	/** Platform-funded LLM via Fusion. */
	llmPlatform: boolean;
	/** `creative` domain — required for /api/ai/{image,3d,video,music,voice}. */
	creativeDomain: boolean;
	/** Multimodal jobs debit same UsageBucket weighted tokens — retired by 6F. */
	creativeDebitsLlmPool: boolean;
	/** Block 6F — separate Creative Wallet lane (LIVE). */
	creativeSeparateWallet: boolean;
	/** Monthly included creative credits (0 = none; -1 = unlimited). */
	includedCreativeCreditsPerMonth: number;
	hourlyLimits: Partial<typeof CREATIVE_HOURLY_RATE_LIMITS>;
	modalityAccess: Record<Exclude<CreativeModality, 'llm'>, 'blocked' | 'metered' | 'unlimited'>;
	fusionTaskKinds: string[];
};

const STARTER_CREATIVE: PlanCreativeEntitlements = {
	llmPlatform: true,
	creativeDomain: true,
	creativeDebitsLlmPool: false,
	creativeSeparateWallet: true,
	includedCreativeCreditsPerMonth: 100,
	hourlyLimits: { image: 10, model3d: 5, music: 10, video: 2, voice: 20 },
	modalityAccess: { image: 'metered', model3d: 'metered', video: 'metered', music: 'metered', voice: 'metered', voiceTranscribe: 'metered' },
	fusionTaskKinds: ['simple-chat', 'code', 'bulk-cheap', 'tool-use'],
};

const PRO_CREATIVE: PlanCreativeEntitlements = {
	llmPlatform: true,
	creativeDomain: true,
	creativeDebitsLlmPool: false,
	creativeSeparateWallet: true,
	includedCreativeCreditsPerMonth: 800,
	hourlyLimits: CREATIVE_HOURLY_RATE_LIMITS,
	modalityAccess: { image: 'metered', model3d: 'metered', video: 'metered', music: 'metered', voice: 'metered', voiceTranscribe: 'metered' },
	fusionTaskKinds: ['code', 'planning', 'tool-use', 'vision', 'critic', 'mesh-generation', 'texture-generation', 'world-layout'],
};

export const PLAN_CREATIVE_ENTITLEMENTS: Record<PlanId, PlanCreativeEntitlements> = {
	free: {
		llmPlatform: true,
		creativeDomain: false,
		creativeDebitsLlmPool: false,
		creativeSeparateWallet: true,
		includedCreativeCreditsPerMonth: 0,
		hourlyLimits: {},
		modalityAccess: {
			image: 'blocked',
			model3d: 'blocked',
			video: 'blocked',
			music: 'blocked',
			voice: 'blocked',
			voiceTranscribe: 'blocked',
		},
		fusionTaskKinds: ['simple-chat', 'bulk-cheap'],
	},
	starter: STARTER_CREATIVE,
	basic: PRO_CREATIVE,
	pro: PRO_CREATIVE,
	studio: {
		...PRO_CREATIVE,
		includedCreativeCreditsPerMonth: 2500,
		hourlyLimits: { image: 30, model3d: 30, music: 45, video: 15, voice: 80 },
		fusionTaskKinds: [...PRO_CREATIVE.fusionTaskKinds, 'deep-reasoning', 'material-authoring', 'ecosystem-population'],
	},
	enterprise: {
		...PRO_CREATIVE,
		creativeSeparateWallet: true,
		includedCreativeCreditsPerMonth: -1,
		hourlyLimits: { image: -1, model3d: -1, music: -1, video: -1, voice: -1 },
		modalityAccess: {
			image: 'unlimited',
			model3d: 'unlimited',
			video: 'unlimited',
			music: 'unlimited',
			voice: 'unlimited',
			voiceTranscribe: 'unlimited',
		},
	},
};

export function getCreativeEntitlements(planId: PlanId): PlanCreativeEntitlements {
	return PLAN_CREATIVE_ENTITLEMENTS[planId] ?? PLAN_CREATIVE_ENTITLEMENTS.free;
}

export const FUSION_TASK_TO_MODALITY: Record<string, CreativeModality | 'llm'> = {
	code: 'llm',
	planning: 'llm',
	'tool-use': 'llm',
	vision: 'llm',
	critic: 'llm',
	'mesh-generation': 'model3d',
	'texture-generation': 'image',
	'world-layout': 'llm',
	'material-authoring': 'llm',
	'ecosystem-population': 'llm',
	'creative-writing': 'llm',
	'deep-reasoning': 'llm',
	'simple-chat': 'llm',
	'bulk-cheap': 'llm',
};

/** Known gaps — binding critique register (Wave 6–J). */
export const AI_CAPABILITY_GAPS = [
	{ id: 'GAP-FUSION-01', severity: 'high', gap: 'Fusion routes LLM only; creative providers not in intelligent-model-router', fix: 'Onda J.1 CreativeBridge + creative task router' },
	{ id: 'GAP-FUSION-02', severity: 'high', gap: 'Multimodal debits same token pool as chat — one video can exhaust Pro quota', fix: 'CLOSED 6F — Creative Wallet lane' },
	{ id: 'GAP-FUSION-03', severity: 'high', gap: 'Orchestrator disabled in production', fix: 'Onda J.12 enable with CostGuard' },
	{ id: 'GAP-FUSION-04', severity: 'high', gap: 'Agent creative tools fail-closed while HTTP APIs work', fix: 'Wire ai-tools-registry.creative → CreativeBridge' },
	{ id: 'GAP-FUSION-05', severity: 'medium', gap: 'Pixel video providers exist but must not be default cinematic path', fix: 'Decision #63 Director capture; Veo/Sora opt-in B-roll only' },
	{ id: 'GAP-FUSION-06', severity: 'medium', gap: 'Critic/Actor can share model family → sycophancy', fix: 'Force critic TaskKind + different family in router' },
	{ id: 'GAP-FUSION-07', severity: 'medium', gap: '3D output bypasses USD/S7 cook if user skips pipeline', fix: 'Publish gate requires ingest job receipt' },
	{ id: 'GAP-FUSION-08', severity: 'low', gap: 'OpenRouter catalog manual; no auto-sync', fix: 'Weekly catalog diff CI gate' },
	{ id: 'GAP-FUSION-09', severity: 'high', gap: 'Product may route Foley/SFX to gen music/voice APIs', fix: 'Decision #64 — library search + MetaSounds default; gen Plan B only' },
] as const;
