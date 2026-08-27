import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  AiChat02Icon,
  Alert01Icon,
  Cancel01Icon,
  Loading03Icon,
  SecurityCheckIcon,
  Tick01Icon,
} from '@hugeicons/core-free-icons';
import { supabase } from '../lib/supabaseClient';
import { LoginAluno } from './LoginAluno';
import logoIcon from '../assets/logo-compact.png';

type ProfileRole = 'student' | 'teacher' | 'admin' | null;

interface OAuthConsentProps {
  session: Session | null;
  profileRole: ProfileRole;
  profileLoaded: boolean;
}

interface AuthorizationDetails {
  authorization_id: string;
  redirect_uri: string;
  client: {
    id: string;
    name: string;
    uri: string;
    logo_uri: string;
  };
  user: {
    id: string;
    email: string;
  };
  scope: string;
}

const isRedirect = (value: unknown): value is { redirect_url: string } => (
  typeof value === 'object'
  && value !== null
  && 'redirect_url' in value
  && typeof value.redirect_url === 'string'
);

const friendlyError = (message?: string) => {
  if (!message) return 'Não foi possível carregar esta solicitação de conexão.';
  if (message.toLowerCase().includes('expired')) {
    return 'Esta solicitação expirou. Volte ao ChatGPT e tente conectar novamente.';
  }
  return message;
};

