# ACESSA+ Principles

Este documento registra principios inegociaveis do ACESSA+. Toda decisao futura de produto, arquitetura, codigo, IA, dados e interface deve respeita-los.

## 1. Valor real para o professor

Cada ciclo deve responder:

```txt
O que o professor consegue fazer hoje que nao conseguia no ciclo anterior?
```

Se um ciclo nao aumenta capacidade real de trabalho, ele precisa ser revisto.

No MVP, simplicidade e confiabilidade prevalecem: o professor pode preencher manualmente os principais dados pedagogicos enquanto o Workspace evolui para automatizar contexto no futuro.

## 2. Construcao de dentro para fora

O ACESSA+ evolui na ordem:

```txt
Conhecimento
-> Metodo
-> Inteligencia
-> Interface
```

A interface apresenta capacidades existentes. Ela nao deve inventar regras centrais.

## 3. Missao antes de chat

O professor nao deve precisar dominar engenharia de prompt. A plataforma transforma necessidades em missoes estruturadas.

Nao existe chamada direta da interface para IA.

## 4. Contexto antes de geracao

Toda missao deve passar por:

```txt
Contexto
-> Objetivo
-> Restricoes
-> Produto Esperado
```

Gerar antes de compreender e falha de arquitetura.

## 5. Professor no controle

Toda saida deve ser editavel, revisavel e apresentada como apoio profissional.

O ACESSA+ nao substitui o professor, nao decide pelo estudante e nao transforma IA em autoridade pedagogica.

## 6. Acessibilidade como origem

Acessibilidade nao e etapa posterior. Toda experiencia e todo recurso devem considerar inclusao desde a concepcao.

## 7. Perfil pedagogico, nao medico

Personalizacao deve usar barreiras, preferencias, estrategias, comunicacao, recursos e necessidades pedagogicas.

O ACESSA+ nao e prontuario, laudo ou sistema clinico.

## 8. Dominio independente de tecnologia

O dominio do ACESSA+ nao depende de framework, banco, cache, provedor de IA ou interface.

Frameworks sao substituiveis. O metodo deve permanecer.

## 9. Conhecimento estruturado e versionado

Conhecimento, protocolos, curriculos, legislacoes, evidencias, estrategias e recursos precisam ser estruturados, versionados e auditaveis.

PDF bruto nao e Banco Inteligente.

## 10. IA substituivel e controlada

Todo provedor de IA deve ficar atras do AI Gateway.

O sistema deve poder trocar de fornecedor sem reescrever dominio, Motor Pedagogico, Orquestrador ou Interface.

## 11. Segurança e LGPD desde o inicio

Dados devem ser minimizados, escopados por organizacao, auditaveis e protegidos.

Dados sensiveis nao devem ser enviados a provedores externos sem necessidade, base legal e protecao adequada.

## 12. Reutilizacao inteligente

Todo recurso produzido deve poder se tornar patrimonio pedagogico reutilizavel, com metadados e versoes.

O ACESSA+ deve aprender com uso, revisao, validacao e melhoria.

## 13. Ciclos curtos com entrega funcional

Arquitetura continua importante, mas deve acompanhar produto.

Cada ciclo deve conter:

```txt
Arquitetura minima necessaria
-> Implementacao
-> Testes
-> Revisao
-> Refatoracao
```

## 14. Qualidade antes de quantidade

Uma missao bem feita vale mais do que muitas funcionalidades superficiais.

O MVP deve crescer com confiabilidade pedagogica, seguranca e clareza.
