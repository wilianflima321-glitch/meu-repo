# Agones Fleet — OMNI-PLAN PILAR 3 (A Frota)

Kubernetes/Terraform infra-as-code for Aethel's dedicated-server fleet. This
directory does **not** stand up a cluster or install Agones itself — it
assumes both already exist, and defines the Aethel-specific resources on top.

## What's here

| File | Applies with | Purpose |
|---|---|---|
| `namespace.yaml` | `kubectl` / kustomize | `aethel-fleet` namespace |
| `fleet.yaml` | `kubectl` / kustomize | The `aethel-headless` Agones `Fleet` (GameServer template) |
| `fleetautoscaler.yaml` | `kubectl` / kustomize | Buffer-policy `FleetAutoscaler` for `aethel-headless` |
| `cloudflare-spectrum.tf` | `terraform apply` | Anycast/DDoS-hiding edge in front of the fleet's UDP ports |
| `kustomization.yaml` | `kubectl apply -k .` | Ties the three K8s manifests together |

## Prerequisites this repo does not automate

1. **A running Kubernetes cluster** (GKE/EKS/AKS or self-managed) with a
   cluster-autoscaler, so `fleetautoscaler.yaml` scaling the `Fleet` up
   actually provisions new nodes rather than stalling on `Pending` pods.
2. **Agones installed** on that cluster (Helm chart `agones/agones`), which
   registers the `agones.dev/v1` and `autoscaling.agones.dev/v1` CRDs these
   manifests depend on, and must be configured with a
   `--min-port`/`--max-port` range matching
   `cloudflare-spectrum.tf`'s `agones_dynamic_port_range` variable.
3. **A published `ghcr.io/aethel-engine/headless:latest` image** — a
   headless (no window, no wgpu presentation surface) Linux build target of
   `apps/studio-local/src-tauri`'s physics/ECS kernel does not exist yet.
   `fleet.yaml` is the consumer contract that build needs to satisfy
   (env vars, port 7777/UDP, Agones SDK health pings via `sdkServer`), not a
   claim that image exists today.
4. **A Cloudflare account with Spectrum enabled** (Enterprise-tier add-on)
   and a zone for the domain fronting the fleet, plus `CLOUDFLARE_API_TOKEN`
   for Terraform.

## ⚠️ Requisito de Produção: Load Balancer UDP (Spectrum origin)

**`cloudflare-spectrum.tf`'s `origin_direct` (a static list of raw Kubernetes
node IPs) is a dev/single-node fallback only — never point production traffic
at it.** Agones' `Dynamic` port policy (`fleet.yaml`) schedules each
GameServer onto *any* node in the pool, on a random port within
`agones_dynamic_port_range`; a static node-IP list drifts out of date the
moment:

- the cluster autoscaler adds/replaces a node,
- a GameServer is rescheduled after a node drain, or
- the node pool is resized for a fleet scale-up (the exact scaling event
  `fleetautoscaler.yaml` exists to trigger).

**The fix is a real cloud UDP Load Balancer in front of the whole node pool**,
with Spectrum routing to its single stable hostname (`origin_dns`) instead of
enumerating node IPs (`origin_direct`). The LB — not this Terraform file — is
then responsible for reaching whichever node a given GameServer's Dynamic
port actually landed on:

| Cloud | Load Balancer to stand up | Mode |
|---|---|---|
| AWS (EKS) | Network Load Balancer (NLB) | UDP listener, cross-zone enabled, target group = node pool's instance/IP targets across the full `agones_dynamic_port_range` |
| GCP (GKE) | Passthrough Network Load Balancer | UDP forwarding rule, backend = node pool instance group |
| Azure (AKS) | Azure Load Balancer (Standard SKU) | UDP load-balancing rule across the node pool's backend pool |

Once that LB exists, set its DNS hostname as
`agones_udp_load_balancer_hostname` when applying this Terraform — this
switches `cloudflare-spectrum.tf` from the `origin_direct` node-IP fallback to
the recommended `origin_dns` path automatically:

```bash
terraform apply \
  -var="cloudflare_zone_id=<zone_id>" \
  -var="agones_udp_load_balancer_hostname=<your-udp-lb-hostname>"
```

This has **not** been validated against a real cluster (no live Agones
cluster exists in this environment to test against) — the Terraform is
schema-correct for the `~> 4.0` Cloudflare provider, but the actual
LB-to-node UDP passthrough path should be smoke-tested with a real
GameServer allocation before routing paying-customer traffic through it.

## Deploy order

```bash
# 1. K8s resources (Fleet + Autoscaler)
kubectl apply -k packages/infra/k8s/agones/

# 2. Cloudflare Spectrum edge (separate state, separate lifecycle)
cd packages/infra/k8s/agones
terraform init
terraform apply \
  -var="cloudflare_zone_id=<zone_id>" \
  -var='agones_node_ips=["<node-ip-1>","<node-ip-2>"]'

# 3. Wire the resulting hostname into the web app
#    (see lib/multiplayer/dedicated-server-authority.ts)
export CLOUDFLARE_SPECTRUM_ANYCAST_HOST=$(terraform output -raw spectrum_public_hostname)
export AGONES_ALLOCATOR_URL=https://<agones-allocator-service>
export AGONES_NAMESPACE=aethel-fleet
```

## How this connects to the rest of Pilar 1 / 4 / 5

- `lib/multiplayer/dedicated-server-authority.ts#requestDedicatedServerAllocation`
  is the only code path in the web app allowed to call the Agones allocator
  targeting this Fleet — see that file's docstring for what happens when
  `AGONES_ALLOCATOR_URL` isn't set (this environment today: a labeled
  `simulated: true` response, not a real allocation).
- `lib/redis-cost-guard.ts` gates every allocation *before* it reaches this
  Fleet — the Fleet's `maxReplicas` is a hard physical ceiling, not a
  per-developer entitlement.
- `apps/studio-local/src-tauri/src/physics_kernel.rs`'s `client_consensus`
  module (PILAR 4) is what `AETHEL_CLIENT_CONSENSUS_ENABLED=true` in
  `fleet.yaml` turns on inside the headless image: the server here validates
  plausibility, it does not re-simulate full physics for every entity.

## Known gaps (tracked, not hidden)

- No `Webhook`-type `FleetAutoscaler` policy tying scale-up decisions to
  `multiplayerCostGuard`'s aggregate spend view yet — see the comment at the
  bottom of `fleetautoscaler.yaml`.
- `cloudflare-spectrum.tf` now supports the recommended UDP-Load-Balancer
  origin (see "Requisito de Produção" above), but that path is itself
  unvalidated against a real cluster — no live Agones cluster exists in this
  environment to test the LB-to-node UDP passthrough against.
- No GameServerAllocationPolicy / multi-cluster federation — this is a
  single-cluster Fleet definition.
