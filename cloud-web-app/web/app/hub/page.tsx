import { redirect } from 'next/navigation'

/**
 * Hub RTv1 — /hub is an alias of Arcade Showcase (I.5/I.6).
 * No parallel fake store; deepen /arcade instead.
 */
export default function HubAliasPage() {
  redirect('/arcade')
}
