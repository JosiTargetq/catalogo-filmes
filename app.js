/* ===================================================================
   Tá Onde? — COMPORTAMENTO DO APP
   O único arquivo que "pensa": pede os filmes e desenha a tela.

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
const painel = document.querySelector('#detalhe');
const painelConteudo = document.querySelector('#detalhe-conteudo');
const botaoMais = document.querySelector('#mais');
const contagem = document.querySelector('#contagem');
const campoBusca = document.querySelector('#f-busca');
const painelFiltros = document.querySelector('#filtros');
const modoBusca = document.querySelector('#modo-busca');
const modoBuscaTexto = document.querySelector('#modo-busca-texto');

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
let pagina = 1;
let totalPaginas = 1;
let totalFilmes = 0;
let carregando = false;

// Termo digitado na busca. Vazio = o app está navegando por serviço.
//
// A busca por nome varre o acervo INTEIRO da TMDB, não o catálogo de um
// serviço — não existe "buscar dentro da Netflix" na API. Por isso, com a
// busca ativa, a barra de serviços e os filtros ficam desativados, e o app
// diz isso na tela em vez de deixar a pessoa achar que eles estão valendo.
let termoBusca = '';

// Quais filmes já estão desenhados na tela.
//
// Por que isto existe: a TMDB ordena por popularidade, e a popularidade
// muda entre uma consulta e outra. Um filme que era o 20º da página 1 pode
// virar o 21º e reaparecer na página 2. Sem esta lista, o "carregar mais"
// mostraria o mesmo filme duas vezes.
const idsNaTela = new Set();

/* ------------------------------------------------------------------
   Falar com o nosso servidor
   ------------------------------------------------------------------ */

async function pedir(rota, parametros = {}) {
  const busca = new URLSearchParams({ rota, ...parametros });
  const resposta = await fetch(`/api/tmdb?${busca}`);
  if (!resposta.ok) throw new Error(`A TMDB respondeu ${resposta.status}`);
  return resposta.json();
}

// Monta os parâmetros da consulta principal. Só manda o filtro que está
// preenchido — mandar vazio faz a TMDB devolver resultado errado.
function parametrosDaBusca(idioma, numeroDaPagina) {
  const p = {
    language: idioma,
    watch_region: 'BR',
    with_watch_providers: servicoAtual,
    with_watch_monetization_types: 'flatrate|free|ads',
    sort_by: 'popularity.desc',
    page: String(numeroDaPagina),
  };
  if (filtros.genero) p.with_genres = filtros.genero;
  if (filtros.ano) p.primary_release_year = filtros.ano;
  if (filtros.nota) p['vote_average.gte'] = filtros.nota;
  return p;
}

function parametrosDaBuscaPorNome(idioma, numeroDaPagina) {
  return {
    language: idioma,
    query: termoBusca,
    include_adult: 'false',
    page: String(numeroDaPagina),
  };
}

function estaBuscando() {
  return termoBusca.length >= 2;
}

// Mostra na tela que a busca está mandando, e que serviço e filtros
// não estão valendo agora.
function atualizarModoBusca() {
  const buscando = estaBuscando();
  document.querySelector('#servicos').classList.toggle('desativado', buscando);
  painelFiltros.classList.toggle('desativado', buscando);
  modoBusca.hidden = !buscando;
  if (buscando) {
    modoBuscaTexto.textContent =
      `Buscando "${termoBusca}" em todo o acervo — serviço e filtros não se aplicam.`;
  }
}

/* ------------------------------------------------------------------
   Os três estados da tela: carregando, vazio, erro
   ------------------------------------------------------------------ */

// Retângulos cinzas pulsando no lugar dos pôsteres. Sem isto, entre
// "apagou a tela" e "chegou a resposta" fica um vazio que parece defeito.
function mostrarEsqueletos(quantidade = 20) {
  esconderAviso();
  const itens = Array.from({ length: quantidade }, () => {
    const div = document.createElement('div');
    div.className = 'esqueleto';
    return div;
  });
  grade.replaceChildren(...itens);
}

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
   Títulos: nem todo filme tem tradução em português
   ------------------------------------------------------------------ */

// Quando a TMDB não tem título em português, ela devolve o original —
// que pode estar em híndi, tâmil, coreano, árabe. Ilegível na grade.
// Nesses casos tentamos o título em inglês, que ao menos é pronunciável.
//
// A regra precisa ser exata: "tem letras, e NENHUMA delas é do alfabeto
// latino". Só perguntar "não tem letra latina?" pegaria títulos como
// "2012", que são números e estão perfeitamente legíveis.
function precisaDeTraducao(texto) {
  const t = texto || '';
  return /\p{L}/u.test(t) && !/\p{Script=Latin}/u.test(t);
}

