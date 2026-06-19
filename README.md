# Acessa+

Aplicativo local para criação de atividades e recursos pedagógicos inclusivos.

## O que esta versão entrega

- Atividades adaptadas em folha A4 prontas para estudante.
- Exercícios com campos de nome, turma, disciplina e data.
- Alternativas marcáveis, espaço de resposta, desenho/escrita e mini cartões de CAA.
- Adaptação por DI, TEA, DV, DA, TDAH, AH/SD e múltiplas deficiências.
- Módulos de atividade, adaptação, plano, PEI, avaliação, ABA, CAA e relatório.
- Banco local de materiais salvos no navegador.
- Exportação em PDF/impressão, imagem PNG A4, Word e HTML.
- Instalação como PWA quando aberto por servidor local.

## Como usar

Opção simples:

1. Abra `abrir-acessaplus.bat`.
2. Preencha os dados do estudante e da atividade.
3. Clique em `Gerar material`.
4. Clique em `Imagem A4` para baixar a folha como PNG.

Opção recomendada para instalar como aplicativo:

1. Abra `servidor-local.bat`.
2. Acesse `http://localhost:8787`.
3. Clique em `Instalar app`, se o navegador oferecer essa opção.

## Observação técnica

Esta versão funciona sem internet e sem API externa. A IA está em modo pedagógico local, com regras estruturadas. Para usar IA generativa real, recomenda-se criar um backend para proteger a chave da API.
