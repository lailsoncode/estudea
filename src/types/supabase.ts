export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      turmas: {
        Row: {
          id: string;
          nome: string;
          codigo_acesso: string;
          created_at: string;
          curso_id: string | null;
        };
        Insert: {
          id?: string;
          nome: string;
          codigo_acesso: string;
          created_at?: string;
          curso_id?: string | null;
        };
        Update: {
          id?: string;
          nome?: string;
          codigo_acesso?: string;
          created_at?: string;
          curso_id?: string | null;
        };
      };
      profiles: {
        Row: {
          id: string;
          nome: string | null;
          role: 'student' | 'teacher' | 'admin' | null;
          turma_id: string | null;
          updated_at: string;
          status: 'ativo' | 'bloqueado' | null;
        };
        Insert: {
          id: string;
          nome?: string | null;
          role?: 'student' | 'teacher' | 'admin' | null;
          turma_id?: string | null;
          updated_at?: string;
          status?: 'ativo' | 'bloqueado' | null;
        };
        Update: {
          id?: string;
          nome?: string | null;
          role?: 'student' | 'teacher' | 'admin' | null;
          turma_id?: string | null;
          updated_at?: string;
          status?: 'ativo' | 'bloqueado' | null;
        };
      };
      cursos: {
        Row: {
          id: string;
          titulo: string;
          descricao: string | null;
          imagem_capa: string | null;
          categoria: string | null;
          nivel: string | null;
          duracao: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          titulo: string;
          descricao?: string | null;
          imagem_capa?: string | null;
          categoria?: string | null;
          nivel?: string | null;
          duracao?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          titulo?: string;
          descricao?: string | null;
          imagem_capa?: string | null;
          categoria?: string | null;
          nivel?: string | null;
          duracao?: string | null;
          created_at?: string;
        };
      };
      modulos: {
        Row: {
          id: string;
          curso_id: string;
          titulo: string;
          ordem: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          curso_id: string;
          titulo: string;
          ordem: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          curso_id?: string;
          titulo?: string;
          ordem?: number;
          created_at?: string;
        };
      };
      aulas: {
        Row: {
          id: string;
          numero_aula: number;
          titulo: string;
          conteudo: string;
          created_at: string;
          modulo_id: string | null;
          tipo: 'video' | 'texto' | 'quiz' | 'arquivo';
          duracao: string | null;
          ordem: number;
          video_url: string | null;
          arquivo_url: string | null;
          pontos: number;
          nota_aprovacao: number;
          obrigatorio: boolean;
          embaralhar_questoes: boolean;
          tempo_limite: number | null;
        };
        Insert: {
          id?: string;
          numero_aula: number;
          titulo: string;
          conteudo: string;
          created_at?: string;
          modulo_id?: string | null;
          tipo?: 'video' | 'texto' | 'quiz' | 'arquivo';
          duracao?: string | null;
          ordem?: number;
          video_url?: string | null;
          arquivo_url?: string | null;
          pontos?: number;
          nota_aprovacao?: number;
          obrigatorio?: boolean;
          embaralhar_questoes?: boolean;
          tempo_limite?: number | null;
        };
        Update: {
          id?: string;
          numero_aula?: number;
          titulo?: string;
          conteudo?: string;
          created_at?: string;
          modulo_id?: string | null;
          tipo?: 'video' | 'texto' | 'quiz' | 'arquivo';
          duracao?: string | null;
          ordem?: number;
          video_url?: string | null;
          arquivo_url?: string | null;
          pontos?: number;
          nota_aprovacao?: number;
          obrigatorio?: boolean;
          embaralhar_questoes?: boolean;
          tempo_limite?: number | null;
        };
      };
      questoes: {
        Row: {
          id: string;
          aula_id: string;
          enunciado: string;
          opcoes: string[];
          resposta_correta: string;
          ordem: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          aula_id: string;
          enunciado: string;
          opcoes: string[];
          resposta_correta: string;
          ordem: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          aula_id?: string;
          enunciado?: string;
          opcoes?: string[];
          resposta_correta?: string;
          ordem?: number;
          created_at?: string;
        };
      };
      atividades: {
        Row: {
          id: string;
          aula_id: string;
          enunciado: string;
          tipo_entrega: 'texto' | 'imagem' | 'quiz' | 'multipla' | 'arquivo';
          created_at: string;
        };
        Insert: {
          id?: string;
          aula_id: string;
          enunciado: string;
          tipo_entrega: 'texto' | 'imagem' | 'quiz' | 'multipla' | 'arquivo';
          created_at?: string;
        };
        Update: {
          id?: string;
          aula_id?: string;
          enunciado?: string;
          tipo_entrega?: 'texto' | 'imagem' | 'quiz' | 'multipla' | 'arquivo';
          created_at?: string;
        };
      };
      progresso_alunos: {
        Row: {
          id: string;
          aluno_id: string;
          aula_id: string;
          concluido_em: string;
          avaliacao: number | null;
        };
        Insert: {
          id?: string;
          aluno_id: string;
          aula_id: string;
          concluido_em?: string;
          avaliacao?: number | null;
        };
        Update: {
          id?: string;
          aluno_id?: string;
          aula_id?: string;
          concluido_em?: string;
          avaliacao?: number | null;
        };
      };
      entregas_atividades: {
        Row: {
          id: string;
          aluno_id: string;
          atividade_id: string;
          resposta: string;
          nota: number | null;
          feedback_professor: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          aluno_id: string;
          atividade_id: string;
          resposta: string;
          nota?: number | null;
          feedback_professor?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          aluno_id?: string;
          atividade_id?: string;
          resposta?: string;
          nota?: number | null;
          feedback_professor?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      turma_aulas_liberadas: {
        Row: {
          id: string;
          turma_id: string;
          aula_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          turma_id: string;
          aula_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          turma_id?: string;
          aula_id?: string;
          created_at?: string;
        };
      };
      notificacoes: {
        Row: {
          id: string;
          turma_id: string;
          titulo: string;
          mensagem: string;
          remetente_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          turma_id: string;
          titulo: string;
          mensagem: string;
          remetente_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          turma_id?: string;
          titulo?: string;
          mensagem?: string;
          remetente_id?: string | null;
          created_at?: string;
        };
      };
      notificacao_leituras: {
        Row: {
          id: string;
          notificacao_id: string;
          aluno_id: string;
          lida_em: string;
        };
        Insert: {
          id?: string;
          notificacao_id: string;
          aluno_id: string;
          lida_em?: string;
        };
        Update: {
          id?: string;
          notificacao_id?: string;
          aluno_id?: string;
          lida_em?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
