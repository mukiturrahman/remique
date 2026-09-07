import { LoginForm } from '@/components/admin/login-form';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default function AdminLoginPage() {
  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="font-display text-2xl tracking-display">Sign in</h1>
      <p className="mt-1 mb-6 text-sm text-ink-3">Remique operator access.</p>
      <LoginForm />
    </div>
  );
}
