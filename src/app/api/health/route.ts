import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Quick DB connectivity check
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      {
        status: 'healthy',
        service: 'remique-api',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        status: 'degraded',
        error: err.message,
      },
      { status: 503 }
    );
  }
}
