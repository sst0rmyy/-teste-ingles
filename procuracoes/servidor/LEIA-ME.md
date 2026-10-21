# Livro de Procurações: instalação no cartório

O sistema roda em um computador do cartório (o "servidor"). Os outros computadores abrem pelo navegador, digitam a senha do cartório uma vez e ficam conectados por 30 dias. Ninguém precisa de conta no Claude, e os dados dos clientes não saem da rede do cartório.

## 1. Escolha o computador servidor
- Precisa ficar **ligado durante o expediente**. Se ele estiver desligado, ninguém acessa o sistema.
- Pode ser um computador comum com Windows 10 ou 11.
- O ideal é pedir ao técnico de informática que deixe esse computador com um **IP fixo** na rede (exemplo: `192.168.0.50`). Assim o endereço do sistema nunca muda.

## 2. Instale o Node.js (uma vez só)
1. Acesse https://nodejs.org e baixe a versão **LTS**.
2. Instale clicando em "Avançar" até o fim. Não é preciso mudar nenhuma opção.

## 3. Copie o sistema para o servidor
1. No GitHub, abra o repositório, clique em **Code → Download ZIP** e extraia o arquivo.
2. Copie a pasta **`procuracoes`** inteira para um lugar fixo do servidor, por exemplo `C:\LivroProcuracoes\procuracoes`.

## 4. Ligue o sistema
1. Entre em `procuracoes\servidor` e dê dois cliques em **`iniciar.bat`**.
2. **Na primeira vez**, a janela pede a senha do cartório. Digite a senha, com no mínimo 8 caracteres, e repita para confirmar.
3. Se o Windows perguntar sobre o **Firewall**, marque **Redes privadas** e clique em **Permitir acesso**. Sem isso, os outros computadores não conseguem entrar.
4. A janela mostra os endereços, por exemplo:
   ```
   Neste computador:    http://localhost:8080
   Na rede do cartório: http://192.168.0.50:8080
   ```
   **Deixe essa janela aberta.** Fechar a janela desliga o sistema. Pode minimizar.

### Ligar sozinho quando o computador iniciar
1. Aperte **Windows + R**, digite `shell:startup` e aperte Enter.
2. Na pasta que abrir, crie um **atalho** para o `iniciar.bat` (botão direito no `iniciar.bat` → Mostrar mais opções → Criar atalho, depois mova o atalho para essa pasta).

## 5. Use nos computadores dos funcionários
1. Abra o **Chrome** ou o **Edge** e digite o endereço da rede, por exemplo `http://192.168.0.50:8080`.
2. Digite a senha do cartório e clique em **Entrar**.
3. Para deixar o sistema com cara de programa, com ícone na área de trabalho e janela própria:
   - **Chrome:** menu ⋮ → **Transmitir, salvar e compartilhar** → **Instalar página como app** (ou **Criar atalho**, marcando **Abrir como janela**).
   - **Edge:** menu ⋯ → **Aplicativos** → **Instalar este site como aplicativo**.

A biblioteca é a mesma para todos. O que um funcionário salva aparece na hora nos outros computadores.

## 6. Acessar de outro lugar (Tailscale)
Os passos 1 a 5 funcionam **dentro da rede do cartório**. Para usar o sistema de outro lugar (por exemplo, servidor em casa e uso no cartório, ou o contrário), use o **Tailscale**. Ele cria uma rede particular e criptografada entre os seus computadores, como se todos estivessem no mesmo cabo.

> **Não libere a porta 8080 no roteador** e não use o recurso "Funnel" do Tailscale. Os dois deixam o sistema aberto para a internet inteira.

### 6.1 Crie a conta (uma vez só)
1. Acesse https://tailscale.com e clique em **Get started**.
2. Entre com uma conta Google ou Microsoft **do cartório**. Todos os computadores vão usar essa mesma conta.
3. O plano gratuito pessoal atende alguns computadores. Confira os limites atuais no site antes de instalar em muitos.

### 6.2 Instale no computador servidor
1. Baixe o Tailscale para Windows em https://tailscale.com/download e instale.
2. Clique no ícone do Tailscale perto do relógio, escolha **Log in** e entre com a conta do cartório.
3. No painel https://login.tailscale.com/admin/machines aparece o servidor com um nome (ex.: `servidor-cartorio`) e um endereço `100.x.y.z`. Anote os dois.
4. Ainda nesse painel, clique nos três pontos do servidor e escolha **Disable key expiry**. Assim ele não se desconecta sozinho depois de alguns meses.

