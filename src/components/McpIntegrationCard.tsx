import { useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  AiChat02Icon,
  ArrowUpRight01Icon,
  Copy01Icon,
  Loading03Icon,
  SecurityCheckIcon,
  Tick01Icon,
  Unlink01Icon,
} from '@hugeicons/core-free-icons';
import { supabase } from '../lib/supabaseClient';

interface OAuthGrant {
  client: {
    id: string;
    name: string;
    uri: string;
    logo_uri: string;
  };
  scopes: string[];
  granted_at: string;
}

const MCP_URL = (import.meta.env.VITE_MCP_PUBLIC_URL || 'https://mcp.estudea.com.br/mcp').replace(/\/$/, '');
const CHATGPT_URL = 'https://chatgpt.com';

export function McpIntegrationCard() {
  const [grants, setGrants] = useState<OAuthGrant[]>([]);
  const [loadingGrants, setLoadingGrants] = useState(true);
  const [oauthAvailable, setOauthAvailable] = useState(true);
  const [copied, setCopied] = useState(false);
  const [revokingClientId, setRevokingClientId] = useState<string | null>(null);
  const [grantError, setGrantError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void supabase.auth.oauth.listGrants().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setOauthAvailable(false);
        setGrants([]);
      } else {
        setOauthAvailable(true);
        setGrants((data || []) as OAuthGrant[]);
      }
      setLoadingGrants(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(MCP_URL);
    } catch {
      const input = document.createElement('input');
      input.value = MCP_URL;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  };

  const openChatGpt = () => {
    void copyAddress();
    window.open(CHATGPT_URL, '_blank', 'noopener,noreferrer');
  };

  const revoke = async (grant: OAuthGrant) => {
    if (!window.confirm(`Desconectar ${grant.client.name || 'esta integração'} da sua conta?`)) return;
    setRevokingClientId(grant.client.id);
    setGrantError(null);
    const { error } = await supabase.auth.oauth.revokeGrant({ clientId: grant.client.id });
    if (!error) {
      setGrants((current) => current.filter((item) => item.client.id !== grant.client.id));
    } else {
      setGrantError('Não foi possível desconectar agora. Tente novamente em instantes.');
    }
    setRevokingClientId(null);
  };

  return (
    <section className="product-card overflow-hidden" aria-labelledby="mcp-integration-title">
      <div className="border-b border-outline-variant/60 bg-gradient-to-br from-primary/10 via-surface-container-lowest to-secondary/10 p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-product-control border border-primary/20 bg-surface-container-lowest text-primary shadow-sm">
              <HugeiconsIcon icon={AiChat02Icon} size={23} strokeWidth={2} />
            </span>
            <div>
              <span className="product-section-kicker">Integrações com IA</span>
              <h2 id="mcp-integration-title" className="font-heading text-lg font-extrabold text-on-surface">
                Criar aulas pelo ChatGPT
              </h2>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-on-surface-variant">
                Conecte sua conta uma única vez. Depois, você poderá pedir ao ChatGPT para consultar cursos, preparar aulas em rascunho e liberá-las com sua confirmação.
              </p>
            </div>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            <HugeiconsIcon icon={SecurityCheckIcon} size={14} strokeWidth={2} />
            OAuth individual
          </span>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <ol className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            ['1', 'Abra o ChatGPT', 'O endereço do Estudea será copiado automaticamente.'],
            ['2', 'Adicione a conexão', 'Cole o endereço MCP nas configurações de conectores.'],
            ['3', 'Autorize sua conta', 'Entre no Estudea e confirme o acesso na tela segura.'],
          ].map(([number, title, description]) => (
            <li key={number} className="rounded-product-control border border-outline-variant/60 bg-surface-container-low p-3.5">
              <div className="flex items-start gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-extrabold text-on-primary">
                  {number}
                </span>
                <div>
                  <p className="text-xs font-extrabold text-on-surface">{title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-on-surface-variant">{description}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex min-w-0 flex-1 items-center rounded-product-control border border-outline-variant/70 bg-surface-container-low px-3.5 py-2.5">
            <code className="min-w-0 flex-1 truncate text-[11px] font-semibold text-on-surface-variant">{MCP_URL}</code>
            <button
              type="button"
              onClick={() => void copyAddress()}
              className="ml-2 inline-flex shrink-0 items-center gap-1.5 text-[11px] font-extrabold text-primary hover:underline"
            >
              <HugeiconsIcon icon={copied ? Tick01Icon : Copy01Icon} size={15} strokeWidth={2} />
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <button type="button" onClick={openChatGpt} className="product-primary-action justify-center text-xs">
            <HugeiconsIcon icon={ArrowUpRight01Icon} size={16} strokeWidth={2} />
            Conectar ao ChatGPT
          </button>
        </div>

        <div className="border-t border-outline-variant/60 pt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold text-on-surface">Conexões autorizadas</p>
              <p className="mt-0.5 text-[11px] text-on-surface-variant">Você pode encerrar o acesso a qualquer momento.</p>
            </div>
            {loadingGrants && <HugeiconsIcon icon={Loading03Icon} size={18} className="animate-spin text-primary" />}
          </div>

          {!loadingGrants && oauthAvailable && grants.length === 0 && (
            <div className="mt-3 rounded-product-control border border-dashed border-outline-variant bg-surface-container-low p-4 text-center text-xs text-on-surface-variant">
              Nenhuma conexão autorizada ainda.
            </div>
          )}

          {!loadingGrants && !oauthAvailable && (
            <div className="mt-3 rounded-product-control border border-amber-500/20 bg-amber-500/10 p-3.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
              A conexão individual ainda precisa ser ativada pelo administrador do Estudea.
            </div>
          )}

          {grantError && (
            <div className="mt-3 rounded-product-control border border-error/20 bg-error/10 p-3.5 text-[11px] font-semibold text-error">
              {grantError}
            </div>
          )}

          {grants.length > 0 && (
            <div className="mt-3 space-y-2">
              {grants.map((grant) => (
                <div key={grant.client.id} className="flex items-center justify-between gap-3 rounded-product-control border border-outline-variant/60 p-3.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <HugeiconsIcon icon={AiChat02Icon} size={17} strokeWidth={2} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-extrabold text-on-surface">{grant.client.name || 'Aplicativo conectado'}</p>
                      <p className="text-[10px] text-on-surface-variant">
                        Autorizado em {new Date(grant.granted_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void revoke(grant)}
                    disabled={revokingClientId === grant.client.id}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-product-control px-2.5 py-2 text-[11px] font-extrabold text-error hover:bg-error/10 disabled:opacity-60"
                  >
                    <HugeiconsIcon
                      icon={revokingClientId === grant.client.id ? Loading03Icon : Unlink01Icon}
                      size={15}
                      className={revokingClientId === grant.client.id ? 'animate-spin' : ''}
                    />
                    Desconectar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
