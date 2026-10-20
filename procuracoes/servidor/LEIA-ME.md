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
| O endereço mudou de um dia para o outro | O servidor está sem IP fixo. Peça ao técnico para fixar o IP (passo 1). |
