import type { ReactNode } from "react";

import { PageHeader } from "../components/page-header";
import { AccountTabs } from "./components/account-tabs";

const AccountLayout = ({ children }: { children: ReactNode }) => (
  <>
    <PageHeader flush title="Account">
      <AccountTabs />
    </PageHeader>
    {children}
  </>
);

export default AccountLayout;
