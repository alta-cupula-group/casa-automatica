// Tipos das variáveis de ambiente que o app lê. O Vite só expõe as com prefixo `VITE_`.
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}