export function OAuthConsent({ session, profileRole, profileLoaded }: OAuthConsentProps) {
  const authorizationId = useMemo(
    () => new URLSearchParams(window.location.search).get('authorization_id'),
    [],
  );
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<'approve' | 'deny' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isTeacher = profileRole === 'teacher' || profileRole === 'admin';

  useEffect(() => {
    if (!session || !profileLoaded || !isTeacher || !authorizationId) return;

    let active = true;

    void supabase.auth.oauth.getAuthorizationDetails(authorizationId).then(({ data, error }) => {
      if (!active) return;
      if (error || !data) {
        setError(friendlyError(error?.message));
        setLoading(false);
        return;
      }
      if (isRedirect(data)) {
        window.location.assign(data.redirect_url);
        return;
      }
      setDetails(data as AuthorizationDetails);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [authorizationId, isTeacher, profileLoaded, session]);

  const decide = async (decision: 'approve' | 'deny') => {
    if (!authorizationId || (decision === 'approve' && !isTeacher)) return;
    setAction(decision);
    setError(null);

    const request = decision === 'approve'
      ? supabase.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
      : supabase.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true });
    const { data, error } = await request;

    if (error || !data?.redirect_url) {
      setError(friendlyError(error?.message));
      setAction(null);
      return;
    }
    window.location.assign(data.redirect_url);
  };

  if (!authorizationId) {
    return (
      <ConsentShell>
        <StatusCard
          title="Solicitação inválida"
          message="O código de autorização não foi informado. Inicie a conexão novamente pelo ChatGPT."
        />
      </ConsentShell>
    );
  }

  if (!session) {
    return (
      <ConsentShell>
        <div className="mb-4 rounded-product-control border border-primary/20 bg-primary/5 p-4 text-center">
          <p className="text-xs font-bold text-primary">Conexão segura com o ChatGPT</p>
          <p className="mt-1 text-xs text-on-surface-variant">Entre com sua conta de professor para continuar.</p>
        </div>
        <LoginAluno
          onNavigateToSignup={() => undefined}
          onAuthSuccess={() => undefined}
          title="Autorizar com o Estudea"
          description="Use o mesmo e-mail e senha da sua conta de professor."
          submitLabel="Entrar e continuar"
          hideRegistration
        />
      </ConsentShell>
    );
  }

  if (!profileLoaded) {
    return (
      <ConsentShell>
        <div className="product-card flex flex-col items-center gap-3 p-8 text-center">
          <HugeiconsIcon icon={Loading03Icon} size={32} className="animate-spin text-primary" />
          <p className="text-sm font-bold text-on-surface">Verificando a conexão...</p>
        </div>
      </ConsentShell>
    );
  }

  if (!isTeacher) {
    return (
      <ConsentShell>
        <StatusCard
          title="Acesso exclusivo para professores"
          message="Esta conta é de estudante. Entre com uma conta de professor ou administrador para conectar o ChatGPT ao Estudea."
        >
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void decide('deny')}
              disabled={action !== null}
              className="product-secondary-action justify-center text-xs"
            >
              {action === 'deny' && <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin" />}
              Cancelar conexão
            </button>
            <button
              type="button"
              onClick={() => void supabase.auth.signOut()}
              disabled={action !== null}
              className="product-primary-action justify-center text-xs"
            >
              Entrar com outra conta
            </button>
          </div>
        </StatusCard>
      </ConsentShell>
    );
  }

  if (loading) {
    return (
      <ConsentShell>
        <div className="product-card flex flex-col items-center gap-3 p-8 text-center">
          <HugeiconsIcon icon={Loading03Icon} size={32} className="animate-spin text-primary" />
          <p className="text-sm font-bold text-on-surface">Verificando a conexão...</p>
        </div>
      </ConsentShell>
    );
  }

  if (error || !details) {
    return (
      <ConsentShell>
        <StatusCard title="Não foi possível conectar" message={error || 'A solicitação não está mais disponível.'} />
      </ConsentShell>
    );
  }

  const clientName = details.client.name || 'ChatGPT';

  return (
    <ConsentShell>
      <div className="product-card overflow-hidden">
        <div className="border-b border-outline-variant/60 bg-gradient-to-br from-primary/10 via-surface-container-lowest to-secondary/10 p-6 text-center">
          <div className="mx-auto flex w-fit items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-surface-container-lowest shadow-sm">
              <img src={logoIcon} alt="Estudea" className="h-10 w-10 object-contain" />
            </span>
            <span className="text-xl font-bold text-on-surface-variant">+</span>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-secondary/20 bg-secondary/10 text-secondary shadow-sm">
              <HugeiconsIcon icon={AiChat02Icon} size={26} strokeWidth={2} />
            </span>
          </div>
          <h1 className="mt-4 font-heading text-xl font-extrabold text-on-surface">Conectar {clientName}</h1>
          <p className="mt-1 text-xs text-on-surface-variant">
            {details.user.email} autorizará o acesso à sua conta de professor.
          </p>
        </div>

        <div className="space-y-5 p-6">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-on-surface-variant">O que será permitido</p>
            <ul className="mt-3 space-y-3">
              {[
                'Consultar seus cursos, módulos, turmas e aulas.',
                'Criar aulas completas sempre como rascunho.',
                'Liberar uma aula somente depois da sua confirmação no chat.',
              ].map((permission) => (
                <li key={permission} className="flex items-start gap-2.5 text-xs font-medium text-on-surface">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <HugeiconsIcon icon={Tick01Icon} size={13} strokeWidth={2.5} />
                  </span>
                  {permission}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-start gap-2.5 rounded-product-control border border-outline-variant/60 bg-surface-container-low p-3.5">
            <HugeiconsIcon icon={SecurityCheckIcon} size={18} className="mt-0.5 shrink-0 text-primary" strokeWidth={2} />
            <p className="text-[11px] font-medium leading-relaxed text-on-surface-variant">
              O ChatGPT não receberá sua senha. O acesso usa uma autorização individual, respeita as permissões do Estudea e pode ser revogado quando quiser.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-product-control border border-error/20 bg-error/10 p-3 text-xs font-semibold text-error">
              <HugeiconsIcon icon={Alert01Icon} size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void decide('deny')}
              disabled={action !== null}
              className="product-secondary-action justify-center text-xs"
            >
              {action === 'deny'
                ? <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin" />
                : <HugeiconsIcon icon={Cancel01Icon} size={16} />}
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void decide('approve')}
              disabled={action !== null}
              className="product-primary-action justify-center text-xs"
            >
              {action === 'approve'
                ? <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin" />
                : <HugeiconsIcon icon={SecurityCheckIcon} size={16} />}
              Autorizar conexão
            </button>
          </div>
        </div>
      </div>
    </ConsentShell>
  );
}

function ConsentShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background p-4 font-sans text-on-background">
      <div className="pointer-events-none absolute right-1/4 top-0 h-[420px] w-[420px] rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 h-[360px] w-[360px] rounded-full bg-secondary/5 blur-3xl" />
      <div className="relative z-10 w-full max-w-lg">{children}</div>
    </main>
  );
}

function StatusCard({
  title,
  message,
  children,
}: {
  title: string;
  message: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="product-card p-7 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-error/10 text-error">
        <HugeiconsIcon icon={Alert01Icon} size={24} strokeWidth={2} />
      </span>
      <h1 className="mt-4 font-heading text-lg font-extrabold text-on-surface">{title}</h1>
      <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">{message}</p>
      {children}
    </div>
  );
}
