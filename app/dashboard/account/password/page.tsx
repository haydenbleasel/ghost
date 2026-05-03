import { requireUser } from "@/lib/session";

import { PageBody } from "../../_components/page-header";
import { PasswordPanel } from "../_components/password-panel";

const PasswordPage = async () => {
  await requireUser();

  return (
    <PageBody>
      <PasswordPanel />
    </PageBody>
  );
};

export default PasswordPage;
