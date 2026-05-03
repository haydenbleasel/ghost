import type { ReactNode } from "react";

import { PageHeader } from "../_components/page-header";
import { AccountTabs } from "./_components/account-tabs";

const AccountLayout = ({ children }: { children: ReactNode }) => (
  <>
    <PageHeader flush title="Account">
      <AccountTabs />
    </PageHeader>
    {children}
  </>
);

export default AccountLayout;
