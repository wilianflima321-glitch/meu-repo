"use client";
import Image from 'next/image';
import Link from 'next/link';

export default function AethelHeader() {
  return (
    <header className="aethel-container aethel-flex aethel-justify-between aethel-items-center aethel-p-4" role="banner">
      <div className="aethel-flex aethel-items-center aethel-gap-3">
        <Image src="/aethel-logo.svg" alt="Aethel" width={28} height={28} />
        <Link href="/" className="aethel-button aethel-button-ghost" aria-label="Home">
          Aethel IDE
        </Link>
      </div>
      <nav className="aethel-flex aethel-gap-3" aria-label="Primary">
        <Link className="aethel-button aethel-button-ghost" href="/download">Download</Link>
        <Link className="aethel-button aethel-button-ghost" href="/chat">Chat</Link>
        <Link className="aethel-button aethel-button-ghost" href="/health">Health</Link>
      </nav>
    </header>
  );
}
