/* ===================================================================
   COMPORTAMENTO DO APP — o único arquivo que "pensa".

   Repare numa coisa importante: NÃO existe nenhuma chave aqui.
   O pedido vai para /api/tmdb, que é o nosso próprio servidor —
   é ele quem conhece a chave e conversa com a TMDB.
   =================================================================== */

const IMAGEM = 'https://image.tmdb.org/t/p/w342';      // pôsteres
const LOGO = 'https://image.tmdb.org/t/p/original';    // logos dos serviços

const grade = document.querySelector('#grade');
const barra = document.querySelector('#servicos');

// Escolhidos por Josi em 08/09/2026, entre os 86 serviços cadastrados no Brasil.
// Os códigos e os logos vieram da própria API — nunca escritos de memória.
const SERVICOS = [
  { id: '8',    nome: 'Netflix',     logo: '/rK1KljqmbvO9HQa1PBFLILWah72.png' },
  { id: '119',  nome: 'Prime Video', logo: '/gMZdpavHmxFNnLpMHwVxfqeux2g.png' },
  { id: '337',  nome: 'Disney+',     logo: '/5eZ872CghnHFLB1j8grszbrx0dx.png' },
  { id: '1899', nome: 'Max',         logo: '/skypuy7SXuugIQeYg0IglmzoKaS.png' },
  { id: '307',  nome: 'Globoplay',   logo: '/9A6Oxd3F7iXm7mds7CxYOBicojs.png' },
  { id: '300',  nome: 'Pluto TV',    logo: '/fN4czqaMQNLeF6sSSIjGbAWzvwK.png' },
];

// Qual serviço está selecionado agora. Começa no primeiro da lista.
let servicoAtual = SERVICOS[0].id;

async function pedir(rota, parametros = {}) {
  const busca = new URLSearchParams({ rota, ...parametros });
  const resposta = await fetch(`/api/tmdb?${busca}`);
  if (!resposta.ok) throw new Error(`A TMDB respondeu ${resposta.status}`);
  return resposta.json();
}

function cartaoDoFilme(filme) {
  const cartao = document.createElement('article');
  cartao.className = 'cartao';

  if (filme.poster_path) {
    const img = document.createElement('img');
    img.src = IMAGEM + filme.poster_path;
    img.alt = `Pôster de ${filme.title}`;
    img.loading = 'lazy';
    cartao.append(img);
  } else {
    const vazio = document.createElement('div');
    vazio.className = 'sem-poster';
    vazio.textContent = 'sem pôster';
    cartao.append(vazio);
  }

  const titulo = document.createElement('p');
  titulo.className = 'titulo';
  titulo.textContent = filme.title;
  cartao.append(titulo);

  return cartao;
}

function desenharGrade(filmes) {
  grade.replaceChildren(...filmes.map(cartaoDoFilme));
}

async function carregarFilmes() {
  const dados = await pedir('discover/movie', {
    language: 'pt-BR',
    watch_region: 'BR',
    with_watch_providers: servicoAtual,
    with_watch_monetization_types: 'flatrate|free|ads',
    sort_by: 'popularity.desc',
    page: '1',
  });
  desenharGrade(dados.results);
}

function desenharBarra() {
  barra.replaceChildren(...SERVICOS.map((servico) => {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.title = servico.nome;
    // aria-pressed diz a leitores de tela qual botão está ativo,
    // e é o que o CSS usa para desenhar a borda de selecionado.
    botao.setAttribute('aria-pressed', String(servico.id === servicoAtual));

    const img = document.createElement('img');
    img.src = LOGO + servico.logo;
    img.alt = servico.nome;
    botao.append(img);

    botao.addEventListener('click', () => {
      servicoAtual = servico.id;
      desenharBarra();
      carregarFilmes();
    });

    return botao;
  }));
}

desenharBarra();
carregarFilmes();
