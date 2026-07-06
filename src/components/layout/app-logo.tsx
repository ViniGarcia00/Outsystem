import { cn } from "@/lib/utils";

interface AppLogoProps {
  /**
   * URL/caminho da logo cadastrada nas Configurações (ConfiguracaoSistema.logo).
   * PREPARADO para uso futuro — ainda NÃO implementado: enquanto não houver
   * logo cadastrada (ou nesta fase), exibe o placeholder "OP".
   */
  src?: string | null;
  /** Modo recolhido: mostra apenas o símbolo, sem o wordmark. */
  collapsed?: boolean;
  className?: string;
}

/**
 * Marca da aplicação. Ponto único onde a logo será carregada automaticamente
 * a partir das Configurações no futuro (basta então renderizar `src` aqui).
 */
export function AppLogo({ collapsed = false, className }: AppLogoProps) {
  // TODO(configuracoes): quando `src` estiver disponível, renderizar a imagem
  // da logo cadastrada em vez do símbolo "OP" (sem alterar os consumidores).
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground"
        aria-hidden
      >
        OP
      </div>
      {!collapsed && (
        <span className="truncate text-sm font-semibold text-sidebar-foreground">
          Outmat Propostas
        </span>
      )}
    </div>
  );
}
