import type { ReactNode } from "react";

import { PageHeader } from "../components/page-header";

const AccountLayout = ({ children }: { children: ReactNode }) => (
  <>
    <PageHeader flush title="Account" />
    {children}
  </>
);

export default AccountLayout;
