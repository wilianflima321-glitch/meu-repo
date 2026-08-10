# ONNX fixtures (letters cu + da)

Expected soak weight path: `tiny-text-to-3d.onnx` in this directory.

**Letter cu (protocol CLOSED):** session state machine + VRAM pager around load/infer.
Absence of a non-empty `.onnx` → `probeOnnxOrtWeightsOnDisk().present === false`.

**Letter da (fixture honesty CLOSED / `nativeOnnxReady` HELD):** commercial text-to-3d
ONNX (TripoSR / InstantMesh-class) cannot be redistributed into this repo under current
**size + license** constraints. Do **not** invent Identity protobuf bytes and rename them
as text-to-3d to fake green. Do **not** flip `nativeOnnxReady` without:

1. Real text-to-3d `.onnx` on disk (Founder-licensed / redistributable), and
2. ORT runtime wired (web onnxruntime or cargo `local-ai`), and
3. cu soak evidence (`proveNativeOnnxOrtSoak` passes).

Until then: `probeNativeOnnxFixtureHonesty().stamp === 'HELD'`, BYOK clay (letter cb) remains.

**Top-8 #3 (`creative-onnx-session.ts`):** fail-closed session when model bytes missing
(finance-onnx pattern). Optional `loadOrtFixtureEvidence` may set local `ortFixtureLoaded`
for plumbing evidence only — **never** flips `nativeOnnxReady` or Meshy/Tripo parity.
Identity / mock theater fixtures are refused.

See `lib/native-gen/onnx-fixture-honesty.ts` + `__tests__/native-gen/onnx-fixture-honesty-da.test.ts`
+ `lib/native-gen/creative-onnx-session.ts`.
