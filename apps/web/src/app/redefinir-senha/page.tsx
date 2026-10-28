import { PasswordResetForm } from "../password-reset-form";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }): Promise<React.ReactElement> {
  const { token = "" } = await searchParams;
  return <main className="authShell authExperience"><section className="authBrandPanel"><a className="landingBrand" href="/"><span>A+</span><strong>ACESSA<span>+</span></strong></a><p className="landingKicker"><span aria-hidden="true" /> Link de uso único</p><h1>Defina uma nova senha.</h1><p>Ao concluir, todas as sessões anteriores da conta serão encerradas.</p></section><PasswordResetForm mode="reset" token={token} /></main>;
}

