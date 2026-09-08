/* ===================================================================
   COMPORTAMENTO DO APP — o único arquivo que "pensa".
   Ele pede os filmes e desenha a grade na tela.

   Repare numa coisa importante: NÃO existe nenhuma chave aqui.
   O pedido vai para /api/tmdb, que é o nosso próprio servidor —
   é ele quem conhece a chave e conversa com a TMDB.
   =================================================================== */

const IMAGEM = 'https://image.tmdb.org/t/p/w342';
const grade = document.querySelector('#grade');

// Nesta fase o serviço é fixo de propósito: aqui a gente só prova que o
// caminho front -> servidor -> TMDB -> tela funciona.
// A escolha de serviço é a Fase 2. (8 = Netflix, verificado na API.)
const SERVICO_PROVISORIO = '8';

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

async function iniciar() {
  const dados = await pedir('discover/movie', {
    language: 'pt-BR',
    watch_region: 'BR',
    with_watch_providers: SERVICO_PROVISORIO,
    with_watch_monetization_types: 'flatrate|free|ads',
    sort_by: 'popularity.desc',
    page: '1',
  });
  desenharGrade(dados.results);
}

iniciar();
