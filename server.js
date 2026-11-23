
require("dotenv").config();

const express = require("express");
const crypto = require("node:crypto");

const app = express();
const PORT = process.env.PORT || 3000;
// Disponibiliza os arquivos da interface visual
app.use(express.static("public"));

app.use(express.json({
  verify: (req, res, buffer) => {
    req.rawBody = Buffer.from(buffer);
  }
}));

// Evita processar a mesma mensagem duas vezes
const mensagensProcessadas = new Set();



// Verificação inicial do webhook pela Meta
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    token === process.env.VERIFY_TOKEN
  ) {
    console.log("Webhook verificado pela Meta!");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

// Valida a assinatura de segurança da Meta
function verificarAssinatura(req) {
  const assinatura = req.get("x-hub-signature-256");
  const segredo = process.env.META_APP_SECRET;

  if (!assinatura || !segredo || !req.rawBody) {
    return false;
  }

  const esperada = "sha256=" + crypto
    .createHmac("sha256", segredo)
    .update(req.rawBody)
    .digest("hex");

  const a = Buffer.from(assinatura);
  const b = Buffer.from(esperada);

  return a.length === b.length &&
    crypto.timingSafeEqual(a, b);
}


//
// DG TECH CHATBOT - ATENDIMENTO COM CONTEXTO
//

// Armazena a etapa da conversa de cada usuario
const conversas = new Map();

function gerarResposta(texto, usuarioId = "demo") {
  const mensagem = texto.trim().toLowerCase();

  // Recupera a etapa atual do usuario
  let estado = conversas.get(usuarioId) || "menu";

  // Permite retornar ao menu a qualquer momento
  if (mensagem === "menu" || mensagem === "voltar" || mensagem === "0") {
    conversas.set(usuarioId, "menu");
    return mostrarMenu();
  }

  // O usuario pode escolher outra opcao a qualquer momento
  switch (mensagem) {
    case "1":
      conversas.set(usuarioId, "suporte");
      return `Voce selecionou Suporte Tecnico.

Descreva o problema que esta enfrentando.

Exemplos:
- Computador nao liga
- Internet sem conexao
- Impressora nao imprime

Digite MENU para voltar.`;

    case "2":
      conversas.set(usuarioId, "consultoria");
      return `Voce selecionou Consultoria em TI.

Trabalhamos com:
- Servidores e virtualizacao
- Redes e infraestrutura
- Seguranca da informacao
- Backup e monitoramento

Qual assunto gostaria de conversar?`;

    case "3":
      conversas.set(usuarioId, "sistemas");
      return `Voce selecionou Desenvolvimento de Sistemas.

Podemos conversar sobre:
- Sistemas web
- Automacao de processos
- Integracao de APIs
- Aplicacoes personalizadas

Conte um pouco sobre sua ideia.`;

    case "4":
      conversas.set(usuarioId, "atendente");
      return `Voce selecionou Atendimento Humano.

Esta e uma demonstracao do chatbot DG Tech.
Nenhum atendente real sera acionado.

Digite MENU para retornar.`;
  }

  // Continua o atendimento conforme o assunto escolhido
  switch (estado) {
    case "suporte":
      if (
        mensagem.includes("nao liga") ||
        mensagem.includes("não liga")
      ) {
        return `Entendi! Vamos diagnosticar.

1. Verifique se o cabo de energia esta conectado.
2. Confira se a tomada esta funcionando.
3. Observe se existe alguma luz no equipamento.

Quando voce pressiona o botao de ligar, aparece alguma luz ou sinal de energia?`;
      }

      if (
        mensagem.includes("internet") ||
        mensagem.includes("wifi") ||
        mensagem.includes("wi-fi")
      ) {
        return `Vamos verificar sua conexao.

O problema acontece somente neste computador ou em todos os dispositivos da rede?

Descreva o que esta acontecendo.`;
      }

      if (mensagem.includes("impressora")) {
        return `Vamos verificar sua impressora.

Ela esta ligada e conectada a rede ou ao computador?

Aparece alguma mensagem de erro?`;
      }

      return `Entendi seu relato: "${texto}".

Para continuar o diagnostico, me informe se aparece alguma mensagem de erro ou qual comportamento voce observa.

Digite MENU para voltar.`;

    case "consultoria":
      return `Entendi que voce tem interesse em: "${texto}".

Na DG Tech, podemos estudar solucoes envolvendo infraestrutura, servidores, redes, virtualizacao e seguranca.

Qual e o principal objetivo ou dificuldade do seu ambiente?

Digite MENU para voltar.`;

    case "sistemas":
      return `Interessante! Sua ideia envolve: "${texto}".

Para entender melhor o projeto, me diga:

O sistema sera utilizado por uma empresa, clientes ou usuarios internos?

Digite MENU para voltar.`;

    case "atendente":
      return `Esta e uma demonstracao academica do DG Tech Chatbot.

Para iniciar outro atendimento, digite MENU.`;

    default:
      return mostrarMenu();
  }
}

// Exibe o menu principal
function mostrarMenu() {
  return `Ola! Bem-vindo a DG Tech!

Como podemos ajudar?

1 - Suporte tecnico
2 - Consultoria em TI
3 - Desenvolvimento de sistemas
4 - Falar com um atendente

Digite uma opcao.`;
}


// Envia mensagens pela API do WhatsApp
async function enviarMensagem(numero, texto) {
  const url = `https://graph.facebook.com/${process.env.GRAPH_VERSION}/${process.env.PHONE_NUMBER_ID}/messages`;

  const resposta = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: numero,
      type: "text",
      text: { body: texto }
    })
  });

  const resultado = await resposta.json();

  if (!resposta.ok) {
    throw new Error(JSON.stringify(resultado));
  }

  console.log("Envio aceito pela API:", resultado);
}

