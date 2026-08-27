import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import logoIcon from '../assets/logo-compact.png';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  UserIcon,
  Mail01Icon,
  AccessIcon,
  ViewIcon,
  ViewOffIcon,
  Alert01Icon,
  ArrowRight01Icon,
  Tick01Icon,
  CheckmarkCircle02Icon
} from '@hugeicons/core-free-icons';

interface CadastroAlunoProps {
  onNavigateToLogin: () => void;
  onNavigateToTeacherSignup?: () => void;
  onAuthSuccess: () => void;
}

export const CadastroAluno: React.FC<CadastroAlunoProps> = ({
  onNavigateToLogin,
  onNavigateToTeacherSignup,
  onAuthSuccess
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & Error States
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Real-time Validation States
  const [isNameValid, setIsNameValid] = useState(true);
  const [isEmailValid, setIsEmailValid] = useState(true);
  const [isPasswordValid, setIsPasswordValid] = useState(true);
  const [isAccessCodeValid, setIsAccessCodeValid] = useState(true);

  // Real-time checks
  useEffect(() => {
    if (fullName) {
      // Name validation: must have at least 2 words (first & last name) and >= 5 chars
      const parts = fullName.trim().split(/\s+/);
      setIsNameValid(parts.length >= 2 && fullName.trim().length >= 5);
    } else {
      setIsNameValid(true);
    }
  }, [fullName]);

  useEffect(() => {
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      setIsEmailValid(emailRegex.test(email));
    } else {
      setIsEmailValid(true);
    }
  }, [email]);

  useEffect(() => {
    if (password) {
      setIsPasswordValid(password.length >= 6);
    } else {
      setIsPasswordValid(true);
    }
  }, [password]);

  useEffect(() => {
    if (accessCode) {
      setIsAccessCodeValid(accessCode.trim().length >= 4);
    } else {
      setIsAccessCodeValid(true);
    }
  }, [accessCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Final checks
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const nameParts = fullName.trim().split(/\s+/);

    if (nameParts.length < 2 || fullName.trim().length < 5) {
      setErrorMessage('Por favor, insira o seu nome completo (nome e sobrenome).');
      setIsNameValid(false);
      return;
    }

    if (!emailRegex.test(email)) {
      setErrorMessage('Por favor, insira um e-mail válido.');
      setIsEmailValid(false);
      return;
    }

    if (password.length < 6) {
      setErrorMessage('A senha deve ter pelo menos 6 caracteres.');
      setIsPasswordValid(false);
      return;
    }

    if (!accessCode.trim()) {
      setErrorMessage('Por favor, informe o código de acesso da turma.');
      setIsAccessCodeValid(false);
      return;
    }

    setLoading(true);

    try {
      const recommendedAvatars = [
        'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Man%20student/Default/3D/man_student_3d_default.png',
        'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Woman%20student/Default/3D/woman_student_3d_default.png',
        'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Man%20technologist/Default/3D/man_technologist_3d_default.png',
        'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Woman%20technologist/Default/3D/woman_technologist_3d_default.png'
      ];
      const randomAvatar = recommendedAvatars[Math.floor(Math.random() * recommendedAvatars.length)];

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            nome: fullName.trim(),
            codigo_acesso: accessCode.trim(),
            avatar_url: randomAvatar
          }
        }
      });

      if (signUpError) {
        // Translate common errors
        if (signUpError.message.includes('User already registered') || signUpError.status === 422) {
          setErrorMessage('Este e-mail já está em uso por outra conta.');
        } else if (
          signUpError.message.includes('invalid_class_code') ||
          signUpError.message.includes('Database error saving new user')
        ) {
          setErrorMessage('Código de acesso da turma inválido. Verifique com seu professor.');
          setIsAccessCodeValid(false);
        } else {
          setErrorMessage(signUpError.message);
        }
        setLoading(false);
        return;
      }

      if (data.session) {
        // User is immediately logged in
        setSuccessMessage('Cadastro realizado com sucesso!');
        setTimeout(() => {
          onAuthSuccess();
        }, 1500);
      } else {
        // User needs to confirm email (or database trigger was completed)
        setSuccessMessage('Cadastro realizado! Verifique sua caixa de entrada para confirmar seu e-mail.');
      }
    } catch (err: any) {
      setErrorMessage('Ocorreu um erro inesperado. Verifique sua conexão e tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    fullName &&
    email &&
    password.length >= 6 &&
    accessCode &&
    isNameValid &&
    isEmailValid &&
    isPasswordValid &&
    isAccessCodeValid;

  return (
    <div className="w-full max-w-md mx-auto bg-surface-container-lowest border border-outline-variant/65 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 p-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <img src={logoIcon} alt="Estudea Logo" className="w-16 h-16 rounded-2xl mx-auto object-contain shadow-sm" />
        <h3 className="text-headline-lg font-heading font-extrabold text-on-background">
          Cadastro de Aluno
        </h3>
        <p className="text-on-surface-variant text-label-md">
          Preencha os dados abaixo e o código da sua turma.
        </p>
      </div>

      {/* Role Selector Tabs */}
      {onNavigateToTeacherSignup && (
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-surface-container-low rounded-product-control border border-outline-variant/60 text-xs font-bold">
          <button
            type="button"
            className="py-1.5 rounded-product-control bg-brand-navy text-white shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-default"
          >
            <HugeiconsIcon icon={UserIcon} size={14} strokeWidth={2} />
            <span>Sou Aluno</span>
          </button>
          <button
            type="button"
            onClick={onNavigateToTeacherSignup}
            className="py-1.5 rounded-product-control text-on-surface-variant hover:text-on-surface flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} strokeWidth={2} />
            <span>Sou Professor</span>
          </button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-on-surface flex items-center gap-1">
            <HugeiconsIcon icon={UserIcon} size={14} className="text-on-surface-variant" strokeWidth={2} />
            <span>Nome Completo</span>
          </label>
          <input
            type="text"
            placeholder="Ex: João Silva"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
            className={`product-control text-xs ${!isNameValid ? '!border-error' : ''}`}
          />
          {!isNameValid && (
            <p className="text-[11px] text-error flex items-center gap-1 mt-1 font-medium">
              <HugeiconsIcon icon={Alert01Icon} size={12} strokeWidth={2} />
              <span>Digite seu nome e sobrenome completo.</span>
            </p>
          )}
        </div>

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
            className={`product-control text-xs ${!isEmailValid ? '!border-error' : ''}`}
          />
          {!isEmailValid && (
            <p className="text-[11px] text-error flex items-center gap-1 mt-1 font-medium">
              <HugeiconsIcon icon={Alert01Icon} size={12} strokeWidth={2} />
              <span>Insira um endereço de e-mail válido.</span>
            </p>
          )}
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
              placeholder="Mínimo de 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className={`product-control text-xs pr-10 ${!isPasswordValid ? '!border-error' : ''}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1"
            >
              <HugeiconsIcon icon={showPassword ? ViewOffIcon : ViewIcon} size={16} strokeWidth={2} />
            </button>
          </div>
          {!isPasswordValid && (
            <p className="text-[11px] text-error flex items-center gap-1 mt-1 font-medium">
              <HugeiconsIcon icon={Alert01Icon} size={12} strokeWidth={2} />
              <span>A senha deve conter pelo menos 6 caracteres.</span>
            </p>
          )}
        </div>

        {/* Class Access Code */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-on-surface flex items-center gap-1">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} className="text-on-surface-variant" strokeWidth={2} />
            <span>Código de Acesso da Turma</span>
          </label>
          <input
            type="text"
            placeholder="Ex: TURMA-A-2026"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            disabled={loading}
            className={`product-control text-xs uppercase tracking-wider font-mono font-bold ${!isAccessCodeValid ? '!border-error' : ''}`}
          />
          {!isAccessCodeValid && (
            <p className="text-[11px] text-error flex items-center gap-1 mt-1 font-medium">
              <HugeiconsIcon icon={Alert01Icon} size={12} strokeWidth={2} />
              <span>Informe o código de acesso fornecido pelo professor.</span>
            </p>
          )}
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
          <span>{loading ? 'Cadastrando...' : 'Registrar-se'}</span>
          <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} />
        </button>
      </form>

      {/* Switch Screen Link */}
      <div className="text-center pt-3 space-y-2 border-t border-outline-variant/60 mt-3">
        <p className="text-xs text-on-surface-variant">
          Já possui uma conta?{' '}
          <button
            onClick={onNavigateToLogin}
            className="text-primary font-bold hover:underline focus:outline-none cursor-pointer"
          >
            Fazer login
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
    </div>
  );
};
