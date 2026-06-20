export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      erro: "Método não permitido"
    });
  }

  try {
    const dados = req.body;

    const resposta = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          input: `
Você é o Assistente AEE do Acessa+.

Crie materiais pedagógicos inclusivos e profissionais.

Considere:
- BNCC
- Currículo Capixaba
- DUA
- ABA
- Taxonomia de Bloom
- Tecnologia Assistiva
- CAA
- DI
- TEA
- DV
- DA
- TDAH
- AH/SD

Dados do professor:

${JSON.stringify(dados, null, 2)}

Produza o material completo em HTML.
`
        })
      }
    );

    const resultado = await resposta.json();

    return res.status(200).json({
      resultado:
        resultado.output_text ||
        "Não foi possível gerar o material."
    });

  } catch (erro) {
    return res.status(500).json({
      erro: erro.message
    });
  }
}
