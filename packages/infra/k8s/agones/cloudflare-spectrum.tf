# OMNI-PLAN PILAR 3 (A Frota) — Cloudflare Spectrum Anycast in front of the
# `aethel-headless` Fleet, so a player's client ever only sees a Cloudflare
# Anycast IP, never a raw cluster node IP (DDoS protection: an attacker
# flooding the address a player connects to can't reach the actual game
# node — the flood lands on Cloudflare's Anycast edge instead).
#
# NOT A KUBERNETES RESOURCE: Spectrum is a Cloudflare product configured via
# the Cloudflare API/Terraform provider, not a K8s CRD — it lives in this
# directory because it's Pilar 3 infra-as-code, applied with `terraform
# apply`, not `kubectl apply`.
#
# HONEST SCOPE / CAVEAT: Agones' `Dynamic` port policy (see `fleet.yaml`)
# binds each GameServer to a random hostPort within the cluster's configured
# range on whichever node it lands on — there is no single stable origin
# IP:port pair to point Spectrum at. This resource fronts the *whole*
# cluster's node pool over the *whole* configured Dynamic port range
# (`AGONES_DYNAMIC_PORT_MIN`-`AGONES_DYNAMIC_PORT_MAX`, matched to the
# `var.agones_dynamic_port_range` below) via `origin_direct`'s multi-IP
# support. This is a real, schema-correct Spectrum config, but the
# port-preservation behavior across multiple `origin_direct` targets (i.e.
# whether Spectrum reliably reaches the exact node a specific GameServer was
# scheduled to, not just *some* node listening on that port number) has not
# been validated against Aethel's actual node topology — verify this against
# a real allocation before relying on it in production. A safer, more
# standard alternative used by several Agones + Cloudflare deployments is to
# route Spectrum at a cloud UDP Network Load Balancer's static IP instead of
# node IPs directly (`origin_dns` pointed at the LB's hostname) — left as
# the first thing to validate once a real cluster exists.
terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

variable "cloudflare_zone_id" {
  description = "Zone ID for the domain fronting the Aethel dedicated-server fleet (e.g. play.aethel.io)."
  type        = string
}

variable "agones_node_ips" {
  description = "Public IPs of the Kubernetes nodes Agones schedules GameServer pods onto. IGNORED when `agones_udp_load_balancer_hostname` is set — see that variable. Only used for the direct-to-node fallback, which is NOT the recommended production path (see caveat above and README.md)."
  type        = list(string)
  default     = []
}

variable "agones_udp_load_balancer_hostname" {
  description = <<-EOT
    RECOMMENDED for production. Hostname of a cloud UDP Network Load Balancer
    (AWS NLB in UDP mode, GCP passthrough Network LB, or Azure Load Balancer
    in UDP mode) fronting every node in the Agones-managed node pool across
    the full `agones_dynamic_port_range`. When set, Spectrum routes via
    `origin_dns` at this single stable hostname instead of enumerating raw,
    ephemeral node IPs in `agones_node_ips` — the LB (not this Terraform
    config) is then responsible for reaching whichever node a given
    GameServer's Dynamic port actually landed on. Leave empty only for local/
    single-node cluster experiments; set this before any real player traffic.
  EOT
  type    = string
  default = ""
}

variable "agones_dynamic_port_range" {
  description = "Must match the Agones controller's --min-port/--max-port install flags, and fleet.yaml's `game` port policy."
  type = object({
    min = number
    max = number
  })
  default = { min = 7000, max = 8000 }
}

locals {
  # `true` once a real UDP load balancer hostname is supplied — this is the
  # production-recommended path per README.md's "Load Balancer UDP" section.
  use_load_balancer_origin = length(var.agones_udp_load_balancer_hostname) > 0
}

resource "cloudflare_spectrum_application" "aethel_headless_fleet" {
  zone_id = var.cloudflare_zone_id

  dns {
    type = "CNAME"
    name = "play.aethel.io"
  }

  protocol       = "udp/${var.agones_dynamic_port_range.min}-${var.agones_dynamic_port_range.max}"
  traffic_type   = "direct"
  proxy_protocol = "simple" # UDP-only PROXY protocol variant — the headless server must parse it to recover the real player IP (needed for region/ping-aware matchmaking telemetry).

  # RECOMMENDED: single stable hostname behind a real UDP load balancer that
  # itself knows how to reach whichever node a GameServer's Dynamic port
  # landed on. `origin_dns` is a nested BLOCK (not an object attribute) on
  # the `~> 4.0` provider line this file is pinned to, so it must be toggled
  # with `dynamic`, not a ternary assignment — a plain `origin_dns = cond ?
  # {...} : null` is v5-provider syntax and will not parse against v4.
  # No explicit `origin_port` is set: it is omitted so the origin port
  # mirrors the edge protocol's port range 1:1 (verify this default against
  # the provider version actually pinned before relying on it in prod).
  dynamic "origin_dns" {
    for_each = local.use_load_balancer_origin ? [var.agones_udp_load_balancer_hostname] : []
    content {
      name = origin_dns.value
    }
  }

  # FALLBACK (dev/single-node only): enumerate raw node IPs directly —
  # fragile the moment Agones schedules a GameServer onto a node not in this
  # static list, or a node is replaced by the cluster autoscaler. Omitted
  # entirely (not just emptied) once a load balancer hostname is set, since
  # `origin_direct` and `origin_dns` are mutually exclusive destinations.
  origin_direct = local.use_load_balancer_origin ? null : [for ip in var.agones_node_ips : "udp://${ip}"]

  # Cloudflare's Anycast network absorbs volumetric DDoS at the edge before
  # it ever reaches an Aethel-owned node — this IS the "esconder o IP do
  # servidor" requirement from the brief; the fleet's real node IPs are only
  # ever known to this Terraform config and Agones itself, never returned to
  # a game client (see `dedicated-server-authority.ts`'s `publicAddress`,
  # which always prefers `CLOUDFLARE_SPECTRUM_ANYCAST_HOST` over the raw
  # Agones-allocated address).

  lifecycle {
    precondition {
      condition     = local.use_load_balancer_origin || length(var.agones_node_ips) > 0
      error_message = "Set either agones_udp_load_balancer_hostname (recommended) or agones_node_ips (dev-only fallback)."
    }
  }
}

output "spectrum_public_hostname" {
  value       = cloudflare_spectrum_application.aethel_headless_fleet.dns[0].name
  description = "Set this as CLOUDFLARE_SPECTRUM_ANYCAST_HOST in the web app's environment."
}
