import Link from "next/link";

export default function TermosPage() {
  return (
    <article className="space-y-4 leading-7">
      <h1 className="text-2xl font-semibold">Termos de uso</h1>
      <p>
        Ao criar uma conta você concorda com estes termos e com as{" "}
        <Link href="/regras" className="text-azul">
          regras da comunidade
        </Link>
        .
      </p>
      <h2 className="text-lg font-semibold">A conta é sua</h2>
      <p className="text-muted">
        Você informa nome, @ e senha. A senha fica só como hash no servidor. Não compartilhe a senha. Você pode
        encerrar a conta no próprio perfil: isso apaga o @, as publicações e as mensagens deste servidor.
      </p>
      <h2 className="text-lg font-semibold">O que você publica</h2>
      <p className="text-muted">
        O texto continua seu. Você autoriza a rede a exibi-lo para quem usa este servidor, até apagar a conta ou até a
        moderação ocultar algo que viole as regras. Não publique o que você não tem direito de publicar.
      </p>
      <h2 className="text-lg font-semibold">Moderação</h2>
      <p className="text-muted">
        A equipe pode ocultar publicação, comentário ou mensagem e limitar uma conta que quebre as regras. A decisão
        fica registrada na denúncia. Conta limitada continua podendo ler a rede.
      </p>
      <h2 className="text-lg font-semibold">O que esta versão não faz</h2>
      <p className="text-muted">
        Não processa pagamento. O botão Apoiar só avisa o artista. Não há anúncio. Parceiros da agenda são
        informativos.
      </p>
      <h2 className="text-lg font-semibold">Servidor local</h2>
      <p className="text-muted">
        Esta instalação roda na máquina de quem subiu o servidor. Os dados ficam num arquivo local, não numa nuvem
        separada. Trate a senha como senha de demonstração se o link for temporário.
      </p>
    </article>
  );
}
