# ACESSA+ Domain Vocabulary

Este documento define o vocabulario oficial do dominio ACESSA+. Ele deve orientar nomes de codigo, contratos, documentacao e discussoes tecnicas.

## Workspace

**Definicao:** ambiente de trabalho onde usuarios, organizacoes, missoes, recursos e conhecimento se relacionam.

**Responsabilidade:** delimitar o espaco operacional de uma pessoa ou instituicao dentro da plataforma.

**Relacionamentos:** contem `Organization`, usuarios, `Mission`, `Resource`, `StudentProfile`, `SchoolProfile` e configuracoes.

**Nao representa:** nao e apenas uma pasta, tela ou banco de dados. Tambem nao substitui `Organization`.

## Mission

**Definicao:** intencao estruturada de trabalho solicitada pelo professor ou instituicao.

**Responsabilidade:** representar o que precisa ser resolvido, seu estado e seu resultado esperado.

**Relacionamentos:** nasce em um `Workspace`, usa `Context`, consulta `Knowledge`, aplica `Protocol`, gera `PedagogicalPlan`, pode produzir `Resource`.

**Nao representa:** nao e conversa livre, prompt solto ou resposta da IA.

## Context

**Definicao:** conjunto de informacoes necessarias para compreender uma missao antes de interpreta-la.

**Responsabilidade:** reunir contexto institucional, pedagogico, curricular, acessivel, temporal, material e de seguranca.

**Relacionamentos:** pode usar `StudentProfile`, `SchoolProfile`, `Organization`, entrada do usuario e recursos disponiveis.

**Nao representa:** nao e regra pedagogica final nem memoria de conversa sem estrutura.

## Knowledge

**Definicao:** ativo estruturado de conhecimento confiavel ou institucionalmente relevante.

**Responsabilidade:** armazenar fundamentos, protocolos, curriculos, legislacoes, evidencias cientificas, estrategias validadas e referencias.

**Relacionamentos:** organiza `Protocol`, curriculos, leis, evidencias e fontes que alimentam `Decision`, `Specialist`, `Validation` e `Resource`.

**Nao representa:** nao e apenas PDF, arquivo bruto ou texto gerado por IA sem curadoria.

## Protocol

**Definicao:** conjunto versionado de criterios, orientacoes, categorias, restricoes e recomendacoes interpretaveis pela plataforma.

**Responsabilidade:** permitir que metodos, curriculos, legislacoes e diretrizes evoluam sem reescrever a arquitetura.

**Relacionamentos:** e um tipo de `Knowledge`; pode orientar `Decision`, `PedagogicalPlan`, `Specialist` e `Validation`.

**Nao representa:** nao e hardcode espalhado no codigo nem prompt de IA.

## Resource

**Definicao:** produto educacional ou institucional reutilizavel criado, adaptado, validado ou importado na plataforma.

**Responsabilidade:** preservar o resultado de uma missao como patrimonio de conhecimento aplicado.

**Relacionamentos:** nasce de uma `Mission`, possui `ResourceVersion`, metadados, validacoes e relacao com `Knowledge`.

**Nao representa:** nao e apenas arquivo anexado. Tambem nao e a missao em si.

## ResourceVersion

**Definicao:** versao historica e auditavel de um `Resource`.

**Responsabilidade:** preservar alteracoes, permitir revisao, comparacao, validacao e rastreabilidade.

**Relacionamentos:** pertence a um `Resource`, pode conter `Validation`, metadados e referencias a protocolos aplicados.

**Nao representa:** nao e copia solta sem vinculo ou backup informal.

## PedagogicalPlan

**Definicao:** plano estruturado que traduz uma missao educacional em objetivos, restricoes, protocolos aplicados e produto esperado.

**Responsabilidade:** orientar geracao, revisao, validacao e futura execucao pedagogica.

**Relacionamentos:** e produzido por decisoes sobre `Context`, `Mission`, `Knowledge` e `Protocol`; alimenta `Specialist`, `Validation` e `Resource`.

**Nao representa:** nao e o material final do professor nem resposta direta de IA.

## StudentProfile

**Definicao:** perfil pedagogico funcional do estudante, focado em barreiras, preferencias, estrategias, acessibilidade e recursos.

**Responsabilidade:** apoiar personalizacao pedagogica com minimizacao de dados.

**Relacionamentos:** pode enriquecer `Context`, orientar `PedagogicalPlan`, `Specialist` e `Validation`.

**Nao representa:** nao e prontuario medico, laudo, diagnostico ou registro clinico.

## SchoolProfile

**Definicao:** perfil institucional da escola ou unidade educacional.

**Responsabilidade:** informar contexto, recursos disponiveis, etapa atendida, politicas, infraestrutura e restricoes locais.

**Relacionamentos:** pertence a uma `Organization`, compoe `Context` e pode orientar `Decision` e `Validation`.

**Nao representa:** nao substitui `Organization` nem representa cada estudante.

## Organization

**Definicao:** entidade institucional ou profissional responsavel por usuarios, dados e recursos.

**Responsabilidade:** delimitar governanca, acesso, permissao, isolamento e responsabilidade legal.

**Relacionamentos:** contem usuarios, `Workspace`, `Mission`, `Resource`, perfis e configuracoes.

**Nao representa:** nao e apenas um cadastro visual. E uma fronteira de seguranca.

## Specialist

**Definicao:** modulo especializado que analisa uma missao ou plano sob uma perspectiva tecnica.

**Responsabilidade:** produzir recomendacoes, restricoes, riscos e criterios de revisao.

**Relacionamentos:** recebe `Context`, `Knowledge`, `Protocol`, `PedagogicalPlan` e produz insumos para `Decision` e `Validation`.

**Nao representa:** nao e persona solta, chatbot individual ou provedor de IA.

## Decision

**Definicao:** resultado estruturado de uma escolha feita pela plataforma com base em contexto, conhecimento, protocolos e restricoes.

**Responsabilidade:** tornar explicito por que determinado caminho foi escolhido antes da geracao.

**Relacionamentos:** usa `Context`, `Mission`, `Knowledge`, `Protocol` e pode produzir `PedagogicalPlan` ou outras decisoes de dominio.

**Nao representa:** nao e decisao opaca de modelo de IA nem substituicao da revisao humana.

## Validation

**Definicao:** avaliacao estruturada de qualidade, seguranca, acessibilidade, coerencia e risco.

**Responsabilidade:** verificar se uma decisao, plano ou recurso atende criterios definidos antes de ser aceito.

**Relacionamentos:** avalia `PedagogicalPlan`, `ResourceVersion`, saidas de `Specialist`, uso de `Protocol` e riscos de LGPD.

**Nao representa:** nao e garantia absoluta de verdade nem dispensa curadoria humana.
