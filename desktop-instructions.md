# Instruções para rodar como Aplicativo Desktop (Electron)

Este projeto foi configurado para rodar como um aplicativo desktop profissional usando Electron.

## Pré-requisitos
Certifique-se de ter o **Node.js** instalado em seu computador.

## Como Iniciar o Aplicativo (Desenvolvimento)
Para rodar o aplicativo localmente enquanto desenvolve:

1. Abra o terminal na pasta do projeto.
2. Certifique-se de que as dependências estão instaladas:
   ```bash
   npm install
   ```
3. Execute o comando de desenvolvimento:
   ```bash
   npm run electron:dev
   ```
   *Este comando irá iniciar o servidor Vite e, assim que estiver pronto, abrirá a janela do Electron automaticamente.*

## Como Gerar o Executável (.exe)
Para criar a versão de distribuição (App Portátil):

1. Execute o comando de build:
   ```bash
   npm run electron:build
   ```
2. Após o término, o executável estará disponível na pasta `/release`.
3. Você encontrará um arquivo chamado `Sistema PDV Profissional.exe` (ou similar).

## Detalhes da Configuração
- **Tela Cheia**: O aplicativo abre automaticamente em modo maximizado.
- **Menu**: A barra de menu padrão do navegador foi removida para parecer um app nativo.
- **Produção**: Quando compilado, o app carrega os arquivos estáticos da pasta `/dist`, garantindo que funcione de forma robusta.
- **Integração de Impressão**: O sistema já está preparado para se comunicar com o processo principal do Electron para funções avançadas no futuro.
