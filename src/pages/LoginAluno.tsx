import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import logoIcon from '../assets/logo.png';
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
  onAuthSuccess: () => void;
}

export const LoginAluno: React.FC<LoginAlunoProps> = ({
  onNavigateToSignup,
  onAuthSuccess
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
    } catch (err: any) {
      setErrorMessage('Ocorreu um erro ao tentar fazer login. Tente novamente mais tarde.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = email && password.length >= 6;

  return (
    <div className="w-full max-w-md mx-auto bg-surface-container-lowest border border-outline-variant/65 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 p-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <img src={logoIcon} alt="Estudea Logo" className="w-16 h-16 rounded-2xl mx-auto object-contain shadow-sm" />
        <h3 className="text-headline-lg font-heading font-extrabold text-on-background">
          Acessar Estudea
        </h3>
        <p className="text-on-surface-variant text-label-md">
          Faça login para entrar na sua conta de estudante.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-1">
          <label className="text-label-sm font-semibold text-on-surface flex items-center gap-1">
            <HugeiconsIcon icon={Mail01Icon} size={14} className="text-outline" />
            E-mail
          </label>
          <input
            type="email"
            placeholder="aluno@estudea.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="w-full p-4 text-body-md rounded border border-outline-variant/60 bg-surface-container-low focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
          />
        </div>

        {/* Password */}
        <div className="space-y-1">
          <label className="text-label-sm font-semibold text-on-surface flex items-center gap-1">
            <HugeiconsIcon icon={AccessIcon} size={14} className="text-outline" />
            Senha
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full p-4 pr-12 text-body-md rounded border border-outline-variant/60 bg-surface-container-low focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant hover:text-on-surface"
            >
              <HugeiconsIcon icon={showPassword ? ViewOffIcon : ViewIcon} size={20} />
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {errorMessage && (
          <div className="p-4 bg-error-container/30 border border-error/20 rounded text-error text-label-md flex items-start gap-2">
            <HugeiconsIcon icon={Alert01Icon} size={16} className="mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-secondary-container/30 border border-secondary/20 rounded text-secondary text-label-md flex items-start gap-2">
            <HugeiconsIcon icon={Tick01Icon} size={16} className="mt-0.5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !isFormValid}
          className={`w-full py-4 rounded-xl font-heading font-bold text-body-lg flex items-center justify-center gap-2 transition-all duration-300 ${
            isFormValid && !loading
              ? 'bg-gradient-to-r from-primary to-primary-container text-on-primary shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 active:scale-95'
              : 'bg-surface-container-high text-on-surface-variant cursor-not-allowed border border-outline-variant/40'
          }`}
        >
          {loading ? 'Entrando...' : 'Entrar na Plataforma'}
          <HugeiconsIcon icon={ArrowRight01Icon} size={18} />
        </button>
      </form>

      {/* Switch Screen Link */}
      <div className="text-center pt-2">
        <p className="text-label-md text-on-surface-variant">
          Não possui uma conta?{' '}
          <button
            onClick={onNavigateToSignup}
            className="text-primary font-bold hover:underline focus:outline-none"
          >
            Cadastrar-se agora
          </button>
        </p>
      </div>

      {/* Demo Mode Button for local verification */}
      <div className="text-center pt-2 border-t border-outline-variant/30 mt-4">
        <button
          type="button"
          onClick={() => {
            const mockSession = {
              user: {
                id: 'mock-student-id',
                email: 'aluno.demo@estudea.com',
                user_metadata: {
                  nome: 'Aluno Demo'
                }
              }
            };
            sessionStorage.setItem('demo_session', JSON.stringify(mockSession));
            sessionStorage.setItem('just_logged_in', 'true');
            window.location.reload();
          }}
          className="text-label-sm font-semibold text-secondary hover:underline py-1.5 cursor-pointer"
        >
          Entrar no Modo de Demonstração (Sem Banco)
        </button>
      </div>
    </div>
  );
};
