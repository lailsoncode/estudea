import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  UserIcon,
  Mail01Icon,
  LockPasswordIcon,
  Tick01Icon,
  Cancel01Icon,
  Loading03Icon,
  Camera01Icon,
  SchoolIcon
} from '@hugeicons/core-free-icons';

interface PerfilUsuarioProps {
  session: any;
  onBack?: () => void;
  isAdmin: boolean;
}

// Preset modern avatars for quick selection (verified working Fluent UI Emoji URLs)
const PRESET_AVATARS = [
  'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Man%20student/Default/3D/man_student_3d_default.png', // 3D Male Student
  'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Woman%20student/Default/3D/woman_student_3d_default.png', // 3D Female Student
  'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Man%20teacher/Default/3D/man_teacher_3d_default.png', // 3D Male Teacher
  'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Woman%20teacher/Default/3D/woman_teacher_3d_default.png', // 3D Female Teacher
  'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Man%20technologist/Default/3D/man_technologist_3d_default.png', // 3D Male Technologist
  'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Woman%20technologist/Default/3D/woman_technologist_3d_default.png' // 3D Female Technologist
];

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 256;
        const MAX_HEIGHT = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível obter o contexto 2D'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export const PerfilUsuario: React.FC<PerfilUsuarioProps> = ({ session, onBack, isAdmin }) => {
  const userId = session?.user?.id;

  // Profile data state
  const [nome, setNome] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  // Compression status
  const [compressionInfo, setCompressionInfo] = useState<{ originalSize: string; compressedSize: string } | null>(null);
  const [compressing, setCompressing] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Por favor, selecione um arquivo de imagem válido.' });
      return;
    }

    setCompressing(true);
    setCompressionInfo(null);
    setMessage(null);

    const originalSizeKb = (file.size / 1024).toFixed(1);

    try {
      const compressedDataUrl = await compressImage(file);
      
      const stringLength = compressedDataUrl.length - 'data:image/jpeg;base64,'.length;
      const compressedSizeKb = ((stringLength * 3) / 4 / 1024).toFixed(1);

      setAvatarUrl(compressedDataUrl);
      setCompressionInfo({
        originalSize: `${originalSizeKb} KB`,
        compressedSize: `${compressedSizeKb} KB`
      });
      setMessage({ type: 'success', text: 'Imagem comprimida com sucesso! Clique em "Salvar Alterações" para aplicar.' });
    } catch (err) {
      console.error('Erro na compressão:', err);
      setMessage({ type: 'error', text: 'Falha ao comprimir imagem. Tente outro arquivo.' });
    } finally {
      setCompressing(false);
    }
  };
  const [turmaNome, setTurmaNome] = useState('');
  const [roleLabel, setRoleLabel] = useState('');

  // Password state
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');

  // UI States
  const [loadingData, setLoadingData] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch initial profile data
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!userId) return;
      setLoadingData(true);
      try {
        // Fetch raw profile
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*, turmas(nome)')
          .eq('id', userId)
          .single();

        if (error) throw error;

        if (profile) {
          setNome(profile.nome || '');
          setAvatarUrl(profile.avatar_url || session?.user?.user_metadata?.avatar_url || PRESET_AVATARS[0]);
          
          if (profile.turmas) {
            setTurmaNome(profile.turmas.nome || '');
          }

          const roleMap: Record<string, string> = {
            admin: 'Administrador / Professor',
            teacher: 'Professor',
            student: 'Estudante'
          };
          setRoleLabel(roleMap[profile.role || 'student'] || 'Estudante');
        }
      } catch (err) {
        console.error('Erro ao carregar dados do perfil:', err);
        // Fallback to auth metadata
        setNome(session?.user?.user_metadata?.nome || '');
        setAvatarUrl(session?.user?.user_metadata?.avatar_url || PRESET_AVATARS[0]);
        setRoleLabel(isAdmin ? 'Administrador / Professor' : 'Estudante');
      } finally {
        setLoadingData(false);
      }
    };

    fetchProfileData();
  }, [userId, session, isAdmin]);

  // Handle profile details save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setMessage({ type: 'error', text: 'O nome não pode ficar em branco.' });
      return;
    }

    setSavingProfile(true);
    setMessage(null);

    try {
      // 1. Try to update public.profiles table (resilient to missing avatar_url column)
      let updatePayload: any = { nome };
      
      // Attempt with avatar_url first
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          ...updatePayload,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (profileError) {
        console.warn('Falha ao atualizar avatar no perfil, tentando apenas nome:', profileError);
        // Fallback updating only name in profiles if column does not exist
        const { error: nameOnlyError } = await supabase
          .from('profiles')
          .update({ nome, updated_at: new Date().toISOString() })
          .eq('id', userId);
          
        if (nameOnlyError) throw nameOnlyError;
      }

      // 2. Always update user_metadata in Auth (guaranteed metadata persistence)
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          nome: nome,
          avatar_url: avatarUrl
        }
      });

      if (authError) throw authError;

      // Update session cookies/metadata in real-time
      if (session?.user?.user_metadata) {
        session.user.user_metadata.nome = nome;
        session.user.user_metadata.avatar_url = avatarUrl;
      }

      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
      
      // Auto dismiss success message
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Erro ao salvar perfil:', err);
      setMessage({ type: 'error', text: err.message || 'Erro ao salvar alterações do perfil.' });
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle password update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha.length < 6) {
      setMessage({ type: 'error', text: 'A senha deve ter no mínimo 6 caracteres.' });
      return;
    }
    if (novaSenha !== confirmaSenha) {
      setMessage({ type: 'error', text: 'As senhas não coincidem.' });
      return;
    }

    setSavingPassword(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: novaSenha
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
      setNovaSenha('');
      setConfirmaSenha('');

      // Auto dismiss success message
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Erro ao atualizar senha:', err);
      setMessage({ type: 'error', text: err.message || 'Falha ao atualizar a senha.' });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <HugeiconsIcon icon={Loading03Icon} className="w-10 h-10 text-primary animate-spin" />
        <p className="text-on-surface-variant text-body-md font-sans">Carregando dados do perfil...</p>
      </div>
    );
  }

  return (
    <div className="product-page max-w-5xl mx-auto space-y-6 relative overflow-hidden animate-fade-in pb-10">
      {/* Top Navigation */}
      <header className="product-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="product-section-kicker">Configurações Pessoais</span>
          <h1 className="product-section-heading mt-0 text-xl sm:text-2xl">Minha Conta</h1>
          <p className="product-subtitle">Personalize suas informações e gerencie a segurança de acesso.</p>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="product-secondary-action text-xs"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={15} strokeWidth={2} />
            <span>Voltar</span>
          </button>
        )}
      </header>

      {/* Message Banner */}
      {message && (
        <div className={`p-4 rounded-product-control flex items-center gap-3 border ${
          message.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300' 
            : 'bg-error/10 border-error/20 text-error'
        }`}>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
            message.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-error text-white'
          }`}>
            <HugeiconsIcon icon={message.type === 'success' ? Tick01Icon : Cancel01Icon} size={15} strokeWidth={2.5} />
          </div>
          <p className="text-xs font-bold">{message.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Card: Avatar Selection & Overview */}
        <div className="product-card p-5 flex flex-col items-center space-y-5">
          <div 
            onClick={() => document.getElementById('avatar-upload-input')?.click()}
            className="relative group cursor-pointer"
            title="Clique para enviar uma foto"
          >
            <div className="w-28 h-28 rounded-full overflow-hidden border-3 border-primary/20 shadow-md bg-surface-container-low relative">
              <img
                src={avatarUrl}
                alt="Avatar atual"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = PRESET_AVATARS[0];
                }}
              />
              {compressing && (
                <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center">
                  <HugeiconsIcon icon={Loading03Icon} className="w-7 h-7 text-white animate-spin" />
                </div>
              )}
            </div>
            <div className="absolute inset-0 bg-slate-950/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="text-center text-white space-y-1">
                <HugeiconsIcon icon={Camera01Icon} className="mx-auto w-5 h-5" strokeWidth={2} />
                <span className="block text-[9px] font-extrabold uppercase tracking-wider">Enviar Foto</span>
              </div>
            </div>
          </div>

          <input
            id="avatar-upload-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />

          {compressionInfo && (
            <div className="w-full bg-surface-container-low border border-outline-variant/60 rounded-product-control p-3 text-center space-y-1 animate-fade-in">
              <p className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Compressão Otimizada (Canvas)</p>
              <div className="flex justify-around text-xs text-on-surface-variant font-mono">
                <div>
                  <span className="opacity-70 block text-[9px] uppercase">Original</span>
                  <span className="line-through text-error/80">{compressionInfo.originalSize}</span>
                </div>
                <div className="font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="opacity-70 block text-[9px] uppercase">Comprimido</span>
                  <span>{compressionInfo.compressedSize}</span>
                </div>
              </div>
            </div>
          )}

          <div className="text-center space-y-1">
            <h3 className="font-heading font-extrabold text-base text-on-surface">
              {nome || 'Usuário'}
            </h3>
            <p className="text-xs text-on-surface-variant font-medium">{session?.user?.email}</p>
            <span className="inline-block bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-0.5 text-[11px] font-extrabold mt-2">
              {roleLabel}
            </span>
          </div>

          {/* Quick preset avatars */}
          <div className="w-full border-t border-outline-variant/60 pt-5 space-y-3">
            <p className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider text-center">Avatares Recomendados</p>
            <div className="grid grid-cols-3 gap-2.5 justify-items-center">
              {PRESET_AVATARS.map((url, index) => (
                <button
                  key={index}
                  onClick={() => setAvatarUrl(url)}
                  className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all hover:scale-105 cursor-pointer ${
                    avatarUrl === url ? 'border-primary ring-2 ring-primary/20 scale-105' : 'border-outline-variant/60'
                  }`}
                >
                  <img src={url} alt={`Preset ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Cards: Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Form 1: Personal Details */}
          <div className="product-card p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-2.5 border-b border-outline-variant/60 pb-3">
              <HugeiconsIcon icon={UserIcon} className="text-primary w-5 h-5" strokeWidth={2} />
              <h3 className="font-heading font-extrabold text-sm text-on-surface">Informações Pessoais</h3>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="product-control text-xs"
                  placeholder="Seu nome de exibição"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface">E-mail (Não alterável)</label>
                <div className="flex items-center bg-surface-container-low border border-outline-variant/60 rounded-product-control px-3.5 py-2.5 text-on-surface-variant text-xs font-medium">
                  <HugeiconsIcon icon={Mail01Icon} className="w-4 h-4 mr-2.5 text-on-surface-variant" strokeWidth={2} />
                  <span>{session?.user?.email}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface">URL da Foto de Perfil</label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="product-control text-xs"
                  placeholder="https://exemplo.com/sua-foto.jpg"
                />
                <p className="text-[11px] text-on-surface-variant mt-1 font-medium">Cole uma URL de imagem ou escolha um dos avatares rápidos ao lado.</p>
              </div>

              {/* Show student turma info if student */}
              {!isAdmin && turmaNome && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface">Sua Turma</label>
                  <div className="flex items-center bg-surface-container-low border border-outline-variant/60 rounded-product-control px-3.5 py-2.5 text-on-surface text-xs font-bold">
                    <HugeiconsIcon icon={SchoolIcon} className="w-4 h-4 mr-2.5 text-primary" strokeWidth={2} />
                    <span>{turmaNome}</span>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="product-primary-action text-xs"
                >
                  {savingProfile ? (
                    <>
                      <HugeiconsIcon icon={Loading03Icon} className="w-4 h-4 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <HugeiconsIcon icon={Tick01Icon} size={16} strokeWidth={2} />
                      <span>Salvar Alterações</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Form 2: Password Update */}
          <div className="product-card p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-2.5 border-b border-outline-variant/60 pb-3">
              <HugeiconsIcon icon={LockPasswordIcon} className="text-secondary w-5 h-5" strokeWidth={2} />
              <h3 className="font-heading font-extrabold text-sm text-on-surface">Segurança (Alterar Senha)</h3>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface">Nova Senha</label>
                  <input
                    type="password"
                    required
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    className="product-control text-xs"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface">Confirmar Nova Senha</label>
                  <input
                    type="password"
                    required
                    value={confirmaSenha}
                    onChange={(e) => setConfirmaSenha(e.target.value)}
                    className="product-control text-xs"
                    placeholder="Repita a nova senha"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="product-primary-action text-xs !bg-secondary hover:!bg-secondary/90"
                >
                  {savingPassword ? (
                    <>
                      <HugeiconsIcon icon={Loading03Icon} className="w-4 h-4 animate-spin" />
                      <span>Alterando...</span>
                    </>
                  ) : (
                    <>
                      <HugeiconsIcon icon={LockPasswordIcon} size={16} strokeWidth={2} />
                      <span>Atualizar Senha</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
