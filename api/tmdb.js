// Única peça do projeto que conhece a chave da API.
// Recebe um pedido do front-end, carimba a chave, pergunta à TMDB, devolve.
//
// A chave NUNCA é enviada ao navegador: ela existe só aqui, lida da variável
// de ambiente TMDB_TOKEN configurada na Vercel.

const BASE = 'https://api.themoviedb.org/3';

// Rotas que o app tem permissão de pedir. Qualquer outra é recusada.
//
// Por que a lista existe: sem ela, qualquer pessoa poderia usar o nosso endereço
// para fazer qualquer chamada à TMDB com a NOSSA chave — vira um proxy aberto, e
// quem leva a suspensão é a nossa conta.
const ROTAS_FIXAS = new Set([
  'discover/movie',
  'search/movie',
  'watch/providers/movie',
  'genre/movie/list',
]);

// Rotas com número no meio: movie/550 e movie/550/watch/providers
const ROTAS_PADRAO = [
  /^movie\/\d+$/,
  /^movie\/\d+\/watch\/providers$/,
];

function rotaPermitida(rota) {
  if (!rota) return false;
  if (ROTAS_FIXAS.has(rota)) return true;
  return ROTAS_PADRAO.some((padrao) => padrao.test(rota));
}

export default async function handler(req, res) {
  const { rota, ...parametros } = req.query;

  if (!rotaPermitida(rota)) {
    return res.status(400).json({ erro: 'Rota não permitida.' });
  }

  const token = process.env.TMDB_TOKEN;
  if (!token) {
    return res.status(500).json({ erro: 'TMDB_TOKEN não configurado no servidor.' });
  }

  const url = new URL(`${BASE}/${rota}`);
  for (const [chave, valor] of Object.entries(parametros)) {
    url.searchParams.set(chave, valor);
  }

  try {
    const resposta = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
    });
    const dados = await resposta.json();
    return res.status(resposta.status).json(dados);
  } catch (erro) {
    return res.status(502).json({ erro: 'Não consegui falar com a TMDB.' });
  }
}
