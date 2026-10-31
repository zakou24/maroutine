import { LogoutButton } from "./logout-button";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-5 pt-14 pb-8">
      <h1 className="text-[28px] leading-[34px] font-bold">Cette semaine</h1>
      <p className="text-[17px] text-muted-foreground">Tes stats arriveront au Lot 2.</p>
      <div>
        <LogoutButton />
      </div>
    </main>
  );
}
