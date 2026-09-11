import { LoginForm } from '@/components/admin/login-form';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default function AdminLoginPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-16rem)] max-w-[22rem] flex-col justify-center pb-16 pt-8">
      <h1 className="font-display text-[30px] font-semibold leading-tight tracking-display">
        Operator access
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
        One password, one session, twelve hours. There is no account to recover.
      </p>

      <div className="mt-8 border-t border-line pt-8">
        <LoginForm />
      </div>
    </div>
  );
}
