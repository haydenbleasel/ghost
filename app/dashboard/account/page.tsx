import { requireUser } from "@/lib/session";
import { AccountPanel } from "./_components/account-panel";

const AccountPage = async () => {
  const user = await requireUser();

  return (
    <div className="grid gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading font-medium text-2xl tracking-tight">Account</h1>
        <p className="text-muted-foreground text-sm">
          Manage your profile and password.
        </p>
      </header>
      <AccountPanel
        user={{
          email: user.email,
          emailVerified: user.emailVerified,
          name: user.name ?? "",
        }}
      />
    </div>
  );
};

export default AccountPage;
