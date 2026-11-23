// Cria um identificador unico para esta conversa
const usuarioId = crypto.randomUUID();
// Seleciona os elementos HTML
const messages = document.getElementById("messages");
const form = document.getElementById("chat-form");
const input = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");
const quickButtons = document.querySelectorAll("[data-message]");

// Cria um balão de mensagem na tela
function adicionarMensagem(texto, tipo) {
  const balao = document.createElement("div");

  balao.className = `message ${tipo}`;

  // textContent evita interpretar mensagens como HTML
  balao.textContent = texto;

  messages.appendChild(balao);

  // Rola a conversa para a última mensagem
  messages.scrollTop = messages.scrollHeight;
}

// Mostra o menu inicial
adicionarMensagem(
  `Olá! Bem-vindo à DG Tech!

Como podemos ajudar?

1 - Suporte técnico
2 - Consultoria em TI
3 - Desenvolvimento de sistemas
4 - Falar com um atendente

Digite uma opção ou utilize os botões abaixo.`,
  "bot"
);

// Envia uma mensagem para o backend Node.js
async function enviarMensagem(texto) {
  texto = texto.trim();

  if (!texto || sendButton.disabled) return;

  adicionarMensagem(texto, "user");

  input.value = "";
  input.disabled = true;
  sendButton.disabled = true;

 try {
  const resposta = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      mensagem: texto,
      usuarioId: usuarioId
    })
  });

    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados.erro || "Erro na API.");
    }

    adicionarMensagem(dados.resposta, "bot");

  } catch (erro) {
    console.error(erro);

    adicionarMensagem(
      "Não foi possível conectar ao servidor. Tente novamente.",
      "bot"
    );
  } finally {
    input.disabled = false;
    sendButton.disabled = false;
    input.focus();
  }
}

// Envio pelo formulário
form.addEventListener("submit", (evento) => {
  evento.preventDefault();

  enviarMensagem(input.value);
});

// Envio pelos botões rápidos
quickButtons.forEach((botao) => {
  botao.addEventListener("click", () => {
    enviarMensagem(botao.dataset.message);
  });
});