### 6.3 Instale em cada computador que vai usar o sistema
1. Instale o Tailscale e entre com **a mesma conta** (passos 1 e 2 acima).
2. Abra o Chrome ou o Edge e digite `http://NOME-DO-SERVIDOR:8080` (ex.: `http://servidor-cartorio:8080`). Se o nome não funcionar, use o endereço: `http://100.x.y.z:8080`.
3. Entre com a senha do cartório. O resto funciona igual ao passo 5.

O Tailscale abre sozinho com o Windows. Se um computador não conseguir acessar, confira se o ícone dele está conectado (**Connected**).

### 6.4 Ativar o endereço https:// (recomendado)
Com `https://`, o botão **Copiar texto** passa a funcionar, o navegador instala o sistema como aplicativo completo e a conexão ganha mais uma camada de proteção.
1. No painel do Tailscale, abra **DNS** e confirme que **MagicDNS** está ativado. Na mesma página, em **HTTPS Certificates**, clique em **Enable HTTPS**.
2. No computador servidor, com o `iniciar.bat` aberto, abra o **Prompt de Comando** e digite:
   ```
   tailscale serve --bg 8080
   ```
3. O comando mostra o endereço novo, parecido com `https://servidor-cartorio.tail1234.ts.net`. É esse endereço que todos devem usar a partir de agora.
4. Nos computadores, entre de novo com a senha nesse endereço novo e reinstale o atalho/aplicativo por ele.

O `tailscale serve` continua valendo depois de reiniciar o computador. Para desligar o https, use `tailscale serve reset`.

### 6.5 Se o servidor ficar fora do cartório
- O computador precisa ficar **ligado e com internet** durante todo o expediente. Sem ele, o cartório fica sem o sistema.
- Use um **nobreak** se possível. Nas configurações de energia do Windows, deixe **Suspender: Nunca**.
- A pasta `dados` terá dados pessoais dos clientes fora do cartório. Avalie isso com a responsável pela serventia (LGPD e normas de segurança da informação das serventias) e mantenha o backup em dia.
- O recomendado é deixar o servidor **no cartório** e usar o Tailscale só para acessar de fora quando preciso.

## Senha
- **Trocar a senha:** feche a janela do servidor, dê dois cliques em **`trocar-senha.bat`**, defina a nova senha e abra o `iniciar.bat` de novo. Todos os computadores precisarão entrar com a senha nova.
- **Sair em um computador:** botão **Sair** no canto superior direito do sistema.
- Depois de 10 senhas erradas, aquele computador fica bloqueado por 15 minutos.

## Backup (importante)
Todas as procurações ficam na pasta **`procuracoes\servidor\dados`**:
- `procuracoes\`: uma procuração por arquivo;
- `lixeira\`: procurações excluídas. Nada é apagado de vez; para recuperar uma, mova o arquivo de volta para `procuracoes\` e apague do nome a parte da data;
- `cartorio.json`: o cadastro de escreventes;
- `config.json` e `sessoes.json`: a senha (gravada de forma protegida) e os computadores conectados.

**Inclua a pasta `dados` no backup diário do cartório.** Essa pasta contém dados pessoais dos clientes, então trate-a com o mesmo cuidado dos demais arquivos sigilosos (LGPD).

## Atualizar o sistema
Quando houver uma versão nova, substitua os arquivos da pasta `procuracoes`, **menos a pasta `servidor\dados`**. Depois feche e abra o `iniciar.bat`.

## Problemas comuns
| O que acontece | O que fazer |
|---|---|
| "O servidor do cartório não respondeu" | Confira se a janela do `iniciar.bat` está aberta no servidor e se o endereço digitado está certo. |
| Funciona no servidor, mas não nos outros computadores | Libere o Node.js no Firewall do Windows (Painel de Controle → Firewall → Permitir um aplicativo → Node.js → Privada). |
| "A porta 8080 já está em uso" | Já existe um servidor aberto. Feche a outra janela, ou edite o `iniciar.bat` e troque a linha `node servidor.js` por `set PORTA=8081 && node servidor.js`. |
| O botão "Copiar texto" não copia | Os navegadores só liberam a cópia automática em endereços `https`. Selecione o texto da minuta e use Ctrl+C. O download do Word funciona normalmente. |
| De fora do cartório não abre | Confira se o Tailscale está conectado nos dois computadores, com a mesma conta, e se o servidor está ligado. Teste primeiro pelo endereço `100.x.y.z:8080`. |
| Com https, aparece "certificado" ou "não seguro" | Use exatamente o endereço `https://….ts.net` mostrado pelo `tailscale serve`, não o `100.x.y.z`. |
| O endereço mudou de um dia para o outro | O servidor está sem IP fixo. Peça ao técnico para fixar o IP (passo 1). |
