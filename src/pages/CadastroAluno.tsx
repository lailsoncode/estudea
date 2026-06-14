import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import logoIcon from '../assets/logo.png';
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
  onAuthSuccess: () => void;
}

export const CadastroAluno: React.FC<CadastroAlunoProps> = ({
  onNavigateToLogin,
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
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            nome: fullName.trim(),
            codigo_acesso: accessCode.trim()
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
          Criar Conta
        </h3>
        <p className="text-on-surface-variant text-label-md">
          Preencha os dados abaixo para se cadastrar na turma.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div className="space-y-1">
          <label className="text-label-sm font-semibold text-on-surface flex items-center gap-1">
            <HugeiconsIcon icon={UserIcon} size={14} className="text-outline" />
            Nome Completo
          </label>
          <input
            type="text"
            placeholder="Ex: João Silva"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
            className={`w-full p-4 text-body-md rounded border bg-surface-container-low transition-all focus:outline-none focus:ring-2 ${
              !isNameValid
                ? 'border-error focus:ring-error/20'
                : 'border-outline-variant/60 focus:border-primary focus:ring-primary/20'
            }`}
          />
          {!isNameValid && (
            <p className="text-label-sm text-error flex items-center gap-1 mt-1 font-medium">
              <HugeiconsIcon icon={Alert01Icon} size={12} />
              Digite seu nome e sobrenome completo.
            </p>
          )}
        </div>

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
            className={`w-full p-4 text-body-md rounded border bg-surface-container-low transition-all focus:outline-none focus:ring-2 ${
              !isEmailValid
                ? 'border-error focus:ring-error/20'
                : 'border-outline-variant/60 focus:border-primary focus:ring-primary/20'
            }`}
          />
          {!isEmailValid && (
            <p className="text-label-sm text-error flex items-center gap-1 mt-1 font-medium">
              <HugeiconsIcon icon={Alert01Icon} size={12} />
              Insira um endereço de e-mail válido.
            </p>
          )}
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
              placeholder="Mínimo de 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className={`w-full p-4 pr-12 text-body-md rounded border bg-surface-container-low transition-all focus:outline-none focus:ring-2 ${
                !isPasswordValid
                  ? 'border-error focus:ring-error/20'
                  : 'border-outline-variant/60 focus:border-primary focus:ring-primary/20'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant hover:text-on-surface"
            >
              <HugeiconsIcon icon={showPassword ? ViewOffIcon : ViewIcon} size={20} />
            </button>
          </div>
          {!isPasswordValid && (
            <p className="text-label-sm text-error flex items-center gap-1 mt-1 font-medium">
              <HugeiconsIcon icon={Alert01Icon} size={12} />
              A senha deve conter pelo menos 6 caracteres.
            </p>
          )}
        </div>

        {/* Class Access Code */}
        <div className="space-y-1">
          <label className="text-label-sm font-semibold text-on-surface flex items-center gap-1">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} className="text-outline" />
            Código de Acesso da Turma
          </label>
          <input
            type="text"
            placeholder="Ex: TURMA-A-2026"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            disabled={loading}
            className={`w-full p-4 text-body-md rounded border bg-surface-container-low transition-all focus:outline-none focus:ring-2 ${
              !isAccessCodeValid
                ? 'border-error focus:ring-error/20'
                : 'border-outline-variant/60 focus:border-primary focus:ring-primary/20'
            }`}
          />
          {!isAccessCodeValid && (
            <p className="text-label-sm text-error flex items-center gap-1 mt-1 font-medium">
              <HugeiconsIcon icon={Alert01Icon} size={12} />
              Informe o código de acesso fornecido pelo professor.
            </p>
          )}
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
          className={`w-full py-4 rounded font-heading font-bold text-body-lg flex items-center justify-center gap-2 transition-all duration-300 ${
            isFormValid && !loading
              ? 'bg-gradient-to-r from-primary to-primary-container text-on-primary shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5'
              : 'bg-surface-container-high text-on-surface-variant cursor-not-allowed border border-outline-variant/40'
          }`}
        >
          {loading ? 'Cadastrando...' : 'Registrar-se'}
          <HugeiconsIcon icon={ArrowRight01Icon} size={18} />
        </button>
      </form>

      {/* Switch Screen Link */}
      <div className="text-center pt-2">
        <p className="text-label-md text-on-surface-variant">
          Já possui uma conta?{' '}
          <button
            onClick={onNavigateToLogin}
            className="text-primary font-bold hover:underline focus:outline-none"
          >
            Fazer login
          </button>
        </p>
      </div>
    </div>
  );
};
