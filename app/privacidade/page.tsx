export default function PrivacidadePage() {
  return (
    <article className="space-y-4 leading-7">
      <h1 className="text-2xl font-semibold">Privacidade</h1>
      <p>A Cultura Conecta guarda só o que a rede precisa para funcionar.</p>
      <h2 className="text-lg font-semibold">O que é guardado</h2>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>Nome, @, bio, tags e a senha em hash scrypt, nunca em texto puro.</li>
        <li>Publicações, comentários, reações, follows, presença em eventos e denúncias.</li>
        <li>Mensagens diretas, visíveis para quem conversa e, se houver denúncia, para a equipe.</li>
        <li>Um cookie httpOnly com a sessão, para manter você conectado neste navegador.</li>
      </ul>
      <h2 className="text-lg font-semibold">O que não fazemos</h2>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>Não vendemos dados.</li>
        <li>Não pedimos documento, telefone nem cartão.</li>
        <li>Não usamos a rede para anúncio rastreado.</li>
      </ul>
      <h2 className="text-lg font-semibold">Onde fica</h2>
      <p className="text-muted">
        No arquivo de dados do servidor que está no ar agora. Quem administra essa máquina consegue ler o arquivo.
        Por isso as senhas são hash e as contas de demonstração são públicas na tela de entrada.
      </p>
      <h2 className="text-lg font-semibold">Seus controles</h2>
      <p className="text-muted">
        Você edita o perfil, bloqueia contas, denuncia conteúdo e encerra a conta. Encerrar remove seus dados de
        publicação e mensagem deste servidor.
      </p>
    </article>
  );
}
