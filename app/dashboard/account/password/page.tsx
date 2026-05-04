import { requireUser } from "@/lib/session";

import { PageBody } from "../../components/page-header";
import { PasswordPanel } from "../components/password-panel";

const PasswordPage = async () => {
  await requireUser();

  return (
    <PageBody>
      <PasswordPanel />
    </PageBody>
  );
};

export default PasswordPage;
