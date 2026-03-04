import { NextResponse } from 'next/server'

export function GET(request: Request) {
  return NextResponse.redirect(new URL('/icons/favicon.ico', request.url), {
    status: 307,
  })
}
