import type { NativeKernelManifest } from '../../../../packages/aethel-ide-shared/src/runtime-adapter/types'
import type { StudioLocalDesktopManifest } from '../desktop-capability-manifest'

type CapabilityProbeProps = {
  manifest: StudioLocalDesktopManifest
  kernel: NativeKernelManifest | null
}

export function CapabilityProbe({ manifest, kernel }: CapabilityProbeProps) {
  const held = manifest.capabilities.filter((capability) => capability.state === 'held').length

  return (
    <section className="panel">
      <div className="panel-heading">
        <span>Capability manifest</span>
        <strong>{held} held</strong>
      </div>
      <ul className="capability-list" aria-label="Studio Local capability manifest">
        {manifest.capabilities.map((capability) => (
          <li key={capability.id} data-state={capability.state}>
            <span>{capability.id}</span>
            <em>{capability.state}</em>
          </li>
        ))}
      </ul>
      <p>
        Kernel target: {kernel?.target ?? manifest.target}. Claims stay held until receipts exist.
      </p>
    </section>
  )
}
