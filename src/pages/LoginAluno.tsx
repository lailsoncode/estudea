import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import logoIcon from '../assets/logo-compact.png';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Mail01Icon,
  AccessIcon,
  ViewIcon,
  ViewOffIcon,
  Alert01Icon,
  ArrowRight01Icon,
  Tick01Icon
} from '@hugeicons/core-free-icons';

interface LoginAlunoProps {
  onNavigateToSignup: () => void;
  onNavigateToTeacherSignup?: () => void;
  onAuthSuccess: () => void;
  title?: string;
  description?: string;
  submitLabel?: string;
  hideRegistration?: boolean;
}

export const LoginAluno: React.FC<LoginAlunoProps> = ({
  onNavigateToSignup,
  onNavigateToTeacherSignup,
  onAuthSuccess,
  title = 'Acessar Estudea',
  description = 'Faça login para entrar na sua conta de estudante.',
  submitLabel = 'Entrar na Plataforma',
  hideRegistration = false
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & Error States
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email || !password) {
      setErrorMessage('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        // Translate common login errors
        if (error.message.includes('Invalid login credentials')) {
          setErrorMessage('E-mail ou senha incorretos. Verifique suas credenciais.');
        } else {
          setErrorMessage(error.message);
        }
        setLoading(false);
        return;
      }

      setSuccessMessage('Login efetuado com sucesso! Redirecionando...');
      setTimeout(() => {
        onAuthSuccess();
      }, 1500);
    } catch (err: unknown) {
      setErrorMessage('Ocorreu um erro ao tentar fazer login. Tente novamente mais tarde.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = email && password.length >= 6;

  return (
    <div className="w-full max-w-md mx-auto product-card p-6 sm:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <img src={logoIcon} alt="Estudea Logo" className="w-14 h-14 rounded-2xl mx-auto object-contain shadow-xs" />
        <h3 className="font-heading font-extrabold text-xl text-on-surface">
          {title}
        </h3>
        <p className="text-xs text-on-surface-variant font-medium">
          {description}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-on-surface flex items-center gap-1">
            <HugeiconsIcon icon={Mail01Icon} size={14} className="text-on-surface-variant" strokeWidth={2} />
            <span>E-mail</span>
          </label>
          <input
            type="email"
            placeholder="aluno@estudea.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="product-control text-xs"
          />
        </div>

        {/* Password */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-on-surface flex items-center gap-1">
            <HugeiconsIcon icon={AccessIcon} size={14} className="text-on-surface-variant" strokeWidth={2} />
            <span>Senha</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="product-control text-xs pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1"
            >
              <HugeiconsIcon icon={showPassword ? ViewOffIcon : ViewIcon} size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {errorMessage && (
          <div className="p-3.5 bg-error/10 border border-error/20 rounded-product-control text-error text-xs font-semibold flex items-start gap-2">
            <HugeiconsIcon icon={Alert01Icon} size={15} className="mt-0.5 shrink-0" strokeWidth={2} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-product-control text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-start gap-2">
            <HugeiconsIcon icon={Tick01Icon} size={15} className="mt-0.5 shrink-0" strokeWidth={2} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !isFormValid}
          className="w-full product-primary-action text-xs justify-center"
        >
          <span>{loading ? 'Entrando...' : submitLabel}</span>
          <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} />
        </button>
      </form>

      {/* Switch Screen Link */}
      {!hideRegistration && (
        <div className="text-center pt-3 space-y-2 border-t border-outline-variant/60 mt-3">
          <p className="text-xs text-on-surface-variant">
            Não possui uma conta?{' '}
            <button
              onClick={onNavigateToSignup}
              className="text-primary font-bold hover:underline focus:outline-none cursor-pointer"
            >
              Cadastrar como Aluno
            </button>
          </p>
          {onNavigateToTeacherSignup && (
            <p className="text-xs text-on-surface-variant">
              É professor ou instrutor?{' '}
              <button
                onClick={onNavigateToTeacherSignup}
                className="text-secondary font-bold hover:underline focus:outline-none cursor-pointer"
              >
                Cadastre-se como Docente
              </button>
            </p>
          )}
        </div>
      )}
    </div>
  );
};
