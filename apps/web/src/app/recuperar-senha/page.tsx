import { PasswordResetForm } from "../password-reset-form";

export default function ForgotPasswordPage(): React.ReactElement {
  return <main className="authShell authExperience"><section className="authBrandPanel"><a className="landingBrand" href="/"><span>A+</span><strong>ACESSA<span>+</span></strong></a><p className="landingKicker"><span aria-hidden="true" /> Acesso protegido</p><h1>Recupere sua conta.</h1><p>Informe o e-mail usado no cadastro. Se a conta existir e o serviço estiver configurado, enviaremos um link de uso único.</p></section><PasswordResetForm mode="forgot" /></main>;
}

