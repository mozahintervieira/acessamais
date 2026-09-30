const defaultMessage = "Olá! Quero conhecer melhor o ACESSA+ e sua mente pedagógica.";
const publicContactNumber = "5527992977703";

export function WhatsAppContact(): React.ReactElement {
  const number = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? publicContactNumber).replace(/\D/g, "");
  const message = process.env.NEXT_PUBLIC_WHATSAPP_MESSAGE?.trim() || defaultMessage;
  const isConfigured = number.length >= 10;
  const href = isConfigured
    ? `https://wa.me/${number}?text=${encodeURIComponent(message)}`
    : "/cadastro?origem=contato-direto";

  return (
    <a
      className={`whatsappContact${isConfigured ? "" : " awaitingNumber"}`}
      href={href}
      aria-label={isConfigured ? "Conversar com o ACESSA+ pelo WhatsApp" : "Deixar contato para falar com o ACESSA+"}
      {...(isConfigured ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      <span aria-hidden="true">◔</span>
      <b>{isConfigured ? "WhatsApp" : "Contato direto"}</b>
    </a>
  );
}