// ⚠️ Limite conhecido: às vezes a TMDB não tem título em inglês também
// (acontece com filmes indianos e do sudeste asiático). Nesse caso não há
// o que fazer — devolvemos o original em vez de inventar.
function melhorTitulo(filme, titulosEmIngles) {
  if (!precisaDeTraducao(filme.title)) return filme.title;
  const emIngles = titulosEmIngles.get(filme.id);
  if (emIngles && !precisaDeTraducao(emIngles)) return emIngles;
  return filme.title;
}

/* ------------------------------------------------------------------
   Desenhar os filmes
   ------------------------------------------------------------------ */

function cartaoDoFilme(filme, titulosEmIngles) {
  const nome = melhorTitulo(filme, titulosEmIngles);

  const cartao = document.createElement('article');
  cartao.className = 'cartao';

  if (filme.poster_path) {
    const img = document.createElement('img');
    img.src = IMAGEM + filme.poster_path;
    img.alt = `Pôster de ${nome}`;
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
  titulo.textContent = nome;
  cartao.append(titulo);

  // Clicar (ou apertar Enter/espaço, para quem navega pelo teclado)
  // abre o painel de detalhe.
  cartao.tabIndex = 0;
  cartao.setAttribute('role', 'button');
  cartao.addEventListener('click', () => abrirDetalhe(filme.id));
  cartao.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      abrirDetalhe(filme.id);
    }
  });

  return cartao;
}

function atualizarRodape() {
  const naTela = grade.querySelectorAll('.cartao').length;
  contagem.textContent = totalFilmes
    ? `${naTela} de ${totalFilmes.toLocaleString('pt-BR')} filmes`
    : '';
  botaoMais.hidden = pagina >= totalPaginas || totalFilmes === 0;
  botaoMais.disabled = false;
  botaoMais.textContent = 'Carregar mais';
}

// Busca uma página. `acrescentar` decide entre trocar a grade toda
// (nova busca) ou pendurar mais filmes no fim (botão "carregar mais").
async function buscarPagina(numeroDaPagina, acrescentar) {
  if (carregando) return;
  carregando = true;

  if (!acrescentar) mostrarEsqueletos();

  try {
    // Duas fontes possíveis: a busca por nome varre o acervo inteiro,
    // o catálogo por serviço usa os filtros.
    const rota = estaBuscando() ? 'search/movie' : 'discover/movie';
    const montar = estaBuscando() ? parametrosDaBuscaPorNome : parametrosDaBusca;

    // Os dois pedidos saem juntos, não um depois do outro: o segundo é
    // só para ter o título em inglês dos filmes sem tradução.
    const [ptBR, enUS] = await Promise.all([
      pedir(rota, montar('pt-BR', numeroDaPagina)),
      pedir(rota, montar('en-US', numeroDaPagina)),
    ]);

    const titulosEmIngles = new Map((enUS.results || []).map((f) => [f.id, f.title]));

    pagina = numeroDaPagina;
    totalPaginas = ptBR.total_pages || 1;
    totalFilmes = ptBR.total_results || 0;

    const filmes = ptBR.results || [];

    if (filmes.length === 0 && !acrescentar) {
      idsNaTela.clear();
      botaoMais.hidden = true;
      contagem.textContent = '';
      if (estaBuscando()) {
        mostrarAviso(`Não encontrei nenhum filme chamado "${termoBusca}".`);
      } else {
        mostrarAviso('Nenhum filme com esses filtros neste serviço.', true);
      }
      return;
    }

    if (!acrescentar) idsNaTela.clear();

    // Descarta o que já está na tela (ver comentário em idsNaTela).
    const novos = filmes.filter((f) => !idsNaTela.has(f.id));
    for (const f of novos) idsNaTela.add(f.id);

    const cartoes = novos.map((f) => cartaoDoFilme(f, titulosEmIngles));
    if (acrescentar) grade.append(...cartoes);
    else grade.replaceChildren(...cartoes);

    atualizarRodape();
  } catch (erro) {
    if (acrescentar) {
      botaoMais.disabled = false;
      botaoMais.textContent = 'Não consegui. Tentar de novo';
    } else {
      botaoMais.hidden = true;
      contagem.textContent = '';
      mostrarAviso('Não consegui carregar os filmes agora. Tente de novo em instantes.');
    }
  } finally {
    carregando = false;
  }
}

function carregarFilmes() {
  return buscarPagina(1, false);
}

botaoMais.addEventListener('click', () => {
  botaoMais.disabled = true;
  botaoMais.textContent = 'Carregando…';
  buscarPagina(pagina + 1, true);
});

/* ------------------------------------------------------------------
   Painel de detalhe
   ------------------------------------------------------------------ */

document.querySelector('#fechar-detalhe')
  .addEventListener('click', () => painel.close());

