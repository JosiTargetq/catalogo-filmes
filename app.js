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
const aviso = document.querySelector('#aviso');
const seletorGenero = document.querySelector('#f-genero');
const campoAno = document.querySelector('#f-ano');
const campoNota = document.querySelector('#f-nota');

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

// --- Estado do app: o que está selecionado agora na tela ---
let servicoAtual = SERVICOS[0].id;
const filtros = { genero: '', ano: '', nota: '' };

/* ------------------------------------------------------------------
   Falar com o nosso servidor
   ------------------------------------------------------------------ */

async function pedir(rota, parametros = {}) {
  const busca = new URLSearchParams({ rota, ...parametros });
  const resposta = await fetch(`/api/tmdb?${busca}`);
  if (!resposta.ok) throw new Error(`A TMDB respondeu ${resposta.status}`);
  return resposta.json();
}

/* ------------------------------------------------------------------
   Os três estados da tela: carregando, vazio, erro
   ------------------------------------------------------------------ */

function mostrarAviso(texto, comBotao = false) {
  grade.replaceChildren();
  aviso.replaceChildren();

  const p = document.createElement('p');
  p.textContent = texto;
  aviso.append(p);

  if (comBotao) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.textContent = 'Limpar filtros';
    botao.addEventListener('click', limparFiltros);
    aviso.append(botao);
  }

  aviso.hidden = false;
}

function esconderAviso() {
  aviso.hidden = true;
}

/* ------------------------------------------------------------------
   Desenhar os filmes
   ------------------------------------------------------------------ */

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
  esconderAviso();

  const parametros = {
    language: 'pt-BR',
    watch_region: 'BR',
    with_watch_providers: servicoAtual,
    with_watch_monetization_types: 'flatrate|free|ads',
    sort_by: 'popularity.desc',
    page: '1',
  };

  // Só mandamos o filtro se ele estiver preenchido. Mandar vazio faz a
  // TMDB devolver resultado errado em vez de ignorar.
  if (filtros.genero) parametros.with_genres = filtros.genero;
  if (filtros.ano) parametros.primary_release_year = filtros.ano;
  if (filtros.nota) parametros['vote_average.gte'] = filtros.nota;

  try {
    const dados = await pedir('discover/movie', parametros);

    if (!dados.results || dados.results.length === 0) {
      mostrarAviso('Nenhum filme com esses filtros neste serviço.', true);
      return;
    }

    desenharGrade(dados.results);
  } catch (erro) {
    mostrarAviso('Não consegui carregar os filmes agora. Tente de novo em instantes.');
  }
}

/* ------------------------------------------------------------------
   A barra de serviços
   ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------
   Os filtros
   ------------------------------------------------------------------ */

async function carregarGeneros() {
  const dados = await pedir('genre/movie/list', { language: 'pt-BR' });
  for (const genero of dados.genres) {
    const opcao = document.createElement('option');
    opcao.value = genero.id;
    opcao.textContent = genero.name;
    seletorGenero.append(opcao);
  }
}

function limparFiltros() {
  filtros.genero = '';
  filtros.ano = '';
  filtros.nota = '';
  seletorGenero.value = '';
  campoAno.value = '';
  campoNota.value = '';
  carregarFilmes();
}

seletorGenero.addEventListener('change', (e) => {
  filtros.genero = e.target.value;
  carregarFilmes();
});

campoAno.addEventListener('change', (e) => {
  filtros.ano = e.target.value;
  carregarFilmes();
});

campoNota.addEventListener('change', (e) => {
  filtros.nota = e.target.value;
  carregarFilmes();
});

document.querySelector('#f-limpar').addEventListener('click', limparFiltros);

/* ------------------------------------------------------------------
   Começo de tudo
   ------------------------------------------------------------------ */

desenharBarra();
carregarGeneros();
carregarFilmes();
