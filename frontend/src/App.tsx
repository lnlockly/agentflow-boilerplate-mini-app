import WebApp from '@twa-dev/sdk';
import { Sparkles } from 'lucide-react';

export default function App() {
  const user = WebApp.initDataUnsafe?.user;
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <section className="max-w-md w-full rounded-3xl border border-white/10 bg-neutral-900/60 p-8 backdrop-blur">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="text-brand-500" />
          <h1 className="text-2xl font-semibold tracking-tight">Mini App ready</h1>
        </div>
        <p className="text-neutral-400 text-sm leading-relaxed">
          Привет{user?.first_name ? `, ${user.first_name}` : ''}! Это шаблон.
          Coder agent заменит этот блок на реальный UI из brief.
        </p>
      </section>
    </main>
  );
}