// Monta a lista de "onde assistir".
// Só assinatura e grátis — aluguel e compra ficam fora por decisão de produto:
// é o que mais confunde, a pessoa acha que verá de graça e leva susto no caixa.
function listaDeOnde(disponibilidade) {
  const grupos = [
    { chave: 'flatrate', etiqueta: 'incluso', texto: 'Incluso na assinatura' },
    { chave: 'free',     etiqueta: 'gratis',  texto: 'Grátis' },
    { chave: 'ads',      etiqueta: 'gratis',  texto: 'Grátis com anúncios' },
  ];

  const itens = [];
  for (const grupo of grupos) {
    for (const servico of disponibilidade?.[grupo.chave] ?? []) {
      const li = document.createElement('li');

      const img = document.createElement('img');
      img.src = LOGO + servico.logo_path;
      img.alt = servico.provider_name;

      const nome = document.createElement('span');
      nome.className = 'nome-servico';
      nome.textContent = servico.provider_name;

      const etiqueta = document.createElement('span');
      etiqueta.className = `etiqueta ${grupo.etiqueta}`;
      etiqueta.textContent = grupo.texto;

      li.append(img, nome, etiqueta);
      itens.push(li);
    }
  }
  return itens;
}

async function abrirDetalhe(id) {
  painelConteudo.replaceChildren();
  painel.showModal();

  const carregandoTexto = document.createElement('p');
  carregandoTexto.className = 'meta';
  carregandoTexto.textContent = 'Carregando…';
  painelConteudo.append(carregandoTexto);

  try {
    const [filme, onde] = await Promise.all([
      pedir(`movie/${id}`, { language: 'pt-BR' }),
      pedir(`movie/${id}/watch/providers`),
    ]);

    const disponibilidade = onde.results?.BR;

    const titulo = document.createElement('h2');
    titulo.textContent = filme.title;

    const meta = document.createElement('p');
    meta.className = 'meta';
    const ano = filme.release_date ? filme.release_date.slice(0, 4) : 'ano desconhecido';
    const duracao = filme.runtime ? `${filme.runtime} min` : 'duração desconhecida';
    const nota = filme.vote_average
      ? `nota ${filme.vote_average.toFixed(1)}`
      : 'sem nota';
    meta.textContent = `${ano} · ${duracao} · ${nota}`;

    const sinopse = document.createElement('p');
    sinopse.className = 'sinopse';
    sinopse.textContent = filme.overview || 'Sem sinopse em português.';

    const secaoOnde = document.createElement('section');
    secaoOnde.className = 'onde';
    const tituloOnde = document.createElement('h3');
    tituloOnde.textContent = 'Onde assistir no Brasil';
    secaoOnde.append(tituloOnde);

    const itens = listaDeOnde(disponibilidade);
    if (itens.length > 0) {
      const ul = document.createElement('ul');
      ul.append(...itens);
      secaoOnde.append(ul);
    } else {
      const nada = document.createElement('p');
      nada.className = 'meta';
      nada.textContent = 'Não encontrei este filme por assinatura ou grátis no Brasil.';
      secaoOnde.append(nada);
    }

    // App honesto sobre o que não sabe é mais confiável que app que finge
    // certeza. O dado do JustWatch tem atraso e furos — dizemos isso.
    const fonte = document.createElement('p');
    fonte.className = 'fonte';
    const agora = new Date().toLocaleString('pt-BR');
    fonte.textContent =
      `Disponibilidade consultada em ${agora}. Fonte: JustWatch, via TMDB. ` +
      'A informação pode estar desatualizada.';

    painelConteudo.replaceChildren(titulo, meta, sinopse, secaoOnde, fonte);
  } catch (erro) {
    painelConteudo.replaceChildren();
    const falha = document.createElement('p');
    falha.textContent = 'Não consegui carregar os detalhes agora. Tente de novo.';
    painelConteudo.append(falha);
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
   Busca por nome
   ------------------------------------------------------------------ */

let temporizadorBusca;

campoBusca.addEventListener('input', (e) => {
  const termo = e.target.value.trim();

  // Espera 400 ms depois da última tecla antes de perguntar à TMDB.
  // Sem isso, "Matrix" dispararia seis consultas — uma por letra.
  clearTimeout(temporizadorBusca);
  temporizadorBusca = setTimeout(() => {
    termoBusca = termo;
    atualizarModoBusca();
    buscarPagina(1, false);
  }, 400);
});

function sairDaBusca() {
  clearTimeout(temporizadorBusca);
  termoBusca = '';
  campoBusca.value = '';
  atualizarModoBusca();
  carregarFilmes();
}

document.querySelector('#sair-busca').addEventListener('click', sairDaBusca);

/* ------------------------------------------------------------------
   Começo de tudo
   ------------------------------------------------------------------ */

desenharBarra();
carregarGeneros();
carregarFilmes();
