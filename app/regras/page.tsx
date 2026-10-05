import Link from "next/link";

export default function RegrasPage() {
  return (
    <article className="space-y-4 leading-7">
      <h1 className="text-2xl font-semibold">Regras da comunidade</h1>
      <p>
        A Cultura Conecta é uma rede para a cena cultural da Grande Vitória: rap, DJ, breaking, graffiti, slam e
        eventos. Liberdade artística cabe aqui. Ataque a pessoas, não.
      </p>
      <h2 className="text-lg font-semibold">Pode</h2>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>Publicar trabalho, bastidor, agenda e crítica cultural.</li>
        <li>Usar linguagem de rua, poesia e letra, inclusive metáfora.</li>
        <li>Discordar de outro artista sem humilhar nem ameaçar.</li>
      </ul>
      <h2 className="text-lg font-semibold">Não pode</h2>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>Assédio, perseguição, bullying ou exposição de dados pessoais de outra pessoa.</li>
        <li>Discurso de ódio contra um grupo ou uma pessoa.</li>
        <li>Conteúdo sexual, em especial qualquer conteúdo envolvendo menores. Isso é proibido e deve ser denunciado.</li>
        <li>Ameaça real ou incitação à violência contra alguém.</li>
        <li>Venda ou apologia de droga, arma ou outra atividade ilegal.</li>
        <li>Spam, golpe e conta falsa para enganar.</li>
      </ul>
      <h2 className="text-lg font-semibold">Idade</h2>
      <p className="text-muted">É preciso ter 16 anos ou mais para criar uma conta.</p>
      <h2 className="text-lg font-semibold">Se algo sair da linha</h2>
      <p className="text-muted">
        Use Denunciar na publicação, no comentário, na mensagem ou no perfil. A equipe analisa em{" "}
        <Link href="/moderacao" className="text-azul">
          Denúncias
        </Link>
        . O conteúdo pode ser ocultado e a conta, limitada. Bloquear tira a pessoa da sua vista e impede mensagem e
        seguir.
      </p>
      <p className="text-muted">
        A letra de uma música não é, por si só, infração. Ameaça dirigida a uma pessoa real pode ser, mesmo quando o
        filtro automático não pega. Nesse caso, denuncie.
      </p>
    </article>
  );
}