// Recebe eventos enviados pelo WhatsApp
app.post("/webhook", (req, res) => {

if (!verificarAssinatura(req)) {
  const assinatura = req.get("x-hub-signature-256");

  console.log("DIAGNOSTICO DO WEBHOOK:", {
    assinaturaPresente: Boolean(assinatura),
    segredoConfigurado: Boolean(process.env.META_APP_SECRET),
    corpoRecebido: Boolean(req.rawBody)
  });

  return res.sendStatus(403);
}


 
    // Confirma o recebimento do evento para a Meta
    res.sendStatus(200);

    // Confirma que a assinatura digital foi validada
    console.log("WEBHOOK AUTENTICADO COM SUCESSO!");


  for (const entrada of req.body.entry || []) {
    for (const alteracao of entrada.changes || []) {
      if (alteracao.field !== "messages") continue;

      const dados = alteracao.value || {};

      // Mostra os status de entrega no terminal
      for (const status of dados.statuses || []) {
        console.log("Status:", JSON.stringify(status));
      }

      // Ignora mensagens de outros numeros
      if (
        String(dados.metadata?.phone_number_id) !==
        process.env.PHONE_NUMBER_ID
      ) continue;

      for (const mensagem of dados.messages || []) {
        if (mensagem.type !== "text") continue;
        if (mensagensProcessadas.has(mensagem.id)) continue;

        mensagensProcessadas.add(mensagem.id);

        const numero = mensagem.from;
        const texto = mensagem.text?.body || "";

        console.log("Mensagem recebida:", numero, texto);

        enviarMensagem(numero, gerarResposta(texto))
          .catch(erro => {
            console.error("Erro ao responder:", erro.message);
          });
      }
    }
  }
});

//
// API DE DEMONSTRACAO DO DG TECH CHATBOT
// Permite testar o chatbot sem depender do WhatsApp
//

app.post("/api/chat", (req, res) => {
  const mensagem = req.body?.mensagem;

  // Verifica se o usuario digitou uma mensagem valida
  if (
    typeof mensagem !== "string" ||
    !mensagem.trim() ||
    mensagem.length > 1000
  ) {
    return res.status(400).json({
      erro: "Informe uma mensagem valida de ate 1000 caracteres."
    });
  }

  // Utiliza a mesma funcao do chatbot do WhatsApp

  // Identifica a conversa do visitante
  const usuarioId = req.body?.usuarioId;

  // Envia a mensagem mantendo o contexto da conversa
  const resposta = gerarResposta(
    mensagem,
    typeof usuarioId === "string" &&
    usuarioId.length >= 10 &&
    usuarioId.length <= 100
      ? usuarioId
      : "demo"
  );


  console.log("Mensagem de demonstracao:", mensagem);

  return res.json({
    chatbot: "DG Tech",
    resposta: resposta
  });
});

// Inicializa nosso servidor
app.listen(PORT, () => {
  console.log("--------------------------------");
  console.log("DG TECH CHATBOT");
  console.log(`Servidor online na porta ${PORT}`);
  console.log("Respostas automaticas habilitadas");
  console.log("--------------------------------");
});

//
// API DE DEMONSTRACAO DO DG TECH CHATBOT
// Permite testar as respostas sem utilizar o WhatsApp
//

app.post("/api/chat", (req, res) => {
  const mensagem = req.body?.mensagem;

  // Verifica se a mensagem recebida e valida
  if (
    typeof mensagem !== "string" ||
    !mensagem.trim() ||
    mensagem.length > 1000
  ) {
    return res.status(400).json({
      erro: "Informe uma mensagem valida de ate 1000 caracteres."
    });
  }

  // Usa a mesma funcao de resposta do WhatsApp
  const resposta = gerarResposta(mensagem);

  console.log("Mensagem de demonstracao:", mensagem);

  return res.json({
    chatbot: "DG Tech",
    resposta: resposta
  });
});


// Inicializa nosso servidor
app.listen(PORT, () => {
  console.log("--------------------------------");
  console.log("DG TECH CHATBOT");
  console.log(`Servidor online na porta ${PORT}`);
  console.log("Respostas automaticas habilitadas");
  console.log("--------------------------------");
});
