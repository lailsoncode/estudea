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
  Award01Icon
} from '@hugeicons/core-free-icons';

interface CadastroProfessorProps {
  onNavigateToLogin: () => void;
  onNavigateToStudentSignup: () => void;
  onAuthSuccess: () => void;
}

export const CadastroProfessor: React.FC<CadastroProfessorProps> = ({
  onNavigateToLogin,
  onNavigateToStudentSignup,
  onAuthSuccess
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [teacherKey, setTeacherKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & Error States
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Real-time Validation States
  const [isNameValid, setIsNameValid] = useState(true);
  const [isEmailValid, setIsEmailValid] = useState(true);
  const [isPasswordValid, setIsPasswordValid] = useState(true);
  const [isKeyValid, setIsKeyValid] = useState(true);

  // Real-time checks
  useEffect(() => {
    if (fullName) {
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
    if (teacherKey) {
      setIsKeyValid(teacherKey.trim().length >= 4);
    } else {
      setIsKeyValid(true);
    }
  }, [teacherKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

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

    if (!teacherKey.trim()) {
      setErrorMessage('Por favor, informe a Chave de Acesso Docente institucional.');
      setIsKeyValid(false);
      return;
    }

    setLoading(true);

    try {
      const recommendedAvatars = [
        'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Man%20teacher/Default/3D/man_teacher_3d_default.png',
        'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Woman%20teacher/Default/3D/woman_teacher_3d_default.png',
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
            tipo_cadastro: 'teacher',
            codigo_docente: teacherKey.trim().toUpperCase(),
            avatar_url: randomAvatar
          }
        }
      });

      if (signUpError) {
        if (signUpError.message.includes('User already registered') || signUpError.status === 422) {
          setErrorMessage('Este e-mail já está cadastrado no sistema.');
        } else if (
          signUpError.message.includes('invalid_teacher_code') ||
          signUpError.message.includes('Database error saving new user')
        ) {
          setErrorMessage('Chave de Acesso Docente inválida. Solicite a chave institucional com a coordenação.');
          setIsKeyValid(false);
        } else {
          setErrorMessage(signUpError.message);
        }
        setLoading(false);
        return;
      }

      if (data?.session) {
        setSuccessMessage('Cadastro docente realizado com sucesso! Redirecionando para seu painel...');
        setTimeout(() => {
          sessionStorage.setItem('just_logged_in', 'true');
          onAuthSuccess();
        }, 1200);
      } else {
        setSuccessMessage('Conta criada com sucesso! Verifique seu e-mail para confirmar seu cadastro docente.');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Erro no cadastro docente:', err);
      setErrorMessage(err.message || 'Ocorreu um erro ao realizar seu cadastro. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30 rounded-3xl p-6 sm:p-8 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
      
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center space-y-2 mb-6">
        <div className="w-16 h-16 flex items-center justify-center mb-1">
          <img src={logoIcon} alt="Estudea" className="w-16 h-16 object-contain" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-xs font-bold uppercase tracking-wider">
          <HugeiconsIcon icon={Award01Icon} size={14} />
          Portal Docente
        </div>
        <h1 className="text-display-sm font-heading font-extrabold text-on-surface tracking-tight">
          Cadastro de Professor
        </h1>
        <p className="text-body-md text-on-surface-variant max-w-xs">
          Crie sua conta para gerenciar turmas, diário de classe e conteúdos interativos.
        </p>
      </div>

      {/* Role Switcher Tab */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-surface-container-low dark:bg-slate-800 rounded-xl border border-outline-variant/30 mb-6 text-xs font-bold">
        <button
          type="button"
          onClick={onNavigateToStudentSignup}
          className="py-2 rounded-lg text-on-surface-variant hover:text-on-surface flex items-center justify-center gap-1.5 transition-all"
        >
          <HugeiconsIcon icon={UserIcon} size={14} />
          Sou Aluno
        </button>
        <button
          type="button"
          className="py-2 rounded-lg bg-primary text-on-primary shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-default"
        >
          <HugeiconsIcon icon={Award01Icon} size={14} />
          Sou Professor
        </button>
      </div>

      {/* Feedback Messages */}
      {errorMessage && (
        <div className="p-3.5 bg-error-container/30 border border-error/20 rounded-xl text-error text-label-md flex items-start gap-2.5 mb-5 animate-in fade-in duration-200">
          <HugeiconsIcon icon={Alert01Icon} size={18} className="mt-0.5 shrink-0" />
          <span className="leading-tight">{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 text-label-md flex items-start gap-2.5 mb-5 animate-in fade-in duration-200">
          <HugeiconsIcon icon={Tick01Icon} size={18} className="mt-0.5 shrink-0" />
          <span className="leading-tight">{successMessage}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Full Name */}
        <div className="space-y-1.5">
          <label className="text-label-sm font-bold text-on-surface block">
            Nome Completo
          </label>
          <div className="relative">
            <HugeiconsIcon icon={UserIcon} size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ex: Carlos Eduardo Silva"
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border bg-surface-container-lowest dark:bg-slate-800 text-body-md text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none transition-all ${
                !isNameValid ? 'border-error focus:border-error ring-1 ring-error/20' : 'border-outline-variant/30 focus:border-primary'
              }`}
            />
          </div>
          {!isNameValid && (
            <p className="text-[11px] font-semibold text-error">Insira nome e sobrenome (mínimo 5 caracteres).</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-label-sm font-bold text-on-surface block">
            E-mail Institucional
          </label>
          <div className="relative">
            <HugeiconsIcon icon={Mail01Icon} size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@senac.br"
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border bg-surface-container-lowest dark:bg-slate-800 text-body-md text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none transition-all ${
                !isEmailValid ? 'border-error focus:border-error ring-1 ring-error/20' : 'border-outline-variant/30 focus:border-primary'
              }`}
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-label-sm font-bold text-on-surface block">
            Senha de Acesso
          </label>
          <div className="relative">
            <HugeiconsIcon icon={AccessIcon} size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className={`w-full pl-10 pr-10 py-2.5 rounded-xl border bg-surface-container-lowest dark:bg-slate-800 text-body-md text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none transition-all ${
                !isPasswordValid ? 'border-error focus:border-error ring-1 ring-error/20' : 'border-outline-variant/30 focus:border-primary'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-on-surface p-1"
            >
              <HugeiconsIcon icon={showPassword ? ViewOffIcon : ViewIcon} size={16} />
            </button>
          </div>
        </div>

        {/* Teacher Access Key */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-label-sm font-bold text-on-surface block">
              Chave de Acesso Docente
            </label>
            <span className="text-[11px] text-secondary font-semibold">Institucional</span>
          </div>
          <div className="relative">
            <HugeiconsIcon icon={Award01Icon} size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary" />
            <input
              type="text"
              required
              value={teacherKey}
              onChange={(e) => setTeacherKey(e.target.value)}
              placeholder="Digite a chave institucional recebida"
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border bg-surface-container-lowest dark:bg-slate-800 text-body-md font-mono tracking-wider text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none transition-all ${
                !isKeyValid ? 'border-error focus:border-error ring-1 ring-error/20' : 'border-secondary/40 focus:border-secondary'
              }`}
            />
          </div>
          <p className="text-[11px] text-on-surface-variant">
            Chave fornecida pela coordenação pedagógica para liberação de perfil docente.
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3 px-4 bg-primary hover:bg-primary/90 text-on-primary font-heading font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Cadastrando...</span>
            </>
          ) : (
            <>
              <span>Concluir Cadastro Docente</span>
              <HugeiconsIcon icon={ArrowRight01Icon} size={18} />
            </>
          )}
        </button>
      </form>

      {/* Footer Navigation */}
      <div className="mt-6 pt-4 border-t border-outline-variant/30 text-center space-y-2">
        <p className="text-label-sm text-on-surface-variant">
          Já possui cadastro docente?{' '}
          <button
            type="button"
            onClick={onNavigateToLogin}
            className="font-bold text-primary hover:underline cursor-pointer"
          >
            Entrar na conta
          </button>
        </p>
      </div>
    </div>
  );
};
